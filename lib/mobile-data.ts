import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getMaintainerIdentity, scopeWorkOrderWhere } from '@/lib/maintainer-scope';
import { byUrgencyThenDue } from '@/modules/maintenance/domain/priority';
import {
    CLAIMABLE_STATUSES,
    MY_ACTIVE_STATUSES,
    URGENT_PRIORITIES,
    isAssignedToMaintainer,
    workOrderIdFromLink,
} from '@/modules/maintenance/domain/maintainer-visibility';

/**
 * Dati della vista mobile. Solo per componenti del server (non e' un file 'use server').
 * Il filtro per il manutentore e' sempre applicato qui, sul server: la pagina riceve solo quello che puo' vedere.
 */

export interface MobileOrderCard {
    id: string;
    title: string;
    assetName: string;
    location: string | null;
    priority: string;
    status: string;
    dueDate: string | null;
    createdAt: string;
    /** Notifica non letta su questo ordine: "Nuovo". */
    isNew: boolean;
    /** Scadenza superata e ordine non concluso (calcolato sul server: i componenti restano puri). */
    overdue: boolean;
    /** Chi lo ha in carico, mostrato solo a chi supervisiona (mai a un manutentore). */
    assignee: string | null;
}

export interface MobileHome {
    userName: string;
    role: string;
    isMaintainer: boolean;
    /** Manutentore senza profilo tecnico: non puo' prendere in carico ordini finche' non viene creato. */
    missingTechnician: boolean;
    mine: MobileOrderCard[];
    claimable: MobileOrderCard[];
    counts: { todo: number; urgent: number; fresh: number };
}

const CARD_SELECT = {
    id: true, title: true, priority: true, status: true, dueDate: true, createdAt: true, assignedTo: true,
    assignedTechnicianId: true,
    asset: { select: { name: true, location: true } },
    technicians: { select: { technician: { select: { name: true } } } },
} as const;

type CardRow = {
    id: string; title: string; priority: string; status: string; dueDate: Date | null; createdAt: Date; assignedTo: string | null;
    asset: { name: string; location: string | null } | null;
    technicians: { technician: { name: string } }[];
};

/** Id degli ordini per cui l'utente ha una notifica non letta. */
export async function unreadOrderIds(userId: string): Promise<Set<string>> {
    const rows = await prisma.notification.findMany({
        where: { userId, read: false, OR: [{ link: { startsWith: '/work-orders/' } }, { link: { startsWith: '/mobile/orders/' } }] },
        select: { link: true },
        take: 200,
    });
    const ids = new Set<string>();
    for (const r of rows) {
        const id = workOrderIdFromLink(r.link);
        if (id) ids.add(id);
    }
    return ids;
}

const FINAL_STATUSES = ['COMPLETED', 'CLOSED', 'CANCELED'];
function isOverdue(due: Date | null, status: string): boolean {
    return !!due && !FINAL_STATUSES.includes(status) && due.getTime() < Date.now();
}

function toCard(row: CardRow, fresh: Set<string>, showAssignee: boolean): MobileOrderCard {
    const names = [...new Set(row.technicians.map(t => t.technician.name))];
    const assignee = showAssignee ? (names.length ? names.join(', ') : row.assignedTo && row.assignedTo !== 'Unassigned' ? row.assignedTo : null) : null;
    return {
        id: row.id,
        title: row.title,
        assetName: row.asset?.name ?? '-',
        location: row.asset?.location ?? null,
        priority: row.priority,
        status: row.status,
        dueDate: row.dueDate ? row.dueDate.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
        isNew: fresh.has(row.id),
        overdue: isOverdue(row.dueDate, row.status),
        assignee,
    };
}

const sortCards = (rows: CardRow[]) => [...rows].sort(byUrgencyThenDue);

/** Home mobile: attivita' assegnate (a lui, o di tutti per chi supervisiona) e ordini ancora da prendere in carico. */
export async function loadMobileHome(): Promise<MobileHome | null> {
    const session = await auth();
    const user = session?.user as { id?: string; name?: string | null; role?: string } | undefined;
    if (!user?.id) return null;

    const who = await getMaintainerIdentity();
    const isMaintainer = !!who;

    // "Libero" = nessun tecnico ne' nome assegnato: stessa definizione del filtro di visibilita'
    const freeWhere = {
        assignedTechnicianId: null,
        technicians: { none: {} },
        status: { in: [...CLAIMABLE_STATUSES] },
        OR: [{ assignedTo: null }, { assignedTo: '' }, { assignedTo: 'Unassigned' }],
    };

    // Per il manutentore: solo gli ordini in cui e' tra i tecnici. Per gli altri ruoli: tutte le attivita' con un assegnatario.
    const mineBase = isMaintainer
        ? {
            status: { in: [...MY_ACTIVE_STATUSES] },
            OR: [{ assignedTechnicianId: who.technicianId }, { technicians: { some: { technicianId: who.technicianId } } }],
        }
        : { status: { in: [...MY_ACTIVE_STATUSES] }, NOT: freeWhere };
    // Senza profilo tecnico non c'e' nulla di "suo": non si interroga il database (un id nullo nel filtro non deve mai valere "tutti")
    const noProfile = isMaintainer && !who.technicianId;

    const [mineRows, claimRows, fresh] = await Promise.all([
        noProfile ? Promise.resolve([]) : prisma.workOrder.findMany({ where: await scopeWorkOrderWhere(mineBase), select: CARD_SELECT, take: 200 }),
        prisma.workOrder.findMany({ where: await scopeWorkOrderWhere(freeWhere), select: CARD_SELECT, take: 100 }),
        unreadOrderIds(user.id),
    ]);

    const showAssignee = !isMaintainer;
    const mine = sortCards(mineRows as unknown as CardRow[]).map(r => toCard(r, fresh, showAssignee));
    const claimable = sortCards(claimRows as unknown as CardRow[]).map(r => toCard(r, fresh, false));

    return {
        userName: user.name ?? '',
        role: user.role ?? 'USER',
        isMaintainer,
        missingTechnician: isMaintainer && !who?.technicianId,
        mine,
        claimable,
        counts: {
            todo: mine.length,
            urgent: mine.filter(o => (URGENT_PRIORITIES as readonly string[]).includes(o.priority)).length,
            fresh: mine.filter(o => o.isNew).length,
        },
    };
}

