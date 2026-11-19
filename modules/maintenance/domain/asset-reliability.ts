/**
 * Affidabilita' di un asset: numero di guasti, MTBF, MTTR, costo, stato dei piani. Funzioni pure, senza database.
 *
 * Regola di fondo: mai valori inventati. Se i dati non bastano l'indicatore e' null (nella scheda: "n.d.").
 *  - MTBF: media degli intervalli tra guasti consecutivi (data di apertura). Servono almeno due guasti.
 *  - MTTR: media delle ore di lavoro registrate, SOLO sugli interventi che ne hanno. Null se nessuno ne ha.
 *  - Costo: ricambi (quantita' x costo unitario) piu' manodopera (ore x tariffa del tecnico se > 0, altrimenti tariffa predefinita
 *    dello stabilimento): stesso criterio degli indicatori della dashboard.
 */

/** Stati di un ordine ancora da lavorare (tutti tranne completato, chiuso, annullato). */
export const OPEN_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'ON_HOLD', 'PENDING_REVIEW'] as const;
/** Stati degli interventi conclusi: gli unici che entrano negli indicatori. */
export const CLOSED_STATUSES = ['COMPLETED', 'CLOSED'] as const;

/** Tariffa oraria usata quando ne' il tecnico ne' lo stabilimento ne hanno una (stesso valore della dashboard). */
export const FALLBACK_LABOR_RATE = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface FaultLaborLog {
    hours: number;
    technicianId?: string | null;
}

export interface FaultPart {
    quantity: number;
    unitCost: number;
}

/** Un guasto chiuso, con quanto serve per gli indicatori. */
export interface ClosedFault {
    createdAt: Date | string;
    laborLogs: readonly FaultLaborLog[];
    partsUsed: readonly FaultPart[];
}

export interface ReliabilityIndicators {
    /** Guasti chiusi aperti negli ultimi 12 mesi. */
    faultsLast12Months: number;
    /** Guasti chiusi in totale (storico completo). */
    faultsTotal: number;
    /** Giorni medi tra un guasto e il successivo; null con meno di due guasti. */
    mtbfDays: number | null;
    /** Ore medie di lavoro per guasto, sugli interventi con ore registrate; null se nessuno ne ha. */
    mttrHours: number | null;
    /** Quanti interventi hanno ore registrate (la base del MTTR). */
    faultsWithHours: number;
    /** Giorni dall'ultimo guasto; null se non ce ne sono. */
    daysSinceLastFault: number | null;
    /** Data dell'ultimo guasto (ISO); null se non ce ne sono. */
    lastFaultAt: string | null;
    /** Costo totale di ricambi e manodopera dei guasti chiusi, in euro. */
    totalCost: number;
}

/** Tariffa da applicare: quella del tecnico se maggiore di zero, altrimenti la predefinita. */
export function effectiveRate(technicianRate: number | null | undefined, defaultRate: number): number {
    return technicianRate && technicianRate > 0 ? technicianRate : defaultRate;
}

/** Costo della manodopera di un intervento. `rates`: tariffa oraria per id del tecnico. */
export function laborCost(logs: readonly FaultLaborLog[], rates: ReadonlyMap<string, number>, defaultRate: number): number {
    return logs.reduce((sum, log) => {
        const rate = effectiveRate(log.technicianId ? rates.get(log.technicianId) : undefined, defaultRate);
        return sum + (Number(log.hours) || 0) * rate;
    }, 0);
}

/** Costo dei ricambi di un intervento. */
export function partsCost(parts: readonly FaultPart[]): number {
    return parts.reduce((sum, p) => sum + (Number(p.quantity) || 0) * (Number(p.unitCost) || 0), 0);
}

function toTime(d: Date | string): number {
    return (d instanceof Date ? d : new Date(d)).getTime();
}

/** Stesso giorno di un anno prima (in millisecondi). */
function twelveMonthsBefore(from: Date): number {
    const d = new Date(from.getTime());
    d.setFullYear(d.getFullYear() - 1);
    return d.getTime();
}

