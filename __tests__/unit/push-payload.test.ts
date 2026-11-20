// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
    buildPushMessage, extractNotificationPushes, isGoneStatus, isValidVapidSubject, normalizePushUrl,
    serializePushPayload, validatePushSubscription, vapidConfigFromEnv, PUSH_BODY_MAX, PUSH_TITLE_MAX, MAX_PUSH_PER_WRITE,
} from '@/modules/shared/domain/push-payload';

const P256DH = 'B'.repeat(87);
const AUTH = 'a'.repeat(22);
const FCM = 'https://fcm.googleapis.com/fcm/send/abc123:APA91b';

describe('normalizePushUrl', () => {
    it('accetta percorsi interni, con query e ancora', () => {
        expect(normalizePushUrl('/work-orders/123')).toBe('/work-orders/123');
        expect(normalizePushUrl('/requests/material?id=5#riga')).toBe('/requests/material?id=5#riga');
        expect(normalizePushUrl(' /mobile ')).toBe('/mobile');
    });

    it('scarta indirizzi esterni e schemi pericolosi', () => {
        for (const u of ['https://evil.example/x', 'http://evil.example', '//evil.example/x', '/\\evil.example', 'javascript:alert(1)', 'data:text/html,x', 'work-orders/1', '', '   ']) {
            expect(normalizePushUrl(u), u).toBe('/');
        }
    });

    it('scarta valori non testuali, caratteri di controllo e indirizzi lunghissimi', () => {
        expect(normalizePushUrl(undefined)).toBe('/');
        expect(normalizePushUrl(null)).toBe('/');
        expect(normalizePushUrl(42)).toBe('/');
        expect(normalizePushUrl('/a\nb')).toBe('/');
        expect(normalizePushUrl('/' + 'a'.repeat(600))).toBe('/');
    });
});

describe('buildPushMessage / serializePushPayload', () => {
    it('costruisce titolo, testo e indirizzo', () => {
        expect(buildPushMessage({ title: 'Nuova assegnazione', body: 'Ordine #12', url: '/work-orders/12' }))
            .toEqual({ title: 'Nuova assegnazione', body: 'Ordine #12', url: '/work-orders/12' });
    });

    it('senza titolo non c\'e\' notifica', () => {
        expect(buildPushMessage({ title: '', body: 'x' })).toBeNull();
        expect(buildPushMessage({ title: '   ' })).toBeNull();
        expect(buildPushMessage({ body: 'x' })).toBeNull();
        expect(serializePushPayload({ body: 'x' })).toBeNull();
    });

    it('accorcia testi lunghi, appiattisce gli a capo e usa "/" se manca il link', () => {
        const m = buildPushMessage({ title: 'T'.repeat(500), body: 'riga uno\n\nriga due\t' + 'x'.repeat(500) })!;
        expect(m.title.length).toBeLessThanOrEqual(PUSH_TITLE_MAX);
        expect(m.body.length).toBeLessThanOrEqual(PUSH_BODY_MAX);
        expect(m.body.startsWith('riga uno riga due')).toBe(true);
        expect(m.url).toBe('/');
    });

    it('il testo serializzato contiene solo titolo, testo e indirizzo', () => {
        const json = JSON.parse(serializePushPayload({ title: 'a', body: 'b', url: '/c', userId: 'segreto', token: 'x' } as never)!);
        expect(Object.keys(json).sort()).toEqual(['body', 'title', 'url']);
    });
});

describe('isValidVapidSubject / vapidConfigFromEnv', () => {
    it('ammette mailto: e https:, non altro', () => {
        expect(isValidVapidSubject('mailto:it@example.com')).toBe(true);
        expect(isValidVapidSubject('https://example.com/contatti')).toBe(true);
        for (const s of ['http://example.com', 'mailto:', 'mailto:non-un-indirizzo', 'example.com', '', undefined, 5]) {
            expect(isValidVapidSubject(s), String(s)).toBe(false);
        }
    });

    it('serve tutte e tre le variabili e un contatto valido', () => {
        const ok = { publicKey: 'pub', privateKey: 'priv', subject: 'mailto:it@example.com' };
        expect(vapidConfigFromEnv(ok)).toEqual(ok);
        expect(vapidConfigFromEnv({ ...ok, publicKey: '' })).toBeNull();
        expect(vapidConfigFromEnv({ ...ok, privateKey: undefined })).toBeNull();
        expect(vapidConfigFromEnv({ ...ok, subject: null })).toBeNull();
        expect(vapidConfigFromEnv({ ...ok, subject: 'http://example.com' })).toBeNull();
        expect(vapidConfigFromEnv({})).toBeNull();
    });
});

