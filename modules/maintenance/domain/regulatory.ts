/**
 * Scadenziario normativo: manutenzioni e verifiche richieste da una norma (piani con `isRegulatory`).
 * Funzioni pure, senza database.
 *
 * Stati:
 *  - OVERDUE: scaduta (prossima scadenza prima di oggi; a consumo: consumo >= intervallo).
 *  - EXPIRING: scade entro 30 giorni (oggi compreso). A consumo: scadenza stimata entro 30 giorni, oppure quota usata >= 90%.
 *  - OK: in regola.
 *  - UNKNOWN: solo piani a consumo senza dati (nessuna lettura o intervallo non valido): non si dichiara "in regola" senza saperlo.
 */

export const EXPIRING_DAYS = 30;
/** Quota dell'intervallo oltre la quale un piano a consumo senza stima e' considerato in scadenza. */
export const EXPIRING_USED_PCT = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RegulatoryStatus = 'OVERDUE' | 'EXPIRING' | 'OK' | 'UNKNOWN';

export const REGULATORY_STATUS_LABELS: Record<RegulatoryStatus, string> = {
    OVERDUE: 'Scaduta',
    EXPIRING: 'In scadenza',
    OK: 'In regola',
    UNKNOWN: 'Dati insufficienti',
};

function toTime(d: Date | string): number {
    return (d instanceof Date ? d : new Date(d)).getTime();
}

