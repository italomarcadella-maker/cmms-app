'use server';

import { OPERATIVE } from '@/lib/roles';
import { requireLogin, requireRole } from '@/lib/auth-guard';
import { addDays } from 'date-fns';
import type { Prisma } from '@prisma/client';
import { loadMeterReadings } from '@/lib/meter-usage';
import { defaultUnit, meterTypeLabel } from '@/modules/energy/domain/meter-types';
import {
    cleanLegalText,
    computeUsageStatus,
    dueDateForUsage,
    isValidInterval,
    normalizeTriggerType,
    placeholderDueDate,
    sortReadings,
    type TriggerType,
} from '../../domain/usage-triggers';
import { revalidateWorkOrders } from '@/lib/actions';
import { revalidatePath } from 'next/cache';
import { ServiceLocator } from '@/modules/shared/infrastructure/registry/service-locator';
import { PrismaScheduleRepository } from '../db/prisma-schedule-repository';
import { PrismaWorkOrderRepository } from '../db/prisma-work-order-repository';
import { PreventiveSchedule } from '../../domain/entities/preventive-schedule';
import { WorkOrder } from '../../domain/entities/work-order';
import { auth } from '@/auth';
import { assignWorkOrder } from './work-order-actions';
import { prisma } from '@/lib/prisma';
import { safeRefreshAssetHealth } from '@/lib/asset-health-sync';

try {
    ServiceLocator.resolve('IScheduleRepository');
} catch {
    ServiceLocator.register('IScheduleRepository', new PrismaScheduleRepository());
}
try {
    ServiceLocator.resolve('IWorkOrderRepository');
} catch {
    ServiceLocator.register('IWorkOrderRepository', new PrismaWorkOrderRepository());
}

const getSchedRepo = () => ServiceLocator.resolve<PrismaScheduleRepository>('IScheduleRepository');
const getWORepo = () => ServiceLocator.resolve<PrismaWorkOrderRepository>('IWorkOrderRepository');

export async function createWorkOrderFromSchedule(scheduleId: string, date: Date, technicianId?: string) {
    const __guard = await requireRole(OPERATIVE);
    if (!__guard.authorized) return { success: false, message: __guard.message ?? 'Non autorizzato' };
    try {
        const schedRepo = getSchedRepo();
        const woRepo = getWORepo();

        const schedule = await schedRepo.findById(scheduleId);
        if (!schedule) return { success: false, message: "Schedulazione non trovata" };

        let checklistCreate: any[] = [];
        try {
            const activities = schedule.activities ? JSON.parse(schedule.activities) : [];
            if (Array.isArray(activities)) {
                checklistCreate = activities.map((a: any) => ({
                    label: typeof a === 'string' ? a : a.label || "Attività",
                    completed: false
                }));
            }
        } catch (e) {
            console.error("Error parsing schedule activities", e);
        }

        const newWo = await prisma.workOrder.create({
            data: {
                title: schedule.taskTitle,
                description: schedule.description,
                assetId: schedule.assetId,
                priority: 'MEDIUM',
                category: 'OTHER',
                // Manutenzione programmata, non un guasto: senza questo l'ordine contava come guasto (valore predefinito) nei KPI e nell'MTBF
                type: 'ROUTINE',
                // Legame con il piano di origine: al completamento il piano riparte dalla data reale di esecuzione
                originScheduleId: scheduleId,
                status: 'OPEN',
                assignedTo: 'Unassigned',
                dueDate: date,
                checklist: {
                    create: checklistCreate
                }
            }
        });

        // Run the schedule instance to update nextDueDate
        const schedEntity = new PreventiveSchedule(schedule.toJSON());
        schedEntity.run(new Date());
        await schedRepo.save(schedEntity);
        await safeRefreshAssetHealth(schedule.assetId);

        // Il tecnico indicato, altrimenti quello gia' assegnato alla schedulazione (e' un utente: si cerca il suo profilo tecnico)
        let techToAssign = technicianId;
        if (!techToAssign) {
            const sched = await prisma.preventiveSchedule.findUnique({ where: { id: scheduleId }, select: { assignedToId: true } });
            if (sched?.assignedToId) {
                const profile = await prisma.technician.findFirst({ where: { userId: sched.assignedToId }, select: { id: true } });
                techToAssign = profile?.id;
            }
        }
        if (techToAssign) {
            await assignWorkOrder(newWo.id, techToAssign, date);
        }

        revalidatePath('/planning/calendar');
        revalidatePath('/');
        revalidateWorkOrders();
        return { success: true, message: "Ordine creato da schedulazione", id: newWo.id };
    } catch (error) {
        console.error("Error creating WO from Schedule:", error);
        return { success: false, message: "Errore creazione ordine" };
    }
}

