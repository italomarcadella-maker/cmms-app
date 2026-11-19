/**
 * Pareto delle macchine piu' problematiche. Funzioni pure, senza database: ricevono eventi gia' letti.
 *
 * Eventi che contano: ordini di tipo guasto e richiesta non annullati nel periodo. Punti-evento (stessi pesi del calcolo
 * di salute degli asset): guasto 1, guasto con macchina ferma 2, richiesta 0,5. I pesi sono un parametro, cosi' la logica
 * non dipende dal database.
 *
 * Metriche: interventi pesati (punti), ore di lavoro registrate, costo (ricambi + manodopera).
 * Il tempo di fermo non e' proposto: non esiste una durata registrata.
 */

export type ParetoMetric = 'EVENTS' | 'HOURS' | 'COST';
export type ParetoMonths = 3 | 6 | 12;
export type ParetoEventType = 'FAULT' | 'REQUEST';

export const PARETO_MONTHS: readonly ParetoMonths[] = [3, 6, 12];
export const PARETO_METRICS: readonly ParetoMetric[] = ['EVENTS', 'HOURS', 'COST'];

export interface ParetoWeights {
    faultWeight: number;
    stoppedFaultWeight: number;
    requestWeight: number;
}

export const DEFAULT_PARETO_WEIGHTS: ParetoWeights = { faultWeight: 1, stoppedFaultWeight: 2, requestWeight: 0.5 };

/** Soglia cumulata che definisce le "poche vitali" (in percentuale). */
export const PARETO_THRESHOLD = 80;
/** Numero massimo di macchine mostrate prima della riga "Altre". */
export const PARETO_MAX_MACHINES = 15;
/** Sotto questo numero di eventi nel periodo il Pareto non e' significativo. */
export const PARETO_MIN_EVENTS = 3;

const isWeight = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/**
 * Pesi dal campo `SystemSettings.healthConfig` (Json). Accetta le chiavi `faultWeight`, `stoppedFaultWeight`,
 * `requestWeight` al primo livello oppure dentro `weights`. Ogni valore mancante o non valido (non numerico, negativo)
 * torna al predefinito 1 / 2 / 0,5; se i tre pesi sono tutti zero si usano i predefiniti.
 */
export function normalizeParetoWeights(raw: unknown): ParetoWeights {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_PARETO_WEIGHTS };
    const obj = raw as Record<string, unknown>;
    const nested = obj.weights && typeof obj.weights === 'object' && !Array.isArray(obj.weights) ? (obj.weights as Record<string, unknown>) : {};
    // La configurazione di salute degli asset salva i punti-evento in `eventPoints` (fault, stoppingFault, request)
    const points = obj.eventPoints && typeof obj.eventPoints === 'object' && !Array.isArray(obj.eventPoints) ? (obj.eventPoints as Record<string, unknown>) : {};
    const pointsKey: Record<keyof ParetoWeights, string> = { faultWeight: 'fault', stoppedFaultWeight: 'stoppingFault', requestWeight: 'request' };
    const pick = (key: keyof ParetoWeights): number => {
        const direct = obj[key];
        if (isWeight(direct)) return direct;
        const inner = nested[key];
        if (isWeight(inner)) return inner;
        const fromPoints = points[pointsKey[key]];
        if (isWeight(fromPoints)) return fromPoints;
        return DEFAULT_PARETO_WEIGHTS[key];
    };
    const w: ParetoWeights = {
        faultWeight: pick('faultWeight'),
        stoppedFaultWeight: pick('stoppedFaultWeight'),
        requestWeight: pick('requestWeight'),
    };
    if (w.faultWeight === 0 && w.stoppedFaultWeight === 0 && w.requestWeight === 0) return { ...DEFAULT_PARETO_WEIGHTS };
    return w;
}

export function normalizeParetoMonths(v: unknown): ParetoMonths {
    const n = Number(v);
    return (PARETO_MONTHS as readonly number[]).includes(n) ? (n as ParetoMonths) : 12;
}

export function normalizeParetoMetric(v: unknown): ParetoMetric {
    return (PARETO_METRICS as readonly unknown[]).includes(v) ? (v as ParetoMetric) : 'EVENTS';
}

/** Un evento (guasto o richiesta) con i valori gia' calcolati: ore e costo sono quelli dell'ordine. */
export interface ParetoEvent {
    assetId: string;
    assetName: string;
    department?: string | null;
    line?: string | null;
    type: ParetoEventType;
    priority?: string | null;
    category?: string | null;
    /** Somma delle ore registrate sull'ordine. */
    hours: number;
    /** Ricambi + manodopera, in euro. */
    cost: number;
}

export interface CategoryCount {
    category: string;
    count: number;
}

