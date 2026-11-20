/**
 * Permessi di lavoro (lavori in quota, uso di PLE, spazi confinati, lock-out/tag-out...): regole pure.
 * Le precauzioni e i tipi di permesso li definisce l'amministratore: qui non c'e' nessun contenuto di sicurezza,
 * solo il ciclo di vita del permesso e i controlli sulle abilitazioni dei tecnici.
 */
import { qualificationState } from './qualifications';
import { tk } from '@/lib/i18n/translate';

export type PermitStatus = 'REQUESTED' | 'APPROVED' | 'ACTIVE' | 'CLOSED' | 'REJECTED' | 'CANCELED';

export const PERMIT_STATUSES: readonly PermitStatus[] = ['REQUESTED', 'APPROVED', 'ACTIVE', 'CLOSED', 'REJECTED', 'CANCELED'];

export const PERMIT_STATUS_LABEL: Record<PermitStatus, string> = {
    REQUESTED: tk('Da approvare'),
    APPROVED: tk('Approvato'),
    ACTIVE: tk('Attivo'),
    CLOSED: tk('Chiuso'),
    REJECTED: tk('Rifiutato'),
    CANCELED: tk('Annullato'),
};

/** Transizioni consentite: da ogni stato, gli stati in cui si puo' passare. */
export const PERMIT_TRANSITIONS: Record<PermitStatus, readonly PermitStatus[]> = {
    REQUESTED: ['APPROVED', 'REJECTED', 'CANCELED'],
    APPROVED: ['ACTIVE', 'CANCELED'],
    ACTIVE: ['CLOSED', 'CANCELED'],
    CLOSED: [],
    REJECTED: [],
    CANCELED: [],
};

