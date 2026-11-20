'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-guard';
import { OPERATIVE, SUPERVISION, MANAGERS, ENGINEERING } from '@/lib/roles';
import { runUnscoped } from '@/lib/plant-scope';
import { canSeeWorkOrder } from '@/lib/maintainer-scope';
import { usersToNotify } from '@/lib/plant-users';
import { logAction } from '@/lib/audit';
import {
    activationWindow,
    allPrecautionsChecked,
    buildPrecautionsDone,
    canTransition,
    checkTechniciansQualified,
    computeValidity,
    effectivePermitStatus,
    isPermitStatus,
    parsePrecautionsDone,
    qualificationProblemText,
    validatePermitType,
    type EffectivePermitStatus,
    type PermitStatus,
    type PermitTypeInput,
    type PrecautionRecord,
    type TechnicianQualificationInfo,
} from '../../domain/work-permits';

/**
 * Permessi di lavoro legati agli ordini e alle abilitazioni dei manutentori.
 * I tipi di permesso e le precauzioni li definiscono gli amministratori dall'interfaccia: qui non c'e' nessun contenuto predefinito.
 * Ogni cambio di stato e' un updateMany condizionato allo stato di partenza: due persone che agiscono insieme non si sovrappongono.
 */

type Result = { success: boolean; message: string; id?: string };
const ok = (message: string, id?: string): Result => ({ success: true, message, id });
const fail = (message: string): Result => ({ success: false, message });

const MAX_PLACE = 200;
const MAX_NOTES = 1000;
const MAX_REASON = 500;
const FINAL_ORDER_STATUSES = ['COMPLETED', 'CLOSED', 'CANCELED'];
const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 1000;

const clean = (v: string | null | undefined, max: number) => (v?.trim().slice(0, max) || null);

// --- Tipi per l'interfaccia ---

export interface PermitTypeRow {
    id: string;
    name: string;
    description: string | null;
    requiredQualificationId: string | null;
    requiredQualificationName: string | null;
    requiresApproval: boolean;
    defaultValidityHours: number | null;
    precautions: string[];
    isActive: boolean;
    sortOrder: number;
}

export interface PermitTypesData {
    types: PermitTypeRow[];
    qualifications: { id: string; name: string }[];
    canManage: boolean;
}

export interface PermitRow {
    id: string;
    workOrderId: string;
    workOrderTitle: string;
    assetName: string | null;
    typeId: string;
    typeName: string;
    requiresApproval: boolean;
    requiredQualificationName: string | null;
    status: PermitStatus;
    /** Come status, ma "EXPIRED" per un permesso approvato o attivo oltre la fine della validita'. */
    effectiveStatus: EffectivePermitStatus;
    requestedByName: string;
    approvedByName: string | null;
    approvedAt: string | null;
    rejectionReason: string | null;
    validFrom: string | null;
    validTo: string | null;
    place: string | null;
    notes: string | null;
    /** Precauzioni attuali del tipo (da spuntare all'attivazione). */
    precautions: string[];
    /** Precauzioni registrate al momento dell'attivazione. */
    precautionsDone: PrecautionRecord[];
    closedAt: string | null;
    createdAt: string;
    /** Per i permessi richiesti o approvati: tecnici assegnati senza l'abilitazione richiesta. Vuoto se tutto a posto. */
    qualificationIssue: string;
}

export interface OrderPermitsData {
    permits: PermitRow[];
    /** Tipi attivi tra cui scegliere per una nuova richiesta. */
    types: PermitTypeRow[];
    assigned: { id: string; name: string }[];
    /** Per tipo: tecnici assegnati non abilitati (mancante / scaduta). */
    issuesByType: Record<string, { missing: string[]; expired: string[]; text: string }>;
    /** L'ordine e' concluso: non si richiedono nuovi permessi. */
    orderClosed: boolean;
    canApprove: boolean;
    canRequest: boolean;
}

// --- Lettura: supporto ---

