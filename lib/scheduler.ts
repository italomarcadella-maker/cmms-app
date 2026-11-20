import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import type { Prisma } from "@prisma/client";
import { parseActivities } from "@/modules/maintenance/domain/checklist";
import { OPEN_STATUSES } from "@/modules/maintenance/domain/asset-reliability";
import { computeUsageStatus, dueDateForUsage, dueDateNeedsUpdate } from "@/modules/maintenance/domain/usage-triggers";
import { loadMeterReadings } from "@/lib/meter-usage";
import { safeRefreshAssetHealth } from "@/lib/asset-health-sync";

type MeterSchedule = Prisma.PreventiveScheduleGetPayload<{ include: { asset: true; meter: true } }>;

const numberFmt = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });

/**
 * Valuta un piano a consumo di un contatore con le sue letture (in ordine di data crescente).
 * - Se il consumo dall'ultima esecuzione ha raggiunto l'intervallo genera l'ordine (come per i piani a tempo) e sposta la base
 *   del piano al valore attuale con una "prenotazione" atomica: due esecuzioni insieme non creano ordini doppi.
 *   Se esiste gia' un ordine aperto nato dal piano non ne crea un altro.
 * - Altrimenti tiene aggiornata `nextDueDate` (stima, oppure oggi + 5 anni se non calcolabile).
 * Ritorna true se ha generato un ordine.
 */
async function evaluateMeterSchedule(
    schedule: MeterSchedule,
    readings: ReadonlyMap<string, { value: number; date: Date | string }[]>,
    now: Date
): Promise<boolean> {
    if (!schedule.meter || !schedule.meterId) return false; // contatore eliminato: il piano non ha piu' un riferimento valido
    const list = readings.get(schedule.meterId) ?? [];
    const plan = { interval: schedule.meterInterval, lastMeterValue: schedule.lastMeterValue };
    const status = computeUsageStatus(plan, list);
    if (!status.validInterval || !status.hasReadings || status.currentValue === null) return false;

    const prevBase = schedule.lastMeterValue ?? null;

    if (status.overdue) {
        const alreadyOpen = await prisma.workOrder.findFirst({
            where: { originScheduleId: schedule.id, status: { in: [...OPEN_STATUSES] } },
            select: { id: true },
        });
        if (!alreadyOpen) {
            const afterClaim = computeUsageStatus({ interval: schedule.meterInterval, lastMeterValue: status.currentValue }, list);
            const created = await prisma.$transaction(async (tx) => {
                // "Prenota" la scadenza per prima: solo chi riesce a portare la base al valore attuale genera l'ordine.
                const claimed = await tx.preventiveSchedule.updateMany({
                    where: { id: schedule.id, triggerType: "METER", lastMeterValue: prevBase },
                    data: { lastRunDate: now, lastMeterValue: status.currentValue, nextDueDate: dueDateForUsage(afterClaim, now) },
                });
                if (claimed.count !== 1) return false;

                const checklist = parseActivities(schedule.activities);
                const unit = schedule.meter?.unit ? ` ${schedule.meter.unit}` : "";
                await tx.workOrder.create({
                    data: {
                        title: `[AUTO] ${schedule.taskTitle}`,
                        description:
                            `${schedule.description}\n\nGenerato dal piano a consumo del contatore "${schedule.meter?.name}": ` +
                            `consumo di ${numberFmt.format(status.consumed ?? 0)}${unit} dall'ultima esecuzione ` +
                            `(intervallo ${numberFmt.format(status.interval ?? 0)}${unit}).`,
                        priority: "MEDIUM", // Default for routine
                        type: "ROUTINE",
                        category: "OTHER",
                        status: "OPEN",
                        assetId: schedule.assetId,
                        plantId: schedule.asset?.plantId ?? null,
                        dueDate: addDays(now, 7), // Give 1 week to complete by default
                        originScheduleId: schedule.id,
                        checklist: checklist.length > 0 ? { create: checklist.map(label => ({ label, completed: false })) } : undefined,
                    },
                });
                return true;
            });
            return created;
        }
    }

    // Nessun ordine da generare: si aggiornano la base (se mancava) e la scadenza stimata
    const desired = dueDateForUsage(status, now);
    const data: Prisma.PreventiveScheduleUpdateManyMutationInput = {};
    if (prevBase === null && status.baseline !== null) data.lastMeterValue = status.baseline;
    if (dueDateNeedsUpdate(schedule.nextDueDate, desired, status, now)) data.nextDueDate = desired;
    if (Object.keys(data).length > 0) {
        await prisma.preventiveSchedule.updateMany({
            where: { id: schedule.id, triggerType: "METER", lastMeterValue: prevBase },
            data,
        });
    }
    return false;
}