export interface ParetoRow {
    /** null per la riga "Altre n macchine". */
    assetId: string | null;
    name: string;
    department: string | null;
    line: string | null;
    isOthers: boolean;
    /** Quante macchine raccoglie la riga (1, o n per "Altre"). */
    machineCount: number;
    /** Valore della metrica scelta (punti, ore o euro). */
    value: number;
    /** Solo per la metrica interventi: punti dei guasti e delle richieste (la somma e' `value`). */
    faultValue: number;
    requestValue: number;
    faults: number;
    stoppedFaults: number;
    requests: number;
    hours: number;
    cost: number;
    /** Percentuale sul totale (0-100). */
    sharePct: number;
    /** Percentuale cumulata fino a questa riga compresa (0-100). */
    cumulativePct: number;
    /** Fa parte delle "poche vitali": le macchine che servono per arrivare al 80% cumulato. */
    vital: boolean;
    /** Eventi per categoria, dal piu' frequente. */
    categories: CategoryCount[];
}

export interface ParetoResult {
    rows: ParetoRow[];
    metric: ParetoMetric;
    /** Somma della metrica su tutte le macchine (con valore > 0). */
    totalValue: number;
    /** Eventi nel periodo (guasti + richieste), anche di macchine con valore 0. */
    totalEvents: number;
    totalFaults: number;
    totalStoppedFaults: number;
    totalRequests: number;
    /** Macchine con almeno un evento. */
    machinesWithEvents: number;
    /** Macchine con valore > 0 (quelle del Pareto). */
    machines: number;
    /** Quante macchine sono "poche vitali" (su tutte, anche oltre la riga "Altre"). */
    vitalCount: number;
    /** Quota del totale delle poche vitali (0-100). */
    vitalSharePct: number;
    /** Meno di PARETO_MIN_EVENTS eventi: niente grafico. */
    insufficient: boolean;
}

export interface BuildParetoOptions {
    maxMachines?: number;
    threshold?: number;
    minEvents?: number;
}

