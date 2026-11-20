/**
 * Notifiche push (Web Push): logica pura, senza accesso a database o rete.
 * Il contenuto inviato al telefono e' volutamente minimo: solo titolo, testo e indirizzo da aprire.
 * Nessun dato sensibile viaggia nel payload (passa dai server dei produttori dei browser).
 */

export interface PushMessage {
    title: string;
    body: string;
    url: string;
}

export const PUSH_TITLE_MAX = 80;
export const PUSH_BODY_MAX = 180;
export const PUSH_FALLBACK_URL = '/';
export const MAX_SUBSCRIPTIONS_PER_USER = 10;
export const MAX_ENDPOINT_LENGTH = 1000;

// I caratteri di controllo (a capo e tabulazioni compresi) non hanno senso in una notifica: diventano spazi
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
// eslint-disable-next-line no-control-regex
const HAS_CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

function cleanText(value: unknown, max: number): string {
    if (typeof value !== 'string') return '';
    const flat = value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
    return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/**
 * Indirizzo da aprire al tocco: ammesso solo un percorso interno che inizia con "/".
 * Indirizzi esterni (https://..., //host, javascript:, data:), barre rovesciate e caratteri di controllo ricadono su "/".
 */
export function normalizePushUrl(url: unknown): string {
    if (typeof url !== 'string') return PUSH_FALLBACK_URL;
    const u = url.trim();
    if (!u.startsWith('/') || u.startsWith('//')) return PUSH_FALLBACK_URL;
    if (u.includes('\\') || HAS_CONTROL_CHARS.test(u)) return PUSH_FALLBACK_URL;
    if (u.length > 500) return PUSH_FALLBACK_URL;
    // Una barra seguita da uno schema ("/https://x") non e' un problema per il browser, ma teniamo l'indirizzo semplice
    try {
        const parsed = new URL(u, 'https://placeholder.invalid');
        if (parsed.origin !== 'https://placeholder.invalid') return PUSH_FALLBACK_URL;
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return PUSH_FALLBACK_URL;
    }
}

/** Costruisce il messaggio da inviare; null se manca il titolo (niente notifiche vuote). */
export function buildPushMessage(input: { title?: unknown; body?: unknown; url?: unknown }): PushMessage | null {
    const title = cleanText(input?.title, PUSH_TITLE_MAX);
    if (!title) return null;
    return { title, body: cleanText(input?.body, PUSH_BODY_MAX), url: normalizePushUrl(input?.url) };
}

/** Testo JSON del payload (stesso formato letto da worker/index.js). */
export function serializePushPayload(input: { title?: unknown; body?: unknown; url?: unknown }): string | null {
    const msg = buildPushMessage(input);
    return msg ? JSON.stringify(msg) : null;
}

/** Il contatto VAPID deve essere un "mailto:" con un indirizzo oppure un indirizzo "https:". */
export function isValidVapidSubject(subject: unknown): boolean {
    if (typeof subject !== 'string') return false;
    const s = subject.trim();
    if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(s)) return true;
    try {
        const u = new URL(s);
        return u.protocol === 'https:' && !!u.hostname;
    } catch {
        return false;
    }
}

export interface VapidEnv {
    publicKey?: string | null;
    privateKey?: string | null;
    subject?: string | null;
}

/** Le tre variabili devono essere presenti e il contatto valido; altrimenti le push restano spente senza errori. */
export function vapidConfigFromEnv(env: VapidEnv): { publicKey: string; privateKey: string; subject: string } | null {
    const publicKey = env.publicKey?.trim();
    const privateKey = env.privateKey?.trim();
    const subject = env.subject?.trim();
    if (!publicKey || !privateKey || !subject) return null;
    if (!isValidVapidSubject(subject)) return null;
    return { publicKey, privateKey, subject };
}

/**
 * Servizi push dei browser. Il server invia una richiesta all'indirizzo della sottoscrizione, che arriva dal client:
 * ammettiamo solo i domini dei servizi noti (altrimenti un utente potrebbe far contattare al server indirizzi interni).
 * Per supportare un nuovo servizio basta aggiungere il dominio qui.
 */
export const PUSH_SERVICE_DOMAINS = [
    'fcm.googleapis.com',       // Chrome, Edge, Opera, Samsung Internet (Android e desktop)
    'push.services.mozilla.com', // Firefox
    'notify.windows.com',       // Edge/Windows (WNS)
    'push.apple.com',           // Safari, iPhone con l'app sulla schermata Home
];

const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

export interface PushSubscriptionInput {
    endpoint: string;
    keys: { p256dh: string; auth: string };
}

/** Controlla endpoint e chiavi di una sottoscrizione ricevuta dal browser. Restituisce i valori puliti o un messaggio d'errore. */
export function validatePushSubscription(input: unknown): { ok: true; value: PushSubscriptionInput } | { ok: false; error: string } {
    const raw = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null | undefined;
    const endpoint = typeof raw?.endpoint === 'string' ? raw.endpoint.trim() : '';
    const p256dh = typeof raw?.keys?.p256dh === 'string' ? raw.keys.p256dh.trim() : '';
    const auth = typeof raw?.keys?.auth === 'string' ? raw.keys.auth.trim() : '';

    if (!endpoint || endpoint.length > MAX_ENDPOINT_LENGTH) return { ok: false, error: 'Indirizzo della sottoscrizione non valido' };
    let url: URL;
    try {
        url = new URL(endpoint);
    } catch {
        return { ok: false, error: 'Indirizzo della sottoscrizione non valido' };
    }
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
        return { ok: false, error: 'Indirizzo della sottoscrizione non valido' };
    }
    const host = url.hostname.toLowerCase();
    if (!PUSH_SERVICE_DOMAINS.some(d => host === d || host.endsWith(`.${d}`))) {
        return { ok: false, error: 'Servizio di notifica del browser non riconosciuto' };
    }
    // Chiave pubblica P-256 non compressa: 65 byte (87 caratteri in base64url); segreto di autenticazione: 16 byte (22 caratteri)
    if (p256dh.length < 40 || p256dh.length > 200 || !BASE64URL.test(p256dh)) return { ok: false, error: 'Chiave della sottoscrizione non valida' };
    if (auth.length < 8 || auth.length > 100 || !BASE64URL.test(auth)) return { ok: false, error: 'Chiave della sottoscrizione non valida' };

    return { ok: true, value: { endpoint, keys: { p256dh, auth } } };
}

/** Codici di risposta del servizio push che indicano una sottoscrizione scaduta o revocata: va cancellata. */
export function isGoneStatus(status: unknown): boolean {
    return status === 404 || status === 410;
}

/** Una notifica in scrittura, ridotta ai campi che servono alla push. */
export interface PushRecipientMessage extends PushMessage {
    userId: string;
}

export const MAX_PUSH_PER_WRITE = 200;

/** Messaggi da inviare a partire dal campo `data` di create/createMany (un oggetto o un elenco). Salta le righe senza destinatario o titolo. */
export function extractNotificationPushes(data: unknown): PushRecipientMessage[] {
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    const out: PushRecipientMessage[] = [];
    for (const row of rows.slice(0, MAX_PUSH_PER_WRITE)) {
        const r = row as { userId?: unknown; user?: { connect?: { id?: unknown } }; title?: unknown; message?: unknown; link?: unknown } | null;
        const userId = r?.userId ?? r?.user?.connect?.id;
        if (typeof userId !== 'string' || !userId) continue;
        const msg = buildPushMessage({ title: r?.title, body: r?.message, url: r?.link });
        if (msg) out.push({ userId, ...msg });
    }
    return out;
}
