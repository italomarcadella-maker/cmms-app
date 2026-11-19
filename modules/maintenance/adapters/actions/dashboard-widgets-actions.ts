'use server';

import { addDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-guard';
import { getPlantScope, runUnscoped } from '@/lib/plant-scope';
import { DEFAULT_TIMEZONE, dayKeyInZone, shiftOf, type ShiftId } from '../../domain/shifts';
import { contractState, isInForce } from '../../domain/contractors';

/**
 * Dati per i widget della dashboard: guasti per reparto e turno, piano settimanale degli interventi.
 * Tutto passa dal filtro per stabilimento: ognuno vede i dati dei propri plant.
 */

const VIEWERS = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'MAINTAINER', 'PROCESS_ENGINEER'];

/** Fuso orario da usare: quello dello stabilimento se ne e' visibile uno solo, altrimenti Europa/Roma. */
async function currentTimezone(): Promise<string> {
    const scope = await getPlantScope();
    const single = scope.mode === 'plants' && scope.plantIds.length === 1 ? scope.plantIds[0] : null;
    if (!single) return DEFAULT_TIMEZONE;
    const plant = await runUnscoped(() => prisma.plant.findUnique({ where: { id: single }, select: { timezone: true } }));
    return plant?.timezone || DEFAULT_TIMEZONE;
}

// --- Guasti per reparto e turno ---

export interface DepartmentShiftRow {
    department: string;
    shifts: Record<ShiftId, number>;
    total: number;
    downtimeMin: number;
}

export interface FailuresByShift {
    success: boolean;
    days: number;
    timezone: string;
    rows: DepartmentShiftRow[];
    totals: Record<ShiftId, number>;
    totalFaults: number;
    /** Quante macchine non hanno il reparto indicato (finiscono in "Non indicato"). */
    withoutDepartment: number;
}

export async function getFailuresByDepartmentShift(days = 30): Promise<FailuresByShift> {
    const range = [7, 30, 90].includes(days) ? days : 30;
    const timezone = await currentTimezone();
    const emptyTotals = { MORNING: 0, AFTERNOON: 0, NIGHT: 0 } as Record<ShiftId, number>;
    const empty: FailuresByShift = { success: false, days: range, timezone, rows: [], totals: emptyTotals, totalFaults: 0, withoutDepartment: 0 };

    const { authorized } = await requireRole(VIEWERS);
    if (!authorized) return empty;

    const since = addDays(new Date(), -range);
    const faults = await prisma.workOrder.findMany({
        where: { type: 'FAULT', createdAt: { gte: since }, status: { not: 'CANCELED' } },
        select: {
            createdAt: true,
            asset: { select: { department: true } },
            ewo: { select: { totalDowntimeMin: true, downtimeStart: true } },
        },
    });

    const byDept = new Map<string, DepartmentShiftRow>();
    const totals = { ...emptyTotals };
    let withoutDepartment = 0;
    for (const f of faults) {
        const dept = f.asset?.department?.trim() || 'Non indicato';
        if (dept === 'Non indicato') withoutDepartment += 1;
        // Il turno e' quello in cui il guasto e' avvenuto: inizio del fermo se registrato, altrimenti l'apertura dell'ordine
        const shift = shiftOf(f.ewo?.downtimeStart ?? f.createdAt, timezone);
        const row = byDept.get(dept) ?? { department: dept, shifts: { ...emptyTotals }, total: 0, downtimeMin: 0 };
        row.shifts[shift] += 1;
        row.total += 1;
        row.downtimeMin += f.ewo?.totalDowntimeMin ?? 0;
        byDept.set(dept, row);
        totals[shift] += 1;
    }

    return {
        success: true,
        days: range,
        timezone,
        rows: [...byDept.values()].sort((a, b) => b.total - a.total),
        totals,
        totalFaults: faults.length,
        withoutDepartment,
    };
}

// --- Piano settimanale ---

