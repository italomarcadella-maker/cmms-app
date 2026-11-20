/**
 * Raccolta dei testi da tradurre (logica condivisa da scripts/i18n-sync.cjs e dal test del catalogo).
 * Un "testo" e' una stringa italiana usata come chiave. Si raccolgono, SOLO se letterali (senza ${...}):
 *  - t("...") / tk("...") (anche con apici singoli o backtick)   testi dell'interfaccia
 *  - toast.xxx("...")                                      messaggi mostrati all'utente
 *  - nelle azioni del server: message: "...", error: "...", fail("..."), ok("...")   messaggi restituiti al browser
 */
const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'public', '.claude', 'prisma', 'locales', 'scripts', '__tests__', 'e2e']);
const CODE_EXT = /\.(ts|tsx)$/;
const SERVER_MESSAGE_FILE = /(^|\/)(modules\/[^/]+\/adapters\/actions\/|lib\/(actions|dashboard-actions|process-actions|inventory-actions|ai-service|auth-guard|asset-health-sync|stock-ledger|i18n\/actions)\.ts$|app\/api\/)/;

const STR = String.raw`("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|` + '`(?:[^`\\\\$]|\\\\.)*`)';
const RE_T = new RegExp(String.raw`(?<![\w.$])(?:t|tk)\(\s*` + STR, 'g');
const RE_TOAST = new RegExp(String.raw`toast(?:\.\w+)?\(\s*` + STR, 'g');
const RE_MESSAGE = new RegExp(String.raw`\b(?:message|error)\s*:\s*` + STR, 'g');
const RE_RESULT_FN = new RegExp(String.raw`(?<![\w.$])(?:fail|ok)\(\s*` + STR, 'g');

function unquote(literal) {
    const body = literal.slice(1, -1);
    return body.replace(/\\(.)/g, (_, c) => ({ n: '\n', t: '\t', r: '\r' }[c] ?? c));
}

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (CODE_EXT.test(entry.name) && !/\.d\.ts$/.test(entry.name)) out.push(full);
    }
    return out;
}

/** Testo "da tradurre": ha almeno una lettera e non e' un identificatore tecnico (niente spazi e minuscolo/maiuscolo di codice). */
function looksTranslatable(text) {
    if (!/[A-Za-zÀ-ÿ]/.test(text)) return false;
    if (/^[a-z0-9_\-./:#?=&%]+$/i.test(text) && !/\s/.test(text) && /[._\-/:]/.test(text)) return false; // percorsi, id, url
    if (/^[A-Z0-9_]+$/.test(text)) return false; // costanti (ADMIN, OPEN...)
    return true;
}

/**
 * Restituisce { keys: Map<testo, Set<file>> } con tutti i testi trovati sotto `root`.
 * `kinds` filtra le sorgenti: 'ui' (t e toast), 'server' (messaggi delle azioni).
 */
function collectKeys(root, kinds = ['ui', 'server']) {
    const keys = new Map();
    const add = (text, file) => {
        if (!looksTranslatable(text)) return;
        if (!keys.has(text)) keys.set(text, new Set());
        keys.get(text).add(file);
    };
    for (const file of walk(root)) {
        const rel = path.relative(root, file).replace(/\\/g, '/');
        const src = fs.readFileSync(file, 'utf8');
        if (kinds.includes('ui')) {
            for (const re of [RE_T, RE_TOAST]) {
                re.lastIndex = 0;
                let m;
                while ((m = re.exec(src))) add(unquote(m[1]), rel);
            }
        }
        if (kinds.includes('server') && SERVER_MESSAGE_FILE.test(rel)) {
            for (const re of [RE_MESSAGE, RE_RESULT_FN]) {
                re.lastIndex = 0;
                let m;
                while ((m = re.exec(src))) add(unquote(m[1]), rel);
            }
        }
    }
    return { keys };
}

function placeholders(text) {
    return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]))].sort();
}

module.exports = { collectKeys, placeholders, looksTranslatable, walk };