export async function getPreventiveSchedules() {
    const session = await auth();
    if (!session?.user) return [];
    try {
        const prismaSchedules = await prisma.preventiveSchedule.findMany({
            include: { asset: { select: { name: true, line: true } } },
            orderBy: { nextDueDate: 'asc' }
        });
        return prismaSchedules.map(s => ({
            ...s,
            assetName: s.asset.name,
            assetLine: s.asset.line,
            activities: s.activities ? JSON.parse(s.activities) : [],
            lastRunDate: s.lastRunDate ? s.lastRunDate.toISOString() : null,
            nextDueDate: s.nextDueDate.toISOString()
        }));
    } catch (error) {
        console.error('[schedule-actions]', error);
        return [];
    }
}

export async function getAssetSchedules(assetId: string) {
    try {
        const prismaSchedules = await prisma.preventiveSchedule.findMany({
            where: { assetId },
            include: { asset: { select: { name: true, line: true } } },
            orderBy: { nextDueDate: 'asc' }
        });
        return prismaSchedules.map(s => ({
            ...s,
            assetName: s.asset.name,
            assetLine: s.asset.line,
            activities: s.activities ? JSON.parse(s.activities) : [],
            lastRunDate: s.lastRunDate ? s.lastRunDate.toISOString() : null,
            nextDueDate: s.nextDueDate.toISOString()
        }));
    } catch (error) {
        console.error('[schedule-actions]', error);
        return [];
    }
}

// --- Piani a consumo e verifiche di legge ---

interface PlanSettingsInput {
    triggerType?: string;
    meterId?: string | null;
    meterInterval?: number | null;
    isRegulatory?: boolean;
    legalReference?: string | null;
    authority?: string | null;
}

interface ResolvedPlanSettings {
    triggerType: TriggerType;
    meterId: string | null;
    meterInterval: number | null;
    isRegulatory: boolean;
    legalReference: string | null;
    authority: string | null;
}

/**
 * Controlla e pulisce i campi dei piani a consumo e di legge. Il contatore deve esistere ed essere visibile all'utente
 * (la lettura passa dal filtro per stabilimento) e appartenere allo stesso stabilimento dell'asset; l'intervallo deve essere > 0.
 */
async function resolvePlanSettings(
    asset: { plantId: string | null },
    input: PlanSettingsInput
): Promise<{ ok: true; settings: ResolvedPlanSettings } | { ok: false; message: string }> {
    const triggerType = normalizeTriggerType(input.triggerType);
    const isRegulatory = input.isRegulatory === true;
    const common = {
        isRegulatory,
        legalReference: isRegulatory ? cleanLegalText(input.legalReference) : null,
        authority: isRegulatory ? cleanLegalText(input.authority) : null,
    };
    if (triggerType === 'TIME') {
        return { ok: true, settings: { triggerType, meterId: null, meterInterval: null, ...common } };
    }

    if (typeof input.meterId !== 'string' || !input.meterId) return { ok: false, message: 'Scegli il contatore del piano a consumo' };
    const interval = Number(input.meterInterval);
    if (!isValidInterval(interval)) return { ok: false, message: 'L\'intervallo deve essere un numero maggiore di zero' };
    const meter = await prisma.meter.findUnique({ where: { id: input.meterId }, select: { id: true, plantId: true } });
    if (!meter) return { ok: false, message: 'Contatore non trovato' };
    if ((meter.plantId ?? null) !== (asset.plantId ?? null)) return { ok: false, message: 'Il contatore deve appartenere allo stesso stabilimento dell\'asset' };
    return { ok: true, settings: { triggerType, meterId: meter.id, meterInterval: interval, ...common } };
}

/** Base di un piano a consumo appena creato o riassegnato: ultima lettura del contatore (null se non ce ne sono) e scadenza iniziale. */
async function initialMeterBaseline(meterId: string, interval: number, now: Date): Promise<{ lastMeterValue: number | null; nextDueDate: Date }> {
    const readings = (await loadMeterReadings([meterId])).get(meterId) ?? [];
    const sorted = sortReadings(readings);
    if (sorted.length === 0) return { lastMeterValue: null, nextDueDate: placeholderDueDate(now) };
    const lastMeterValue = sorted[sorted.length - 1].value;
    const status = computeUsageStatus({ interval, lastMeterValue }, readings);
    return { lastMeterValue, nextDueDate: dueDateForUsage(status, now) };
}