interface AssetTotals {
    assetId: string;
    name: string;
    department: string | null;
    line: string | null;
    faults: number;
    stoppedFaults: number;
    requests: number;
    faultPoints: number;
    requestPoints: number;
    hours: number;
    cost: number;
    categories: Map<string, number>;
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Punti-evento di un singolo evento. */
export function eventPoints(event: Pick<ParetoEvent, 'type' | 'priority'>, weights: ParetoWeights): number {
    if (event.type === 'REQUEST') return weights.requestWeight;
    return event.priority === 'STOPPED' ? weights.stoppedFaultWeight : weights.faultWeight;
}

/** Arrotonda ai centesimi per togliere il rumore dei numeri decimali (somme di ore e importi). */
const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
const round1 = (v: number) => Math.round((v + Number.EPSILON) * 10) / 10;

function aggregate(events: readonly ParetoEvent[], weights: ParetoWeights): Map<string, AssetTotals> {
    const byAsset = new Map<string, AssetTotals>();
    for (const e of events) {
        let t = byAsset.get(e.assetId);
        if (!t) {
            t = {
                assetId: e.assetId, name: e.assetName, department: e.department ?? null, line: e.line ?? null,
                faults: 0, stoppedFaults: 0, requests: 0, faultPoints: 0, requestPoints: 0, hours: 0, cost: 0,
                categories: new Map(),
            };
            byAsset.set(e.assetId, t);
        }
        const pts = eventPoints(e, weights);
        if (e.type === 'REQUEST') {
            t.requests += 1;
            t.requestPoints += pts;
        } else {
            t.faults += 1;
            if (e.priority === 'STOPPED') t.stoppedFaults += 1;
            t.faultPoints += pts;
        }
        t.hours += Math.max(0, num(e.hours));
        t.cost += Math.max(0, num(e.cost));
        const cat = e.category || 'OTHER';
        t.categories.set(cat, (t.categories.get(cat) ?? 0) + 1);
    }
    return byAsset;
}

function metricValue(t: AssetTotals, metric: ParetoMetric): number {
    if (metric === 'HOURS') return t.hours;
    if (metric === 'COST') return t.cost;
    return t.faultPoints + t.requestPoints;
}

function sortedCategories(map: ReadonlyMap<string, number>): CategoryCount[] {
    return Array.from(map.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

/**
 * Costruisce il Pareto: ordina le macchine per la metrica (decrescente; a parita' piu' punti, poi nome), esclude quelle con
 * valore 0, calcola la cumulata, marca le poche vitali (la riga che raggiunge la soglia e' compresa, minimo una) e
 * limita a `maxMachines` righe piu' la riga "Altre n macchine", che entra nella cumulata.
 */
export function buildPareto(
    events: readonly ParetoEvent[],
    metric: ParetoMetric,
    weights: ParetoWeights = DEFAULT_PARETO_WEIGHTS,
    options: BuildParetoOptions = {},
): ParetoResult {
    const maxMachines = Math.max(1, Math.floor(options.maxMachines ?? PARETO_MAX_MACHINES));
    const threshold = options.threshold ?? PARETO_THRESHOLD;
    const minEvents = options.minEvents ?? PARETO_MIN_EVENTS;

    const byAsset = aggregate(events, weights);
    const totalFaults = Array.from(byAsset.values()).reduce((s, t) => s + t.faults, 0);
    const totalStopped = Array.from(byAsset.values()).reduce((s, t) => s + t.stoppedFaults, 0);
    const totalRequests = Array.from(byAsset.values()).reduce((s, t) => s + t.requests, 0);

    const base = {
        metric,
        totalEvents: events.length,
        totalFaults,
        totalStoppedFaults: totalStopped,
        totalRequests,
        machinesWithEvents: byAsset.size,
    };

    // Valore tolto il rumore dei decimali; le macchine con valore 0 non entrano
    const ranked = Array.from(byAsset.values())
        .map(t => ({ t, value: round2(metricValue(t, metric)) }))
        .filter(x => x.value > 0)
        .sort((a, b) =>
            b.value - a.value
            || (b.t.faultPoints + b.t.requestPoints) - (a.t.faultPoints + a.t.requestPoints)
            || a.t.name.localeCompare(b.t.name, 'it')
            || a.t.assetId.localeCompare(b.t.assetId));

    const insufficient = events.length < minEvents;
    const totalValue = round2(ranked.reduce((s, x) => s + x.value, 0));

    if (insufficient || ranked.length === 0 || totalValue <= 0) {
        return { ...base, rows: [], totalValue, machines: ranked.length, vitalCount: 0, vitalSharePct: 0, insufficient };
    }

    // Poche vitali: si somma finche' la cumulata non raggiunge la soglia (la riga che la raggiunge e' inclusa)
    const vitalFlags: boolean[] = [];
    let running = 0;
    let reached = false;
    let vitalCount = 0;
    let vitalValue = 0;
    for (const x of ranked) {
        if (reached) {
            vitalFlags.push(false);
            continue;
        }
        vitalFlags.push(true);
        running += x.value;
        vitalCount += 1;
        vitalValue = running;
        // Tolleranza per l'errore dei decimali: 80,0000001 / 79,9999999 sono 80
        if ((running / totalValue) * 100 >= threshold - 1e-9) reached = true;
    }

    const toRow = (t: AssetTotals, value: number, vital: boolean, cumulative: number): ParetoRow => ({
        assetId: t.assetId,
        name: t.name,
        department: t.department,
        line: t.line,
        isOthers: false,
        machineCount: 1,
        value,
        faultValue: round2(t.faultPoints),
        requestValue: round2(t.requestPoints),
        faults: t.faults,
        stoppedFaults: t.stoppedFaults,
        requests: t.requests,
        hours: round2(t.hours),
        cost: round2(t.cost),
        sharePct: (value / totalValue) * 100,
        cumulativePct: Math.min(100, (cumulative / totalValue) * 100),
        vital,
        categories: sortedCategories(t.categories),
    });

    const rows: ParetoRow[] = [];
    let cum = 0;
    const shown = ranked.slice(0, maxMachines);
    shown.forEach((x, i) => {
        cum += x.value;
        rows.push(toRow(x.t, x.value, vitalFlags[i], cum));
    });

    const rest = ranked.slice(maxMachines);
    if (rest.length > 0) {
        const cats = new Map<string, number>();
        let value = 0, faultValue = 0, requestValue = 0, faults = 0, stopped = 0, requests = 0, hours = 0, cost = 0;
        for (const x of rest) {
            value += x.value;
            faultValue += x.t.faultPoints;
            requestValue += x.t.requestPoints;
            faults += x.t.faults;
            stopped += x.t.stoppedFaults;
            requests += x.t.requests;
            hours += x.t.hours;
            cost += x.t.cost;
            x.t.categories.forEach((c, k) => cats.set(k, (cats.get(k) ?? 0) + c));
        }
        rows.push({
            assetId: null,
            name: rest.length === 1 ? 'Altra macchina' : `Altre ${rest.length} macchine`,
            department: null,
            line: null,
            isOthers: true,
            machineCount: rest.length,
            value: round2(value),
            faultValue: round2(faultValue),
            requestValue: round2(requestValue),
            faults, stoppedFaults: stopped, requests,
            hours: round2(hours),
            cost: round2(cost),
            sharePct: (value / totalValue) * 100,
            cumulativePct: 100,
            vital: false,
            categories: sortedCategories(cats),
        });
    }

    return {
        ...base,
        rows,
        totalValue,
        machines: ranked.length,
        vitalCount,
        vitalSharePct: Math.min(100, (vitalValue / totalValue) * 100),
        insufficient: false,
    };
}

/** Percentuale con una cifra decimale, per i test e per i testi (es. 82,4). */
export function roundPct(v: number): number {
    return round1(v);
}
