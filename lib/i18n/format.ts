import { LOCALE_INFO, type Locale } from './config';

/**
 * Formati di data, ora, numeri e valute secondo la lingua (logica pura, senza dipendenze dal browser).
 * Le date accettano Date, testo ISO o numero; un valore non valido restituisce "-" invece di "Invalid Date".
 */
export interface Formatter {
    /** Codice Intl in uso (es. "it-IT"). */
    intl: string;
    date(value: Date | string | number | null | undefined, options?: Intl.DateTimeFormatOptions): string;
    dateTime(value: Date | string | number | null | undefined, options?: Intl.DateTimeFormatOptions): string;
    time(value: Date | string | number | null | undefined, options?: Intl.DateTimeFormatOptions): string;
    number(value: number | null | undefined, options?: Intl.NumberFormatOptions): string;
    currency(value: number | null | undefined, currency?: string, options?: Intl.NumberFormatOptions): string;
}

function toDate(value: Date | string | number | null | undefined): Date | null {
    if (value === null || value === undefined || value === '') return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function makeFormatter(locale: Locale): Formatter {
    const intl = LOCALE_INFO[locale].intl;
    return {
        intl,
        date: (value, options) => {
            const d = toDate(value);
            return d ? d.toLocaleDateString(intl, options) : '-';
        },
        dateTime: (value, options) => {
            const d = toDate(value);
            return d ? d.toLocaleString(intl, options) : '-';
        },
        time: (value, options) => {
            const d = toDate(value);
            return d ? d.toLocaleTimeString(intl, options ?? { hour: '2-digit', minute: '2-digit' }) : '-';
        },
        number: (value, options) => (value === null || value === undefined || Number.isNaN(value) ? '-' : value.toLocaleString(intl, options)),
        currency: (value, currency = 'EUR', options) =>
            value === null || value === undefined || Number.isNaN(value)
                ? '-'
                : value.toLocaleString(intl, { style: 'currency', currency, ...options }),
    };
}
