import { nextOccurrence } from '../../shared/domain/recurrence';
import { tk } from '@/lib/i18n/translate';

/**
 * Pianificazione delle letture dei contatori. Funzioni pure.
 */

export const FREQUENCY_OPTIONS = [
    { days: 1, label: tk('Ogni giorno') },
    { days: 7, label: tk('Ogni settimana') },
    { days: 14, label: tk('Ogni 2 settimane') },
    { days: 30, label: tk('Ogni mese') },
] as const;

export function frequencyLabel(days: number | null | undefined): string {
    if (!days) return tk('Non pianificata');
    return FREQUENCY_OPTIONS.find(f => f.days === days)?.label ?? `Ogni ${days} giorni`;
}

/** Prossima scadenza dopo aver registrato una lettura (regola comune alle scadenze periodiche). */
export function nextReadingDue(due: Date, frequencyDays: number, now: Date): Date {
    return nextOccurrence(due, frequencyDays, now);
}