function startOfDay(now: Date): number {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/** Stato di un piano a scadenza di tempo. Una scadenza di oggi e' in scadenza, non scaduta. */
export function statusFromDueDate(nextDueDate: Date | string, now: Date = new Date()): RegulatoryStatus {
    const due = toTime(nextDueDate);
    if (!Number.isFinite(due)) return 'UNKNOWN';
    const today = startOfDay(now);
    if (due < today) return 'OVERDUE';
    if (due < today + (EXPIRING_DAYS + 1) * DAY_MS) return 'EXPIRING';
    return 'OK';
}

export interface UsageSnapshot {
    validInterval: boolean;
    hasReadings: boolean;
    overdue: boolean;
    usedPct: number | null;
    estimatedDueDate: Date | string | null;
}

/** Stato di un piano a consumo dallo stato del contatore. */
export function statusFromUsage(usage: UsageSnapshot, now: Date = new Date()): RegulatoryStatus {
    if (!usage.validInterval || !usage.hasReadings) return 'UNKNOWN';
    if (usage.overdue) return 'OVERDUE';
    if (usage.estimatedDueDate !== null && statusFromDueDate(usage.estimatedDueDate, now) !== 'OK') return 'EXPIRING';
    if (usage.usedPct !== null && usage.usedPct >= EXPIRING_USED_PCT) return 'EXPIRING';
    return 'OK';
}

/** Giorni alla scadenza (negativi se scaduta); null se non c'e' una data. */
export function daysUntil(due: Date | string | null | undefined, now: Date = new Date()): number | null {
    if (due === null || due === undefined) return null;
    const t = toTime(due);
    if (!Number.isFinite(t)) return null;
    const d = new Date(t);
    const dueDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return Math.round((dueDay - startOfDay(now)) / DAY_MS);
}

export interface RegulatoryRow {
    scheduleId: string;
    title: string;
    assetId: string;
    assetName: string;
    plantId: string | null;
    plantName: string | null;
    legalReference: string | null;
    authority: string | null;
    triggerType: string;
    /** Ultima esecuzione (ISO). */
    lastRunDate: string | null;
    /** Prossima scadenza (ISO): a tempo e' la data del piano, a consumo la data stimata (null se non calcolabile). */
    nextDueDate: string | null;
    status: RegulatoryStatus;
    /** Solo piani a consumo. */
    usage: { unit: string; interval: number | null; consumed: number | null; usedPct: number | null; remaining: number | null } | null;
}

export interface RegulatoryTotals {
    total: number;
    overdue: number;
    expiring: number;
    ok: number;
    unknown: number;
}

export function summarizeRegulatory(rows: readonly Pick<RegulatoryRow, 'status'>[]): RegulatoryTotals {
    const t: RegulatoryTotals = { total: rows.length, overdue: 0, expiring: 0, ok: 0, unknown: 0 };
    for (const r of rows) {
        if (r.status === 'OVERDUE') t.overdue++;
        else if (r.status === 'EXPIRING') t.expiring++;
        else if (r.status === 'OK') t.ok++;
        else t.unknown++;
    }
    return t;
}

const URGENCY: Record<RegulatoryStatus, number> = { OVERDUE: 0, EXPIRING: 1, UNKNOWN: 2, OK: 3 };

/**
 * Ordine per urgenza: scadute (le piu' in ritardo per prime), in scadenza (la piu' vicina per prima), dati insufficienti, in regola
 * (la piu' vicina per prima). A parita' di data, per nome dell'asset e del piano. Non modifica l'array passato.
 */
export function sortByUrgency<T extends Pick<RegulatoryRow, 'status' | 'nextDueDate' | 'assetName' | 'title'>>(rows: readonly T[]): T[] {
    return [...rows].sort((a, b) => {
        const byStatus = URGENCY[a.status] - URGENCY[b.status];
        if (byStatus !== 0) return byStatus;
        const ta = a.nextDueDate ? toTime(a.nextDueDate) : Infinity;
        const tb = b.nextDueDate ? toTime(b.nextDueDate) : Infinity;
        if (ta !== tb) return ta < tb ? -1 : 1;
        return a.assetName.localeCompare(b.assetName, 'it') || a.title.localeCompare(b.title, 'it');
    });
}

export type RegulatoryFilter = 'ALL' | RegulatoryStatus;

export function filterByStatus<T extends Pick<RegulatoryRow, 'status'>>(rows: readonly T[], filter: RegulatoryFilter): T[] {
    return filter === 'ALL' ? [...rows] : rows.filter(r => r.status === filter);
}

// --- Esportazione CSV ---

/** Data gg/mm/aaaa nel fuso del chiamante; stringa vuota se assente o non valida. */
export function formatDateIt(value: Date | string | null | undefined): string {
    if (value === null || value === undefined) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Cella CSV sicura: una cella che inizia con = + - @ (o tabulazione / ritorno a capo) sarebbe interpretata come formula da Excel:
 * si antepone un apice. Poi virgolette, punto e virgola e a capo secondo la regola del CSV.
 */
export function csvCell(value: unknown): string {
    let text = value === null || value === undefined ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    if (/[";\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
    return text;
}

const nf = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });

export const CSV_HEADER = [
    'Asset', 'Stabilimento', 'Piano', 'Riferimento normativo', 'Ente', 'Tipo di scadenza',
    'Ultima esecuzione', 'Prossima scadenza', 'Stato', 'Avanzamento',
] as const;

function usageText(r: RegulatoryRow): string {
    if (!r.usage || r.usage.consumed === null || r.usage.interval === null) return '';
    const unit = r.usage.unit ? ` ${r.usage.unit}` : '';
    return `${nf.format(r.usage.consumed)} / ${nf.format(r.usage.interval)}${unit}`;
}

/** CSV con punto e virgola come separatore, date gg/mm/aaaa e BOM UTF-8 iniziale (Excel italiano lo apre senza rovinare gli accenti). */
export function buildRegulatoryCsv(rows: readonly RegulatoryRow[]): string {
    const lines = [CSV_HEADER.map(csvCell).join(';')];
    for (const r of rows) {
        lines.push(
            [
                r.assetName,
                r.plantName ?? '',
                r.title,
                r.legalReference ?? '',
                r.authority ?? '',
                r.triggerType === 'METER' ? 'A consumo' : 'A tempo',
                formatDateIt(r.lastRunDate),
                r.triggerType === 'METER' && r.nextDueDate ? `${formatDateIt(r.nextDueDate)} (stimata)` : formatDateIt(r.nextDueDate),
                REGULATORY_STATUS_LABELS[r.status],
                usageText(r),
            ]
                .map(csvCell)
                .join(';')
        );
    }
    return `﻿${lines.join('\r\n')}\r\n`;
}
