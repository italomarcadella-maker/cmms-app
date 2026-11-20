/**
 * Traduzione dei testi (logica pura, senza dipendenze). La chiave e' il testo in italiano; i segnaposto sono {nome}:
 *   t("Ordini aperti: {count}", { count: 3 })
 * Se la traduzione manca si usa la chiave (cioe' l'italiano), mai un errore.
 */
export type Params = Record<string, string | number>;
export type Dictionary = Record<string, string>;

export function interpolate(template: string, params?: Params): string {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) => (Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match));
}

export function translate(dict: Dictionary | undefined, key: string, params?: Params): string {
    const found = dict && Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : undefined;
    return interpolate(found ? found : key, params);
}

/** Nomi dei segnaposto di un testo, senza duplicati e in ordine alfabetico: serve a controllare che le traduzioni li mantengano. */
export function placeholders(text: string): string[] {
    return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]))].sort();
}

/**
 * Segna un testo italiano da tradurre quando e' dichiarato FUORI da un componente (costanti, etichette di stato, voci di menu).
 * Non traduce: restituisce il testo com'e'. Al momento di mostrarlo si usa t():
 *   const LABELS = { OPEN: tk("Aperto") };   ...   {t(LABELS[status])}
 * Serve perche' lo strumento che raccoglie i testi da tradurre riconosce t("...") e tk("...").
 */
export const tk = (text: string): string => text;
