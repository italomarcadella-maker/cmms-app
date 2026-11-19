import { nextOccurrence } from '../../shared/domain/recurrence';

/**
 * Regole delle ditte esterne: stato dei contratti e delle attivita' periodiche. Funzioni pure.
 */

export type ContractState = 'UPCOMING' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED';

export interface ContractLike {
    status: string;
    startDate: Date;
    endDate: Date | null;
    renewalNoticeDays: number;
}

const DAY = 86_400_000;

/** Giorni alla scadenza del contratto (negativi se scaduto); null se senza scadenza. */
export function daysToEnd(endDate: Date | null, now: Date): number | null {
    if (!endDate) return null;
    return Math.ceil((endDate.getTime() - now.getTime()) / DAY);
}

export function contractState(c: ContractLike, now: Date): ContractState {
    if (c.status === 'TERMINATED') return 'TERMINATED';
    if (c.startDate.getTime() > now.getTime()) return 'UPCOMING';
    const left = daysToEnd(c.endDate, now);
    if (left !== null && left < 0) return 'EXPIRED';
    if (left !== null && left <= c.renewalNoticeDays) return 'EXPIRING';
    return 'ACTIVE';
}

/** Un contratto in vigore e' quello su cui le attivita' vanno eseguite (anche se in scadenza). */
export const isInForce = (state: ContractState) => state === 'ACTIVE' || state === 'EXPIRING';

export type ActivityState = 'OVERDUE' | 'DUE_SOON' | 'OK' | 'INACTIVE';

export function activityState(a: { isActive: boolean; nextDueDate: Date }, now: Date, soonDays = 7): ActivityState {
    if (!a.isActive) return 'INACTIVE';
    if (a.nextDueDate.getTime() < now.getTime() - DAY) return 'OVERDUE'; // un giorno di tolleranza: la scadenza e' una data, non un'ora
    if (a.nextDueDate.getTime() <= now.getTime() + soonDays * DAY) return 'DUE_SOON';
    return 'OK';
}

/** Prossima scadenza di un'attivita' dopo un'esecuzione. */
export function nextDueAfterExecution(doneAt: Date, due: Date, frequencyDays: number): Date {
    return nextOccurrence(due, frequencyDays, doneAt);
}

export const OUTCOMES = [
    { id: 'OK', label: 'Eseguita, tutto in regola' },
    { id: 'ISSUES', label: 'Eseguita, con criticità da seguire' },
] as const;

export function frequencyText(days: number): string {
    const map: Record<number, string> = { 7: 'Ogni settimana', 14: 'Ogni 2 settimane', 30: 'Ogni mese', 60: 'Ogni 2 mesi', 90: 'Ogni 3 mesi', 180: 'Ogni 6 mesi', 365: 'Ogni anno' };
    return map[days] ?? `Ogni ${days} giorni`;
}

export const FREQUENCY_CHOICES = [7, 14, 30, 60, 90, 180, 365] as const;
