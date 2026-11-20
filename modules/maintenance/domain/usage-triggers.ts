/**
 * Piani di manutenzione "a consumo": scattano quando un contatore (ore di funzionamento, cicli, kWh...) avanza di un intervallo
 * dall'ultima esecuzione. Funzioni pure, senza database.
 *
 * Regola di fondo: mai valori inventati.
 *  - Il consumo e' la differenza tra il valore attuale (ultima lettura) e il valore all'ultima esecuzione (`lastMeterValue`).
 *    Se `lastMeterValue` manca, la base e' la prima lettura disponibile.
 *  - Un valore che SCENDE (contatore azzerato o sostituito) non e' consumo: quel tratto viene ignorato e il conteggio riparte
 *    dal nuovo valore. Il consumo avvenuto prima dell'azzeramento, se non registrato, non e' noto e non viene stimato.
 *  - La data di scadenza e' STIMATA solo con almeno due letture utili: consumo medio giornaliero sulle ultime letture, proiettato
 *    sul residuo. Altrimenti null.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Quante delle ultime letture entrano nel consumo medio giornaliero. */
export const USAGE_RATE_WINDOW = 10;
/** Oltre questo orizzonte la stima non e' piu' significativa: si restituisce null. */
export const MAX_ESTIMATE_DAYS = 36_500;
/** Valore segnaposto della scadenza per i piani a consumo senza stima: oggi + 5 anni, cosi' non risultano scaduti. */
export const PLACEHOLDER_YEARS = 5;

export interface UsageReading {
    value: number;
    date: Date | string;
}

export interface UsagePlanInput {
    /** Ogni quante unita' del contatore va fatta la manutenzione. */
    interval: number | null | undefined;
    /** Valore del contatore all'ultima esecuzione; null = non ancora noto. */
    lastMeterValue: number | null | undefined;
}

export interface UsageStatus {
    /** Intervallo valido (numero finito > 0). */
    validInterval: boolean;
    /** C'e' almeno una lettura valida. */
    hasReadings: boolean;
    interval: number | null;
    /** Valore del contatore da cui si conta il consumo. */
    baseline: number | null;
    /** Ultima lettura. */
    currentValue: number | null;
    /** Data dell'ultima lettura (ISO). */
    lastReadingDate: string | null;
    /** Consumo dall'ultima esecuzione (>= 0). */
    consumed: number | null;
    /** Quota dell'intervallo usata, in percentuale (puo' superare 100). */
    usedPct: number | null;
    /** Quanto manca alla scadenza (0 se scaduto). */
    remaining: number | null;
    /** Consumo >= intervallo. */
    overdue: boolean;
    /** Consumo medio giornaliero dalle ultime letture; null con meno di due letture utili o consumo nullo. */
    avgDailyUsage: number | null;
    /** Data di scadenza stimata; null se non calcolabile o se e' gia' scaduto. */
    estimatedDueDate: Date | null;
}

const EMPTY: UsageStatus = {
    validInterval: false,
    hasReadings: false,
    interval: null,
    baseline: null,
    currentValue: null,
    lastReadingDate: null,
    consumed: null,
    usedPct: null,
    remaining: null,
    overdue: false,
    avgDailyUsage: null,
    estimatedDueDate: null,
};

export function isValidInterval(interval: unknown): interval is number {
    return typeof interval === 'number' && Number.isFinite(interval) && interval > 0;
}

function toTime(d: Date | string): number {
    return (d instanceof Date ? d : new Date(d)).getTime();
}

/** Letture valide (valore e data finiti), in ordine di data crescente. */
export function sortReadings(readings: readonly UsageReading[]): { value: number; time: number }[] {
    return readings
        .map(r => ({ value: Number(r.value), time: toTime(r.date) }))
        .filter(r => Number.isFinite(r.value) && Number.isFinite(r.time))
        .sort((a, b) => a.time - b.time);
}

/** Somma degli incrementi positivi tra letture consecutive: i cali (azzeramenti) valgono zero. */
function positiveDeltaSum(series: readonly { value: number }[]): number {
    let sum = 0;
    for (let i = 1; i < series.length; i++) {
        const delta = series[i].value - series[i - 1].value;
        if (delta > 0) sum += delta;
    }
    return sum;
}

/**
 * Consumo dalla base e base effettivamente usata.
 *  - Base nota e presente tra le letture (ultima lettura con quel valore): si contano gli incrementi da li' in poi.
 *  - Base nota ma non tra le letture: se il valore attuale e' >= base e' la differenza; se e' sceso (contatore azzerato)
 *    si contano gli incrementi dall'ultimo azzeramento.
 *  - Base non nota: prima lettura, incrementi su tutta la serie.
 */
