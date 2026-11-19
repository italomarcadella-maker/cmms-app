
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { parseActivities } from "@/modules/maintenance/domain/checklist";

export async function checkAndGeneratePreventiveWorkOrders() {
    try {
        const today = new Date();

        // 1. Find all schedules due
        const dueSchedules = await prisma.preventiveSchedule.findMany({
            where: {
                nextDueDate: {
                    lte: today,
                },
            },
            take: 50, // Batch limit to prevent timeouts
            include: {
                asset: true,
            },
        });

        if (dueSchedules.length === 0) {
            return { success: true, count: 0, message: "No schedules due." };
        }

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
                        where: { id: schedule.id, nextDueDate: { lte: today } },
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
