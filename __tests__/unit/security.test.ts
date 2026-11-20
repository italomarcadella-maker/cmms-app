// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { isPublicPath } from '@/lib/public-paths';
import { validatePassword, MIN_PASSWORD_LENGTH } from '@/lib/password-policy';
import { hasRole, isRole, OPERATIVE, SUPERVISION, MANAGERS, ADMINS, EVERYONE } from '@/lib/roles';
import { escapeHtml } from '@/lib/html';

describe('percorsi pubblici', () => {
    it('login, autenticazione, controllo di salute e cron sono pubblici', () => {
        for (const p of ['/login', '/api/auth/session', '/api/auth/callback/credentials', '/api/health', '/api/cron/preventive']) {
            expect(isPublicPath(p), p).toBe(true);
        }
    });

    it('le risorse statiche note sono pubbliche', () => {
        for (const p of ['/brand/FITT-logo-bianco.svg', '/icon.svg', '/manifest.json', '/sw.js', '/workbox-4754cb34.js', '/worker-1a2b3c4d.js', '/_next/static/chunks/app.js', '/favicon.ico']) {
            expect(isPublicPath(p), p).toBe(true);
        }
    });

    it('pagine e API dell\'applicazione NON sono pubbliche, anche se finiscono come un file', () => {
        for (const p of ['/', '/work-orders', '/api/assets', '/api/plants', '/mobile/assets/x.png', '/work-orders/abc.js', '/users/qualcosa.json', '/api/daily-meetings/a.png', '/change-password']) {
            expect(isPublicPath(p), p).toBe(false);
        }
    });

    it('un percorso che solo inizia come uno pubblico non lo diventa', () => {
        for (const p of ['/loginx', '/login-admin', '/api/authx', '/api/healthy', '/api/cronjob', '/brandx/a.png', '/_nextx/a']) {
            expect(isPublicPath(p), p).toBe(false);
        }
    });
});

describe('regole delle password', () => {
    it('rifiuta password brevi, comuni o banali', () => {
        expect(validatePassword('abc12')).toMatch(/almeno/);
        expect(validatePassword('admin')).not.toBeNull();
        expect(validatePassword('Password123')).not.toBeNull(); // comune, anche se lunga 11
        expect(validatePassword('aaaaaaaaaaaa')).not.toBeNull();
        expect(validatePassword('solo-lettere-qui')).toMatch(/lettera e un numero/);
        expect(validatePassword(12345678901)).not.toBeNull();
    });

    it('accetta una password ragionevole', () => {
        expect(validatePassword('Fabbrica-2026-ok')).toBeNull();
        expect(validatePassword('x'.repeat(MIN_PASSWORD_LENGTH - 1) + '1')).toBeNull();
    });

    it('rifiuta password lunghissime (costo dell\'hash)', () => {
        expect(validatePassword('a1'.repeat(80))).toMatch(/lunga/);
    });
});

describe('ruoli', () => {
    it('i gruppi sono annidati correttamente', () => {
        expect(hasRole('ADMIN', ADMINS)).toBe(true);
        expect(hasRole('PLANT_MANAGER', ADMINS)).toBe(false);
        expect(hasRole('PLANT_MANAGER', MANAGERS)).toBe(true);
        expect(hasRole('SUPERVISOR', MANAGERS)).toBe(false);
        expect(hasRole('SUPERVISOR', SUPERVISION)).toBe(true);
        expect(hasRole('MAINTAINER', SUPERVISION)).toBe(false);
        expect(hasRole('MAINTAINER', OPERATIVE)).toBe(true);
        expect(hasRole('USER', OPERATIVE)).toBe(false);
        expect(hasRole('USER', EVERYONE)).toBe(true);
    });

    it('un ruolo mancante o inventato non ha mai accesso', () => {
        expect(hasRole(undefined, EVERYONE)).toBe(false);
        expect(hasRole('SUPERADMIN', EVERYONE)).toBe(false);
        expect(isRole('SUPERADMIN')).toBe(false);
        expect(isRole('ADMIN')).toBe(true);
    });
});

