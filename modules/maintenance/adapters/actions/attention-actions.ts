'use server';

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-guard';
import { getContractorsOverview } from './contractor-actions';
import { getWeekPlan } from './dashboard-widgets-actions';
import { getMaintainerIdentity } from '@/lib/maintainer-scope';
import { maintainerWorkOrderWhere, withMaintainerFilter } from '../../domain/maintainer-visibility';

/**
 * "Richiede attenzione": le poche cose da guardare subito, in ordine di gravita'.
 * Raccoglie fermi, segnalazioni di sicurezza, ritardi, interventi di oggi senza assegnatario, letture in ritardo,
 * contratti in scadenza: al posto di tanti blocchi separati nella dashboard. Il briefing dell'assistente AI e' un blocco a parte.
 */

const VIEWERS = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'MAINTAINER', 'PROCESS_ENGINEER'];
const OPEN = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'ON_HOLD', 'PENDING_REVIEW'] as const;

export type AttentionSeverity = 'critical' | 'warning' | 'info';

export interface AttentionItem {
    id: string;
    severity: AttentionSeverity;
    title: string;
    detail?: string;
    href: string;
}

const ORDER: Record<AttentionSeverity, number> = { critical: 0, warning: 1, info: 2 };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export async function getAttentionItems(limit = 6): Promise<AttentionItem[]> {
    const { authorized } = await requireRole(VIEWERS);
    if (!authorized) return [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const items: AttentionItem[] = [];

    // Un manutentore vede solo gli ordini che lo riguardano (suoi, richiesti da lui, ancora da assegnare): gli altri non sono nemmeno nei conteggi
    const who = await getMaintainerIdentity();
    const visible = who ? maintainerWorkOrderWhere(who) : null;
    const meterMine = who ? { OR: [{ readingAssigneeId: null }, { readingAssigneeId: { in: [who.userId, ...(who.technicianId ? [who.technicianId] : [])] } }] } : {};

    const [stopped, safety, overdue, lateReadings, contractors, week] = await Promise.all([
        prisma.workOrder.findMany({
            where: withMaintainerFilter({ priority: 'STOPPED', status: { in: [...OPEN] } }, visible),
            orderBy: { createdAt: 'desc' }, take: 3,
            select: { id: true, title: true, asset: { select: { name: true } } },
        }),
        prisma.workOrder.findMany({
            where: withMaintainerFilter({ OR: [{ category: 'SAFETY' }, { assetId: 'SYS-SAFETY' }], status: { in: [...OPEN] }, priority: { in: ['STOPPED', 'HIGH', 'MALFUNCTIONING'] } }, visible),
            orderBy: { createdAt: 'desc' }, take: 2,
            select: { id: true, title: true },
        }),
        prisma.workOrder.count({ where: withMaintainerFilter({ status: { in: [...OPEN] }, dueDate: { lt: now } }, visible) }),
        prisma.meter.count({ where: { nextReadingDue: { lt: startOfToday }, ...meterMine } }),
        getContractorsOverview().catch(() => null),
        getWeekPlan().catch(() => null),
    ]);

    for (const w of stopped) {
        items.push({ id: `stop-${w.id}`, severity: 'critical', title: `Fermo: ${w.title}`, detail: w.asset?.name, href: `/work-orders/${w.id}` });
    }
    for (const w of safety) {
        items.push({ id: `safe-${w.id}`, severity: 'critical', title: `Sicurezza: ${w.title}`, detail: 'Segnalazione aperta', href: `/work-orders/${w.id}` });
    }
    if (overdue > 0) {
        items.push({ id: 'overdue', severity: 'warning', title: `${plural(overdue, 'ordine in ritardo', 'ordini in ritardo')}`, detail: 'Scadenza superata', href: '/work-orders' });
    }
    const today = week?.days.find(d => d.date === week.today);
    if (today && today.unassignedCount > 0) {
        items.push({
            id: 'unassigned-today', severity: 'warning',
            title: `${plural(today.unassignedCount, 'intervento di oggi', 'interventi di oggi')} senza assegnatario`,
            detail: who ? 'Guarda il calendario' : 'Assegnali dal calendario', href: '#week-calendar',
        });
    }
    if (lateReadings > 0) {
        items.push({ id: 'readings', severity: 'warning', title: `${plural(lateReadings, 'lettura in ritardo', 'letture in ritardo')}`, detail: 'Contatori da leggere', href: '/impianti' });
    }
    if (contractors) {
        const k = contractors.kpis;
        if (k.overdueActivities > 0) {
            items.push({ id: 'ctr-overdue', severity: 'warning', title: `${plural(k.overdueActivities, 'attività di ditte esterne in ritardo', 'attività di ditte esterne in ritardo')}`, detail: 'Da sollecitare', href: '/contractors' });
        }
        if (k.expiringContracts > 0) {
            items.push({ id: 'ctr-expiring', severity: 'warning', title: `${plural(k.expiringContracts, 'contratto in scadenza', 'contratti in scadenza')}`, detail: 'Da rinnovare o disdire', href: '/contractors' });
        }
    }
    return items.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]).slice(0, limit);
}