function consumptionSince(
    series: readonly { value: number }[],
    lastMeterValue: number | null | undefined
): { baseline: number; consumed: number } {
    const current = series[series.length - 1].value;
    const hasBase = typeof lastMeterValue === 'number' && Number.isFinite(lastMeterValue);

    if (!hasBase) return { baseline: series[0].value, consumed: positiveDeltaSum(series) };

    const base = lastMeterValue as number;
    let idx = -1;
    for (let i = series.length - 1; i >= 0; i--) {
        if (series[i].value === base) {
            idx = i;
            break;
        }
    }
    if (idx >= 0) return { baseline: base, consumed: positiveDeltaSum(series.slice(idx)) };

    if (current >= base) return { baseline: base, consumed: current - base };

    // Il contatore e' sceso sotto la base senza che la base compaia tra le letture: azzeramento. Si riparte dall'ultimo calo.
    let lastDrop = 0;
    for (let i = series.length - 1; i > 0; i--) {
        if (series[i].value < series[i - 1].value) {
            lastDrop = i;
            break;
        }
    }
    return { baseline: base, consumed: positiveDeltaSum(series.slice(lastDrop)) };
}

/** Consumo medio giornaliero sulle ultime letture (tratti con calo ed esclusi dal calcolo, anche nel tempo). Null se non calcolabile. */
export function averageDailyUsage(readings: readonly UsageReading[], windowSize: number = USAGE_RATE_WINDOW): number | null {
    const series = sortReadings(readings).slice(-Math.max(2, windowSize));
    let delta = 0;
    let days = 0;
    for (let i = 1; i < series.length; i++) {
        const dv = series[i].value - series[i - 1].value;
        const dt = (series[i].time - series[i - 1].time) / DAY_MS;
        if (dv < 0 || dt <= 0) continue; // azzeramento o letture nello stesso istante
        delta += dv;
        days += dt;
    }
    if (days <= 0 || delta <= 0) return null;
    return delta / days;
}

/** Stato di un piano a consumo rispetto alle letture del suo contatore. */
export function computeUsageStatus(plan: UsagePlanInput, readings: readonly UsageReading[]): UsageStatus {
    const validInterval = isValidInterval(plan.interval);
    if (!validInterval) return { ...EMPTY };
    const interval = plan.interval as number;

    const series = sortReadings(readings);
    if (series.length === 0) return { ...EMPTY, validInterval: true, interval };

    const last = series[series.length - 1];
    const { baseline, consumed } = consumptionSince(series, plan.lastMeterValue);
    const overdue = consumed >= interval;
    const remaining = Math.max(0, interval - consumed);

    const avg = averageDailyUsage(readings);
    let estimatedDueDate: Date | null = null;
    if (!overdue && avg !== null) {
        const daysLeft = remaining / avg;
        if (Number.isFinite(daysLeft) && daysLeft <= MAX_ESTIMATE_DAYS) {
            estimatedDueDate = new Date(last.time + daysLeft * DAY_MS);
        }
    }

    return {
        validInterval: true,
        hasReadings: true,
        interval,
        baseline,
        currentValue: last.value,
        lastReadingDate: new Date(last.time).toISOString(),
        consumed,
        usedPct: (consumed / interval) * 100,
        remaining,
        overdue,
        avgDailyUsage: avg,
        estimatedDueDate,
    };
}

/** Oggi + 5 anni: scadenza segnaposto dei piani a consumo senza stima. */
export function placeholderDueDate(now: Date): Date {
    const d = new Date(now.getTime());
    d.setFullYear(d.getFullYear() + PLACEHOLDER_YEARS);
    return d;
}

/**
 * Scadenza da salvare in `nextDueDate` per un piano a consumo: la stima se c'e', altrimenti il segnaposto.
 * Un piano scaduto per consumo ha scadenza "adesso".
 */
export function dueDateForUsage(status: UsageStatus, now: Date): Date {
    if (status.overdue) return new Date(now.getTime());
    return status.estimatedDueDate ?? placeholderDueDate(now);
}

/**
 * Serve aggiornare `nextDueDate`? Evita scritture inutili a ogni esecuzione: il segnaposto cambia ogni giorno,
 * quindi vale come "gia' a posto" se la data salvata e' ancora oltre i 4 anni; una stima si aggiorna se cambia di almeno un giorno.
 */
export function dueDateNeedsUpdate(current: Date, desired: Date, status: UsageStatus, now: Date): boolean {
    if (!status.overdue && status.estimatedDueDate === null) {
        const fourYears = new Date(now.getTime());
        fourYears.setFullYear(fourYears.getFullYear() + PLACEHOLDER_YEARS - 1);
        return current.getTime() <= fourYears.getTime();
    }
    if (status.overdue) return current.getTime() > now.getTime();
    return Math.abs(current.getTime() - desired.getTime()) >= DAY_MS;
}

// --- Dati inseriti dall'utente ---

export const TRIGGER_TYPES = ['TIME', 'METER'] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export function normalizeTriggerType(value: unknown): TriggerType {
    return value === 'METER' ? 'METER' : 'TIME';
}

export const LEGAL_TEXT_MAX = 200;

/** Testo libero pulito: spazi ai bordi e interni normalizzati, niente caratteri di controllo, max 200 caratteri; vuoto = null. */
export function cleanLegalText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, LEGAL_TEXT_MAX).trim();
    return cleaned === '' ? null : cleaned;
}