describe('escape HTML', () => {
    it('neutralizza i tag e le virgolette', () => {
        expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
        expect(escapeHtml('"a" & \'b\'')).toBe('&quot;a&quot; &amp; &#39;b&#39;');
        expect(escapeHtml(null)).toBe('');
    });
});

describe('azioni del server', () => {
    const root = path.resolve(process.cwd());

    function walk(dir: string, out: string[] = []): string[] {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name === 'node_modules' || entry.name === '.next') continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full, out);
            else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
        }
        return out;
    }

    // Funzioni che scrivono nel database e per scelta richiedono solo di essere connessi (o fanno un controllo proprio)
    const LOGIN_ONLY = new Set([
        'lib/actions.ts::updateFirstLoginPassword', // cambia la PROPRIA password
        'lib/actions.ts::markNotificationAsRead', // solo le proprie notifiche (controllo nella query)
        'lib/audit.ts::logAction', // funzione interna, non una server action
        'modules/maintenance/adapters/actions/work-order-actions.ts::createWorkOrder', // chiunque puo' inviare una richiesta
        'lib/actions.ts::getSystemSettings', // crea la riga predefinita se manca; le impostazioni si leggono ovunque
    ]);

    it('ogni funzione che scrive nel database controlla il ruolo (o e\' nell\'elenco motivato)', () => {
        const WRITES = /prisma\.\w+\.(create|update|delete|upsert|createMany|updateMany|deleteMany)\(|\$transaction|[rR]epo\(?\)?\.(save|delete)\(/;
        // Solo i controlli veri: leggere `.role` da solo (es. per una query) non e' una verifica dei permessi
        const ROLE = /requireRole\(|requireLogin\(|hasRole\(|isRole\(|__guard|role\s*(===|!==)\s*['"]|\.includes\(\s*(session\??\.user\??\.)?role/;
        const offenders: string[] = [];

        for (const dir of ['app', 'lib', 'modules']) {
            for (const file of walk(path.join(root, dir))) {
                const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
                const rel = path.relative(root, file).replace(/\\/g, '/');
                const isAction = /^\s*['"]use server['"]/.test(src);
                const isRoute = /route\.ts$/.test(file);
                if (!isAction && !isRoute) continue;

                const re = isRoute
                    ? /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/g
                    : /export\s+(?:async\s+function\s+(\w+)|const\s+(\w+)\s*=)/g;
                const starts: { name: string; idx: number }[] = [];
                let m: RegExpExecArray | null;
                while ((m = re.exec(src))) starts.push({ name: m[1] || m[2], idx: m.index });
                starts.forEach((st, i) => {
                    const body = src.slice(st.idx, i + 1 < starts.length ? starts[i + 1].idx : src.length);
                    if (WRITES.test(body) && !ROLE.test(body) && !LOGIN_ONLY.has(`${rel}::${st.name}`)) offenders.push(`${rel}::${st.name}`);
                });
            }
        }
        expect(offenders).toEqual([]);
    });

    it('nessuna azione del server accetta il ruolo o l\'utente dal browser', () => {
        const offenders: string[] = [];
        for (const dir of ['app', 'lib', 'modules']) {
            for (const file of walk(path.join(root, dir))) {
                const src = fs.readFileSync(file, 'utf8');
                if (!/^\s*['"]use server['"]/.test(src) && !/route\.ts$/.test(file)) continue;
                // userId preso dal corpo della richiesta di una route handler (impersonazione)
                if (/route\.ts$/.test(file) && /const\s*\{[^}]*\buserId\b[^}]*\}\s*=\s*(await\s+)?(body|request\.json\(\))/.test(src)) {
                    offenders.push(path.relative(root, file).replace(/\\/g, '/'));
                }
            }
        }
        expect(offenders).toEqual([]);
    });
});
