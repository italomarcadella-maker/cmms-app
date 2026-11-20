import type { Locale } from './config';
import type { Dictionary } from './translate';
import en from '@/locales/en.json';
import fr from '@/locales/fr.json';
import pl from '@/locales/pl.json';
import zh from '@/locales/zh.json';

/** Dizionari per lingua: chiave = testo italiano, valore = traduzione. L'italiano non ha dizionario: la chiave e' gia' il testo. */
const DICTIONARIES: Record<Locale, Dictionary> = {
    it: {},
    en: en as Dictionary,
    fr: fr as Dictionary,
    pl: pl as Dictionary,
    zh: zh as Dictionary,
};

export function getDictionary(locale: Locale): Dictionary {
    return DICTIONARIES[locale] ?? {};
}