/** Tipo di intervento, che nel calendario ha un colore: guasto (rosso), programmata (verde), ditta esterna (blu), lettura (giallo). */
export type WeekItemType = 'FAULT' | 'PROGRAMMED' | 'CONTRACTOR' | 'READING' | 'REQUEST';

export interface WeekItem {
    kind: 'WO' | 'PM' | 'READ' | 'CTR';
    type: WeekItemType;
    id: string;
    title: string;
    assetName: string;
    department: string | null;
    plantId: string | null;
    priority: string | null;
    status: string | null;
    assignees: string[];
    unassigned: boolean;
    href: string;
    /** Solo per le letture pianificate: unita' e ultimo valore, per inserire quello nuovo. */
    meter?: { unit: string; lastValue: number | null; lastReadAt: string | null };
}

export interface WeekDay {
    date: string; // AAAA-MM-GG
    items: WeekItem[];
    unassignedCount: number;
}

export interface WeekPlan {
    success: boolean;
    weekStart: string;
    today: string;
    timezone: string;
    days: WeekDay[];
}

const DONE = ['CLOSED', 'COMPLETED', 'CANCELED'];

function mondayOf(dateKey: string): string {
    const d = new Date(`${dateKey}T12:00:00Z`);
    const dow = (d.getUTCDay() + 6) % 7; // 0 = lunedi'
    d.setUTCDate(d.getUTCDate() - dow);
    return d.toISOString().slice(0, 10);
}