async function processMeterSchedules(schedules: MeterSchedule[], now: Date, errors: string[]): Promise<{ count: number; assetIds: string[] }> {
    const readings = await loadMeterReadings(schedules.map(s => s.meterId).filter((id): id is string => !!id));
    let count = 0;
    const assetIds: string[] = [];
    for (const schedule of schedules) {
        try {
            if (await evaluateMeterSchedule(schedule, readings, now)) {
                count++;
                assetIds.push(schedule.assetId);
            }
        } catch (err: any) {
            console.error(`Error processing meter schedule ${schedule.id}:`, err);
            errors.push(`Schedule ${schedule.id}: ${err.message}`);
        }
    }
    return { count, assetIds };
}

export async function checkAndGeneratePreventiveWorkOrders() {
    try {
        const today = new Date();

        // 1. Find all schedules due (solo i piani a tempo: quelli a consumo hanno una scadenza stimata o un segnaposto)
        const dueSchedules = await prisma.preventiveSchedule.findMany({
            where: {
                triggerType: "TIME",
                nextDueDate: {
                    lte: today,
                },
            },
            take: 50, // Batch limit to prevent timeouts
            include: {
                asset: true,
            },
        });

        let generatedCount = 0;
        const errors: string[] = [];

        // 2. Process each schedule
        for (const schedule of dueSchedules) {
            try {
                const created = await prisma.$transaction(async (tx) => {
                    // "Prenota" la scadenza per prima: se il cron e un utente lanciano la generazione insieme, solo uno
                    // riesce a spostare la data e genera l'ordine (niente ordini doppi).
                    const daysToAdd = schedule.frequencyDays > 0 ? schedule.frequencyDays : 30; // dati errati non devono creare cicli infiniti
                    const claimed = await tx.preventiveSchedule.updateMany({
                        where: { id: schedule.id, triggerType: "TIME", nextDueDate: { lte: today } },
                        data: { lastRunDate: today, nextDueDate: addDays(today, daysToAdd) },
                    });
                    if (claimed.count !== 1) return false;

                    const checklist = parseActivities(schedule.activities);
                    await tx.workOrder.create({
                        data: {
                            title: `[AUTO] ${schedule.taskTitle}`,
                            description: `${schedule.description}\n\nGenerated from Preventive Schedule: ${schedule.frequency}`,
                            priority: "MEDIUM", // Default for routine
                            type: "ROUTINE",
                            category: "OTHER", // Adjusted from PREVENTIVE, as it's not in the WorkOrderCategory enum
                            status: "OPEN",
                            assetId: schedule.assetId,
                            plantId: schedule.asset?.plantId ?? null,
                            dueDate: addDays(today, 7), // Give 1 week to complete by default
                            originScheduleId: schedule.id,
                            checklist: checklist.length > 0 ? { create: checklist.map(label => ({ label, completed: false })) } : undefined,
                        },
                    });
                    return true;
                });
                if (!created) continue; // gia' generato da un'altra esecuzione
                generatedCount++;
            } catch (err: any) {
                console.error(`Error processing schedule ${schedule.id}:`, err);
                errors.push(`Schedule ${schedule.id}: ${err.message}`);
            }
        }

        // 3. Piani a consumo di un contatore (ore di funzionamento, cicli, kWh...)
        let meterGenerated = 0;
        try {
            const meterSchedules = await prisma.preventiveSchedule.findMany({
                where: { triggerType: "METER", meterId: { not: null } },
                take: 500,
                include: { asset: true, meter: true },
            });
            meterGenerated = (await processMeterSchedules(meterSchedules, today, errors)).count;
        } catch (err: any) {
            console.error("Error processing meter schedules:", err);
            errors.push(`Piani a consumo: ${err.message}`);
        }
        generatedCount += meterGenerated;

        if (generatedCount === 0 && errors.length === 0) {
            return { success: true, count: 0, message: "No schedules due." };
        }

        return {
            success: true,
            count: generatedCount,
            errors: errors.length > 0 ? errors : undefined,
        };

    } catch (error: any) {
        console.error("Scheduler Fatal Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Subito dopo una nuova lettura: valuta solo i piani a consumo di quel contatore. Se serve genera l'ordine e aggiorna la stima.
 * Non lancia mai: un errore qui non deve bloccare la registrazione della lettura.
 */
export async function checkMeterPlansNow(meterId: string): Promise<{ generated: number; errors?: string[] }> {
    try {
        if (!meterId) return { generated: 0 };
        const now = new Date();
        const schedules = await prisma.preventiveSchedule.findMany({
            where: { triggerType: "METER", meterId },
            include: { asset: true, meter: true },
        });
        if (schedules.length === 0) return { generated: 0 };
        const errors: string[] = [];
        const { count, assetIds } = await processMeterSchedules(schedules, now, errors);
        for (const assetId of new Set(assetIds)) await safeRefreshAssetHealth(assetId);
        return { generated: count, errors: errors.length > 0 ? errors : undefined };
    } catch (error: any) {
        console.error("checkMeterPlansNow error:", error);
        return { generated: 0, errors: [String(error?.message ?? error)] };
    }
}
