import { DEFAULT_LOCALE, LOCALE_INFO, type Locale } from './config';
import { translate, type Dictionary, type Params } from './translate';
import { makeFormatter, type Formatter } from './format';

/**
 * Lingua corrente per il codice che gira FUORI da React ma nel browser: i messaggi toast e i gestori di eventi.
 * Si imposta solo nel browser: sul server una variabile globale sarebbe condivisa tra richieste di utenti diversi.
 * Nei componenti usa useT() / useFormat(); sul server getT() / getFormat().
 */
let current: { locale: Locale; dict: Dictionary } = { locale: DEFAULT_LOCALE, dict: {} };

export function setRuntimeLocale(locale: Locale, dict: Dictionary): void {
    if (typeof window === 'undefined') return;
    current = { locale, dict };
}

export function runtimeLocale(): Locale {
    return current.locale;
}

/** Traduce un testo (chiave italiana) con la lingua corrente del browser. */
export function rt(key: string, params?: Params): string {
    return translate(current.dict, key, params);
}

export function runtimeFormatter(): Formatter {
    return makeFormatter(current.locale);
}

export function runtimeIntl(): string {
    return LOCALE_INFO[current.locale].intl;
}
