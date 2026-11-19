'use server';

import { prisma } from '@/lib/prisma';
import { requireLogin } from '@/lib/auth-guard';
import { getEffectiveSettings } from '@/lib/actions';
import { getMaintainerIdentity, scopeWorkOrderWhere } from '@/lib/maintainer-scope';
import {
    CLOSED_STATUSES,
    FALLBACK_LABOR_RATE,
    HISTORY_PAGE_SIZE,
    computeReliability,
    findStoppingFault,
    normalizeHistoryKind,
    normalizeHistoryPage,
    planDaysOverdue,
    planStatus,
    type HistoryKind,
    type OpenFault,
    type PlanStatus,
    type ReliabilityIndicators,
} from '../../domain/asset-reliability';

/**
 * Legame tra asset, guasti e piani di manutenzione, per la scheda dell'asset.
 * Le stesse letture che gia' vede chiunque apra la scheda (qualsiasi utente connesso, nei limiti del proprio stabilimento).
 * Un manutentore vede solo gli ordini che lo riguardano (lib/maintainer-scope.ts): anche gli indicatori sono calcolati
 * soltanto su quelli, e `restricted` lo segnala all'interfaccia.
 */

export interface AssetPlanInfo {
    id: string;
    taskTitle: string;
    frequency: string;
    frequencyDays: number;
    lastRunDate: string | null;
    nextDueDate: string;
    status: PlanStatus;
    daysOverdue: number;
    /** Ordini nati da questo piano (quelli visibili all'utente). */
    generatedCount: number;
    lastOrder: { id: string; createdAt: string; status: string } | null;
}

export interface AssetReliability {
    success: boolean;
    message?: string;
    /** Vero per un manutentore: indicatori e conteggi riguardano solo gli ordini che puo' vedere. */
    restricted: boolean;
    indicators: ReliabilityIndicators;
    openFaults: OpenFault[];
    stoppedByFault: boolean;
    stoppingFault: OpenFault | null;
    closedFaultsWithoutAnalysis: number;
    plans: AssetPlanInfo[];
    hasPlan: boolean;
}

const EMPTY_INDICATORS: ReliabilityIndicators = {
    faultsLast12Months: 0,
    faultsTotal: 0,
    mtbfDays: null,
    mttrHours: null,
    faultsWithHours: 0,
    daysSinceLastFault: null,
    lastFaultAt: null,
    totalCost: 0,
};

function emptyReliability(message: string): AssetReliability {
    return {
        success: false,
        message,
        restricted: false,
        indicators: EMPTY_INDICATORS,
        openFaults: [],
        stoppedByFault: false,
        stoppingFault: null,
        closedFaultsWithoutAnalysis: 0,
        plans: [],
        hasPlan: false,
    };
}

export async function getAssetReliability(assetId: string): Promise<AssetReliability> {
    const guard = await requireLogin();
    if (!guard.authorized) return emptyReliability(guard.message ?? 'Non autorizzato');
    if (typeof assetId !== 'string' || !assetId) return emptyReliability('Asset non valido');

    try {
        // La lettura dell'asset passa dal filtro per stabilimento: fuori dal proprio non si vede nulla
        const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true, plantId: true } });
        if (!asset) return emptyReliability('Asset non trovato');

        const restricted = !!(await getMaintainerIdentity());

        const [closedFaults, openFaultRows, schedules] = await Promise.all([
            prisma.workOrder.findMany({
                where: await scopeWorkOrderWhere({ assetId, type: 'FAULT', status: { in: [...CLOSED_STATUSES] } }),
                select: {
                    createdAt: true,
                    laborLogs: { select: { hours: true, technicianId: true } },
                    partsUsed: { select: { quantity: true, unitCost: true } },
                    ewo: { select: { id: true } },
                },
            }),
            prisma.workOrder.findMany({
                where: await scopeWorkOrderWhere({ assetId, type: 'FAULT', status: { notIn: ['COMPLETED', 'CLOSED', 'CANCELED'] } }),
                select: { id: true, title: true, priority: true, status: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
            }),
            prisma.preventiveSchedule.findMany({
                where: { assetId },
                select: { id: true, taskTitle: true, frequency: true, frequencyDays: true, lastRunDate: true, nextDueDate: true },
                orderBy: { nextDueDate: 'asc' },
            }),
        ]);

        // Tariffe: del tecnico se > 0, altrimenti quella predefinita dello stabilimento dell'asset (come nella dashboard)
        const techIds = Array.from(new Set(closedFaults.flatMap(f => f.laborLogs.map(l => l.technicianId)).filter((id): id is string => !!id)));
        const [technicians, settings] = await Promise.all([
            techIds.length ? prisma.technician.findMany({ where: { id: { in: techIds } }, select: { id: true, hourlyRate: true } }) : Promise.resolve([]),
            getEffectiveSettings(asset.plantId ?? null),
        ]);
        const rates = new Map<string, number>(technicians.map(t => [t.id, t.hourlyRate]));
        const defaultRate = settings?.defaultLaborHourlyRate ?? FALLBACK_LABOR_RATE;

        const now = new Date();
        const indicators = computeReliability(closedFaults, rates, defaultRate, now);

        const openFaults: OpenFault[] = openFaultRows.map(f => ({
            id: f.id,
            title: f.title,
            priority: String(f.priority),
            status: String(f.status),
            createdAt: f.createdAt.toISOString(),
        }));
        const stoppingFault = findStoppingFault(openFaults);

        // Ordini nati dai piani (per quanti sono e per l'ultimo)
        const scheduleIds = schedules.map(s => s.id);
        const generated = scheduleIds.length
            ? await prisma.workOrder.findMany({
                where: await scopeWorkOrderWhere({ assetId, originScheduleId: { in: scheduleIds } }),
                select: { id: true, originScheduleId: true, createdAt: true, status: true },
                orderBy: { createdAt: 'desc' },
            })
            : [];
        const bySchedule = new Map<string, { count: number; last: { id: string; createdAt: string; status: string } }>();
        for (const wo of generated) {
            if (!wo.originScheduleId) continue;
            const entry = bySchedule.get(wo.originScheduleId);
            if (entry) entry.count++;
            else bySchedule.set(wo.originScheduleId, { count: 1, last: { id: wo.id, createdAt: wo.createdAt.toISOString(), status: String(wo.status) } });
        }

        const plans: AssetPlanInfo[] = schedules.map(s => {
            const g = bySchedule.get(s.id);
            return {
                id: s.id,
                taskTitle: s.taskTitle,
                frequency: s.frequency,
                frequencyDays: s.frequencyDays,
                lastRunDate: s.lastRunDate ? s.lastRunDate.toISOString() : null,
                nextDueDate: s.nextDueDate.toISOString(),
                status: planStatus(s.nextDueDate, now),
                daysOverdue: planDaysOverdue(s.nextDueDate, now),
                generatedCount: g?.count ?? 0,
                lastOrder: g?.last ?? null,
            };
        });

        return {
            success: true,
            restricted,
            indicators,
            openFaults,
            stoppedByFault: stoppingFault !== null,
            stoppingFault,
            closedFaultsWithoutAnalysis: closedFaults.filter(f => !f.ewo).length,
            plans,
            hasPlan: plans.length > 0,
        };
    } catch (error) {
        console.error('[asset-reliability] getAssetReliability', error);
        return emptyReliability('Errore nel calcolo degli indicatori');
    }
}

