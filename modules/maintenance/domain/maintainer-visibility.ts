/**
 * Cosa vede un manutentore (ruolo MAINTAINER) tra gli ordini di lavoro. Funzioni pure.
 *
 * Un manutentore vede soltanto:
 *  - gli ordini assegnati a lui (campo `assignedTechnicianId` oppure una riga di assegnazione `WorkOrderTechnician`);
 *  - gli ordini che ha richiesto lui (`requesterId`);
 *  - gli ordini ancora senza assegnatario in stato OPEN o APPROVED, che puo' prendere in carico.
 * Non vede mai gli ordini assegnati ad altri. Gli altri ruoli (supervisione, ingegneri di processo, admin) vedono tutto:
 * per loro questi filtri non si applicano.
 *
 * Il filtro vale per qualunque lettura: va sempre composto (AND) con gli altri criteri della query, mai al loro posto.
 */

/** Stati in cui un ordine senza assegnatario e' offerto ai manutentori ("Da prendere in carico"). */
export const CLAIMABLE_STATUSES = ['OPEN', 'APPROVED'] as const;

/** Identita' del manutentore: l'id dell'utente e, se esiste, quello del suo profilo tecnico (sono due id diversi). */
export interface MaintainerIdentity {
    userId: string;
    technicianId?: string | null;
}

/** Filtro Prisma sugli ordini di lavoro (tipizzato in modo lasco: il dominio non dipende dal client del database). */
export type WorkOrderWhere = Record<string, unknown>;

export function isMaintainerRole(role: string | null | undefined): boolean {
    return role === 'MAINTAINER';
}

/** Vero se `assignedTo` (testo libero, nome o segnaposto) non indica nessuna persona. */
function noAssigneeName(): WorkOrderWhere {
    return { OR: [{ assignedTo: null }, { assignedTo: '' }, { assignedTo: 'Unassigned' }] };
}

/** Filtro "ordini che il manutentore puo' vedere", da unire con AND alla query. */
export function maintainerWorkOrderWhere(who: MaintainerIdentity): WorkOrderWhere {
    const mine: WorkOrderWhere[] = [];
    if (who.technicianId) {
        mine.push({ assignedTechnicianId: who.technicianId });
        mine.push({ technicians: { some: { technicianId: who.technicianId } } });
    }
    return {
        OR: [
            ...mine,
            { requesterId: who.userId },
            {
                assignedTechnicianId: null,
                technicians: { none: {} },
                status: { in: [...CLAIMABLE_STATUSES] },
                AND: [noAssigneeName()],
            },
        ],
    };
}

/** Unisce il filtro del manutentore (se c'e') a `where`, senza sostituire nulla di quello che c'e' gia'. */
export function withMaintainerFilter<W extends WorkOrderWhere>(where: W | undefined, filter: WorkOrderWhere | null): WorkOrderWhere {
    if (!filter) return where ?? {};
    return { AND: [...(where && Object.keys(where).length ? [where] : []), filter] };
}

/** Dati minimi di un ordine per decidere in memoria se e' visibile (stessa regola del filtro del database). */
export interface WorkOrderOwnership {
    requesterId?: string | null;
    assignedTechnicianId?: string | null;
    assignedTo?: string | null;
    /** Id dei tecnici nelle righe di assegnazione. */
    technicianIds?: readonly string[];
    status: string;
}

export function isWorkOrderVisibleToMaintainer(wo: WorkOrderOwnership, who: MaintainerIdentity): boolean {
    const techIds = wo.technicianIds ?? [];
    if (who.technicianId && (wo.assignedTechnicianId === who.technicianId || techIds.includes(who.technicianId))) return true;
    if (wo.requesterId && wo.requesterId === who.userId) return true;
    const hasNoOne = !wo.assignedTechnicianId && techIds.length === 0 && (!wo.assignedTo || wo.assignedTo === 'Unassigned');
    return hasNoOne && (CLAIMABLE_STATUSES as readonly string[]).includes(wo.status);
}

/** Vero se l'ordine e' assegnato al manutentore (e non solo richiesto da lui o ancora libero). */
export function isAssignedToMaintainer(wo: Pick<WorkOrderOwnership, 'assignedTechnicianId' | 'technicianIds'>, who: MaintainerIdentity): boolean {
    if (!who.technicianId) return false;
    return wo.assignedTechnicianId === who.technicianId || (wo.technicianIds ?? []).includes(who.technicianId);
}

/**
 * Voci del piano settimanale che hanno un solo assegnatario espresso con un id (manutenzioni programmate, letture dei contatori):
 * l'id puo' essere quello dell'utente o del tecnico. Visibili al manutentore se sono sue o ancora senza assegnatario.
 */
export function isPlanItemVisibleToMaintainer(assigneeId: string | null | undefined, who: MaintainerIdentity): boolean {
    if (!assigneeId) return true;
    return assigneeId === who.userId || (!!who.technicianId && assigneeId === who.technicianId);
}

/** Stati in cui un ordine e' "da fare" per chi lo ha in carico (mostrati nella home mobile). */
export const MY_ACTIVE_STATUSES = ['ASSIGNED', 'OPEN', 'IN_PROGRESS', 'ON_HOLD'] as const;

/** Priorita' che contano come "urgenti" nei contatori. */
export const URGENT_PRIORITIES = ['STOPPED', 'MALFUNCTIONING', 'HIGH'] as const;

/** Id dell'ordine contenuto in un link di notifica del tipo `/work-orders/<id>` (anche con query o barra finale), altrimenti null. */
export function workOrderIdFromLink(link: string | null | undefined): string | null {
    if (!link) return null;
    const m = /^\/(?:mobile\/orders|work-orders)\/([^/?#]+)\/?(?:[?#].*)?$/.exec(link);
    if (!m) return null;
    try { return decodeURIComponent(m[1]); } catch { return m[1]; }
}
