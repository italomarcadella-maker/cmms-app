'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireLogin, requireRole } from '@/lib/auth-guard';
import { logAction } from '@/lib/audit';
import { OPERATIVE, hasRole } from '@/lib/roles';
import { PlantScopeError, resolveWritePlantId } from '@/lib/plant-scope';
import { usersToNotify } from '@/lib/plant-users';
import {
    MATERIAL_STATUS_LABELS, canTransition, normalizeMaterialItems, parseNeededBy, staleStatusMessage, statesBefore,
    type MaterialItemInput, type MaterialStatus,
} from '../../domain/material-request';

/**
 * Richieste di materiale alla manutenzione.
 * Qualsiasi utente connesso (anche il ruolo base) chiede materiale al magazzino manutenzione del proprio stabilimento;
 * chi lavora in manutenzione (ruoli OPERATIVE) le evade. I dati seguono il filtro per stabilimento di lib/prisma.ts.
 */

const LINK = '/requests/material';
const MANAGERS_TO_NOTIFY = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'MAINTAINER'];

type Result = { success: boolean; message: string; id?: string };
const ok = (message: string, id?: string): Result => ({ success: true, message, id });
const fail = (message: string): Result => ({ success: false, message });

const clean = (v: string | null | undefined, max: number) => (v?.trim().slice(0, max) || null);

/** Errore con un messaggio pensato per l'utente (annulla la transazione e lo si mostra cosi' com'e'). */
class UserFacingError extends Error { }

// --- Tipi per l'interfaccia ---

export interface MaterialRequestItemRow {
    id: string;
    partId: string | null;
    description: string;
    quantity: number;
    deliveredQty: number | null;
    /** Giacenza attuale del magazzino: solo per chi evade le richieste. */
    available: number | null;
}

export interface MaterialRequestRow {
    id: string;
    plantId: string;
    requesterId: string | null;
    requesterName: string;
    department: string | null;
    status: MaterialStatus;
    note: string | null;
    neededBy: string | null;
    handledByName: string | null;
    handledAt: string | null;
    responseNote: string | null;
    createdAt: string;
    items: MaterialRequestItemRow[];
}

export interface WarehousePartHit {
    id: string;
    name: string;
    available: number;
    location: string | null;
}

export interface MaterialRequestInput {
    plantId?: string;
    department?: string;
    /** AAAA-MM-GG */
    neededBy?: string;
    note?: string;
    items: MaterialItemInput[];
}

// --- Letture ---

/** Ricerca nel magazzino manutenzione per nome. Nessun costo: i reparti vedono solo nome, disponibilita' e ubicazione. */
export async function searchWarehouseParts(query: string, plantId?: string): Promise<WarehousePartHit[]> {
    const { authorized } = await requireLogin();
    if (!authorized) return [];
    const q = (query ?? '').trim().slice(0, 80);
    if (!q) return [];
    const parts = await prisma.sparePart.findMany({
        where: { name: { contains: q, mode: 'insensitive' }, ...(plantId ? { plantId } : {}) },
        select: { id: true, name: true, quantity: true, location: true },
        orderBy: { name: 'asc' },
        take: 20,
    });
    return parts.map(p => ({ id: p.id, name: p.name, available: Math.max(0, p.quantity), location: p.location }));
}

export async function listMaterialRequests(scope: 'mine' | 'all'): Promise<MaterialRequestRow[]> {
    const { authorized, session } = await requireLogin();
    if (!authorized) return [];
    const operative = hasRole(session.user.role, OPERATIVE);
    if (scope === 'all' && !operative) return [];

    const rows = await prisma.materialRequest.findMany({
        where: scope === 'mine' ? { requesterId: session.user.id } : {},
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { items: { orderBy: { id: 'asc' }, include: { part: { select: { quantity: true } } } } },
    });

    return rows.map(r => ({
        id: r.id,
        plantId: r.plantId,
        requesterId: r.requesterId,
        requesterName: r.requesterName,
        department: r.department,
        status: r.status as MaterialStatus,
        note: r.note,
        neededBy: r.neededBy ? r.neededBy.toISOString() : null,
        handledByName: r.handledByName,
        handledAt: r.handledAt ? r.handledAt.toISOString() : null,
        responseNote: r.responseNote,
        createdAt: r.createdAt.toISOString(),
        items: r.items.map(i => ({
            id: i.id,
            partId: i.partId,
            description: i.description,
            quantity: i.quantity,
            deliveredQty: i.deliveredQty,
            available: operative && scope === 'all' && i.part ? Math.max(0, i.part.quantity) : null,
        })),
    }));
}

// --- Nuova richiesta e annullamento (chi richiede) ---

