#!/usr/bin/env node
/**
 * Controlla i file di traduzione compilati in locales/_todo/ prima dell'unione.
 *   node scripts/i18n-check-todo.cjs <lingua> [da] [a]     es. node scripts/i18n-check-todo.cjs fr 1 6
 * Segnala: JSON non valido, testi senza traduzione, segnaposto {nome} diversi dall'italiano, traduzioni identiche al testo
 * italiano (da controllare: va bene solo per sigle e nomi propri), caratteri strani (es. emoji, residui di markdown di codice).
 */
const fs = require('fs');
const path = require('path');
const { placeholders } = require('./i18n-keys.cjs');

const [, , locale, fromArg, toArg] = process.argv;
if (!locale) { console.log('Uso: node scripts/i18n-check-todo.cjs <lingua> [da] [a]'); process.exit(1); }
const dir = path.resolve(__dirname, '..', 'locales', '_todo');
const from = Number(fromArg) || 1, to = Number(toArg) || 99;

let total = 0, empty = 0, bad = 0, same = 0;
const issues = [];
for (const file of fs.readdirSync(dir).filter(f => f.startsWith(locale + '-') && f.endsWith('.json')).sort()) {
    const n = Number(file.slice(locale.length + 1, -5));
    if (n < from || n > to) continue;
    let obj;
    try { obj = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); }
    catch (e) { issues.push(`${file}: JSON non valido (${e.message})`); continue; }
    for (const [key, value] of Object.entries(obj)) {
        total++;
        if (typeof value !== 'string' || !value.trim()) { empty++; if (empty <= 10) issues.push(`${file}: manca la traduzione di "${key.slice(0, 60)}"`); continue; }
        if (placeholders(key).join(',') !== placeholders(value).join(',')) { bad++; issues.push(`${file}: segnaposto diversi: "${key.slice(0, 50)}" -> "${value.slice(0, 50)}"`); }
        if (value === key && /[a-zà-ÿ]{4,}/i.test(key)) { same++; }
        if (/\p{Extended_Pictographic}/u.test(value)) issues.push(`${file}: emoji nella traduzione di "${key.slice(0, 40)}"`);
    }
}
console.log(`${locale}: ${total} testi controllati | senza traduzione: ${empty} | segnaposto errati: ${bad} | identici all'italiano (da rivedere): ${same}`);
issues.slice(0, 40).forEach(i => console.log('  ' + i));
process.exit(empty || bad || issues.some(i => i.includes('JSON non valido')) ? 1 : 0);
