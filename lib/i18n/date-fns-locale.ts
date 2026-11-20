import { it, enGB, fr, pl, zhCN } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';
import type { Locale } from './config';

/** Lingua per date-fns (nomi di mesi e giorni): format(data, "EEEE d MMMM", { locale: dateFnsLocale(locale) }). */
const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = { it, en: enGB, fr, pl, zh: zhCN };

export function dateFnsLocale(locale: Locale): DateFnsLocale {
    return DATE_FNS_LOCALES[locale] ?? it;
}