/** Come puo' lavorare l'utente su questo ordine dalla scheda mobile. */
export type MobileOrderMode =
    /** Puo' avviare, mettere in pausa, concludere, spuntare la checklist. */
    | 'WORK'
    /** Ordine libero: prima va preso in carico. */
    | 'CLAIM'
    /** Solo lettura (ordine finito, in approvazione o di un collega, visibile perche' richiesto da lui). */
    | 'READONLY';

export interface MobileOrderDetail {
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    category: string;
    dueDate: string | null;
    createdAt: string;
    asset: { id: string; name: string; location: string | null; model: string | null };
    checklist: { id: string; label: string; completed: boolean }[];
    /** Inizio del timer attivo dell'utente (ISO), se sta lavorando. */
    activeSince: string | null;
    totalMinutes: number;
    mode: MobileOrderMode;
    assignedToMe: boolean;
    /** Nome degli assegnatari, solo per chi supervisiona. Per un manutentore sempre null. */
    assignees: string | null;
    isMaintainer: boolean;
    overdue: boolean;
}

const FINAL_OR_WAITING = ['PENDING_APPROVAL', 'PENDING_REVIEW', 'COMPLETED', 'CLOSED', 'CANCELED'];

/** Scheda di un ordine. Restituisce null se non esiste O se un manutentore non e' autorizzato a vederlo (stessa risposta: "non trovato"). */
export async function loadMobileOrder(id: string): Promise<MobileOrderDetail | null> {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id || !id) return null;

    const who = await getMaintainerIdentity();
    const row = await prisma.workOrder.findFirst({
        where: await scopeWorkOrderWhere({ id }),
        select: {
            id: true, title: true, description: true, priority: true, status: true, category: true, dueDate: true, createdAt: true,
            assignedTo: true, assignedTechnicianId: true,
            asset: { select: { id: true, name: true, location: true, model: true } },
            checklist: { orderBy: { id: 'asc' }, select: { id: true, label: true, completed: true } },
            timers: { select: { userId: true, startTime: true, endTime: true, duration: true } },
            technicians: { select: { technicianId: true, technician: { select: { name: true } } } },
        },
    });
    if (!row) return null;

    const technicianIds = row.technicians.map(t => t.technicianId);
    const assignedToMe = who ? isAssignedToMaintainer({ assignedTechnicianId: row.assignedTechnicianId, technicianIds }, who) : false;
    const isFree = !row.assignedTechnicianId && technicianIds.length === 0 && (!row.assignedTo || row.assignedTo === 'Unassigned');

    let mode: MobileOrderMode;
    if (FINAL_OR_WAITING.includes(row.status)) mode = 'READONLY';
    else if (who) mode = assignedToMe ? 'WORK' : isFree && (CLAIMABLE_STATUSES as readonly string[]).includes(row.status) ? 'CLAIM' : 'READONLY';
    else mode = 'WORK';

    const myActive = row.timers.find(t => t.userId === user.id && !t.endTime);
    const names = [...new Set(row.technicians.map(t => t.technician.name))];

    return {
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority,
        status: row.status,
        category: row.category,
        dueDate: row.dueDate ? row.dueDate.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
        asset: { id: row.asset.id, name: row.asset.name, location: row.asset.location ?? null, model: row.asset.model ?? null },
        checklist: row.checklist,
        activeSince: myActive ? myActive.startTime.toISOString() : null,
        totalMinutes: row.timers.reduce((acc, t) => acc + (t.duration ?? 0), 0),
        mode,
        assignedToMe,
        assignees: who ? null : (names.length ? names.join(', ') : row.assignedTo && row.assignedTo !== 'Unassigned' ? row.assignedTo : null),
        isMaintainer: !!who,
        overdue: isOverdue(row.dueDate, row.status),
    };
}