type PermitWithRefs = {
    id: string; workOrderId: string; typeId: string; status: string; requestedByName: string; approvedByName: string | null;
    approvedAt: Date | null; rejectionReason: string | null; validFrom: Date | null; validTo: Date | null; place: string | null;
    notes: string | null; precautionsDone: unknown; closedAt: Date | null; createdAt: Date;
    type: { name: string; requiresApproval: boolean; precautions: string[]; requiredQualificationId: string | null; requiredQualification: { name: string } | null };
    workOrder: { title: string; asset: { name: string } | null };
};

const PERMIT_INCLUDE = {
    type: { select: { name: true, requiresApproval: true, precautions: true, requiredQualificationId: true, requiredQualification: { select: { name: true } } } },
    workOrder: { select: { title: true, asset: { select: { name: true } } } },
} as const;

/** Tecnici assegnati a ciascun ordine (assegnatario principale + righe WorkOrderTechnician) con le loro abilitazioni. */
async function loadAssignedTechnicians(workOrderIds: string[]): Promise<Map<string, TechnicianQualificationInfo[]>> {
    const result = new Map<string, TechnicianQualificationInfo[]>();
    if (workOrderIds.length === 0) return result;
    const orders = await prisma.workOrder.findMany({
        where: { id: { in: workOrderIds } }, // filtrato per stabilimento
        select: { id: true, assignedTechnicianId: true, technicians: { select: { technicianId: true } } },
    });
    const idsByOrder = new Map<string, string[]>();
    const allIds = new Set<string>();
    for (const o of orders) {
        const ids = new Set<string>(o.technicians.map(t => t.technicianId));
        if (o.assignedTechnicianId) ids.add(o.assignedTechnicianId);
        idsByOrder.set(o.id, [...ids]);
        ids.forEach(i => allIds.add(i));
    }
    // I tecnici di un ordine possono essere in prestito da un altro stabilimento: gli id arrivano gia' da ordini visibili
    const techs = allIds.size === 0 ? [] : await runUnscoped(() => prisma.technician.findMany({
        where: { id: { in: [...allIds] } },
        select: { id: true, name: true, qualifications: { select: { typeId: true, expiresAt: true } } },
    }));
    const byId = new Map(techs.map(t => [t.id, { id: t.id, name: t.name, qualifications: t.qualifications }]));
    for (const [orderId, ids] of idsByOrder) {
        result.set(orderId, ids.map(i => byId.get(i)).filter((t): t is TechnicianQualificationInfo => !!t));
    }
    return result;
}

function toRow(p: PermitWithRefs, now: Date, techsByOrder: Map<string, TechnicianQualificationInfo[]>): PermitRow {
    const status = (isPermitStatus(p.status) ? p.status : 'CANCELED') as PermitStatus;
    let qualificationIssue = '';
    if (status === 'REQUESTED' || status === 'APPROVED') {
        const check = checkTechniciansQualified(p.type.requiredQualificationId, techsByOrder.get(p.workOrderId) ?? [], now);
        qualificationIssue = qualificationProblemText(check, p.type.requiredQualification?.name);
    }
    return {
        id: p.id,
        workOrderId: p.workOrderId,
        workOrderTitle: p.workOrder.title,
        assetName: p.workOrder.asset?.name ?? null,
        typeId: p.typeId,
        typeName: p.type.name,
        requiresApproval: p.type.requiresApproval,
        requiredQualificationName: p.type.requiredQualification?.name ?? null,
        status,
        effectiveStatus: effectivePermitStatus(status, p.validTo, now),
        requestedByName: p.requestedByName,
        approvedByName: p.approvedByName,
        approvedAt: p.approvedAt?.toISOString() ?? null,
        rejectionReason: p.rejectionReason,
        validFrom: p.validFrom?.toISOString() ?? null,
        validTo: p.validTo?.toISOString() ?? null,
        place: p.place,
        notes: p.notes,
        precautions: p.type.precautions,
        precautionsDone: parsePrecautionsDone(p.precautionsDone),
        closedAt: p.closedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        qualificationIssue,
    };
}