export async function createMaterialRequest(input: MaterialRequestInput): Promise<Result> {
    const { authorized, message, session } = await requireLogin();
    if (!authorized) return fail(message ?? 'Non autorizzato');

    const normalized = normalizeMaterialItems(input?.items);
    if ('error' in normalized) return fail(normalized.error);

    const neededBy = parseNeededBy(input.neededBy);
    if (neededBy === 'invalid') return fail('Data di necessità non valida.');
    if (neededBy) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (neededBy < today) return fail('La data in cui serve il materiale non può essere nel passato.');
    }

    try {
        const plantId = await resolveWritePlantId(input.plantId);

        // Gli articoli del magazzino devono esistere e appartenere allo stabilimento della richiesta
        const partIds = [...new Set(normalized.items.flatMap(i => (i.partId ? [i.partId] : [])))];
        const parts = partIds.length
            ? await prisma.sparePart.findMany({ where: { id: { in: partIds } }, select: { id: true, name: true, plantId: true } })
            : [];
        const byId = new Map(parts.map(p => [p.id, p]));
        const items: { partId: string | null; description: string; quantity: number }[] = [];
        for (const item of normalized.items) {
            if (!item.partId) {
                items.push({ partId: null, description: item.description, quantity: item.quantity });
                continue;
            }
            const part = byId.get(item.partId);
            if (!part) return fail('Uno dei materiali scelti non è più presente nel magazzino: ripeti la ricerca.');
            if (part.plantId && part.plantId !== plantId) return fail(`"${part.name}" non appartiene al magazzino dello stabilimento scelto.`);
            items.push({ partId: part.id, description: part.name.slice(0, 200), quantity: item.quantity });
        }

        const requesterName: string = session.user.name ?? session.user.email ?? 'Utente';
        const department = clean(input.department, 80);
        const created = await prisma.materialRequest.create({
            data: {
                plantId,
                requesterId: session.user.id,
                requesterName,
                department,
                status: 'REQUESTED',
                note: clean(input.note, 500),
                neededBy,
                items: { create: items },
            },
        });

        // Avviso a chi gestisce la manutenzione dello stabilimento (la notifica non deve far fallire la richiesta)
        try {
            const handlers = await usersToNotify(plantId, MANAGERS_TO_NOTIFY);
            const text = `${requesterName}${department ? ` (${department})` : ''}: ${items.length} ${items.length === 1 ? 'riga' : 'righe'} di materiale.`;
            for (const u of handlers) {
                if (u.id === session.user.id) continue;
                await prisma.notification.create({ data: { userId: u.id, title: 'Nuova richiesta di materiale', message: text, link: LINK } });
            }
        } catch (e) {
            console.error('[material-request] notifica non inviata', e);
        }

        await logAction('CREATE_MATERIAL_REQUEST', created.id, `${items.length} righe`);
        revalidatePath(LINK);
        return ok('Richiesta inviata alla manutenzione.', created.id);
    } catch (e) {
        if (e instanceof PlantScopeError) return fail(e.message);
        console.error('[material-request] createMaterialRequest', e);
        return fail('Invio della richiesta non riuscito.');
    }
}

/** Solo chi l'ha creata, e solo finche' la manutenzione non l'ha presa in carico. */
export async function cancelMaterialRequest(id: string): Promise<Result> {
    const { authorized, message, session } = await requireLogin();
    if (!authorized) return fail(message ?? 'Non autorizzato');
    try {
        const res = await prisma.materialRequest.updateMany({
            where: { id, requesterId: session.user.id, status: 'REQUESTED' },
            data: { status: 'CANCELED' },
        });
        if (res.count !== 1) {
            const current = await prisma.materialRequest.findUnique({ where: { id }, select: { requesterId: true, status: true } });
            if (!current) return fail('Richiesta non trovata.');
            if (current.requesterId !== session.user.id) return fail('Puoi annullare solo le tue richieste.');
            return fail(staleStatusMessage(current.status));
        }
        await logAction('CANCEL_MATERIAL_REQUEST', id);
        revalidatePath(LINK);
        return ok('Richiesta annullata.');
    } catch (e) {
        console.error('[material-request] cancelMaterialRequest', e);
        return fail('Annullamento non riuscito.');
    }
}

// --- Evasione (manutenzione) ---

type Handler = { id: string; name: string };

/**
 * Cambia lo stato di una richiesta con un aggiornamento condizionato allo stato di partenza: se due persone agiscono
 * insieme, solo una riesce. La consegna scarica il magazzino nella stessa transazione.
 */