/** Contatori tra cui scegliere per un piano a consumo: quelli dello stabilimento dell'asset (prima quelli legati all'asset), con l'ultima lettura. */
export async function getMetersForSchedule(assetId: string) {
    const guard = await requireLogin();
    if (!guard.authorized) return [];
    try {
        const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true, plantId: true } });
        if (!asset) return [];
        const meters = await prisma.meter.findMany({
            where: { plantId: asset.plantId ?? null },
            select: {
                id: true, name: true, type: true, unit: true, assetId: true,
                readings: { orderBy: { date: 'desc' }, take: 1, select: { value: true, date: true } },
            },
            orderBy: { name: 'asc' },
        });
        return meters
            .map(m => ({
                id: m.id,
                name: m.name,
                type: m.type,
                typeLabel: meterTypeLabel(m.type),
                unit: m.unit || defaultUnit(m.type),
                ofAsset: m.assetId === asset.id,
                lastValue: m.readings[0]?.value ?? null,
                lastDate: m.readings[0] ? m.readings[0].date.toISOString() : null,
            }))
            .sort((a, b) => Number(b.ofAsset) - Number(a.ofAsset) || a.name.localeCompare(b.name, 'it'));
    } catch (error) {
        console.error('[schedule-actions] getMetersForSchedule', error);
        return [];
    }
}

export async function createPreventiveSchedule(data: {
    title: string;
    description: string;
    assetId: string;
    frequency: string;
    frequencyDays: number;
    activities: any[];
    firstDate: Date;
    triggerType?: string;
    meterId?: string | null;
    meterInterval?: number | null;
    isRegulatory?: boolean;
    legalReference?: string | null;
    authority?: string | null;
}) {
    const __guard = await requireRole(['ADMIN', 'PLANT_MANAGER']);
    if (!__guard.authorized) return { success: false, message: __guard.message ?? 'Non autorizzato' };

    try {
        const title = typeof data.title === 'string' ? data.title.trim() : '';
        if (!title) return { success: false, message: 'Indica il nome del piano' };
        if (typeof data.assetId !== 'string' || !data.assetId) return { success: false, message: 'Asset non valido' };
        // La lettura passa dal filtro per stabilimento: un asset fuori dal proprio non si trova
        const asset = await prisma.asset.findUnique({ where: { id: data.assetId }, select: { id: true, plantId: true } });
        if (!asset) return { success: false, message: 'Asset non trovato' };

        const resolved = await resolvePlanSettings(asset, data);
        if (!resolved.ok) return { success: false, message: resolved.message };
        const s = resolved.settings;
        const now = new Date();

        let nextDueDate: Date;
        let lastMeterValue: number | null = null;
        let frequency = data.frequency;
        let frequencyDays = data.frequencyDays;
        if (s.triggerType === 'METER') {
            const base = await initialMeterBaseline(s.meterId as string, s.meterInterval as number, now);
            nextDueDate = base.nextDueDate;
            lastMeterValue = base.lastMeterValue;
            frequency = 'METER';
            frequencyDays = 30; // non usata dai piani a consumo
        } else {
            nextDueDate = new Date(data.firstDate);
            if (Number.isNaN(nextDueDate.getTime())) return { success: false, message: 'Data della prima esecuzione non valida' };
        }

        await prisma.preventiveSchedule.create({
            data: {
                taskTitle: title,
                description: typeof data.description === 'string' ? data.description : '',
                assetId: asset.id,
                frequency: frequency || 'MONTHLY',
                frequencyDays: Number.isFinite(frequencyDays) && frequencyDays > 0 ? Math.floor(frequencyDays) : 30,
                activities: JSON.stringify(Array.isArray(data.activities) ? data.activities : []),
                nextDueDate,
                triggerType: s.triggerType,
                meterId: s.meterId,
                meterInterval: s.meterInterval,
                lastMeterValue,
                isRegulatory: s.isRegulatory,
                legalReference: s.legalReference,
                authority: s.authority,
            },
        });
        await safeRefreshAssetHealth(asset.id);
        revalidatePath('/maintenance/schedule');
        revalidatePath('/maintenance/regulatory');
        return { success: true, message: 'Schedulazione creata con successo' };
    } catch (error) {
        console.error("Create Sched Error:", error);
        return { success: false, message: 'Errore creazione schedulazione' };
    }
}

