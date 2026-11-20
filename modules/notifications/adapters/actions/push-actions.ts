'use server';

import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { requireLogin } from '@/lib/auth-guard';
import { isPushConfigured } from '@/lib/push';
import { MAX_SUBSCRIPTIONS_PER_USER, validatePushSubscription } from '@/modules/shared/domain/push-payload';

/**
 * Sottoscrizioni alle notifiche push del telefono. Ogni utente gestisce solo le proprie.
 * Le sottoscrizioni sono dati dell'utente (non legati a uno stabilimento, modello fuori dallo scope): filtro esplicito su userId.
 */

type Result = { success: boolean; message: string };

export async function savePushSubscription(input: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<Result> {
    const access = await requireLogin();
    if (!access.authorized) return { success: false, message: access.message ?? 'Non autenticato' };
    const userId: string = access.session.user.id;

    if (!isPushConfigured()) return { success: false, message: 'Le notifiche sul telefono non sono ancora attivate dall\'amministratore' };

    const parsed = validatePushSubscription(input);
    if (!parsed.ok) return { success: false, message: parsed.error };
    const { endpoint, keys } = parsed.value;

    try {
        const userAgent = (await headers()).get('user-agent')?.slice(0, 250) ?? null;

        // Lo stesso browser puo' passare da un utente all'altro (telefono condiviso): l'endpoint e' unico e segue l'ultimo accesso
        await prisma.pushSubscription.upsert({
            where: { endpoint },
            create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
            update: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent },
        });

        // Al massimo MAX_SUBSCRIPTIONS_PER_USER dispositivi per utente: si eliminano i piu' vecchi
        const extra = await prisma.pushSubscription.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip: MAX_SUBSCRIPTIONS_PER_USER,
            select: { id: true },
        });
        if (extra.length) await prisma.pushSubscription.deleteMany({ where: { userId, id: { in: extra.map(e => e.id) } } });

        return { success: true, message: 'Notifiche sul telefono attivate' };
    } catch (err) {
        console.error('[push] salvataggio sottoscrizione:', (err as Error)?.message ?? err);
        return { success: false, message: 'Impossibile attivare le notifiche. Riprova.' };
    }
}

export async function removePushSubscription(endpoint: string): Promise<Result> {
    const access = await requireLogin();
    if (!access.authorized) return { success: false, message: access.message ?? 'Non autenticato' };
    const userId: string = access.session.user.id;

    if (typeof endpoint !== 'string' || !endpoint || endpoint.length > 1000) return { success: false, message: 'Sottoscrizione non valida' };
    try {
        // Solo le sottoscrizioni dell'utente connesso
        await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
        return { success: true, message: 'Notifiche sul telefono disattivate' };
    } catch (err) {
        console.error('[push] rimozione sottoscrizione:', (err as Error)?.message ?? err);
        return { success: false, message: 'Impossibile disattivare le notifiche. Riprova.' };
    }
}

/** Stato per l'interfaccia: push attiva sul server e almeno un dispositivo dell'utente iscritto. Non espone mai chiavi private. */
export async function getPushStatus(): Promise<{ configured: boolean; subscribed: boolean }> {
    const configured = isPushConfigured();
    const access = await requireLogin();
    if (!access.authorized || !configured) return { configured, subscribed: false };
    try {
        const count = await prisma.pushSubscription.count({ where: { userId: access.session.user.id } });
        return { configured, subscribed: count > 0 };
    } catch {
        return { configured, subscribed: false };
    }
}
