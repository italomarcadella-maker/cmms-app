/**
 * Punteggio di salute di un asset, CALCOLATO (0-100) da guasti, richieste e manutenzione programmata. Funzioni pure, senza database.
 *
 * Tre componenti, ognuno 0-100, combinati con una media pesata (pesi predefiniti 40 / 30 / 30):
 *  - Stato attuale: guasti aperti adesso (100 nessuno, 50 uno che non ferma la macchina, 0 uno che la ferma).
 *  - Frequenza: punti-evento negli ultimi 12 mesi (guasto 1, guasto che ferma la macchina 2, richiesta 0,5) a gradini.
 *  - Manutenzione programmata: piani in ritardo e quota di interventi programmati chiusi entro la scadenza.
 *
 * Senza piani di manutenzione il terzo componente e' "non valutabile": la media si ricalcola sugli altri due e il
 * punteggio non puo' superare un tetto (predefinito 70). Se i dati non bastano il punteggio e' null: mai un 100 senza
 * significato. Il risultato dice sempre da dove vengono i punti persi, cosi' e' spiegabile.
 *
 * Tutti i valori sono modificabili (HealthConfig, salvata in SystemSettings.healthConfig); `parseHealthConfig` riporta
 * ai predefiniti i valori mancanti o assurdi.
 */

export type HealthComponentKey = 'current' | 'frequency' | 'schedule';

export interface FrequencyStep {
    /** Fino a questi punti-evento (compresi) vale `score`. */
    maxPoints: number;
    score: number;
}

export interface HealthConfig {
    /** Pesi dei tre componenti (>= 0, somma > 0). */
    weights: Record<HealthComponentKey, number>;
    /** Tetto del punteggio per gli asset senza piani di manutenzione (0-100). */
    noPlanCap: number;
    /** Punti-evento per guasto, guasto che ferma la macchina, richiesta. */
    eventPoints: { fault: number; stoppingFault: number; request: number };
    /** Finestra di osservazione in mesi. */
    windowMonths: number;
    /** Punteggio del componente "stato attuale". */
    currentScores: { ok: number; fault: number; stopped: number };
    /** Gradini della frequenza, in ordine crescente di punti; oltre l'ultimo vale `frequencyBeyondScore`. */
    frequencySteps: FrequencyStep[];
    frequencyBeyondScore: number;
    /** Punti persi dal componente programmato per ogni piano in ritardo. */
    overduePenalty: number;
    /** Un asset inserito da meno di questi giorni, senza eventi ne' piani, non e' valutabile. */
    minHistoryDays: number;
}

export const DEFAULT_HEALTH_CONFIG: HealthConfig = {
    weights: { current: 40, frequency: 30, schedule: 30 },
    noPlanCap: 70,
    eventPoints: { fault: 1, stoppingFault: 2, request: 0.5 },
    windowMonths: 12,
    currentScores: { ok: 100, fault: 50, stopped: 0 },
    frequencySteps: [
        { maxPoints: 0, score: 100 },
        { maxPoints: 1, score: 80 },
        { maxPoints: 2, score: 60 },
        { maxPoints: 3, score: 40 },
    ],
    frequencyBeyondScore: 20,
    overduePenalty: 25,
    minHistoryDays: 90,
};

export function defaultHealthConfig(): HealthConfig {
    return JSON.parse(JSON.stringify(DEFAULT_HEALTH_CONFIG)) as HealthConfig;
}

// --- Validazione della configurazione ---

