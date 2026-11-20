import { after } from 'next/server';
import { workOrderIdFromLink } from '@/modules/maintenance/domain/maintainer-visibility';
import {
    MAX_SUBSCRIPTIONS_PER_USER, isGoneStatus, serializePushPayload, vapidConfigFromEnv,
    type PushRecipientMessage,
} from '@/modules/shared/domain/push-payload';

/**
 * Notifiche push sul telefono (Web Push). Questo modulo NON e' una server action: lo usano lib/prisma.ts (aggancio
 * automatico alle notifiche) e le azioni dell'app.
 *
 * Senza le variabili d'ambiente VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT) non fa nulla e non
 * da' errori: si attiva da solo quando l'amministratore le imposta. Non lancia mai eccezioni.
 * Le sottoscrizioni sono dell'utente destinatario e PushSubscription non e' un modello soggetto a scope per stabilimento: si usa il
 * client normale, importato in modo differito perche' lib/prisma.ts importa questo modulo (niente import circolare al caricamento).
 */

const SEND_TIMEOUT_MS = 5_000;
const TTL_SECONDS = 24 * 60 * 60;

function vapid() {
    return vapidConfigFromEnv({
        publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        privateKey: process.env.VAPID_PRIVATE_KEY,
        subject: process.env.VAPID_SUBJECT,
    });
}

/** Vero se le tre variabili VAPID sono presenti e il contatto e' un "mailto:" o un "https:". */
export function isPushConfigured(): boolean {
    return vapid() !== null;
}

/**
 * Invia una push a tutti i dispositivi dell'utente. Cancella le sottoscrizioni scadute (404/410) e aggiorna lastUsedAt
 * di quelle riuscite. Non lancia mai eccezioni.
 */
export async function sendPushToUser(userId: string, message: { title: string; body?: string; url?: string }): Promise<{ sent: number; removed: number }> {
    const result = { sent: 0, removed: 0 };
    try {
        const config = vapid();
        if (!config || !userId) return result;
        const { prisma } = await import('@/lib/prisma');
        // Un manutentore usa la vista mobile: l'ordine si apre li', non nella versione completa
        let outgoing = message;
        const woId = workOrderIdFromLink(message.url);
        if (woId) {
            const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
            if (u?.role === 'MAINTAINER') outgoing = { ...message, url: `/mobile/orders/${encodeURIComponent(woId)}` };
        }
        const payload = serializePushPayload(outgoing);
        if (!payload) return result;

        const subs = await prisma.pushSubscription.findMany({
            where: { userId },
            select: { id: true, endpoint: true, p256dh: true, auth: true },
            orderBy: { createdAt: 'desc' },
            take: MAX_SUBSCRIPTIONS_PER_USER,
        });
        if (subs.length === 0) return result;

        const mod = await import('web-push');
        const webpush = (mod as { default?: typeof import('web-push') }).default ?? mod;

        const sentIds: string[] = [];
        const goneIds: string[] = [];
        await Promise.all(subs.map(async s => {
            try {
                await webpush.sendNotification(
                    { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                    payload,
                    {
                        TTL: TTL_SECONDS,
                        timeout: SEND_TIMEOUT_MS,
                        vapidDetails: { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey },
                    },
                );
                sentIds.push(s.id);
            } catch (err) {
                const status = (err as { statusCode?: number })?.statusCode;
                if (isGoneStatus(status)) goneIds.push(s.id);
                // Niente indirizzo della sottoscrizione nel log: e' un dato riservato dell'utente
                else console.warn(`[push] invio non riuscito (${status ?? (err as Error)?.message ?? 'errore'})`);
            }
        }));

        if (sentIds.length) await prisma.pushSubscription.updateMany({ where: { id: { in: sentIds } }, data: { lastUsedAt: new Date() } });
        if (goneIds.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: goneIds } } });
        result.sent = sentIds.length;
        result.removed = goneIds.length;
    } catch (err) {
        console.warn('[push] errore imprevisto:', (err as Error)?.message ?? err);
    }
    return result;
}

/**
 * Invia le push per le notifiche appena scritte, senza far attendere chi le ha create: dentro una richiesta si usa after()
 * (su Vercel tiene viva la funzione fino alla fine dell'invio), altrimenti parte e basta. Non lancia mai eccezioni.
 */
export function dispatchNotificationPushes(rows: PushRecipientMessage[]): void {
    try {
        if (rows.length === 0 || !isPushConfigured()) return;
        const job = async () => {
            await Promise.allSettled(rows.map(r => sendPushToUser(r.userId, r)));
        };
        try {
            after(job);
        } catch {
            // Fuori da una richiesta (script, test, cron senza contesto): si lancia senza attendere
            void job();
        }
    } catch (err) {
        console.warn('[push] aggancio non riuscito:', (err as Error)?.message ?? err);
    }
}