type TypeWithQual = {
    id: string; name: string; description: string | null; requiredQualificationId: string | null; requiresApproval: boolean;
    defaultValidityHours: number | null; precautions: string[]; isActive: boolean; sortOrder: number; requiredQualification: { name: string } | null;
};

const toTypeRow = (t: TypeWithQual): PermitTypeRow => ({
    id: t.id,
    name: t.name,
    description: t.description,
    requiredQualificationId: t.requiredQualificationId,
    requiredQualificationName: t.requiredQualification?.name ?? null,
    requiresApproval: t.requiresApproval,
    defaultValidityHours: t.defaultValidityHours,
    precautions: t.precautions,
    isActive: t.isActive,
    sortOrder: t.sortOrder,
});

const TYPE_INCLUDE = { requiredQualification: { select: { name: true } } } as const;

// --- Lettura ---

/** Tipi di permesso. Chi gestisce (admin, responsabili di plant) vede anche quelli disattivati. */
export async function getPermitTypes(): Promise<PermitTypesData> {
    const { authorized, session } = await requireRole(OPERATIVE);
    const empty: PermitTypesData = { types: [], qualifications: [], canManage: false };
    if (!authorized) return empty;
    const canManage = (MANAGERS as readonly string[]).includes(session.user.role);
    const [types, qualifications] = await Promise.all([
        prisma.workPermitType.findMany({
            where: canManage ? {} : { isActive: true },
            include: TYPE_INCLUDE,
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
        canManage ? prisma.qualificationType.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }) : Promise.resolve([]),
    ]);
    return { types: types.map(toTypeRow), qualifications, canManage };
}

