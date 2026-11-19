'use server';

import { requireLogin } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { getMaintainerIdentity } from '@/lib/maintainer-scope';
import { runUnscoped } from '@/lib/plant-scope';

/**
 * Azioni di supporto alla vista mobile del manutentore e ai filtri "solo miei".
 * Le letture riguardano solo l'utente connesso; la scrittura tocca solo le SUE notifiche.
 */

/** Id del profilo tecnico dell'utente connesso (non coincide con l'id utente), o null se non ne ha uno. */
export async function getCurrentTechnicianId(): Promise<string | null> {
    const guard = await requireLogin();
    if (!guard.authorized) return null;
    const who = await getMaintainerIdentity();
    if (who) return who.technicianId ?? null;
    // Altri ruoli (supervisor, admin...) possono avere un profilo tecnico se sono stati assegnati a un ordine
    const tech = await runUnscoped(() => prisma.technician.findUnique({ where: { userId: guard.session.user.id }, select: { id: true } }));
    return tech?.id ?? null;
}

/**
 * Segna come lette le notifiche dell'utente connesso che puntano all'ordine indicato (all'apertura della scheda).
 * Modifica SOLO notifiche dell'utente stesso: la condizione `userId` e' nella query, l'id dell'ordine da solo non basta.
 */
export async function markWorkOrderNotificationsRead(workOrderId: string): Promise<{ success: boolean; count: number }> {
    const guard = await requireLogin();
    if (!guard.authorized) return { success: false, count: 0 };
    if (typeof workOrderId !== 'string' || workOrderId.length === 0 || workOrderId.length > 100) return { success: false, count: 0 };
    try {
        const res = await prisma.notification.updateMany({
            where: {
                userId: guard.session.user.id,
                read: false,
                link: { in: [`/work-orders/${workOrderId}`, `/mobile/orders/${workOrderId}`] },
            },
            data: { read: true },
        });
        return { success: true, count: res.count };
    } catch (error) {
        console.error('[mobile-actions] markWorkOrderNotificationsRead', error);
        return { success: false, count: 0 };
    }
}
