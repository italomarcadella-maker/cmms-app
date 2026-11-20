/**
 * Lingue dell'applicazione. L'italiano e' la lingua di partenza: i testi nel codice sono in italiano e FANNO DA CHIAVE
 * (es. t("Salva")). Per le altre lingue c'e' un dizionario in locales/<lingua>.json; se una traduzione manca si vede l'italiano.
 */
export const LOCALES = ['it', 'en', 'fr', 'pl', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'it';
export const LOCALE_COOKIE = 'cmms_locale';
/** Un anno: la scelta della lingua resta sul dispositivo. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export interface LocaleInfo {
    /** Nome della lingua scritto nella lingua stessa (e' quello che si mostra nel selettore). */
    label: string;
    /** Codice per Intl (date, numeri, valute). */
    intl: string;
    /** Valore dell'attributo lang di <html>. */
    html: string;
}

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
    it: { label: 'Italiano', intl: 'it-IT', html: 'it' },
    en: { label: 'English', intl: 'en-GB', html: 'en' },
    fr: { label: 'Français', intl: 'fr-FR', html: 'fr' },
    pl: { label: 'Polski', intl: 'pl-PL', html: 'pl' },
    zh: { label: '中文', intl: 'zh-CN', html: 'zh-CN' },
};

export function isLocale(value: unknown): value is Locale {
    return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Sceglie la lingua dall'intestazione Accept-Language del browser (rispettando l'ordine di preferenza e i valori q),
 * tra quelle supportate; se nessuna corrisponde si usa l'italiano.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
    if (!acceptLanguage) return DEFAULT_LOCALE;
    const ranked = acceptLanguage
        .split(',')
        .map((part, index) => {
            const [tag, ...params] = part.trim().split(';');
            const q = params.map(p => p.trim()).find(p => p.startsWith('q='));
            const weight = q ? Number(q.slice(2)) : 1;
            return { tag: tag.trim().toLowerCase(), weight: Number.isFinite(weight) ? weight : 0, index };
        })
        .filter(x => x.tag && x.tag !== '*' && x.weight > 0)
        .sort((a, b) => b.weight - a.weight || a.index - b.index);
    for (const { tag } of ranked) {
        const primary = tag.split('-')[0];
        if (isLocale(primary)) return primary;
    }
    return DEFAULT_LOCALE;
}
