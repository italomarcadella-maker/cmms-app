/**
 * Turni, giorni e serie senza infortuni. Funzioni pure, senza dipendenze: usate dalle azioni della dashboard.
 */

export const SHIFTS = [
    { id: 'MORNING', label: 'Mattina', from: 6, to: 14 },
    { id: 'AFTERNOON', label: 'Pomeriggio', from: 14, to: 22 },
    { id: 'NIGHT', label: 'Notte', from: 22, to: 6 },
] as const;

export type ShiftId = (typeof SHIFTS)[number]['id'];

export const DEFAULT_TIMEZONE = 'Europe/Rome';

/** Ora (0-23) di un istante nel fuso indicato. */
export function hourInZone(date: Date, timeZone: string = DEFAULT_TIMEZONE): number {
    const parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone }).formatToParts(date);
    const hour = Number(parts.find(p => p.type === 'hour')?.value ?? '0');
    return hour % 24; // alcuni motori restituiscono 24 a mezzanotte
}

export function shiftOf(date: Date, timeZone: string = DEFAULT_TIMEZONE): ShiftId {
    const h = hourInZone(date, timeZone);
    if (h >= 6 && h < 14) return 'MORNING';
    if (h >= 14 && h < 22) return 'AFTERNOON';
    return 'NIGHT';
}

/** Giorno di calendario (AAAA-MM-GG) di un istante nel fuso indicato. */
export function dayKeyInZone(date: Date, timeZone: string = DEFAULT_TIMEZONE): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Giorni interi trascorsi tra due istanti (mai negativo). */
export function wholeDaysBetween(from: Date, to: Date): number {
    return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

/**
 * Serie piu' lunga senza infortuni, in giorni: il massimo tra gli intervalli fra un infortunio e il successivo e
 * la serie in corso. Serve almeno un intervallo noto (due infortuni): con uno solo non si conosce il periodo prima.
 */
export function longestStreakDays(injuryDates: Date[], now: Date): number | null {
    if (injuryDates.length < 2) return null;
    const sorted = [...injuryDates].sort((a, b) => a.getTime() - b.getTime());
    let best = wholeDaysBetween(sorted[sorted.length - 1], now);
    for (let i = 1; i < sorted.length; i++) best = Math.max(best, wholeDaysBetween(sorted[i - 1], sorted[i]));
    return best;
}
