import { contractState, isInForce, type ContractLike } from './contractors';

/**
 * Linee senza calendario di produzione: quando una linea non ha un calendario (nessuna riga ProductionLine dello stesso
 * stabilimento con lo stesso nome) non ha vincoli di produzione, quindi si propone cosa si puo' fare ora:
 *  1. le attivita' ancora pendenti sulle sue macchine (ordini aperti, ditte esterne, letture dei contatori);
 *  2. le manutenzioni programmate eseguibili (piani scaduti o in scadenza entro l'orizzonte, anticipabili).
 * Funzioni pure: nessun accesso al database.
 */

export const HORIZON_CHOICES = [7, 14, 30, 60] as const;
export type HorizonDays = (typeof HORIZON_CHOICES)[number];
export const DEFAULT_HORIZON_DAYS: HorizonDays = 30;

/** Entro questi giorni una scadenza e' "in scadenza"; oltre (ma dentro l'orizzonte) e' "anticipabile". */
export const SOON_DAYS = 7;

/** Stati degli ordini di lavoro ancora da chiudere. */
export const OPEN_ORDER_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'ON_HOLD', 'PENDING_REVIEW'] as const;

/** Stati di un asset che non e' piu' in uso (rottamato, accantonato): non contano per le linee. */
const NOT_IN_USE_STATUSES = ['DECOMMISSIONED', 'STORAGE'];

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------------------------------------------------
// Regola: la linea ha un calendario di produzione?
// ---------------------------------------------------------------------------------------------------------------------

export interface ConfiguredLine {
    plantId: string | null;
    line: string;
}

/** Nome della linea per i confronti: senza spazi ai bordi e senza distinguere maiuscole e minuscole. */
export function normalizeLineName(name: string | null | undefined): string {
    return (name ?? '').trim().toLowerCase();
}

/**
 * Vero se la linea e' valorizzata e NON esiste un calendario di produzione dello stesso stabilimento con lo stesso nome.
 * E' l'unico punto della regola: in futuro si puo' estendere (es. "fuori dalla finestra di produzione") senza toccare il resto.
 */
export function isLineWithoutProductionCalendar(
    plantId: string | null | undefined,
    lineName: string | null | undefined,
    configuredLines: readonly ConfiguredLine[],
): boolean {
    const wanted = normalizeLineName(lineName);
    if (!wanted) return false; // senza nome non e' una linea
    const plant = plantId ?? null;
    return !configuredLines.some(c => (c.plantId ?? null) === plant && normalizeLineName(c.line) === wanted);
}

export interface LineAsset {
    id: string;
    name: string;
    line: string | null;
    plantId: string | null;
    status: string;
}

/** Un asset "in uso": non un segnaposto di sistema (SYS-*), non rottamato o accantonato. */
export function isAssetInUse(asset: Pick<LineAsset, 'id' | 'status'>): boolean {
    return !asset.id.startsWith('SYS-') && !NOT_IN_USE_STATUSES.includes(asset.status);
}

/** Gli asset in uso che stanno su una linea senza calendario di produzione. */
export function assetsOnLinesWithoutCalendar(assets: readonly LineAsset[], configuredLines: readonly ConfiguredLine[]): LineAsset[] {
    return assets.filter(a => isAssetInUse(a) && isLineWithoutProductionCalendar(a.plantId, a.line, configuredLines));
}

// ---------------------------------------------------------------------------------------------------------------------
// Voci
// ---------------------------------------------------------------------------------------------------------------------

export interface OrderInput {
    id: string;
    title: string;
    type: string;
    priority: string;
    status: string;
    dueDate: Date | null;
    assignedTo: string | null;
    assetId: string;
    originScheduleId: string | null;
}

export interface ScheduleInput {
    id: string;
    taskTitle: string;
    frequency: string;
    frequencyDays: number;
    nextDueDate: Date;
    lastRunDate: Date | null;
    assetId: string;
    assigneeName: string | null;
}

export interface ContractorActivityInput {
    id: string;
    title: string;
    isActive: boolean;
    nextDueDate: Date;
    assetId: string | null;
    assigneeName: string | null;
    contract: ContractLike & { contractorId: string; contractorName: string };
}