/** Permessi di un ordine, con i tipi disponibili e gli eventuali tecnici non abilitati. */
export async function getPermitsForOrder(workOrderId: string): Promise<OrderPermitsData> {
    const { authorized, session } = await requireRole(OPERATIVE);
    const empty: OrderPermitsData = { permits: [], types: [], assigned: [], issuesByType: {}, orderClosed: false, canApprove: false, canRequest: false };
    if (!authorized || typeof workOrderId !== 'string' || !workOrderId) return empty;
    if (!(await canSeeWorkOrder(workOrderId))) return empty;

    const now = new Date();
    const [order, rows, types, techsByOrder] = await Promise.all([
        prisma.workOrder.findUnique({ where: { id: workOrderId }, select: { status: true } }),
        prisma.workPermit.findMany({ where: { workOrderId }, include: PERMIT_INCLUDE, orderBy: { createdAt: 'desc' } }),
        prisma.workPermitType.findMany({ where: { isActive: true }, include: TYPE_INCLUDE, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
        loadAssignedTechnicians([workOrderId]),
    ]);
    const assigned = techsByOrder.get(workOrderId) ?? [];
    const issuesByType: OrderPermitsData['issuesByType'] = {};
    for (const t of types) {
        if (!t.requiredQualificationId) continue;
        const check = checkTechniciansQualified(t.requiredQualificationId, assigned, now);
        if (!check.ok) issuesByType[t.id] = { missing: check.missing, expired: check.expired, text: qualificationProblemText(check, t.requiredQualification?.name) };
    }
    const orderClosed = !!order && FINAL_ORDER_STATUSES.includes(order.status);
    return {
        permits: (rows as unknown as PermitWithRefs[]).map(p => toRow(p, now, techsByOrder)),
        types: types.map(toTypeRow),
        assigned: assigned.map(t => ({ id: t.id, name: t.name })),
        issuesByType,
        orderClosed,
        canApprove: (SUPERVISION as readonly string[]).includes(session.user.role),
        canRequest: !orderClosed,
    };
}

/**
 * Elenco generale dei permessi (supervisione e ingegneri di processo, questi ultimi in sola lettura).
 * `status` puo' essere uno stato o un elenco di stati; senza filtro restituisce tutto, dal piu' recente.
 */
export async function listPermits(opts: { status?: PermitStatus | PermitStatus[]; limit?: number } = {}): Promise<PermitRow[]> {
    const { authorized } = await requireRole(ENGINEERING);
    if (!authorized) return [];
    const statuses = (Array.isArray(opts.status) ? opts.status : opts.status ? [opts.status] : []).filter(isPermitStatus);
    const limit = Math.min(Math.max(Math.trunc(Number(opts.limit) || DEFAULT_LIMIT), 1), MAX_LIMIT);
    const rows = await prisma.workPermit.findMany({
        where: statuses.length > 0 ? { status: { in: statuses } } : {},
        include: PERMIT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
    const now = new Date();
    const pendingOrderIds = [...new Set(rows.filter(r => r.status === 'REQUESTED' || r.status === 'APPROVED').map(r => r.workOrderId))];
    const techsByOrder = await loadAssignedTechnicians(pendingOrderIds);
    return (rows as unknown as PermitWithRefs[]).map(p => toRow(p, now, techsByOrder));
}

// --- Tipi di permesso (admin, responsabili di plant) ---

export type PermitTypeFormInput = PermitTypeInput & { isActive?: boolean };

async function checkTypeReferences(name: string, qualificationId: string | null, exceptId?: string): Promise<string | null> {
    const dup = await prisma.workPermitType.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
        select: { id: true },
    });
    if (dup) return 'Esiste già un tipo di permesso con questo nome.';
    if (qualificationId) {
        const q = await prisma.qualificationType.findUnique({ where: { id: qualificationId }, select: { id: true } });
        if (!q) return 'L\'abilitazione richiesta non esiste.';
    }
    return null;
}

export async function createPermitType(input: PermitTypeFormInput): Promise<Result> {
    const { authorized, message } = await requireRole(MANAGERS);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    const v = validatePermitType(input);
    if (!v.ok) return fail(v.message);
    const problem = await checkTypeReferences(v.value.name, v.value.requiredQualificationId);
    if (problem) return fail(problem);
    try {
        const last = await prisma.workPermitType.aggregate({ _max: { sortOrder: true } });
        const created = await prisma.workPermitType.create({
            data: { ...v.value, isActive: input.isActive !== false, sortOrder: (last._max.sortOrder ?? 0) + 1 },
            select: { id: true },
        });
        revalidatePath('/permits');
        return ok('Tipo di permesso creato.', created.id);
    } catch (e) {
        if ((e as { code?: string })?.code === 'P2002') return fail('Esiste già un tipo di permesso con questo nome.');
        console.error('[work-permit-actions]', e);
        return fail('Errore durante il salvataggio del tipo di permesso.');
    }
}

export async function updatePermitType(id: string, input: PermitTypeFormInput): Promise<Result> {
    const { authorized, message } = await requireRole(MANAGERS);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    if (typeof id !== 'string' || !id) return fail('Tipo di permesso non trovato.');
    const v = validatePermitType(input);
    if (!v.ok) return fail(v.message);
    const existing = await prisma.workPermitType.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return fail('Tipo di permesso non trovato.');
    const problem = await checkTypeReferences(v.value.name, v.value.requiredQualificationId, id);
    if (problem) return fail(problem);
    try {
        await prisma.workPermitType.update({
            where: { id },
            data: { ...v.value, ...(typeof input.isActive === 'boolean' ? { isActive: input.isActive } : {}) },
        });
        revalidatePath('/permits');
        return ok('Tipo di permesso aggiornato.', id);
    } catch (e) {
        if ((e as { code?: string })?.code === 'P2002') return fail('Esiste già un tipo di permesso con questo nome.');
        console.error('[work-permit-actions]', e);
        return fail('Errore durante il salvataggio del tipo di permesso.');
    }
}

// --- Richiesta, approvazione, attivazione, chiusura ---

function parseDate(value: string | null | undefined): Date | null | 'invalid' {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string') return 'invalid';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 'invalid' : d;
}

function refresh(workOrderId: string) {
    revalidatePath(`/work-orders/${workOrderId}`);
    revalidatePath(`/mobile/orders/${workOrderId}`);
    revalidatePath('/permits');
}

async function notify(userIds: (string | null | undefined)[], title: string, message: string, workOrderId: string) {
    const ids = [...new Set(userIds.filter((i): i is string => !!i))];
    if (ids.length === 0) return;
    try {
        await prisma.notification.createMany({ data: ids.map(userId => ({ userId, title, message, link: `/work-orders/${workOrderId}` })) });
    } catch (e) {
        console.error('[work-permit-actions] notifica non inviata', e); // la notifica non deve far fallire l'azione
    }
}

export async function requestPermit(input: { workOrderId: string; typeId: string; place?: string; notes?: string; validFrom?: string | null; validTo?: string | null }): Promise<Result> {
    const { authorized, message, session } = await requireRole(OPERATIVE);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    if (!input || typeof input.workOrderId !== 'string' || typeof input.typeId !== 'string') return fail('Dati non validi.');
    if (!(await canSeeWorkOrder(input.workOrderId))) return fail('Ordine non trovato.');

    const [order, type] = await Promise.all([
        prisma.workOrder.findUnique({ where: { id: input.workOrderId }, select: { id: true, title: true, plantId: true, status: true } }),
        prisma.workPermitType.findUnique({ where: { id: input.typeId }, include: TYPE_INCLUDE }),
    ]);
    if (!order) return fail('Ordine non trovato.');
    if (FINAL_ORDER_STATUSES.includes(order.status)) return fail('L\'ordine è concluso: non si possono richiedere nuovi permessi.');
    if (!type || !type.isActive) return fail('Tipo di permesso non disponibile.');

    const from = parseDate(input.validFrom);
    const to = parseDate(input.validTo);
    if (from === 'invalid' || to === 'invalid') return fail('Data non valida.');
    const now = new Date();
    if (from || to) {
        const v = computeValidity({ validFrom: from, validTo: to }, now);
        if (!v.ok) return fail(v.message);
    }

    const requesterName = String(session.user.name || session.user.email || 'Utente');
    let status: PermitStatus = 'REQUESTED';
    let validFrom = from;
    let validTo = to;
    let approvedAt: Date | null = null;

    // Tipo senza approvazione: parte gia' approvato, ma solo se tutti i tecnici assegnati sono abilitati
    if (!type.requiresApproval) {
        const techs = await loadAssignedTechnicians([order.id]);
        const check = checkTechniciansQualified(type.requiredQualificationId, techs.get(order.id) ?? [], now);
        if (!check.ok) return fail(`Permesso non rilasciabile: ${qualificationProblemText(check, type.requiredQualification?.name)}.`);
        const v = computeValidity({ validFrom: from, validTo: to, defaultValidityHours: type.defaultValidityHours }, now);
        if (!v.ok) return fail(v.message);
        status = 'APPROVED';
        validFrom = v.validFrom;
        validTo = v.validTo;
        approvedAt = now;
    }

    try {
        const created = await prisma.workPermit.create({
            data: {
                workOrderId: order.id,
                typeId: type.id,
                status,
                requestedById: session.user.id ?? null,
                requestedByName: requesterName,
                approvedAt,
                validFrom,
                validTo,
                place: clean(input.place, MAX_PLACE),
                notes: clean(input.notes, MAX_NOTES),
            },
            select: { id: true },
        });
        await logAction('REQUEST_WORK_PERMIT', created.id, JSON.stringify({ workOrderId: order.id, type: type.name, status }));
        if (status === 'REQUESTED') {
            const approvers = await usersToNotify(order.plantId, ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR']);
            await notify(
                approvers.map(u => u.id).filter(id => id !== session.user.id),
                'Permesso di lavoro da approvare',
                `${requesterName} ha richiesto «${type.name}» per l'ordine «${order.title}».`,
                order.id,
            );
        }
        refresh(order.id);
        return ok(status === 'APPROVED' ? 'Permesso approvato: il tipo non richiede approvazione.' : 'Richiesta inviata.', created.id);
    } catch (e) {
        console.error('[work-permit-actions]', e);
        return fail('Errore durante la richiesta del permesso.');
    }
}

async function loadPermit(id: string) {
    if (typeof id !== 'string' || !id) return null;
    return prisma.workPermit.findUnique({
        where: { id },
        include: {
            type: { include: TYPE_INCLUDE },
            workOrder: { select: { id: true, title: true, plantId: true } },
        },
    });
}

export async function approvePermit(id: string): Promise<Result> {
    const { authorized, message, session } = await requireRole(SUPERVISION);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    const permit = await loadPermit(id);
    if (!permit) return fail('Permesso non trovato.');
    if (!canTransition(permit.status, 'APPROVED')) return fail('Il permesso non è più in attesa di approvazione.');

    const now = new Date();
    const techs = await loadAssignedTechnicians([permit.workOrderId]);
    const check = checkTechniciansQualified(permit.type.requiredQualificationId, techs.get(permit.workOrderId) ?? [], now);
    if (!check.ok) return fail(`Approvazione rifiutata: ${qualificationProblemText(check, permit.type.requiredQualification?.name)}.`);

    const v = computeValidity({ validFrom: permit.validFrom, validTo: permit.validTo, defaultValidityHours: permit.type.defaultValidityHours }, now);
    if (!v.ok) return fail(v.message);
    if (v.validTo && v.validTo.getTime() < now.getTime()) return fail('La validità richiesta è già scaduta: chiedi un nuovo permesso.');

    const approver = String(session.user.name || session.user.email || 'Utente');
    try {
        const res = await prisma.workPermit.updateMany({
            where: { id, status: 'REQUESTED' },
            data: { status: 'APPROVED', approvedByName: approver, approvedAt: now, rejectionReason: null, validFrom: v.validFrom, validTo: v.validTo },
        });
        if (res.count === 0) return fail('Il permesso è già stato gestito da un\'altra persona.');
        await logAction('APPROVE_WORK_PERMIT', id, JSON.stringify({ workOrderId: permit.workOrderId, type: permit.type.name }));
        await notify([permit.requestedById], 'Permesso di lavoro approvato', `«${permit.type.name}» per l'ordine «${permit.workOrder.title}» è stato approvato da ${approver}.`, permit.workOrderId);
        refresh(permit.workOrderId);
        return ok('Permesso approvato.', id);
    } catch (e) {
        console.error('[work-permit-actions]', e);
        return fail('Errore durante l\'approvazione.');
    }
}

export async function rejectPermit(id: string, reason: string): Promise<Result> {
    const { authorized, message, session } = await requireRole(SUPERVISION);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    const why = typeof reason === 'string' ? reason.trim().slice(0, MAX_REASON) : '';
    if (!why) return fail('Indica il motivo del rifiuto.');
    const permit = await loadPermit(id);
    if (!permit) return fail('Permesso non trovato.');
    if (!canTransition(permit.status, 'REJECTED')) return fail('Il permesso non è più in attesa di approvazione.');
    const who = String(session.user.name || session.user.email || 'Utente');
    try {
        const res = await prisma.workPermit.updateMany({
            where: { id, status: 'REQUESTED' },
            data: { status: 'REJECTED', rejectionReason: why, approvedByName: who, approvedAt: new Date() },
        });
        if (res.count === 0) return fail('Il permesso è già stato gestito da un\'altra persona.');
        await logAction('REJECT_WORK_PERMIT', id, JSON.stringify({ workOrderId: permit.workOrderId, type: permit.type.name }));
        await notify([permit.requestedById], 'Permesso di lavoro rifiutato', `«${permit.type.name}» per l'ordine «${permit.workOrder.title}» è stato rifiutato: ${why}`, permit.workOrderId);
        refresh(permit.workOrderId);
        return ok('Permesso rifiutato.', id);
    } catch (e) {
        console.error('[work-permit-actions]', e);
        return fail('Errore durante il rifiuto.');
    }
}

export async function activatePermit(id: string, precautionsChecked: boolean[]): Promise<Result> {
    const { authorized, message } = await requireRole(OPERATIVE);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    const permit = await loadPermit(id);
    if (!permit || !(await canSeeWorkOrder(permit.workOrderId))) return fail('Permesso non trovato.');
    if (!canTransition(permit.status, 'ACTIVE')) return fail('Il permesso deve essere approvato prima di essere attivato.');

    const now = new Date();
    const window = activationWindow(permit.validFrom, permit.validTo, now);
    if (!window.ok) return fail(window.message);
    if (!allPrecautionsChecked(permit.type.precautions, precautionsChecked)) return fail('Per attivare il permesso devi spuntare tutte le precauzioni.');

    // Le abilitazioni possono essere scadute o i tecnici cambiati dopo l'approvazione
    const techs = await loadAssignedTechnicians([permit.workOrderId]);
    const check = checkTechniciansQualified(permit.type.requiredQualificationId, techs.get(permit.workOrderId) ?? [], now);
    if (!check.ok) return fail(`Permesso non attivabile: ${qualificationProblemText(check, permit.type.requiredQualification?.name)}.`);

    try {
        const res = await prisma.workPermit.updateMany({
            where: { id, status: 'APPROVED' },
            data: { status: 'ACTIVE', precautionsDone: JSON.parse(JSON.stringify(buildPrecautionsDone(permit.type.precautions, precautionsChecked))) },
        });
        if (res.count === 0) return fail('Lo stato del permesso è cambiato: ricarica la pagina.');
        await logAction('ACTIVATE_WORK_PERMIT', id, JSON.stringify({ workOrderId: permit.workOrderId, type: permit.type.name }));
        refresh(permit.workOrderId);
        return ok('Permesso attivato.', id);
    } catch (e) {
        console.error('[work-permit-actions]', e);
        return fail('Errore durante l\'attivazione.');
    }
}

export async function closePermit(id: string): Promise<Result> {
    const { authorized, message } = await requireRole(OPERATIVE);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    const permit = await loadPermit(id);
    if (!permit || !(await canSeeWorkOrder(permit.workOrderId))) return fail('Permesso non trovato.');
    if (!canTransition(permit.status, 'CLOSED')) return fail('Si può chiudere solo un permesso attivo.');
    try {
        const res = await prisma.workPermit.updateMany({ where: { id, status: 'ACTIVE' }, data: { status: 'CLOSED', closedAt: new Date() } });
        if (res.count === 0) return fail('Lo stato del permesso è cambiato: ricarica la pagina.');
        await logAction('CLOSE_WORK_PERMIT', id, JSON.stringify({ workOrderId: permit.workOrderId, type: permit.type.name }));
        refresh(permit.workOrderId);
        return ok('Permesso chiuso.', id);
    } catch (e) {
        console.error('[work-permit-actions]', e);
        return fail('Errore durante la chiusura.');
    }
}

export async function cancelPermit(id: string): Promise<Result> {
    const { authorized, message } = await requireRole(OPERATIVE);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    const permit = await loadPermit(id);
    if (!permit || !(await canSeeWorkOrder(permit.workOrderId))) return fail('Permesso non trovato.');
    if (!canTransition(permit.status, 'CANCELED')) return fail('Questo permesso non si può più annullare.');
    try {
        // Condizionato allo stato letto: se nel frattempo e' cambiato non si annulla "alla cieca"
        const res = await prisma.workPermit.updateMany({ where: { id, status: permit.status }, data: { status: 'CANCELED', closedAt: new Date() } });
        if (res.count === 0) return fail('Lo stato del permesso è cambiato: ricarica la pagina.');
        await logAction('CANCEL_WORK_PERMIT', id, JSON.stringify({ workOrderId: permit.workOrderId, type: permit.type.name, from: permit.status }));
        refresh(permit.workOrderId);
        return ok('Permesso annullato.', id);
    } catch (e) {
        console.error('[work-permit-actions]', e);
        return fail('Errore durante l\'annullamento.');
    }
}
