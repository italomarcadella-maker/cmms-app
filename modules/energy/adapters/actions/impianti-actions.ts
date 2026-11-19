'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/actions';
import { activityState, contractState, isInForce, type ActivityState } from '@/modules/maintenance/domain/contractors';
import { readingState, type ReadingState } from '../../domain/meter-types';

/**
 * Pagina Impianti: gli impianti tecnologici (asset di tipo "impianto", raggruppati per linea: aria compressa,
 * elettrico, acqua...) con stato, ordini aperti, manutenzioni, ditte esterne e contatori da leggere.
 */

const VIEWERS = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'MAINTAINER', 'PROCESS_ENGINEER'];
const PLANNERS = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'PROCESS_ENGINEER'];
const OPEN = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'ON_HOLD', 'PENDING_REVIEW'] as const;

export interface ImpiantoMeter {
    id: string;
    name: string;
    type: string;
    unit: string;
    location: string | null;
    assetId: string | null;
    lastValue: number | null;
    lastReadAt: string | null;
    frequencyDays: number | null;
    nextDue: string | null;
    assigneeName: string | null;
    state: ReadingState;
}

export interface Impianto {
    key: string;
    name: string;
    plantId: string | null;
    plantName: string | null;
    assets: { id: string; name: string; status: string; healthScore: number }[];
    avgHealth: number;
    offline: number;
    openOrders: number;
    overdueOrders: number;
    nextPm: { title: string; date: string } | null;
    contractors: { name: string; activity: string; nextDue: string; state: ActivityState }[];
    meters: ImpiantoMeter[];
}

export interface RoundItem extends ImpiantoMeter {
    impiantoName: string | null;
}

export interface ImpiantiOverview {
    impianti: Impianto[];
    looseMeters: ImpiantoMeter[];
    round: RoundItem[];
    kpis: { impianti: number; readingsDue: number; openOrders: number; contractorOverdue: number };
    canPlan: boolean;
    facilityAssets: { id: string; name: string }[];
}

