/**
 * Confronto di testi brevi (descrizioni di ricambi, sintomi di guasto) senza dipendenze.
 * Normalizza (minuscole, senza accenti e punteggiatura, senza parole vuote, plurali ridotti) e confronta gli
 * insiemi di parole. I codici con cifre ("6205", "2rs") pesano di piu': "Cuscinetto 6205" e "Cuscinetto 6204"
 * non sono la stessa cosa anche se si assomigliano.
 */

const STOP_WORDS = new Set([
    'di', 'del', 'dello', 'della', 'dei', 'degli', 'delle', 'da', 'per', 'con', 'senza', 'il', 'lo', 'la', 'le', 'i', 'gli',
    'un', 'uno', 'una', 'e', 'ed', 'a', 'in', 'su', 'x', 'art', 'cod', 'codice', 'pz', 'pezzi', 'nr', 'n', 'tipo', 'mod', 'modello',
    // preposizioni articolate e forme elise ("dell'albero" -> dell, albero)
    'dal', 'dalla', 'dalle', 'dallo', 'dai', 'dagli', 'dall', 'dell', 'nel', 'nella', 'nelle', 'nello', 'nei', 'negli', 'nell',
    'sul', 'sulla', 'sulle', 'sullo', 'sui', 'sugli', 'sull', 'al', 'alla', 'alle', 'allo', 'ai', 'agli', 'all',
    'che', 'non', 'si', 'sono', 'ha', 'ho', 'dopo', 'prima', 'quando',
]);

function stripAccents(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function stem(token: string): string {
    // Plurali/generi italiani: cuscinetto/cuscinetti, guarnizione/guarnizioni. Solo sulle parole, non sui codici.
    if (/\d/.test(token) || token.length < 5) return token;
    return token.replace(/[aeio]$/, '');
}

/** Parole significative della descrizione, senza duplicati. */
export function tokenize(description: string): string[] {
    const cleaned = stripAccents(description.toLowerCase()).replace(/[^a-z0-9]+/g, ' ').trim();
    if (!cleaned) return [];
    const tokens = cleaned.split(' ').filter(t => t && (t.length > 1 || /\d/.test(t)) && !STOP_WORDS.has(t)).map(stem);
    return [...new Set(tokens)];
}

/** Chiave stabile: stesse parole in ordine diverso o con punteggiatura diversa danno la stessa chiave. */
export function normalizeKey(description: string): string {
    return tokenize(description).sort().join(' ');
}

const hasDigit = (t: string) => /\d/.test(t);

/** Somiglianza tra due descrizioni, da 0 a 1. */
export function similarity(a: string, b: string): number {
    const ta = tokenize(a);
    const tb = tokenize(b);
    if (ta.length === 0 || tb.length === 0) return 0;
    const sb = new Set(tb);
    const shared = ta.filter(t => sb.has(t));
    const inter = shared.length;
    const union = new Set([...ta, ...tb]).size;
    const jaccard = inter / union;
    const containment = inter / Math.min(ta.length, tb.length);
    let score = 0.5 * jaccard + 0.5 * containment;

    // Codici con cifre: se entrambe ne hanno e non ne condividono nessuno, sono articoli diversi
    const na = ta.filter(hasDigit);
    const nb = tb.filter(hasDigit);
    if (na.length > 0 && nb.length > 0) {
        const nbs = new Set(nb);
        if (!na.some(t => nbs.has(t))) score *= 0.25;
    }
    // Una sola parola in comune su descrizioni lunghe non basta
    if (inter < 2 && Math.min(ta.length, tb.length) > 1) score *= 0.6;
    return Math.min(1, score);
}