function num(v: unknown): number | null {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v.trim().replace(',', '.'));
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function obj(v: unknown): Record<string, unknown> {
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function inRange(v: unknown, min: number, max: number, fallback: number): number {
    const n = num(v);
    return n !== null && n >= min && n <= max ? n : fallback;
}

/**
 * Configurazione valida a partire da un JSON qualsiasi (anche null, parziale o sbagliato): ogni valore mancante o
 * assurdo torna al predefinito. Pesi >= 0 con somma > 0, tetto e punteggi 0-100, punti-evento >= 0, finestra 1-60 mesi.
 */
export function parseHealthConfig(json: unknown): HealthConfig {
    const d = DEFAULT_HEALTH_CONFIG;
    const src = obj(json);

    const w = obj(src.weights);
    let weights: Record<HealthComponentKey, number> = {
        current: inRange(w.current, 0, 1000, d.weights.current),
        frequency: inRange(w.frequency, 0, 1000, d.weights.frequency),
        schedule: inRange(w.schedule, 0, 1000, d.weights.schedule),
    };
    if (!(weights.current + weights.frequency + weights.schedule > 0)) weights = { ...d.weights };

    const ep = obj(src.eventPoints);
    const cs = obj(src.currentScores);

    let steps: FrequencyStep[] = d.frequencySteps.map(s => ({ ...s }));
    if (Array.isArray(src.frequencySteps) && src.frequencySteps.length >= 1 && src.frequencySteps.length <= 10) {
        const parsed: FrequencyStep[] = [];
        let ok = true;
        for (const raw of src.frequencySteps) {
            const o = obj(raw);
            const maxPoints = num(o.maxPoints);
            const score = num(o.score);
            if (maxPoints === null || maxPoints < 0 || score === null || score < 0 || score > 100) { ok = false; break; }
            if (parsed.length && maxPoints <= parsed[parsed.length - 1].maxPoints) { ok = false; break; }
            parsed.push({ maxPoints, score });
        }
        if (ok) steps = parsed;
    }

    const months = num(src.windowMonths);

    return {
        weights,
        noPlanCap: inRange(src.noPlanCap, 0, 100, d.noPlanCap),
        eventPoints: {
            fault: inRange(ep.fault, 0, 1000, d.eventPoints.fault),
            stoppingFault: inRange(ep.stoppingFault, 0, 1000, d.eventPoints.stoppingFault),
            request: inRange(ep.request, 0, 1000, d.eventPoints.request),
        },
        windowMonths: months !== null && Number.isInteger(months) && months >= 1 && months <= 60 ? months : d.windowMonths,
        currentScores: {
            ok: inRange(cs.ok, 0, 100, d.currentScores.ok),
            fault: inRange(cs.fault, 0, 100, d.currentScores.fault),
            stopped: inRange(cs.stopped, 0, 100, d.currentScores.stopped),
        },
        frequencySteps: steps,
        frequencyBeyondScore: inRange(src.frequencyBeyondScore, 0, 100, d.frequencyBeyondScore),
        overduePenalty: inRange(src.overduePenalty, 0, 100, d.overduePenalty),
        minHistoryDays: (() => {
            const n = num(src.minHistoryDays);
            return n !== null && Number.isInteger(n) && n >= 0 && n <= 3650 ? n : d.minHistoryDays;
        })(),
    };
}

// --- Dati in ingresso ---

const CLOSED = new Set(['COMPLETED', 'CLOSED']);
const OPEN = new Set(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'ON_HOLD', 'PENDING_REVIEW']);

export interface HealthOrder {
    /** FAULT | ROUTINE | REQUEST. */
    type: string;
    priority: string;
    status: string;
    createdAt: Date | string;
    dueDate?: Date | string | null;
    completedAt?: Date | string | null;
}

export interface HealthPlan {
    nextDueDate: Date | string;
}

export interface HealthInput {
    /** Quando l'asset e' stato inserito. */
    assetCreatedAt: Date | string;
    /**
     * Ordini dell'asset. Bastano: i guasti aperti, gli ordini creati nella finestra e gli ordini programmati chiusi
     * nella finestra; la funzione filtra comunque da sola.
     */
    orders: readonly HealthOrder[];
    plans: readonly HealthPlan[];
    /** Quanti ordini non annullati l'asset ha avuto in tutta la sua storia (qualunque data): serve a sapere se c'e' storia. */
    totalOrders?: number;
    now?: Date;
}

// --- Risultato ---

export interface HealthLoss {
    component: HealthComponentKey | 'cap';
    /** Punti persi sul punteggio finale (0-100), con un decimale. */
    points: number;
    reason: string;
}

