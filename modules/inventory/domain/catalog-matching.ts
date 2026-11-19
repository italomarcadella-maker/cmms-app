/**
 * Riconoscimento dello stesso ricambio in plant diversi.
 *
 * Non esiste un codice articolo comune a tutti gli stabilimenti, quindi l'abbinamento si basa sulla
 * descrizione (vedi modules/shared/domain/text-matching.ts per il confronto).
 */
import { normalizeKey, similarity, tokenize } from '../../shared/domain/text-matching';

export { normalizeKey, similarity, tokenize };

/** Sopra questa soglia due descrizioni vengono considerate lo stesso articolo (unione automatica nel catalogo). */
export const SAME_ITEM_THRESHOLD = 0.85;
/** Sopra questa soglia un articolo compare come "possibile corrispondenza" nella ricerca. */
export const SEARCH_THRESHOLD = 0.5;

export interface CatalogCandidate {
    id: string;
    name: string;
}

/** Voci del catalogo che corrispondono a `query`, dalla piu' simile; include l'eventuale corrispondenza esatta. */
export function rankMatches<T extends CatalogCandidate>(query: string, catalog: T[], threshold = SEARCH_THRESHOLD): (T & { score: number })[] {
    const queryTokens = tokenize(query);
    const queryKey = normalizeKey(query);
    return catalog
        .map(entry => {
            // Ricerca "parziale": tutte le parole digitate presenti nel nome => corrisponde, anche se il nome e' piu' lungo
            const entryTokens = new Set(tokenize(entry.name));
            const covered = queryTokens.length > 0 && queryTokens.every(t => entryTokens.has(t));
            const exact = queryKey !== '' && queryKey === normalizeKey(entry.name);
            const score = exact ? 1 : Math.max(similarity(query, entry.name), covered ? 0.8 : 0);
            return { ...entry, score };
        })
        .filter(e => e.score >= threshold)
        .sort((x, y) => y.score - x.score);
}

/** Voce del catalogo piu' adatta per una nuova descrizione, o null se serve una nuova voce. */
export function findSameItem<T extends CatalogCandidate>(description: string, catalog: T[]): T | null {
    const key = normalizeKey(description);
    const exact = catalog.find(c => normalizeKey(c.name) === key);
    if (exact) return exact;
    let best: { entry: T; score: number } | null = null;
    for (const entry of catalog) {
        const score = similarity(description, entry.name);
        if (score >= SAME_ITEM_THRESHOLD && (!best || score > best.score)) best = { entry, score };
    }
    return best?.entry ?? null;
}
