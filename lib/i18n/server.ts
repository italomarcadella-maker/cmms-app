import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_INFO, isLocale, negotiateLocale, type Locale } from './config';
import { getDictionary } from './dictionaries';
import { translate, type Params } from './translate';
import { makeFormatter, type Formatter } from './format';

/**
 * Lingua della richiesta, per componenti e azioni server: prima la scelta salvata nel cookie, poi la lingua del browser
 * (Accept-Language), altrimenti l'italiano. Non usare variabili globali: ogni richiesta ha la sua lingua.
 */
export async function getLocale(): Promise<Locale> {
    try {
        const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
        if (isLocale(stored)) return stored;
        return negotiateLocale((await headers()).get('accept-language'));
    } catch {
        // Fuori da una richiesta (script, test): italiano
        return DEFAULT_LOCALE;
    }
}

export interface ServerI18n {
    locale: Locale;
    intl: string;
    t: (key: string, params?: Params) => string;
    format: Formatter;
}

/** Traduttore e formati per la richiesta in corso: const { t, format } = await getT(); */
export async function getT(): Promise<ServerI18n> {
    const locale = await getLocale();
    const dict = getDictionary(locale);
    return {
        locale,
        intl: LOCALE_INFO[locale].intl,
        t: (key, params) => translate(dict, key, params),
        format: makeFormatter(locale),
    };
}