async function applyTransition(id: string, to: 'READY' | 'DELIVERED' | 'REJECTED', handler: Handler, responseNote?: string | null): Promise<Result> {
    const request = await prisma.materialRequest.findUnique({ where: { id }, select: { id: true, status: true, requesterId: true, items: { select: { description: true, quantity: true } } } });
    if (!request) return fail('Richiesta non trovata.');
    if (!canTransition(request.status, to)) return fail(staleStatusMessage(request.status));

    const data = {
        status: to,
        handledById: handler.id,
        handledByName: handler.name,
        handledAt: new Date(),
        ...(responseNote !== undefined ? { responseNote } : {}),
    };
    const from = statesBefore(to);

    try {
        if (to === 'DELIVERED') {
            await prisma.$transaction(async tx => {
                const claimed = await tx.materialRequest.updateMany({ where: { id, status: { in: from } }, data });
                if (claimed.count !== 1) throw new UserFacingError('La richiesta è già stata gestita: aggiorna l\'elenco.');

                const items = await tx.materialRequestItem.findMany({ where: { requestId: id }, orderBy: { id: 'asc' } });
                for (const item of items) {
                    if (item.partId) {
                        const res = await tx.sparePart.updateMany({
                            where: { id: item.partId, quantity: { gte: item.quantity } },
                            data: { quantity: { decrement: item.quantity }, lastUpdated: new Date() },
                        });
                        if (res.count !== 1) {
                            throw new UserFacingError(`Giacenza insufficiente per "${item.description}" (richiesti ${item.quantity} pz): la richiesta non è stata consegnata.`);
                        }
                    }
                    await tx.materialRequestItem.updateMany({ where: { id: item.id }, data: { deliveredQty: item.quantity } });
                }
            });
        } else {
            const claimed = await prisma.materialRequest.updateMany({ where: { id, status: { in: from } }, data });
            if (claimed.count !== 1) {
                const current = await prisma.materialRequest.findUnique({ where: { id }, select: { status: true } });
                return fail(current ? staleStatusMessage(current.status) : 'Richiesta non trovata.');
            }
        }
    } catch (e) {
        if (e instanceof UserFacingError) return fail(e.message);
        console.error('[material-request] applyTransition', e);
        return fail('Operazione non riuscita.');
    }

    // Avviso a chi ha fatto la richiesta (la notifica non deve far fallire l'operazione gia' completata)
    if (request.requesterId && request.requesterId !== handler.id) {
        const summary = request.items.length === 1
            ? `${request.items[0].quantity} x ${request.items[0].description}`
            : `${request.items.length} righe di materiale`;
        const text: Record<typeof to, string> = {
            READY: `${summary}: il materiale è pronto da ritirare in magazzino manutenzione.${responseNote ? ` ${responseNote}` : ''}`,
            DELIVERED: `${summary}: il materiale ti è stato consegnato.`,
            REJECTED: `${summary}: richiesta rifiutata${responseNote ? `. Motivo: ${responseNote}` : '.'}`,
        };
        try {
            await prisma.notification.create({
                data: { userId: request.requesterId, title: `Richiesta di materiale: ${MATERIAL_STATUS_LABELS[to].toLowerCase()}`, message: text[to], link: LINK },
            });
        } catch (e) {
            console.error('[material-request] notifica non inviata', e);
        }
    }

    await logAction(`MATERIAL_REQUEST_${to}`, id, responseNote ?? undefined);
    revalidatePath(LINK);
    if (to === 'DELIVERED') {
        revalidatePath('/inventory');
        revalidatePath('/inventory/availability');
    }
    return ok(to === 'READY' ? 'Richiesta segnata come pronta da ritirare.' : to === 'DELIVERED' ? 'Richiesta consegnata: la giacenza è stata scalata.' : 'Richiesta rifiutata.');
}

export async function markMaterialRequestReady(id: string, responseNote?: string): Promise<Result> {
    const { authorized, message, session } = await requireRole(OPERATIVE);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    return applyTransition(id, 'READY', { id: session.user.id, name: session.user.name ?? 'Utente' }, clean(responseNote, 300));
}

export async function deliverMaterialRequest(id: string): Promise<Result> {
    const { authorized, message, session } = await requireRole(OPERATIVE);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    return applyTransition(id, 'DELIVERED', { id: session.user.id, name: session.user.name ?? 'Utente' });
}

export async function rejectMaterialRequest(id: string, reason: string): Promise<Result> {
    const { authorized, message, session } = await requireRole(OPERATIVE);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    const motive = clean(reason, 300);
    if (!motive) return fail('Indica il motivo del rifiuto.');
    return applyTransition(id, 'REJECTED', { id: session.user.id, name: session.user.name ?? 'Utente' }, motive);
}