export interface MeterInput {
    id: string;
    name: string;
    nextReadingDue: Date | null;
    assetId: string | null;
    assigneeName: string | null;
}

export type OpportunityKind = 'ORDER' | 'CONTRACTOR' | 'METER' | 'PLAN';

/** In ritardo; in scadenza (entro SOON_DAYS); anticipabile (dentro l'orizzonte, oltre SOON_DAYS); da fare (senza urgenza di data). */
export type OpportunityState = 'OVERDUE' | 'DUE_SOON' | 'ANTICIPATABLE' | 'PENDING';

export interface OpportunityItem {
    key: string;
    kind: OpportunityKind;
    /** Id del record di origine (ordine, piano, attivita' della ditta, contatore). */
    refId: string;
    title: string;
    assetId: string;
    assetName: string;
    /** Solo per gli ordini: FAULT, ROUTINE, REQUEST. */
    orderType: string | null;
    priority: string | null;
    status: string | null;
    dueDate: Date | null;
    state: OpportunityState;
    /** Giorni da oggi alla scadenza: negativo se in ritardo; null senza scadenza. */
    days: number | null;
    assigneeName: string | null;
    /** Solo per i piani. */
    frequency: string | null;
    frequencyDays: number | null;
    lastRunDate: Date | null;
    /** Solo per le attivita' delle ditte. */
    contractorId: string | null;
    contractorName: string | null;
}

export interface LineCounts {
    pending: number;
    executable: number;
    overdue: number;
}

export interface LineOpportunity {
    key: string;
    plantId: string | null;
    plantName: string | null;
    line: string;
    pending: OpportunityItem[];
    executable: OpportunityItem[];
    counts: LineCounts;
}

export interface LineOpportunitiesTotals extends LineCounts {
    lines: number;
}

// ---------------------------------------------------------------------------------------------------------------------
// Calcolo
// ---------------------------------------------------------------------------------------------------------------------

function startOfDay(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Giorni di calendario da oggi alla data (negativi se passata). */
export function daysFromToday(date: Date, now: Date): number {
    return Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS);
}

/** Orizzonte valido (0 o piu', intero); un valore non valido vale l'orizzonte predefinito. */
export function sanitizeHorizon(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : DEFAULT_HORIZON_DAYS;
}

/** Stato di una voce in base alla scadenza; `later` e' lo stato di chi scade oltre SOON_DAYS. */
export function opportunityState(days: number | null, later: 'ANTICIPATABLE' | 'PENDING'): OpportunityState {
    if (days === null) return 'PENDING';
    if (days < 0) return 'OVERDUE';
    if (days <= SOON_DAYS) return 'DUE_SOON';
    return later;
}

/** 0 = piu' urgente: ritardo prima di tutto. */
const PRIORITY_BUCKET: Record<string, number> = { STOPPED: 0, MALFUNCTIONING: 1, HIGH: 2 };
const priorityBucket = (p: string | null) => (p && p in PRIORITY_BUCKET ? PRIORITY_BUCKET[p] : 3);

