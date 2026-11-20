import { prisma } from '@/lib/prisma';
import { computeUsageStatus, type UsageReading, type UsageStatus } from '@/modules/maintenance/domain/usage-triggers';

/**
 * Letture dei contatori per i piani a consumo. NON e' un file 'use server': non e' richiamabile dal browser.
 * Le letture passano dal filtro per stabilimento di `prisma` (nei job di sistema: dentro `runUnscoped`).
 */

/** Quante letture recenti si caricano per contatore (bastano per trovare la base e la finestra del consumo medio). */
export const READINGS_PER_METER = 500;

/** Ultime letture di ciascun contatore, in ordine di data crescente. */
export async function loadMeterReadings(meterIds: readonly string[]): Promise<Map<string, UsageReading[]>> {
    const unique = Array.from(new Set(meterIds.filter(Boolean)));
    const entries = await Promise.all(
        unique.map(async (meterId) => {
            const rows = await prisma.meterReading.findMany({
                where: { meterId },
                orderBy: { date: 'desc' },
                take: READINGS_PER_METER,
                select: { value: true, date: true },
            });
            return [meterId, rows.reverse() as UsageReading[]] as const;
        })
    );
    return new Map(entries);
}

export interface MeterPlanLike {
    meterId: string | null;
    meterInterval: number | null;
    lastMeterValue: number | null;
}

/** Stato a consumo di un piano, date le letture caricate. Piano senza contatore: nessun dato (mai inventato). */
export function usageStatusOf(plan: MeterPlanLike, readings: ReadonlyMap<string, UsageReading[]>): UsageStatus {
    const list = plan.meterId ? readings.get(plan.meterId) ?? [] : [];
    return computeUsageStatus({ interval: plan.meterInterval, lastMeterValue: plan.lastMeterValue }, list);
}