/**
 * Modifica il tipo di innesco, il contatore, l'intervallo e i dati di legge di un piano. I campi non indicati restano come sono.
 * Cambiando contatore la base riparte dall'ultima lettura del nuovo contatore.
 */
export async function updatePreventiveScheduleSettings(id: string, data: PlanSettingsInput) {
    const __guard = await requireRole(['ADMIN', 'PLANT_MANAGER']);
    if (!__guard.authorized) return { success: false, message: __guard.message ?? 'Non autorizzato' };

    try {
        const current = await prisma.preventiveSchedule.findUnique({ where: { id }, include: { asset: { select: { id: true, plantId: true } } } });
        if (!current) return { success: false, message: 'Schedulazione non trovata' };

        const merged: PlanSettingsInput = {
            triggerType: data.triggerType ?? current.triggerType,
            meterId: data.meterId !== undefined ? data.meterId : current.meterId,
            meterInterval: data.meterInterval !== undefined ? data.meterInterval : current.meterInterval,
            isRegulatory: data.isRegulatory !== undefined ? data.isRegulatory : current.isRegulatory,
            legalReference: data.legalReference !== undefined ? data.legalReference : current.legalReference,
            authority: data.authority !== undefined ? data.authority : current.authority,
        };
        const resolved = await resolvePlanSettings(current.asset, merged);
        if (!resolved.ok) return { success: false, message: resolved.message };
        const s = resolved.settings;
        const now = new Date();

        const update: Prisma.PreventiveScheduleUncheckedUpdateInput = {
            triggerType: s.triggerType,
            meterId: s.meterId,
            meterInterval: s.meterInterval,
            isRegulatory: s.isRegulatory,
            legalReference: s.legalReference,
            authority: s.authority,
        };
        if (s.triggerType === 'METER') {
            if (current.triggerType !== 'METER' || current.meterId !== s.meterId) {
                const base = await initialMeterBaseline(s.meterId as string, s.meterInterval as number, now);
                update.lastMeterValue = base.lastMeterValue;
                update.nextDueDate = base.nextDueDate;
            }
            update.frequency = 'METER';
        } else if (current.triggerType === 'METER') {
            // Torna a scadenza di tempo: la scadenza segnaposto non e' piu' valida
            update.lastMeterValue = null;
            update.frequency = 'MONTHLY';
            update.nextDueDate = addDays(now, current.frequencyDays > 0 ? current.frequencyDays : 30);
        }

        await prisma.preventiveSchedule.update({ where: { id }, data: update });
        await safeRefreshAssetHealth(current.assetId);
        revalidatePath('/maintenance/schedule');
        revalidatePath('/maintenance/regulatory');
        return { success: true, message: 'Piano aggiornato' };
    } catch (error) {
        console.error('[schedule-actions]', error);
        return { success: false, message: 'Errore aggiornamento piano' };
    }
}

export async function deletePreventiveSchedule(id: string) {
    const __guard = await requireRole(['ADMIN', 'PLANT_MANAGER']);
    if (!__guard.authorized) return { success: false, message: __guard.message ?? 'Non autorizzato' };
    try {
        const schedRepo = getSchedRepo();
        const doomed = await schedRepo.findById(id);
        await schedRepo.delete(id);
        await safeRefreshAssetHealth(doomed?.assetId);
        revalidatePath('/maintenance/schedule');
        return { success: true, message: 'Schedulazione eliminata con successo' };
    } catch (error) {
        console.error('[schedule-actions]', error);
        return { success: false, message: 'Errore eliminazione' };
    }
}

export async function updatePreventiveSchedule(id: string, nextDueDate: Date) {
    const __guard = await requireRole(['ADMIN', 'PLANT_MANAGER']);
    if (!__guard.authorized) return { success: false, message: __guard.message ?? 'Non autorizzato' };

    try {
        const schedRepo = getSchedRepo();
        const schedule = await schedRepo.findById(id);
        if (!schedule) return { success: false, message: "Schedulazione non trovata" };

        const updated = new PreventiveSchedule({
            ...schedule.toJSON(),
            nextDueDate
        });
        await schedRepo.save(updated);
        await safeRefreshAssetHealth(schedule.assetId);

        revalidatePath('/maintenance/schedule');
        revalidatePath('/maintenance');
        return { success: true, message: 'Data aggiornata' };
    } catch (error) {
        console.error('[schedule-actions]', error);
        return { success: false, message: 'Errore aggiornamento data' };
    }
}
