'use server';

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-guard';
import { ENGINEERING } from '@/lib/roles';
import { loadMeterReadings, usageStatusOf } from '@/lib/meter-usage';
import {
    sortByUrgency,
    statusFromDueDate,
    statusFromUsage,
    summarizeRegulatory,
    type RegulatoryRow,
    type RegulatoryTotals,
} from '../../domain/regulatory';

/**
 * Scadenziario normativo: i piani di manutenzione contrassegnati come "di legge" (verifiche periodiche, controlli obbligatori).
 * Riservato a chi coordina (admin, responsabili di plant, supervisor, ingegneri di processo): i manutentori non lo vedono.
 * Le letture passano dal filtro per stabilimento di `prisma`.
 */

export interface RegulatoryDeadlines {
    success: boolean;
    message?: string;
    rows: RegulatoryRow[];
    totals: RegulatoryTotals;
}

const EMPTY_TOTALS: RegulatoryTotals = { total: 0, overdue: 0, expiring: 0, ok: 0, unknown: 0 };

export async function getRegulatoryDeadlines(): Promise<RegulatoryDeadlines> {
    const guard = await requireRole(ENGINEERING);
    if (!guard.authorized) return { success: false, message: guard.message ?? 'Non autorizzato', rows: [], totals: EMPTY_TOTALS };

    try {
        const schedules = await prisma.preventiveSchedule.findMany({
            where: { isRegulatory: true },
            select: {
                id: true,
                taskTitle: true,
                lastRunDate: true,
                nextDueDate: true,
                triggerType: true,
                meterId: true,
                meterInterval: true,
                lastMeterValue: true,
                legalReference: true,
                authority: true,
                meter: { select: { unit: true } },
                asset: { select: { id: true, name: true, plantId: true, plant: { select: { name: true } } } },
            },
        });

        const now = new Date();
        const meterIds = schedules.filter(s => s.triggerType === 'METER' && s.meterId).map(s => s.meterId as string);
        const readings = meterIds.length ? await loadMeterReadings(meterIds) : new Map();

        const rows: RegulatoryRow[] = schedules.map(s => {
            const base = {
                scheduleId: s.id,
                title: s.taskTitle,
                assetId: s.asset.id,
                assetName: s.asset.name,
                plantId: s.asset.plantId ?? null,
                plantName: s.asset.plant?.name ?? null,
                legalReference: s.legalReference,
                authority: s.authority,
                triggerType: s.triggerType,
                lastRunDate: s.lastRunDate ? s.lastRunDate.toISOString() : null,
            };
            if (s.triggerType === 'METER') {
                const usage = usageStatusOf(s, readings);
                return {
                    ...base,
                    // A consumo la scadenza e' solo la stima dal contatore: senza stima resta vuota (la data salvata e' un segnaposto)
                    nextDueDate: usage.estimatedDueDate ? usage.estimatedDueDate.toISOString() : null,
                    status: statusFromUsage(usage, now),
                    usage: {
                        unit: s.meter?.unit ?? '',
                        interval: usage.interval,
                        consumed: usage.consumed,
                        usedPct: usage.usedPct,
                        remaining: usage.remaining,
                    },
                };
            }
            return { ...base, nextDueDate: s.nextDueDate.toISOString(), status: statusFromDueDate(s.nextDueDate, now), usage: null };
        });

        return { success: true, rows: sortByUrgency(rows), totals: summarizeRegulatory(rows) };
    } catch (error) {
        console.error('[regulatory-actions] getRegulatoryDeadlines', error);
        return { success: false, message: 'Errore nel caricamento dello scadenziario', rows: [], totals: EMPTY_TOTALS };
    }
}
