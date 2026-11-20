"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { LOCALE_INFO, DEFAULT_LOCALE, type Locale } from "./config";
import { translate, type Dictionary, type Params } from "./translate";
import { makeFormatter, type Formatter } from "./format";
import { setRuntimeLocale } from "./runtime";
import { dateFnsLocale } from "./date-fns-locale";

export type TFunction = (key: string, params?: Params) => string;

interface I18nContextValue {
    locale: Locale;
    t: TFunction;
    format: Formatter;
}

const fallbackFormat = makeFormatter(DEFAULT_LOCALE);
const I18nContext = createContext<I18nContextValue>({
    locale: DEFAULT_LOCALE,
    t: (key, params) => translate(undefined, key, params),
    format: fallbackFormat,
});

/** Fornisce lingua e dizionario ai componenti. Il layout principale lo monta con la lingua scelta dall'utente. */
export function I18nProvider({ locale, dictionary, children }: { locale: Locale; dictionary: Dictionary; children: ReactNode }) {
    // Per toast e gestori di eventi (fuori da React): si imposta solo nel browser, vedi lib/i18n/runtime.ts
    setRuntimeLocale(locale, dictionary);
    const value = useMemo<I18nContextValue>(
        () => ({ locale, t: (key, params) => translate(dictionary, key, params), format: makeFormatter(locale) }),
        [locale, dictionary],
    );
    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** t("Testo in italiano", { segnaposto }) nella lingua dell'utente. */
export function useT(): TFunction {
    return useContext(I18nContext).t;
}

export function useLocale(): Locale {
    return useContext(I18nContext).locale;
}

/** Date, ore, numeri e valute nel formato della lingua dell'utente. */
export function useFormat(): Formatter {
    return useContext(I18nContext).format;
}

export function useLocaleInfo() {
    const { locale } = useContext(I18nContext);
    return { locale, ...LOCALE_INFO[locale] };
}

/** Lingua per date-fns nella lingua dell'utente: format(data, "EEEE d MMMM", { locale: useDateFnsLocale() }). */
export function useDateFnsLocale() {
    const { locale } = useContext(I18nContext);
    return dateFnsLocale(locale);
}
