import { normalizeKey, similarity } from '../../shared/domain/text-matching';

/**
 * Analisi dei guasti sullo storico di tutti gli stabilimenti.
 *
 * Funzioni pure: dato un guasto da analizzare e i casi chiusi in tutti i plant, trovano i casi piu' simili
 * (stesso sintomo, soprattutto sulla stessa macchina) e ne ricavano le azioni piu' coerenti, indicando in quali
 * plant sono state usate. Nessun dato personale entra qui: solo sintomo, causa, soluzione e tempi.
 */

export interface FailureCase {
    plantId: string | null;
    plantName: string;
    assetModel?: string | null;
    assetVendor?: string | null;
    category?: string | null;
    /** Sintomo in sintesi (titolo dell'ordine). */
    title: string;
    /** Testo completo: serve solo al confronto, non viene mostrato agli altri plant. */
    description?: string | null;
    date: string;
    cause?: string | null;
    solution?: string | null;
    prevention?: string | null;
    downtimeMin?: number | null;
    isOwn: boolean;
    /** Solo per i casi del proprio plant: permette di aprire l'ordine. */
    workOrderId?: string;
}

export interface FailureQuery {
    text: string;
    model?: string | null;
    vendor?: string | null;
    category?: string | null;
}

export interface ScoredCase extends FailureCase {
    score: number;
    sameModel: boolean;
}

export interface RecommendedAction {
    action: string;
    occurrences: number;
    plants: string[];
    avgDowntimeMin: number | null;
    /** 0-1: quanto e' coerente con il guasto descritto e quanto e' ricorrente. */
    confidence: number;
    cause?: string | null;
    prevention?: string | null;
}

const same = (a?: string | null, b?: string | null) => !!a && !!b && normalizeKey(a) === normalizeKey(b);

export function scoreCase(query: FailureQuery, c: FailureCase): ScoredCase {
    const text = similarity(query.text, `${c.title} ${c.description ?? ''}`);
    const sameModel = same(query.model, c.assetModel);
    const sameVendor = same(query.vendor, c.assetVendor);
    const sameCategory = !!query.category && query.category === c.category;
    // Il sintomo conta di piu'; la stessa macchina rende il caso molto piu' affidabile
    const score = Math.min(1, 0.65 * text + (sameModel ? 0.25 : 0) + (sameVendor ? 0.05 : 0) + (sameCategory ? 0.05 : 0));
    return { ...c, score: Math.round(score * 100) / 100, sameModel };
}

/** Casi abbastanza simili, dal piu' pertinente; a parita' di punteggio prima quelli con una soluzione registrata. */
export function selectCases(query: FailureQuery, cases: FailureCase[], opts: { minScore?: number; limit?: number } = {}): ScoredCase[] {
    const { minScore = 0.35, limit = 8 } = opts;
    return cases
        .map(c => scoreCase(query, c))
        .filter(c => c.score >= minScore)
        .sort((a, b) => b.score - a.score || Number(!!b.solution) - Number(!!a.solution))
        .slice(0, limit);
}

/** Raggruppa le soluzioni equivalenti (anche scritte in modo diverso) e le ordina per coerenza e ricorrenza. */
export function aggregateActions(scored: ScoredCase[], opts: { limit?: number } = {}): RecommendedAction[] {
    const withSolution = scored.filter(c => c.solution && c.solution.trim().length > 0);
    type Group = { action: string; cases: ScoredCase[] };
    const groups: Group[] = [];

    for (const c of withSolution) {
        const solution = c.solution!.trim();
        const group = groups.find(g => similarity(solution, g.action) >= 0.6);
        if (group) group.cases.push(c);
        else groups.push({ action: solution, cases: [c] }); // il primo e' il piu' pertinente: ordinati per score
    }

    return groups
        .map(g => {
            const avgScore = g.cases.reduce((s, c) => s + c.score, 0) / g.cases.length;
            const plants = [...new Set(g.cases.map(c => c.plantName))];
            const downtimes = g.cases.map(c => c.downtimeMin).filter((d): d is number => typeof d === 'number' && d > 0);
            const best = g.cases[0];
            const confidence = Math.min(0.99, avgScore * (1 + 0.15 * (g.cases.length - 1)) * (plants.length > 1 ? 1.1 : 1));
            return {
                action: g.action,
                occurrences: g.cases.length,
                plants,
                avgDowntimeMin: downtimes.length ? Math.round(downtimes.reduce((s, d) => s + d, 0) / downtimes.length) : null,
                confidence: Math.round(confidence * 100) / 100,
                cause: best.cause ?? null,
                prevention: g.cases.find(c => c.prevention)?.prevention ?? null,
            } satisfies RecommendedAction;
        })
        .sort((a, b) => b.confidence - a.confidence || b.occurrences - a.occurrences)
        .slice(0, opts.limit ?? 5);
}
