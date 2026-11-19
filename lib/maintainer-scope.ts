import { cache } from 'react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { runUnscoped } from '@/lib/plant-scope';
import {
    isMaintainerRole,
    maintainerWorkOrderWhere,
    withMaintainerFilter,
    type MaintainerIdentity,
    type WorkOrderWhere,
} from '@/modules/maintenance/domain/maintainer-visibility';

/**
 * Identita' del manutentore connesso, per limitare le letture agli ordini che lo riguardano.
 * NON e' un file 'use server': le funzioni non sono azioni richiamabili dal browser, si usano solo dal codice del server.
 *
 * Per gli altri ruoli restituisce null: nessun filtro, vedono tutto come prima (nei limiti del loro stabilimento).
 * L'id del tecnico e' quello del profilo `Technician` dell'utente (`userId` univoco): non coincide con l'id dell'utente.
 */
export const getMaintainerIdentity = cache(async (): Promise<(MaintainerIdentity & { name: string | null }) | null> => {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string; name?: string | null } | undefined;
    if (!user?.id || !isMaintainerRole(user.role)) return null;
    // Ricerca per il proprio userId: non dipende dallo stabilimento scelto nel selettore
    const tech = await runUnscoped(() => prisma.technician.findUnique({ where: { userId: user.id as string }, select: { id: true } }));
    return { userId: user.id, technicianId: tech?.id ?? null, name: user.name ?? null };
});

/** Filtro sugli ordini da unire (AND) a ogni lettura: null se l'utente non e' un manutentore. */
export async function getMaintainerWorkOrderFilter(): Promise<WorkOrderWhere | null> {
    const who = await getMaintainerIdentity();
    return who ? maintainerWorkOrderWhere(who) : null;
}

/** `where` gia' composto con il filtro del manutentore (se l'utente lo e'). */
export async function scopeWorkOrderWhere<W extends WorkOrderWhere>(where?: W): Promise<WorkOrderWhere> {
    return withMaintainerFilter(where, await getMaintainerWorkOrderFilter());
}

/** Vero se l'ordine `id` e' visibile all'utente corrente (sempre vero per chi non e' un manutentore e l'ordine esiste). */
export async function canSeeWorkOrder(id: string): Promise<boolean> {
    const where = await scopeWorkOrderWhere({ id });
    const found = await prisma.workOrder.findFirst({ where, select: { id: true } });
    return !!found;
}
