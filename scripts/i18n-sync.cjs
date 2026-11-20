#!/usr/bin/env node
/**
 * Gestione delle traduzioni.
 *   node scripts/i18n-sync.cjs status            quanti testi ci sono e quanti ne mancano per lingua
 *   node scripts/i18n-sync.cjs todo [N]          scrive in locales/_todo/ i testi mancanti, a blocchi di N (predefinito 300)
 *   node scripts/i18n-sync.cjs merge             unisce nei dizionari le traduzioni compilate in locales/_todo/
 * Il testo italiano e' la chiave; i segnaposto {nome} devono restare identici nella traduzione.
 */
const fs = require('fs');
const path = require('path');
const { collectKeys, placeholders } = require('./i18n-keys.cjs');

const root = path.resolve(__dirname, '..');
const LOCALES = ['en', 'fr', 'pl', 'zh'];
const dir = path.join(root, 'locales');
const todoDir = path.join(dir, '_todo');

const read = (l) => JSON.parse(fs.readFileSync(path.join(dir, `${l}.json`), 'utf8') || '{}');
const write = (l, obj) => {
    const sorted = Object.fromEntries(Object.keys(obj).sort((a, b) => a.localeCompare(b, 'it')).map(k => [k, obj[k]]));
    fs.writeFileSync(path.join(dir, `${l}.json`), JSON.stringify(sorted, null, 2) + '\n');
};

function missingFor(keys, locale) {
    const dict = read(locale);
    return [...keys.keys()].filter(k => !dict[k]).sort((a, b) => a.localeCompare(b, 'it'));
}

const cmd = process.argv[2] || 'status';
const { keys } = collectKeys(root);

if (cmd === 'status') {
    console.log(`Testi da tradurre trovati nel codice: ${keys.size}`);
    for (const l of LOCALES) {
        const miss = missingFor(keys, l);
        console.log(`  ${l}: tradotti ${keys.size - miss.length}, mancanti ${miss.length}`);
    }
} else if (cmd === 'todo') {
    const size = Number(process.argv[3]) || 300;
    fs.rmSync(todoDir, { recursive: true, force: true });
    fs.mkdirSync(todoDir, { recursive: true });
    for (const l of LOCALES) {
        const miss = missingFor(keys, l);
        for (let i = 0; i < miss.length; i += size) {
            const n = String(Math.floor(i / size) + 1).padStart(2, '0');
            const chunk = Object.fromEntries(miss.slice(i, i + size).map(k => [k, '']));
            fs.writeFileSync(path.join(todoDir, `${l}-${n}.json`), JSON.stringify(chunk, null, 2) + '\n');
        }
        console.log(`${l}: ${miss.length} testi da tradurre`);
    }
} else if (cmd === 'merge') {
    if (!fs.existsSync(todoDir)) { console.log('Niente da unire (manca locales/_todo).'); process.exit(0); }
    const problems = [];
    const added = Object.fromEntries(LOCALES.map(l => [l, 0]));
    const dicts = Object.fromEntries(LOCALES.map(l => [l, read(l)]));
    for (const file of fs.readdirSync(todoDir).filter(f => f.endsWith('.json')).sort()) {
        const locale = file.split('-')[0];
        if (!LOCALES.includes(locale)) continue;
        const chunk = JSON.parse(fs.readFileSync(path.join(todoDir, file), 'utf8'));
        for (const [key, value] of Object.entries(chunk)) {
            if (typeof value !== 'string' || !value.trim()) continue;
            const a = placeholders(key).join(','), b = placeholders(value).join(',');
            if (a !== b) { problems.push(`${file}: segnaposto diversi in "${key}" -> "${value}"`); continue; }
            dicts[locale][key] = value;
            added[locale]++;
        }
    }
    for (const l of LOCALES) write(l, dicts[l]);
    console.log('Traduzioni unite:', JSON.stringify(added));
    if (problems.length) { console.log(`ATTENZIONE: ${problems.length} traduzioni scartate:`); problems.slice(0, 30).forEach(p => console.log('  ' + p)); }
} else {
    console.log('Comando sconosciuto. Usa: status | todo [N] | merge');
    process.exit(1);
}
