import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_LOCALE, LOCALES, LOCALE_INFO, isLocale, negotiateLocale } from '@/lib/i18n/config';
import { interpolate, placeholders, translate } from '@/lib/i18n/translate';
import { makeFormatter } from '@/lib/i18n/format';

const require = createRequire(import.meta.url);
const { collectKeys, looksTranslatable } = require('../../scripts/i18n-keys.cjs') as {
    collectKeys: (root: string, kinds?: string[]) => { keys: Map<string, Set<string>> };
    looksTranslatable: (text: string) => boolean;
};

describe('lingue: scelta e traduzione', () => {
    it('le lingue sono italiano, inglese, francese, polacco e cinese, con l\'italiano di partenza', () => {
        expect([...LOCALES]).toEqual(['it', 'en', 'fr', 'pl', 'zh']);
        expect(DEFAULT_LOCALE).toBe('it');
        expect(LOCALE_INFO.zh.intl).toBe('zh-CN');
        expect(isLocale('pl')).toBe(true);
        expect(isLocale('de')).toBe(false);
        expect(isLocale(undefined)).toBe(false);
    });

    it('negozia la lingua dal browser rispettando preferenze e valori q', () => {
        expect(negotiateLocale(null)).toBe('it');
        expect(negotiateLocale('')).toBe('it');
        expect(negotiateLocale('fr-FR,fr;q=0.9,en;q=0.8')).toBe('fr');
        expect(negotiateLocale('de-DE,de;q=0.9,pl;q=0.5')).toBe('pl');
        expect(negotiateLocale('zh-CN,zh;q=0.9')).toBe('zh');
        expect(negotiateLocale('en;q=0.4, it;q=0.9')).toBe('it');
        expect(negotiateLocale('de,es')).toBe('it');
        expect(negotiateLocale('en;q=0')).toBe('it'); // q=0 = non accettata
    });

    it('traduce con la chiave italiana e ripiega sull\'italiano se manca la traduzione', () => {
        const dict = { Salva: 'Save', 'Ordini aperti: {count}': 'Open orders: {count}' };
        expect(translate(dict, 'Salva')).toBe('Save');
        expect(translate(dict, 'Annulla')).toBe('Annulla');
        expect(translate(dict, 'Ordini aperti: {count}', { count: 3 })).toBe('Open orders: 3');
        expect(translate(undefined, 'Ordini aperti: {count}', { count: 3 })).toBe('Ordini aperti: 3');
        expect(translate({ Salva: '' }, 'Salva')).toBe('Salva'); // traduzione vuota = non tradotto
    });

    it('i segnaposto non sostituiti restano com\'e\' e non esplode con chiavi particolari', () => {
        expect(interpolate('Ciao {nome}, hai {n} ordini', { nome: 'Anna' })).toBe('Ciao Anna, hai {n} ordini');
        expect(translate({}, 'constructor')).toBe('constructor');
        expect(translate({}, '__proto__')).toBe('__proto__');
    });

    it('riconosce i segnaposto di un testo', () => {
        expect(placeholders('{b} e {a} e {a}')).toEqual(['a', 'b']);
        expect(placeholders('Nessun segnaposto')).toEqual([]);
    });

    it('formatta date, numeri e valute secondo la lingua', () => {
        const d = new Date(2026, 10, 20, 14, 5);
        expect(makeFormatter('it').date(d)).toBe('20/11/2026');
        expect(makeFormatter('en').date(d)).toBe('20/11/2026');
        expect(makeFormatter('pl').date(d)).toBe('20.11.2026');
        expect(makeFormatter('it').number(1234.5)).toBe('1234,5');
        expect(makeFormatter('it').number(12345.5)).toContain('12.345,5');
        expect(makeFormatter('en').number(12345.5)).toBe('12,345.5');
        expect(makeFormatter('fr').currency(1234.5)).toMatch(/1\s?234,50\s?€/);
        expect(makeFormatter('it').date(null)).toBe('-');
        expect(makeFormatter('it').date('non una data')).toBe('-');
        expect(makeFormatter('it').number(Number.NaN)).toBe('-');
    });
});

