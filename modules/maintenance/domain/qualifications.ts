/**
 * Abilitazioni dei manutentori (PLE, lavori in quota, carrello elevatore...). Funzioni pure.
 * La scadenza e' una data: l'abilitazione vale fino alla fine di quel giorno.
 */

export type QualificationState = 'NO_EXPIRY' | 'VALID' | 'EXPIRING' | 'EXPIRED';

/** Giorni di preavviso: dentro questa soglia l'abilitazione risulta "in scadenza". */
export const EXPIRING_DAYS = 30;

export const QUALIFICATION_STATE_LABEL: Record<QualificationState, string> = {
    NO_EXPIRY: 'Senza scadenza',
    VALID: 'Valida',
    EXPIRING: 'In scadenza',
    EXPIRED: 'Scaduta',
};

const DAY = 86_400_000;

/** Giorni di calendario da `now` alla scadenza (0 = scade oggi, negativo = scaduta). Ignora l'ora. */
export function daysToExpiry(expiresAt: Date, now: Date): number {
    const a = Date.UTC(expiresAt.getFullYear(), expiresAt.getMonth(), expiresAt.getDate());
    const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((a - b) / DAY);
}

export function qualificationState(expiresAt: Date | null, now: Date): QualificationState {
    if (!expiresAt) return 'NO_EXPIRY';
    const left = daysToExpiry(expiresAt, now);
    if (left < 0) return 'EXPIRED';
    if (left <= EXPIRING_DAYS) return 'EXPIRING';
    return 'VALID';
}

/** Testo breve per il badge: "in scadenza il 15/06/2026", "scaduta il ...", "valida fino al ...". */
export function qualificationText(state: QualificationState, expiresAt: Date | null): string {
    if (!expiresAt || state === 'NO_EXPIRY') return QUALIFICATION_STATE_LABEL.NO_EXPIRY.toLowerCase();
    const d = expiresAt.toLocaleDateString('it-IT');
    if (state === 'EXPIRED') return `scaduta il ${d}`;
    if (state === 'EXPIRING') return `in scadenza il ${d}`;
    return `valida fino al ${d}`;
}