// --- Storico completo ---

export interface AssetHistoryItem {
    id: string;
    type: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    dueDate: string | null;
    assignee: string | null;
    link: string;
}

export interface AssetHistoryPage {
    success: boolean;
    message?: string;
    items: AssetHistoryItem[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

/**
 * Storico di tutti gli ordini dell'asset, senza limite di data, dal piu' recente. 25 per pagina.
 * `kind`: ALL, FAULT (guasti), ROUTINE (manutenzione programmata), REQUEST (richieste).
 */
export async function getAssetHistory(assetId: string, opts: { kind?: HistoryKind; page?: number } = {}): Promise<AssetHistoryPage> {
    const kind = normalizeHistoryKind(opts.kind);
    const page = normalizeHistoryPage(opts.page);
    const empty: AssetHistoryPage = { success: false, items: [], total: 0, page, pageSize: HISTORY_PAGE_SIZE, hasMore: false };

    const guard = await requireLogin();
    if (!guard.authorized) return { ...empty, message: guard.message ?? 'Non autorizzato' };
    if (typeof assetId !== 'string' || !assetId) return { ...empty, message: 'Asset non valido' };

    try {
        const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true } });
        if (!asset) return { ...empty, message: 'Asset non trovato' };

        const where = await scopeWorkOrderWhere({ assetId, ...(kind === 'ALL' ? {} : { type: kind }) });
        const [total, rows] = await Promise.all([
            prisma.workOrder.count({ where }),
            prisma.workOrder.findMany({
                where,
                select: {
                    id: true,
                    type: true,
                    title: true,
                    status: true,
                    priority: true,
                    createdAt: true,
                    dueDate: true,
                    assignedTo: true,
                    assignedTechnician: { select: { name: true } },
                },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * HISTORY_PAGE_SIZE,
                take: HISTORY_PAGE_SIZE,
            }),
        ]);

        const items: AssetHistoryItem[] = rows.map(r => {
            const free = r.assignedTo && r.assignedTo !== 'Unassigned' ? r.assignedTo : null;
            return {
                id: r.id,
                type: String(r.type),
                title: r.title,
                status: String(r.status),
                priority: String(r.priority),
                createdAt: r.createdAt.toISOString(),
                dueDate: r.dueDate ? r.dueDate.toISOString() : null,
                assignee: r.assignedTechnician?.name ?? free,
                link: `/work-orders/${r.id}`,
            };
        });

        return { success: true, items, total, page, pageSize: HISTORY_PAGE_SIZE, hasMore: page * HISTORY_PAGE_SIZE < total };
    } catch (error) {
        console.error('[asset-reliability] getAssetHistory', error);
        return { ...empty, message: 'Errore nel caricamento dello storico' };
    }
}

/**
 * Per la lista asset: id degli asset con un guasto aperto che li ferma (priorita' STOPPED). Una sola query raggruppata.
 * Un manutentore vede solo i guasti che lo riguardano.
 */
export async function getAssetsStoppedByFault(): Promise<string[]> {
    const guard = await requireLogin();
    if (!guard.authorized) return [];
    try {
        const rows = await prisma.workOrder.groupBy({
            by: ['assetId'],
            where: await scopeWorkOrderWhere({ type: 'FAULT', priority: 'STOPPED', status: { notIn: ['COMPLETED', 'CLOSED', 'CANCELED'] } }),
        });
        return rows.map(r => r.assetId);
    } catch (error) {
        console.error('[asset-reliability] getAssetsStoppedByFault', error);
        return [];
    }
}