describe('raccolta dei testi da tradurre', () => {
    it('non considera tradotti identificatori tecnici e costanti', () => {
        expect(looksTranslatable('Salva')).toBe(true);
        expect(looksTranslatable('Ordini aperti: {count}')).toBe(true);
        expect(looksTranslatable('ADMIN')).toBe(false);
        expect(looksTranslatable('/work-orders/new')).toBe(false);
        expect(looksTranslatable('12')).toBe(false);
        expect(looksTranslatable('work-orders')).toBe(false);
    });

    it('trova t(), toast e messaggi delle azioni, ma non testi con interpolazioni dinamiche', () => {
        const dir = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TEMP ?? '/tmp'), 'i18n-'));
        try {
            fs.mkdirSync(path.join(dir, 'components'), { recursive: true });
            fs.mkdirSync(path.join(dir, 'modules/x/adapters/actions'), { recursive: true });
            fs.writeFileSync(path.join(dir, 'components/a.tsx'), [
                'const a = t("Salva"); const b = t(\'Annulla\'); const c = t("Ordini: {n}", { n: 1 });',
                'toast.success("Fatto"); toast.error(`Errore ${x}`); split("non qui"); format("neanche");',
                'const d = t(`Con template`); const E = tk("Etichetta");',
            ].join('\n'));
            fs.writeFileSync(path.join(dir, 'modules/x/adapters/actions/a.ts'), [
                'return { success: false, message: "Non autorizzato" };',
                "return fail('Ordine non trovato'); return ok(\"Salvato\");",
                'return { error: `Dinamico ${x}` };',
            ].join('\n'));
            const { keys } = collectKeys(dir);
            expect([...keys.keys()].sort()).toEqual(['Annulla', 'Con template', 'Etichetta', 'Fatto', 'Non autorizzato', 'Ordine non trovato', 'Ordini: {n}', 'Salva', 'Salvato']);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe('dizionari delle lingue', () => {
    const root = path.resolve(__dirname, '../..');
    const { keys } = collectKeys(root);

    for (const locale of ['en', 'fr', 'pl', 'zh']) {
        it(`${locale}: file valido, solo testi, segnaposto identici all'italiano`, () => {
            const dict = JSON.parse(fs.readFileSync(path.join(root, 'locales', `${locale}.json`), 'utf8') || '{}') as Record<string, unknown>;
            const bad: string[] = [];
            for (const [key, value] of Object.entries(dict)) {
                if (typeof value !== 'string') { bad.push(`${key}: non e' un testo`); continue; }
                if (value && placeholders(key).join(',') !== placeholders(value).join(',')) bad.push(`${key} -> ${value}`);
            }
            expect(bad).toEqual([]);
        });
    }

    // Completezza: ogni testo usato nel codice (t, tk, toast, messaggi delle azioni) deve avere la traduzione in tutte le lingue.
    // Se aggiungi o cambi un testo: `node scripts/i18n-sync.cjs todo`, compila i file in locales/_todo e `node scripts/i18n-sync.cjs merge`.
    describe('completezza delle traduzioni', () => {
        for (const locale of ['en', 'fr', 'pl', 'zh']) {
            it(`${locale}: ogni testo usato nel codice ha una traduzione`, () => {
                const dict = JSON.parse(fs.readFileSync(path.join(root, 'locales', `${locale}.json`), 'utf8') || '{}') as Record<string, string>;
                const missing = [...keys.keys()].filter(k => !dict[k]);
                expect(missing.slice(0, 20), `mancano ${missing.length} traduzioni`).toEqual([]);
            });
        }

        // Il reset del database si conferma scrivendo ELIMINA TUTTO: il codice confronta il testo alla lettera, quindi la frase
        // non va mai tradotta (le istruzioni attorno si traducono, la parola da digitare no).
        for (const locale of ['en', 'fr', 'pl', 'zh']) {
            it(`${locale}: la frase da digitare per il reset resta ELIMINA TUTTO`, () => {
                const dict = JSON.parse(fs.readFileSync(path.join(root, 'locales', `${locale}.json`), 'utf8') || '{}') as Record<string, string>;
                const bad = Object.entries(dict).filter(([k, v]) => k.includes('ELIMINA TUTTO') && !v.includes('ELIMINA TUTTO'));
                expect(bad).toEqual([]);
            });
        }
    });
});