export function isPermitStatus(value: unknown): value is PermitStatus {
    return typeof value === 'string' && (PERMIT_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: string, to: string): boolean {
    return isPermitStatus(from) && isPermitStatus(to) && PERMIT_TRANSITIONS[from].includes(to);
}

/** Stati in cui il permesso e' ancora "vivo" (non concluso). */
export const OPEN_STATUSES: readonly PermitStatus[] = ['REQUESTED', 'APPROVED', 'ACTIVE'];

export function isOpenStatus(status: string): boolean {
    return (OPEN_STATUSES as readonly string[]).includes(status);
}

/** Richiesto ma non ancora attivo: se l'ordine ha un permesso cosi' (e nessuno attivo) il lavoro non puo' partire. */
export function isPendingStatus(status: string): boolean {
    return status === 'REQUESTED' || status === 'APPROVED';
}

/** Stato mostrato: per APPROVED e ACTIVE oltre `validTo` il permesso risulta "scaduto". Lo stato salvato non cambia. */
export type EffectivePermitStatus = PermitStatus | 'EXPIRED';

export const EFFECTIVE_STATUS_LABEL: Record<EffectivePermitStatus, string> = { ...PERMIT_STATUS_LABEL, EXPIRED: tk('Scaduto') };

export function isPermitExpired(status: string, validTo: Date | null | undefined, now: Date): boolean {
    if (status !== 'APPROVED' && status !== 'ACTIVE') return false;
    return !!validTo && now.getTime() > validTo.getTime();
}

export function effectivePermitStatus(status: PermitStatus, validTo: Date | null | undefined, now: Date): EffectivePermitStatus {
    return isPermitExpired(status, validTo, now) ? 'EXPIRED' : status;
}

// --- Validita' ---

export interface ValidityInput {
    validFrom?: Date | null;
    validTo?: Date | null;
    defaultValidityHours?: number | null;
}

export type ValidityResult =
    | { ok: true; validFrom: Date; validTo: Date | null }
    | { ok: false; message: string };

/**
 * Validita' del permesso: l'inizio e' quello indicato (altrimenti adesso); la fine e' quella indicata,
 * altrimenti inizio + ore predefinite del tipo, altrimenti nessuna (il permesso resta aperto finche' non viene chiuso).
 */
export function computeValidity(input: ValidityInput, now: Date): ValidityResult {
    const from = input.validFrom ?? now;
    if (Number.isNaN(from.getTime())) return { ok: false, message: 'Data di inizio non valida.' };
    if (input.validTo) {
        if (Number.isNaN(input.validTo.getTime())) return { ok: false, message: 'Data di fine non valida.' };
        if (input.validTo.getTime() <= from.getTime()) return { ok: false, message: 'La fine della validità deve essere successiva all\'inizio.' };
        return { ok: true, validFrom: from, validTo: input.validTo };
    }
    const hours = input.defaultValidityHours;
    if (hours && hours > 0) return { ok: true, validFrom: from, validTo: new Date(from.getTime() + hours * 3_600_000) };
    return { ok: true, validFrom: from, validTo: null };
}

export type ActivationWindow =
    | { ok: true }
    | { ok: false; reason: 'NOT_YET' | 'EXPIRED'; message: string };

const fmt = (d: Date) => d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

/** Un permesso approvato si attiva solo dentro la sua validita'. */
export function activationWindow(validFrom: Date | null | undefined, validTo: Date | null | undefined, now: Date): ActivationWindow {
    if (validFrom && now.getTime() < validFrom.getTime()) return { ok: false, reason: 'NOT_YET', message: `Il permesso vale dal ${fmt(validFrom)}: non è ancora attivabile.` };
    if (validTo && now.getTime() > validTo.getTime()) return { ok: false, reason: 'EXPIRED', message: `Il permesso è scaduto il ${fmt(validTo)}.` };
    return { ok: true };
}

// --- Abilitazioni dei tecnici ---

export interface TechnicianQualificationInfo {
    id: string;
    name: string;
    qualifications: { typeId: string; expiresAt: Date | null }[];
}

export type TechnicianCheckStatus = 'OK' | 'MISSING' | 'EXPIRED';

export interface QualificationCheck {
    /** Vero se tutti i tecnici sono abilitati (o se il tipo non richiede abilitazioni). */
    ok: boolean;
    /** Il tipo richiede un'abilitazione. */
    required: boolean;
    /** Nessun tecnico assegnato: l'abilitazione non e' verificabile. */
    noTechnicians: boolean;
    /** Nomi di chi non ha l'abilitazione richiesta. */
    missing: string[];
    /** Nomi di chi ha l'abilitazione ma e' scaduta. */
    expired: string[];
    perTechnician: { id: string; name: string; status: TechnicianCheckStatus }[];
}

/** Verifica un elenco di tecnici rispetto all'abilitazione richiesta dal tipo di permesso (null = nessuna richiesta). */
export function checkTechniciansQualified(
    requiredQualificationId: string | null | undefined,
    technicians: readonly TechnicianQualificationInfo[],
    now: Date,
): QualificationCheck {
    if (!requiredQualificationId) {
        return { ok: true, required: false, noTechnicians: technicians.length === 0, missing: [], expired: [], perTechnician: technicians.map(t => ({ id: t.id, name: t.name, status: 'OK' as const })) };
    }
    const perTechnician = technicians.map(t => {
        const q = t.qualifications.find(x => x.typeId === requiredQualificationId);
        let status: TechnicianCheckStatus = 'MISSING';
        if (q) status = qualificationState(q.expiresAt, now) === 'EXPIRED' ? 'EXPIRED' : 'OK';
        return { id: t.id, name: t.name, status };
    });
    const missing = perTechnician.filter(t => t.status === 'MISSING').map(t => t.name);
    const expired = perTechnician.filter(t => t.status === 'EXPIRED').map(t => t.name);
    return { ok: missing.length === 0 && expired.length === 0, required: true, noTechnicians: technicians.length === 0, missing, expired, perTechnician };
}

/** Frase sui tecnici non abilitati (stringa vuota se sono tutti abilitati). */
export function qualificationProblemText(check: QualificationCheck, qualificationName?: string | null): string {
    if (check.ok) return '';
    const what = qualificationName ? `l'abilitazione «${qualificationName}»` : 'l\'abilitazione richiesta';
    const parts: string[] = [];
    if (check.missing.length > 0) parts.push(`non hanno ${what}: ${check.missing.join(', ')}`);
    if (check.expired.length > 0) parts.push(`hanno ${what} scaduta: ${check.expired.join(', ')}`);
    return parts.join('; ');
}

// --- Precauzioni ---

/** Vero se l'elenco spunte copre tutte le precauzioni del tipo ed e' interamente spuntato. Senza precauzioni definite: vero. */
export function allPrecautionsChecked(precautions: readonly string[], checked: readonly boolean[] | null | undefined): boolean {
    if (precautions.length === 0) return true;
    if (!Array.isArray(checked) || checked.length !== precautions.length) return false;
    return checked.every(c => c === true);
}

export interface PrecautionRecord { label: string; checked: boolean }

/** Elenco {label, checked} da salvare al momento dell'attivazione. */
export function buildPrecautionsDone(precautions: readonly string[], checked: readonly boolean[]): PrecautionRecord[] {
    return precautions.map((label, i) => ({ label, checked: checked[i] === true }));
}

/** Legge `precautionsDone` (Json del database) in modo sicuro. */
export function parsePrecautionsDone(value: unknown): PrecautionRecord[] {
    if (!Array.isArray(value)) return [];
    const out: PrecautionRecord[] = [];
    for (const v of value) {
        if (v && typeof v === 'object' && typeof (v as PrecautionRecord).label === 'string') {
            out.push({ label: (v as PrecautionRecord).label, checked: (v as PrecautionRecord).checked === true });
        }
    }
    return out;
}

// --- Tipi di permesso ---

export const MAX_TYPE_NAME = 80;
export const MAX_PRECAUTIONS = 30;
export const MAX_PRECAUTION_LENGTH = 200;

export interface PermitTypeInput {
    name: string;
    description?: string | null;
    requiredQualificationId?: string | null;
    requiresApproval?: boolean;
    defaultValidityHours?: number | null;
    precautions?: string[];
}

export type PermitTypeValidation =
    | { ok: true; value: { name: string; description: string | null; requiredQualificationId: string | null; requiresApproval: boolean; defaultValidityHours: number | null; precautions: string[] } }
    | { ok: false; message: string };

/** Normalizza e controlla i dati di un tipo di permesso (l'unicita' del nome si verifica sul database). */
export function validatePermitType(input: PermitTypeInput): PermitTypeValidation {
    if (!input || typeof input !== 'object') return { ok: false, message: 'Dati non validi.' };
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (name.length < 1 || name.length > MAX_TYPE_NAME) return { ok: false, message: `Il nome deve avere da 1 a ${MAX_TYPE_NAME} caratteri.` };

    const rawPrecautions = Array.isArray(input.precautions) ? input.precautions : [];
    const precautions: string[] = [];
    for (const p of rawPrecautions) {
        if (typeof p !== 'string') return { ok: false, message: 'Precauzioni non valide.' };
        const t = p.trim();
        if (!t) continue;
        if (t.length > MAX_PRECAUTION_LENGTH) return { ok: false, message: `Ogni precauzione può avere al massimo ${MAX_PRECAUTION_LENGTH} caratteri.` };
        precautions.push(t);
    }
    if (precautions.length > MAX_PRECAUTIONS) return { ok: false, message: `Al massimo ${MAX_PRECAUTIONS} precauzioni per tipo.` };

    let hours: number | null = null;
    if (input.defaultValidityHours !== null && input.defaultValidityHours !== undefined) {
        const h = Number(input.defaultValidityHours);
        if (!Number.isInteger(h) || h < 1 || h > 24 * 365) return { ok: false, message: 'Le ore di validità devono essere un numero intero positivo.' };
        hours = h;
    }

    const description = typeof input.description === 'string' && input.description.trim() ? input.description.trim().slice(0, 500) : null;
    return {
        ok: true,
        value: {
            name,
            description,
            requiredQualificationId: input.requiredQualificationId || null,
            requiresApproval: input.requiresApproval !== false,
            defaultValidityHours: hours,
            precautions,
        },
    };
}