export interface HealthComponent {
    key: HealthComponentKey;
    label: string;
    /** 0-100, oppure null se non valutabile. */
    score: number | null;
    weight: number;
    detail: string;
}

export interface HealthCounts {
    openFaults: number;
    openStoppingFaults: number;
    faultsInWindow: number;
    stoppingFaultsInWindow: number;
    requestsInWindow: number;
    eventPoints: number;
    plans: number;
    overduePlans: number;
    /** Interventi programmati chiusi nella finestra con data di chiusura e scadenza (la base della quota in tempo). */
    routineClosed: number;
    routineOnTime: number;
}

export interface AssetHealthResult {
    /** 0-100, oppure null se non valutabile. */
    score: number | null;
    evaluable: boolean;
    /** Perche' non e' valutabile (italiano); null se lo e'. */
    notEvaluableReason: string | null;
    components: HealthComponent[];
    /** Punti persi con il motivo, dal piu' grande; la somma e' 100 meno il punteggio (salvo arrotondamenti). */
    losses: HealthLoss[];
    /** Vero se il tetto per mancanza di piani e' in vigore (l'asset non ha piani). */
    capped: boolean;
    capValue: number | null;
    capReason: string | null;
    /** Punteggio prima del tetto (null se non valutabile). */
    uncappedScore: number | null;
    counts: HealthCounts;
}

export const COMPONENT_LABELS: Record<HealthComponentKey, string> = {
    current: 'Stato attuale',
    frequency: 'Frequenza degli eventi',
    schedule: 'Manutenzione programmata',
};

export const NO_PLAN_REASON = 'nessun piano di manutenzione';

// --- Utilita' ---

const DAY_MS = 24 * 60 * 60 * 1000;

function toTime(d: Date | string): number {
    return d instanceof Date ? d.getTime() : new Date(d).getTime();
}

