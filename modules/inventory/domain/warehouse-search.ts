/**
 * Suggerimento assistito dei materiali del magazzino manutenzione mentre si scrive una richiesta.
 *
 * Il testo digitato viene confrontato per parole (senza maiuscole, accenti, plurali e parole vuote, vedi
 * modules/shared/domain/text-matching.ts), non come testo identico: "guanti nitrile L" trova "Guanti in nitrile taglia L".
 * Anche una parola ancora a meta' ("guan") trova gli articoli che iniziano cosi', e la descrizione dell'articolo conta un po' meno del nome.
 */
import { normalizeKey, similarity, tokenize } from '../../shared/domain/text-matching';

export interface WarehouseCandidate {
    id: string;
    name: string;
    description?: string | null;
}

export interface WarehouseMatch<T> {
    item: T;
    /** 0-1: quanto l'articolo corrisponde a quanto scritto. */
    score: number;
    /** Corrispondenza forte: la riga puo' essere agganciata all'articolo con un solo tocco. */
    strong: boolean;
}

/** Sotto questa soglia l'articolo non viene proposto. */
export const SUGGEST_THRESHOLD = 0.4;
/** Da questa soglia in su il suggerimento e' "consigliato". */
export const STRONG_THRESHOLD = 0.85;
export const MAX_SUGGESTIONS = 8;

/** Ogni parola scritta e' l'inizio di una parola dell'articolo (anche gia' completa): serve a suggerire mentre si digita. */
function prefixCovered(queryTokens: string[], targetTokens: string[]): boolean {
    return queryTokens.length > 0 && queryTokens.every(q => targetTokens.some(t => t === q || (q.length >= 2 && t.startsWith(q))));
}

function textScore(query: string, queryTokens: string[], target: string): number {
    const targetTokens = tokenize(target);
    if (targetTokens.length === 0) return 0;
    if (normalizeKey(query) !== '' && normalizeKey(query) === normalizeKey(target)) return 1;
    let score = similarity(query, target);
    if (prefixCovered(queryTokens, targetTokens)) score = Math.max(score, 0.85);
    return score;
}

export function scoreWarehouseCandidate(query: string, candidate: WarehouseCandidate): number {
    const queryTokens = tokenize(query);
    // Un codice con cifre ("6205") deve coincidere: "Cuscinetto 6204" non e' "Cuscinetto 6205"
    const byName = textScore(query, queryTokens, candidate.name);
    const byDescription = candidate.description ? textScore(query, queryTokens, candidate.description) * 0.7 : 0;
    return Math.max(byName, byDescription);
}

/** Articoli da suggerire per `query`, dal piu' adatto; vuoto se il testo non ha parole utili. */
export function rankWarehouseParts<T extends WarehouseCandidate>(query: string, candidates: readonly T[], limit = MAX_SUGGESTIONS): WarehouseMatch<T>[] {
    if (tokenize(query).length === 0) return [];
    return candidates
        .map(item => ({ item, score: scoreWarehouseCandidate(query, item) }))
        .filter(m => m.score >= SUGGEST_THRESHOLD)
        .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'it'))
        .slice(0, limit)
        .map(m => ({ ...m, strong: m.score >= STRONG_THRESHOLD }));
}