export function computeReliability(
    faults: readonly ClosedFault[],
    rates: ReadonlyMap<string, number>,
    defaultRate: number,
    now: Date = new Date()
): ReliabilityIndicators {
    const times = faults.map(f => toTime(f.createdAt)).filter(t => Number.isFinite(t)).sort((a, b) => a - b);

    const since = twelveMonthsBefore(now);
    const faultsLast12Months = times.filter(t => t >= since && t <= now.getTime()).length;

    let mtbfDays: number | null = null;
    if (times.length >= 2) {
        let sum = 0;
        for (let i = 1; i < times.length; i++) sum += times[i] - times[i - 1];
        mtbfDays = sum / (times.length - 1) / DAY_MS;
    }

    let hoursSum = 0;
    let faultsWithHours = 0;
    let totalCost = 0;
    for (const f of faults) {
        const hours = f.laborLogs.reduce((s, l) => s + (Number(l.hours) || 0), 0);
        if (hours > 0) {
            hoursSum += hours;
            faultsWithHours++;
        }
        totalCost += partsCost(f.partsUsed) + laborCost(f.laborLogs, rates, defaultRate);
    }

    const last = times.length ? times[times.length - 1] : null;
    return {
        faultsLast12Months,
        faultsTotal: times.length,
        mtbfDays,
        mttrHours: faultsWithHours > 0 ? hoursSum / faultsWithHours : null,
        faultsWithHours,
        daysSinceLastFault: last === null ? null : Math.max(0, Math.floor((now.getTime() - last) / DAY_MS)),
        lastFaultAt: last === null ? null : new Date(last).toISOString(),
        totalCost,
    };
}

/** Un guasto ancora aperto. */
export interface OpenFault {
    id: string;
    title: string;
    priority: string;
    status: string;
    createdAt: string;
}

/** Il guasto aperto che ferma la macchina (priorita' STOPPED), se c'e': il piu' vecchio. */
export function findStoppingFault<T extends { priority: string; createdAt: string }>(openFaults: readonly T[]): T | null {
    const stopping = openFaults.filter(f => f.priority === 'STOPPED').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return stopping[0] ?? null;
}

export type PlanStatus = 'OVERDUE' | 'ON_TIME';

/** In ritardo se la prossima scadenza e' precedente a oggi (una scadenza di oggi e' ancora in regola). */
export function planStatus(nextDueDate: Date | string, now: Date = new Date()): PlanStatus {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return toTime(nextDueDate) < startOfToday ? 'OVERDUE' : 'ON_TIME';
}

/** Giorni di ritardo di un piano (0 se in regola). */
export function planDaysOverdue(nextDueDate: Date | string, now: Date = new Date()): number {
    if (planStatus(nextDueDate, now) !== 'OVERDUE') return 0;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.max(1, Math.ceil((startOfToday - toTime(nextDueDate)) / DAY_MS));
}

const FREQUENCY_LABELS: Record<string, string> = {
    DAILY: 'Giornaliera',
    WEEKLY: 'Settimanale',
    BIWEEKLY: 'Quindicinale',
    MONTHLY: 'Mensile',
    BIMONTHLY: 'Bimestrale',
    QUARTERLY: 'Trimestrale',
    SEMIANNUAL: 'Semestrale',
    ANNUAL: 'Annuale',
};

/** Frequenza leggibile; un testo libero (es. proposto dall'AI) resta com'e'. */
export function frequencyLabel(frequency: string | null | undefined): string {
    if (!frequency) return 'Non indicata';
    return FREQUENCY_LABELS[frequency.toUpperCase()] ?? frequency;
}

export const HISTORY_KINDS = ['ALL', 'FAULT', 'ROUTINE', 'REQUEST'] as const;
export type HistoryKind = (typeof HISTORY_KINDS)[number];
export const HISTORY_PAGE_SIZE = 25;

export function normalizeHistoryKind(kind: unknown): HistoryKind {
    return (HISTORY_KINDS as readonly unknown[]).includes(kind) ? (kind as HistoryKind) : 'ALL';
}

/** Numero di pagina valido (intero >= 1). */
export function normalizeHistoryPage(page: unknown): number {
    const n = Math.floor(Number(page));
    return Number.isFinite(n) && n >= 1 ? Math.min(n, 10000) : 1;
}