/** Inizio del giorno (ora locale del server: stesso criterio di planStatus in asset-reliability). */
function startOfDay(t: number): number {
    const d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

function plural(n: number, one: string, many: string): string {
    return `${n} ${n === 1 ? one : many}`;
}

function monthsLabel(m: number): string {
    return m === 1 ? 'ultimo mese' : `ultimi ${m} mesi`;
}

function itNumber(n: number): string {
    return String(Math.round(n * 10) / 10).replace('.', ',');
}

/** Punteggio a gradini: il primo gradino con `maxPoints >= points`, altrimenti il punteggio "oltre". */
export function frequencyScore(points: number, cfg: HealthConfig): number {
    for (const s of cfg.frequencySteps) if (points <= s.maxPoints) return s.score;
    return cfg.frequencyBeyondScore;
}

/** Inizio della finestra di osservazione: `months` mesi prima di `now`. */
export function windowStart(now: Date, months: number): Date {
    const d = new Date(now.getTime());
    d.setMonth(d.getMonth() - months);
    return d;
}

// --- Calcolo ---

export function computeAssetHealth(input: HealthInput, config?: HealthConfig): AssetHealthResult {
    const cfg = config ?? DEFAULT_HEALTH_CONFIG;
    const now = input.now ?? new Date();
    const nowT = now.getTime();
    const from = windowStart(now, cfg.windowMonths).getTime();
    const win = monthsLabel(cfg.windowMonths);

    // --- Conteggi ---
    let openFaults = 0, openStoppingFaults = 0;
    let faultsInWindow = 0, stoppingFaultsInWindow = 0, requestsInWindow = 0, eventPoints = 0;
    let routineClosed = 0, routineOnTime = 0;

    for (const o of input.orders) {
        if (o.status === 'CANCELED') continue;
        const created = toTime(o.createdAt);
        const stopping = o.priority === 'STOPPED';

        if (o.type === 'FAULT' && OPEN.has(o.status)) {
            openFaults++;
            if (stopping) openStoppingFaults++;
        }
        if (created >= from && created <= nowT) {
            if (o.type === 'FAULT') {
                faultsInWindow++;
                if (stopping) { stoppingFaultsInWindow++; eventPoints += cfg.eventPoints.stoppingFault; }
                else eventPoints += cfg.eventPoints.fault;
            } else if (o.type === 'REQUEST') {
                requestsInWindow++;
                eventPoints += cfg.eventPoints.request;
            }
        }
        if (o.type === 'ROUTINE' && CLOSED.has(o.status) && o.completedAt && o.dueDate) {
            const done = toTime(o.completedAt);
            if (done >= from && done <= nowT) {
                routineClosed++;
                if (startOfDay(done) <= startOfDay(toTime(o.dueDate))) routineOnTime++;
            }
        }
    }
    eventPoints = Math.round(eventPoints * 1000) / 1000;

    const startToday = startOfDay(nowT);
    let overduePlans = 0;
    for (const p of input.plans) if (toTime(p.nextDueDate) < startToday) overduePlans++;
    const plans = input.plans.length;

    const counts: HealthCounts = {
        openFaults, openStoppingFaults, faultsInWindow, stoppingFaultsInWindow, requestsInWindow,
        eventPoints, plans, overduePlans, routineClosed, routineOnTime,
    };

    // --- Valutabilita' ---
    const hasEvents = faultsInWindow + requestsInWindow + openFaults > 0;
    const hasPlans = plans > 0;
    const hasHistory = (input.totalOrders ?? input.orders.filter(o => o.status !== 'CANCELED').length) > 0;
    const young = nowT - toTime(input.assetCreatedAt) < cfg.minHistoryDays * DAY_MS;

    const emptyComponents = (): HealthComponent[] =>
        (['current', 'frequency', 'schedule'] as HealthComponentKey[]).map(key => ({
            key, label: COMPONENT_LABELS[key], score: null, weight: cfg.weights[key], detail: 'Dati non sufficienti',
        }));

    if (!hasEvents && !hasPlans && (young || !hasHistory)) {
        return {
            score: null,
            evaluable: false,
            notEvaluableReason: young
                ? `asset inserito da meno di ${cfg.minHistoryDays} giorni, senza guasti, richieste né piani di manutenzione: dati insufficienti per valutarlo`
                : 'nessun guasto, richiesta, piano di manutenzione né storia registrata: dati insufficienti per valutarlo',
            components: emptyComponents(),
            losses: [],
            capped: false,
            capValue: null,
            capReason: null,
            uncappedScore: null,
            counts,
        };
    }

    // --- Componente 1: stato attuale ---
    let currentScore: number;
    let currentDetail: string;
    if (openStoppingFaults > 0) {
        currentScore = cfg.currentScores.stopped;
        currentDetail = openStoppingFaults === openFaults
            ? `${plural(openFaults, 'guasto aperto che ferma la macchina', 'guasti aperti che fermano la macchina')}`
            : `${plural(openFaults, 'guasto aperto', 'guasti aperti')}, di cui ${openStoppingFaults} che ferma${openStoppingFaults === 1 ? '' : 'no'} la macchina`;
    } else if (openFaults > 0) {
        currentScore = cfg.currentScores.fault;
        currentDetail = `${plural(openFaults, 'guasto aperto', 'guasti aperti')}, la macchina non è ferma`;
    } else {
        currentScore = cfg.currentScores.ok;
        currentDetail = 'Nessun guasto aperto';
    }

    // --- Componente 2: frequenza ---
    const freqScore = frequencyScore(eventPoints, cfg);
    let freqDetail: string;
    if (faultsInWindow + requestsInWindow === 0) {
        freqDetail = `Nessun guasto né richiesta negli ${win}`;
    } else {
        const parts: string[] = [];
        if (faultsInWindow > 0) {
            parts.push(`${plural(faultsInWindow, 'guasto', 'guasti')}${stoppingFaultsInWindow > 0 ? ` (${stoppingFaultsInWindow} con macchina ferma)` : ''}`);
        }
        if (requestsInWindow > 0) parts.push(plural(requestsInWindow, 'richiesta', 'richieste'));
        freqDetail = `${parts.join(' e ')} negli ${win}`;
    }

    // --- Componente 3: manutenzione programmata ---
    let schedScore: number | null = null;
    let schedDetail: string;
    let overdueLoss = 0; // sulla scala del componente (0-100)
    let lateLoss = 0;
    if (!hasPlans) {
        schedDetail = 'Nessun piano di manutenzione: non valutabile';
    } else {
        const penaltyScore = Math.max(0, 100 - overduePlans * cfg.overduePenalty);
        let score = penaltyScore;
        const bits: string[] = [];
        bits.push(overduePlans > 0 ? plural(overduePlans, 'piano in ritardo', 'piani in ritardo') : plural(plans, 'piano in regola', 'piani in regola'));
        if (routineClosed > 0) {
            const quota = (routineOnTime / routineClosed) * 100;
            score = Math.min(penaltyScore, quota);
            bits.push(`${routineOnTime} interventi su ${routineClosed} chiusi entro la scadenza`);
            lateLoss = penaltyScore - score;
        }
        overdueLoss = 100 - penaltyScore;
        schedScore = score;
        schedDetail = bits.join('; ');
    }

    // --- Media pesata ---
    const w = cfg.weights;
    const scored: { key: HealthComponentKey; score: number; weight: number }[] = [
        { key: 'current', score: currentScore, weight: w.current },
        { key: 'frequency', score: freqScore, weight: w.frequency },
    ];
    if (schedScore !== null) scored.push({ key: 'schedule', score: schedScore, weight: w.schedule });

    const sumW = scored.reduce((s, c) => s + c.weight, 0);
    // Pesi dei componenti valutabili tutti a zero: media semplice, per non dividere per zero
    const effW = (c: { weight: number }) => (sumW > 0 ? c.weight / sumW : 1 / scored.length);
    const uncapped = scored.reduce((s, c) => s + c.score * effW(c), 0);

    const noPlans = !hasPlans;
    const capped = noPlans;
    let finalScore = uncapped;
    if (noPlans && uncapped > cfg.noPlanCap) finalScore = cfg.noPlanCap;

    // --- Punti persi ---
    const losses: HealthLoss[] = [];
    const lossOf = (component: HealthComponentKey, componentLoss: number, reason: string) => {
        const c = scored.find(s => s.key === component);
        if (!c || componentLoss <= 0) return;
        const pts = round1(componentLoss * effW(c));
        if (pts > 0) losses.push({ component, points: pts, reason });
    };
    lossOf('current', 100 - currentScore, currentDetail);
    lossOf('frequency', 100 - freqScore, freqDetail);
    if (schedScore !== null) {
        if (overdueLoss > 0) lossOf('schedule', overdueLoss, plural(overduePlans, 'piano in ritardo', 'piani in ritardo'));
        if (lateLoss > 0) lossOf('schedule', lateLoss, `${routineOnTime} interventi programmati su ${routineClosed} chiusi entro la scadenza`);
    }
    if (noPlans && uncapped > cfg.noPlanCap) {
        losses.push({ component: 'cap', points: round1(uncapped - cfg.noPlanCap), reason: `tetto di ${itNumber(cfg.noPlanCap)} per ${NO_PLAN_REASON}` });
    }
    losses.sort((a, b) => b.points - a.points);

    const components: HealthComponent[] = [
        { key: 'current', label: COMPONENT_LABELS.current, score: Math.round(currentScore), weight: w.current, detail: currentDetail },
        { key: 'frequency', label: COMPONENT_LABELS.frequency, score: Math.round(freqScore), weight: w.frequency, detail: freqDetail },
        { key: 'schedule', label: COMPONENT_LABELS.schedule, score: schedScore === null ? null : Math.round(schedScore), weight: w.schedule, detail: schedDetail },
    ];

    return {
        score: Math.round(finalScore),
        evaluable: true,
        notEvaluableReason: null,
        components,
        losses,
        capped,
        capValue: noPlans ? cfg.noPlanCap : null,
        capReason: noPlans ? NO_PLAN_REASON : null,
        uncappedScore: Math.round(uncapped),
        counts,
    };
}