describe('validatePushSubscription', () => {
    const base = { endpoint: FCM, keys: { p256dh: P256DH, auth: AUTH } };

    it('accetta una sottoscrizione dei servizi noti', () => {
        expect(validatePushSubscription(base).ok).toBe(true);
        for (const endpoint of [
            'https://updates.push.services.mozilla.com/wpush/v2/abc',
            'https://web.push.apple.com/QWERTY',
            'https://wns2-par02p.notify.windows.com/w/?token=abc',
        ]) {
            expect(validatePushSubscription({ ...base, endpoint }).ok, endpoint).toBe(true);
        }
    });

    it('rifiuta endpoint non https, interni, con credenziali o di servizi sconosciuti', () => {
        for (const endpoint of [
            'http://fcm.googleapis.com/x', 'https://localhost/x', 'https://127.0.0.1/x', 'https://192.168.1.10/x', 'https://169.254.169.254/latest',
            'https://evil.example/x', 'https://fcm.googleapis.com.evil.example/x', 'https://user:pw@fcm.googleapis.com/x', 'https://fcm.googleapis.com:8443/x',
            'non un indirizzo', '', 'https://notfcm.googleapis.com.example.org',
        ]) {
            expect(validatePushSubscription({ ...base, endpoint }).ok, endpoint).toBe(false);
        }
    });

    it('rifiuta endpoint oltre 1000 caratteri e chiavi non valide', () => {
        expect(validatePushSubscription({ ...base, endpoint: FCM + 'a'.repeat(1000) }).ok).toBe(false);
        expect(validatePushSubscription({ ...base, keys: { p256dh: 'corta', auth: AUTH } }).ok).toBe(false);
        expect(validatePushSubscription({ ...base, keys: { p256dh: P256DH, auth: '' } }).ok).toBe(false);
        expect(validatePushSubscription({ ...base, keys: { p256dh: 'x'.repeat(500), auth: AUTH } }).ok).toBe(false);
        expect(validatePushSubscription({ ...base, keys: { p256dh: P256DH, auth: 'non valida!!' } }).ok).toBe(false);
        expect(validatePushSubscription(null).ok).toBe(false);
        expect(validatePushSubscription({}).ok).toBe(false);
        expect(validatePushSubscription({ endpoint: 5, keys: 7 }).ok).toBe(false);
    });
});

describe('isGoneStatus', () => {
    it('404 e 410 indicano una sottoscrizione da cancellare', () => {
        expect(isGoneStatus(404)).toBe(true);
        expect(isGoneStatus(410)).toBe(true);
        for (const s of [200, 201, 400, 401, 403, 413, 429, 500, 503, undefined, '410']) expect(isGoneStatus(s), String(s)).toBe(false);
    });
});

describe('extractNotificationPushes', () => {
    it('create: un solo oggetto, anche con relazione user.connect', () => {
        expect(extractNotificationPushes({ userId: 'u1', title: 'T', message: 'M', link: '/x' }))
            .toEqual([{ userId: 'u1', title: 'T', body: 'M', url: '/x' }]);
        expect(extractNotificationPushes({ user: { connect: { id: 'u2' } }, title: 'T', message: 'M' }))
            .toEqual([{ userId: 'u2', title: 'T', body: 'M', url: '/' }]);
    });

    it('createMany: un elenco; salta le righe senza destinatario o titolo', () => {
        const out = extractNotificationPushes([
            { userId: 'a', title: 'T1', message: 'M1', link: '/1' },
            { title: 'senza destinatario', message: 'x' },
            { userId: 'b', title: '', message: 'senza titolo' },
            { userId: 'c', title: 'T3', message: 'M3', link: 'https://evil.example' },
        ]);
        expect(out.map(o => o.userId)).toEqual(['a', 'c']);
        expect(out[1].url).toBe('/');
    });

    it('dati vuoti o strani non lanciano errori e c\'e\' un tetto per scrittura', () => {
        expect(extractNotificationPushes(undefined)).toEqual([]);
        expect(extractNotificationPushes(null)).toEqual([]);
        expect(extractNotificationPushes([])).toEqual([]);
        expect(extractNotificationPushes('testo')).toEqual([]);
        const many = Array.from({ length: MAX_PUSH_PER_WRITE + 50 }, (_, i) => ({ userId: `u${i}`, title: 'T', message: 'M' }));
        expect(extractNotificationPushes(many)).toHaveLength(MAX_PUSH_PER_WRITE);
    });
});