function addDaysKey(dateKey: string, n: number): string {
    const d = new Date(`${dateKey}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

/** Interventi programmati nella settimana che contiene `anyDay` (AAAA-MM-GG), con assegnatari e voci da assegnare. */
export async function getWeekPlan(anyDay?: string): Promise<WeekPlan> {
    const timezone = await currentTimezone();
    const today = dayKeyInZone(new Date(), timezone);
    const base = /^\d{4}-\d{2}-\d{2}$/.test(anyDay ?? '') ? (anyDay as string) : today;
    const weekStart = mondayOf(base);
    const keys = Array.from({ length: 7 }, (_, i) => addDaysKey(weekStart, i));
    const result: WeekPlan = { success: false, weekStart, today, timezone, days: keys.map(date => ({ date, items: [], unassignedCount: 0 })) };

    const { authorized } = await requireRole(VIEWERS);
    if (!authorized) return result;

    // Intervallo largo (fuso e ora legale): poi si assegna ogni voce al suo giorno nel fuso del plant
    const from = new Date(`${addDaysKey(weekStart, -1)}T00:00:00Z`);
    const to = new Date(`${addDaysKey(weekStart, 8)}T00:00:00Z`);

    const [orders, schedules, meters, contractorActivities] = await Promise.all([
        prisma.workOrder.findMany({
            where: { dueDate: { gte: from, lt: to }, status: { notIn: ['CANCELED'] } },
            select: {
                id: true, title: true, type: true, priority: true, status: true, dueDate: true, assignedTo: true, assignedTechnicianId: true, plantId: true,
                asset: { select: { name: true, department: true } },
                assignedTechnician: { select: { name: true } },
                technicians: { select: { technician: { select: { name: true } } } },
            },
            orderBy: { dueDate: 'asc' },
        }),
        prisma.preventiveSchedule.findMany({
            where: { nextDueDate: { gte: from, lt: to } },
            select: { id: true, taskTitle: true, nextDueDate: true, assignedToId: true, asset: { select: { name: true, department: true, plantId: true } } },
        }),
        prisma.meter.findMany({
            where: { nextReadingDue: { gte: from, lt: to } },
            select: {
                id: true, name: true, unit: true, location: true, plantId: true, nextReadingDue: true, readingAssigneeId: true,
                readings: { orderBy: { date: 'desc' }, take: 1, select: { value: true, date: true } },
            },
        }),
        prisma.contractorActivity.findMany({
            where: { isActive: true, nextDueDate: { gte: from, lt: to }, contract: { status: 'ACTIVE' } },
            select: {
                id: true, title: true, nextDueDate: true,
                asset: { select: { name: true, department: true } },
                contract: { select: { plantId: true, contractorId: true, title: true, status: true, startDate: true, endDate: true, renewalNoticeDays: true, contractor: { select: { name: true } } } },
            },
        }),
    ]);

    const planners = [
        ...schedules.map(s => s.assignedToId),
        ...meters.map(m => m.readingAssigneeId),
    ].filter((x): x is string => !!x);
    const planners2 = planners.length
        ? await prisma.user.findMany({ where: { id: { in: planners } }, select: { id: true, name: true } })
        : [];
    const userName = new Map(planners2.map(u => [u.id, u.name ?? 'Utente']));

    const byDay = new Map(result.days.map(d => [d.date, d]));

    for (const o of orders) {
        if (!o.dueDate) continue;
        const day = byDay.get(dayKeyInZone(o.dueDate, timezone));
        if (!day) continue;
        const names = [
            ...(o.assignedTechnician ? [o.assignedTechnician.name] : []),
            ...o.technicians.map(t => t.technician.name),
        ];
        if (names.length === 0 && o.assignedTo && o.assignedTo !== 'Unassigned') names.push(o.assignedTo);
        const assignees = [...new Set(names)];
        const open = !DONE.includes(o.status);
        const unassigned = open && assignees.length === 0;
        day.items.push({
            kind: 'WO', type: o.type === 'FAULT' ? 'FAULT' : o.type === 'ROUTINE' ? 'PROGRAMMED' : 'REQUEST', id: o.id, title: o.title, assetName: o.asset?.name ?? '-', department: o.asset?.department ?? null, plantId: o.plantId,
            priority: o.priority, status: o.status, assignees, unassigned, href: `/work-orders/${o.id}`,
        });
    }

    for (const s of schedules) {
        const day = byDay.get(dayKeyInZone(s.nextDueDate, timezone));
        if (!day) continue;
        const assignees = s.assignedToId ? [userName.get(s.assignedToId) ?? 'Utente'] : [];
        day.items.push({
            kind: 'PM', type: 'PROGRAMMED', id: s.id, title: s.taskTitle, assetName: s.asset?.name ?? '-', department: s.asset?.department ?? null, plantId: s.asset?.plantId ?? null,
            priority: null, status: null, assignees, unassigned: assignees.length === 0, href: '/maintenance/schedule',
        });
    }

    for (const m of meters) {
        if (!m.nextReadingDue) continue;
        const day = byDay.get(dayKeyInZone(m.nextReadingDue, timezone));
        if (!day) continue;
        const assignees = m.readingAssigneeId ? [userName.get(m.readingAssigneeId) ?? 'Utente'] : [];
        const last = m.readings[0];
        day.items.push({
            kind: 'READ', type: 'READING', id: m.id, title: `Lettura ${m.name}`, assetName: m.location ?? 'Contatore', department: null,
            plantId: m.plantId, priority: null, status: null, assignees, unassigned: assignees.length === 0, href: '/sustainability',
            meter: { unit: m.unit, lastValue: last ? last.value : null, lastReadAt: last ? last.date.toISOString() : null },
        });
    }

    // Attivita' delle ditte esterne: l'esecutore e' la ditta, quindi non compaiono tra le voci "da assegnare"
    const now = new Date();
    for (const a of contractorActivities) {
        if (!isInForce(contractState(a.contract, now))) continue;
        const day = byDay.get(dayKeyInZone(a.nextDueDate, timezone));
        if (!day) continue;
        day.items.push({
            kind: 'CTR', type: 'CONTRACTOR', id: a.id, title: `${a.contract.contractor.name} · ${a.title}`,
            assetName: a.asset?.name ?? a.contract.title, department: a.asset?.department ?? null, plantId: a.contract.plantId,
            priority: null, status: null, assignees: [a.contract.contractor.name], unassigned: false,
            href: `/contractors/${a.contract.contractorId}`,
        });
    }

    for (const d of result.days) d.unassignedCount = d.items.filter(i => i.unassigned).length;
    result.success = true;
    return result;
}