export async function getImpiantiOverview(): Promise<ImpiantiOverview> {
    const { authorized, session } = await requireRole(VIEWERS);
    const empty: ImpiantiOverview = { impianti: [], looseMeters: [], round: [], kpis: { impianti: 0, readingsDue: 0, openOrders: 0, contractorOverdue: 0 }, canPlan: false, facilityAssets: [] };
    if (!authorized) return empty;

    const now = new Date();
    const assets = await prisma.asset.findMany({
        where: { type: 'FACILITY' },
        select: { id: true, name: true, line: true, status: true, healthScore: true, plantId: true, plant: { select: { name: true } } },
        orderBy: { name: 'asc' },
    });
    const ids = assets.map(a => a.id);

    const [meters, openByAsset, overdueByAsset, schedules, contractorActs] = await Promise.all([
        prisma.meter.findMany({
            select: {
                id: true, name: true, type: true, unit: true, location: true, assetId: true,
                readingFrequencyDays: true, nextReadingDue: true, readingAssigneeId: true,
                readings: { orderBy: { date: 'desc' }, take: 1, select: { value: true, date: true } },
            },
            orderBy: { name: 'asc' },
        }),
        ids.length ? prisma.workOrder.groupBy({ by: ['assetId'], where: { assetId: { in: ids }, status: { in: [...OPEN] } }, _count: { _all: true } }) : Promise.resolve([]),
        ids.length ? prisma.workOrder.groupBy({ by: ['assetId'], where: { assetId: { in: ids }, status: { in: [...OPEN] }, dueDate: { lt: now } }, _count: { _all: true } }) : Promise.resolve([]),
        ids.length ? prisma.preventiveSchedule.findMany({ where: { assetId: { in: ids } }, orderBy: { nextDueDate: 'asc' }, select: { assetId: true, taskTitle: true, nextDueDate: true } }) : Promise.resolve([]),
        ids.length ? prisma.contractorActivity.findMany({
            where: { assetId: { in: ids }, isActive: true, contract: { status: 'ACTIVE' } },
            select: {
                assetId: true, title: true, nextDueDate: true, isActive: true,
                contract: { select: { status: true, startDate: true, endDate: true, renewalNoticeDays: true, contractor: { select: { name: true } } } },
            },
        }) : Promise.resolve([]),
    ]);

    const userIds = [...new Set(meters.map(m => m.readingAssigneeId).filter((x): x is string => !!x))];
    const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
    const userName = new Map(users.map(u => [u.id, u.name ?? 'Utente']));

    const toMeter = (m: (typeof meters)[number]): ImpiantoMeter => {
        const last = m.readings[0];
        return {
            id: m.id, name: m.name, type: m.type, unit: m.unit, location: m.location, assetId: m.assetId,
            lastValue: last ? last.value : null, lastReadAt: last ? last.date.toISOString() : null,
            frequencyDays: m.readingFrequencyDays, nextDue: m.nextReadingDue ? m.nextReadingDue.toISOString() : null,
            assigneeName: m.readingAssigneeId ? userName.get(m.readingAssigneeId) ?? 'Utente' : null,
            state: readingState(m.nextReadingDue, now),
        };
    };
    const allMeters = meters.map(toMeter);

    // Un impianto = gli asset di tipo impianto con la stessa linea (es. "Aria compressa"), altrimenti il singolo asset
    const groups = new Map<string, typeof assets>();
    for (const a of assets) {
        const label = (a.line?.trim() || a.name).toLowerCase();
        const key = `${a.plantId ?? ''}|${label}`;
        groups.set(key, [...(groups.get(key) ?? []), a]);
    }

    const count = (rows: { assetId: string; _count: { _all: number } }[], assetIds: string[]) =>
        rows.filter(r => assetIds.includes(r.assetId)).reduce((s, r) => s + r._count._all, 0);

    const impianti: Impianto[] = [...groups.entries()].map(([key, list]) => {
        const assetIds = list.map(a => a.id);
        const pm = schedules.find(s => assetIds.includes(s.assetId));
        return {
            key,
            name: list[0].line?.trim() || list[0].name,
            plantId: list[0].plantId,
            plantName: list[0].plant?.name ?? null,
            assets: list.map(a => ({ id: a.id, name: a.name, status: a.status, healthScore: a.healthScore })),
            avgHealth: Math.round(list.reduce((s, a) => s + a.healthScore, 0) / list.length),
            offline: list.filter(a => a.status === 'OFFLINE').length,
            openOrders: count(openByAsset as never, assetIds),
            overdueOrders: count(overdueByAsset as never, assetIds),
            nextPm: pm ? { title: pm.taskTitle, date: pm.nextDueDate.toISOString() } : null,
            contractors: contractorActs
                .filter(c => c.assetId && assetIds.includes(c.assetId) && isInForce(contractState(c.contract, now)))
                .map(c => ({ name: c.contract.contractor.name, activity: c.title, nextDue: c.nextDueDate.toISOString(), state: activityState(c, now) })),
            meters: allMeters.filter(m => m.assetId && assetIds.includes(m.assetId)),
        };
    });

    const impiantoOfAsset = new Map<string, string>();
    for (const i of impianti) for (const a of i.assets) impiantoOfAsset.set(a.id, i.name);

    const round: RoundItem[] = allMeters
        .filter(m => m.state === 'LATE' || m.state === 'TODAY')
        .sort((a, b) => (a.nextDue ?? '').localeCompare(b.nextDue ?? ''))
        .map(m => ({ ...m, impiantoName: m.assetId ? impiantoOfAsset.get(m.assetId) ?? null : null }));

    return {
        impianti,
        looseMeters: allMeters.filter(m => !m.assetId || !impiantoOfAsset.has(m.assetId)),
        round,
        kpis: {
            impianti: impianti.length,
            readingsDue: round.length,
            openOrders: impianti.reduce((s, i) => s + i.openOrders, 0),
            contractorOverdue: impianti.reduce((s, i) => s + i.contractors.filter(c => c.state === 'OVERDUE').length, 0),
        },
        canPlan: PLANNERS.includes(session.user.role),
        facilityAssets: assets.map(a => ({ id: a.id, name: a.name })),
    };
}

/** Collega un contatore a un impianto (asset), o lo scollega con assetId = null. */
export async function setMeterAsset(meterId: string, assetId: string | null) {
    const { authorized, message } = await requireRole(PLANNERS);
    if (!authorized) return { success: false, message: message ?? 'Non autorizzato' };
    const meter = await prisma.meter.findUnique({ where: { id: meterId }, select: { id: true, plantId: true } }); // filtrato per plant
    if (!meter) return { success: false, message: 'Contatore non trovato.' };
    if (assetId) {
        const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { plantId: true } });
        if (!asset) return { success: false, message: 'Impianto non trovato.' };
        if (asset.plantId && meter.plantId && asset.plantId !== meter.plantId) return { success: false, message: 'L\'impianto appartiene a un altro stabilimento.' };
    }
    await prisma.meter.update({ where: { id: meterId }, data: { assetId } });
    revalidatePath('/impianti');
    return { success: true, message: assetId ? 'Contatore collegato all\'impianto.' : 'Contatore scollegato.' };
}