/** Ordine di urgenza: prima chi e' in ritardo, poi priorita' (ferma, malfunzionante, alta, resto), poi la scadenza piu' vicina. */
export function byOpportunityUrgency(a: OpportunityItem, b: OpportunityItem): number {
    const lateA = a.state === 'OVERDUE' ? 0 : 1;
    const lateB = b.state === 'OVERDUE' ? 0 : 1;
    if (lateA !== lateB) return lateA - lateB;
    const prio = priorityBucket(a.priority) - priorityBucket(b.priority);
    if (prio !== 0) return prio;
    const ta = a.dueDate ? a.dueDate.getTime() : Number.POSITIVE_INFINITY;
    const tb = b.dueDate ? b.dueDate.getTime() : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a.key.localeCompare(b.key);
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Testo dello stato, mai solo a colore: "In ritardo di 3 giorni", "In scadenza tra 2 giorni", "Anticipabile (tra 12 giorni)". */
export function describeOpportunityState(state: OpportunityState, days: number | null): string {
    switch (state) {
        case 'OVERDUE': return days === null ? 'In ritardo' : `In ritardo di ${plural(Math.abs(days), 'giorno', 'giorni')}`;
        case 'DUE_SOON': return days === null || days === 0 ? 'In scadenza oggi' : days === 1 ? 'In scadenza domani' : `In scadenza tra ${days} giorni`;
        case 'ANTICIPATABLE': return days === null ? 'Anticipabile' : `Anticipabile (tra ${days} giorni)`;
        default: return 'Da fare';
    }
}

/** Riepilogo in una frase, per il suggerimento nel riquadro AI: "2 linee: 5 attivita' pendenti e 3 manutenzioni programmate eseguibili". */
export function summarizeTotals(t: Pick<LineOpportunitiesTotals, 'lines' | 'pending' | 'executable'>): string {
    const parts: string[] = [];
    if (t.pending > 0) parts.push(plural(t.pending, "attività pendente", "attività pendenti"));
    if (t.executable > 0) parts.push(plural(t.executable, 'manutenzione programmata eseguibile', 'manutenzioni programmate eseguibili'));
    return `${plural(t.lines, 'linea', 'linee')}: ${parts.join(' e ')}`;
}

export interface BuildInput {
    now: Date;
    /** Giorni da oggi entro cui una scadenza e' considerata (0 = solo oggi e il passato). */
    horizonDays: number;
    configuredLines: readonly ConfiguredLine[];
    assets: readonly LineAsset[];
    orders: readonly OrderInput[];
    schedules: readonly ScheduleInput[];
    contractorActivities: readonly ContractorActivityInput[];
    meters: readonly MeterInput[];
    plantNames?: Readonly<Record<string, string>>;
}

/**
 * Costruisce, per ogni linea senza calendario di produzione che ha almeno una voce, le attivita' pendenti e le
 * manutenzioni programmate eseguibili. Le linee senza voci non compaiono.
 */
export function buildLineOpportunities(input: BuildInput): { lines: LineOpportunity[]; totals: LineOpportunitiesTotals } {
    const { now, configuredLines } = input;
    const horizon = sanitizeHorizon(input.horizonDays);

    // Asset in uso su linee senza calendario, raggruppati per (stabilimento, nome linea normalizzato)
    const assetById = new Map<string, LineAsset>();
    const groups = new Map<string, { plantId: string | null; line: string; assetIds: Set<string> }>();
    for (const a of assetsOnLinesWithoutCalendar(input.assets, configuredLines)) {
        assetById.set(a.id, a);
        const name = (a.line ?? '').trim();
        const key = `${a.plantId ?? ''}|${normalizeLineName(name)}`;
        const g = groups.get(key) ?? { plantId: a.plantId, line: name, assetIds: new Set<string>() };
        g.assetIds.add(a.id);
        groups.set(key, g);
    }
    const groupKeyOfAsset = new Map<string, string>();
    for (const [key, g] of groups) for (const id of g.assetIds) groupKeyOfAsset.set(id, key);

    const pending = new Map<string, OpportunityItem[]>();
    const executable = new Map<string, OpportunityItem[]>();
    const push = (map: Map<string, OpportunityItem[]>, key: string, item: OpportunityItem) => {
        const list = map.get(key);
        if (list) list.push(item); else map.set(key, [item]);
    };
    const base = { orderType: null, priority: null, status: null, frequency: null, frequencyDays: null, lastRunDate: null, contractorId: null, contractorName: null, assigneeName: null } as const;

    // 1a. Ordini aperti (tutti: sono gia' pendenti). Chi ha un ordine aperto generato da un piano "occupa" il piano.
    const plansWithOpenOrder = new Set<string>();
    for (const o of input.orders) {
        if (!(OPEN_ORDER_STATUSES as readonly string[]).includes(o.status)) continue;
        if (o.originScheduleId) plansWithOpenOrder.add(o.originScheduleId);
        const asset = assetById.get(o.assetId);
        const gk = groupKeyOfAsset.get(o.assetId);
        if (!asset || !gk) continue;
        const days = o.dueDate ? daysFromToday(o.dueDate, now) : null;
        const assigned = o.assignedTo && o.assignedTo !== 'Unassigned' ? o.assignedTo : null;
        push(pending, gk, {
            ...base, key: `ORDER:${o.id}`, kind: 'ORDER', refId: o.id, title: o.title, assetId: asset.id, assetName: asset.name,
            orderType: o.type, priority: o.priority, status: o.status, dueDate: o.dueDate, days,
            state: opportunityState(days, 'PENDING'), assigneeName: assigned,
        });
    }

    // 1b. Attivita' delle ditte esterne: attive, su un contratto in vigore, in ritardo o in scadenza entro l'orizzonte
    for (const c of input.contractorActivities) {
        if (!c.isActive || !c.assetId) continue;
        if (!isInForce(contractState(c.contract, now))) continue;
        const asset = assetById.get(c.assetId);
        const gk = groupKeyOfAsset.get(c.assetId);
        if (!asset || !gk) continue;
        const days = daysFromToday(c.nextDueDate, now);
        if (days > horizon) continue;
        push(pending, gk, {
            ...base, key: `CONTRACTOR:${c.id}`, kind: 'CONTRACTOR', refId: c.id, title: c.title, assetId: asset.id, assetName: asset.name,
            dueDate: c.nextDueDate, days, state: opportunityState(days, 'ANTICIPATABLE'), assigneeName: c.assigneeName,
            contractorId: c.contract.contractorId, contractorName: c.contract.contractorName,
        });
    }

    // 1c. Letture dei contatori in ritardo o entro l'orizzonte
    for (const m of input.meters) {
        if (!m.assetId || !m.nextReadingDue) continue;
        const asset = assetById.get(m.assetId);
        const gk = groupKeyOfAsset.get(m.assetId);
        if (!asset || !gk) continue;
        const days = daysFromToday(m.nextReadingDue, now);
        if (days > horizon) continue;
        push(pending, gk, {
            ...base, key: `METER:${m.id}`, kind: 'METER', refId: m.id, title: `Lettura contatore: ${m.name}`, assetId: asset.id, assetName: asset.name,
            dueDate: m.nextReadingDue, days, state: opportunityState(days, 'ANTICIPATABLE'), assigneeName: m.assigneeName,
        });
    }

    // 2. Manutenzioni programmate eseguibili: scadute o in scadenza entro l'orizzonte, senza un ordine aperto gia' generato
    for (const s of input.schedules) {
        if (plansWithOpenOrder.has(s.id)) continue;
        const asset = assetById.get(s.assetId);
        const gk = groupKeyOfAsset.get(s.assetId);
        if (!asset || !gk) continue;
        const days = daysFromToday(s.nextDueDate, now);
        if (days > horizon) continue;
        push(executable, gk, {
            ...base, key: `PLAN:${s.id}`, kind: 'PLAN', refId: s.id, title: s.taskTitle, assetId: asset.id, assetName: asset.name,
            dueDate: s.nextDueDate, days, state: opportunityState(days, 'ANTICIPATABLE'), assigneeName: s.assigneeName,
            frequency: s.frequency, frequencyDays: s.frequencyDays, lastRunDate: s.lastRunDate,
        });
    }

    const lines: LineOpportunity[] = [];
    for (const [key, g] of groups) {
        const p = (pending.get(key) ?? []).sort(byOpportunityUrgency);
        const e = (executable.get(key) ?? []).sort(byOpportunityUrgency);
        if (p.length === 0 && e.length === 0) continue;
        lines.push({
            key, plantId: g.plantId, plantName: g.plantId ? input.plantNames?.[g.plantId] ?? null : null, line: g.line,
            pending: p, executable: e,
            counts: { pending: p.length, executable: e.length, overdue: [...p, ...e].filter(i => i.state === 'OVERDUE').length },
        });
    }
    lines.sort((a, b) => (a.plantName ?? '').localeCompare(b.plantName ?? '', 'it') || a.line.localeCompare(b.line, 'it'));

    const totals = lines.reduce<LineOpportunitiesTotals>(
        (t, l) => ({ lines: t.lines + 1, pending: t.pending + l.counts.pending, executable: t.executable + l.counts.executable, overdue: t.overdue + l.counts.overdue }),
        { lines: 0, pending: 0, executable: 0, overdue: 0 },
    );
    return { lines, totals };
}
