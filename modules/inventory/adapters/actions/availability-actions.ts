'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/actions';
import { crossPlant, getPlantScope, resolveWritePlantId, runUnscoped, PlantScopeError } from '@/lib/plant-scope';
import { usersToNotify } from '@/lib/plant-users';
import { rankMatches } from '../../domain/catalog-matching';

/**
 * Disponibilita' dei ricambi tra stabilimenti e trasferimenti.
 *
 * Questa e' una delle due funzioni trasversali del progetto: legge le giacenze di TUTTI i plant (con crossPlant,
 * registrato nell'audit log) ma restituisce solo cio' che serve a chi cerca: quantita', ubicazione e plant di
 * provenienza. Costi unitari, storico e fornitori non escono dal plant.
 */

const READERS = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'MAINTAINER', 'PROCESS_ENGINEER'];
const DECIDERS = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR'];

export interface StockRow {
    partId: string;
    plantId: string;
    plantName: string;
    name: string;
    quantity: number;
    minQuantity: number;
    /** Quantita' cedibile senza scendere sotto la scorta minima del plant che la possiede. */
    surplus: number;
    location: string | null;
    warehouse: string | null;
    /** True se il plant e' uno di quelli dell'utente. */
    isOwn: boolean;
}

export interface AvailabilityGroup {
    catalogId: string;
    catalogName: string;
    score: number;
    stocks: StockRow[];
    totalElsewhere: number;
}

async function ownPlantIds(): Promise<{ all: boolean; ids: string[] }> {
    const scope = await getPlantScope();
    if (scope.mode === 'all' || scope.mode === 'bypass') return { all: true, ids: scope.allowedPlantIds };
    return { all: false, ids: scope.plantIds };
}

async function loadStocks(feature: string, catalogIds: string[], details: Record<string, unknown>): Promise<StockRow[]> {
    const own = await ownPlantIds();
    const rows = await crossPlant(feature, () => prisma.sparePart.findMany({
        where: { catalogId: { in: catalogIds } },
        select: {
            id: true, name: true, quantity: true, minQuantity: true, location: true, warehouse: true, plantId: true, catalogId: true,
            plant: { select: { name: true } },
        },
        orderBy: { quantity: 'desc' },
    }), details);
    return rows
        .filter(r => r.plantId)
        .map(r => ({
            partId: r.id,
            plantId: r.plantId as string,
            plantName: r.plant?.name ?? '-',
            name: r.name,
            quantity: r.quantity,
            minQuantity: r.minQuantity,
            surplus: Math.max(0, r.quantity - r.minQuantity),
            location: r.location,
            warehouse: r.warehouse,
            isOwn: own.all || own.ids.includes(r.plantId as string),
            catalogId: r.catalogId as string,
        })) as (StockRow & { catalogId: string })[];
}

/** Cerca un ricambio per descrizione in tutti gli stabilimenti. */
export async function searchPartAvailability(query: string): Promise<{ success: boolean; message?: string; groups: AvailabilityGroup[] }> {
    const { authorized, message } = await requireRole(READERS);
    if (!authorized) return { success: false, message, groups: [] };
    const q = query.trim();
    if (q.length < 2) return { success: true, groups: [] };

    const catalog = await prisma.sparePartCatalog.findMany({ select: { id: true, name: true } });
    const matches = rankMatches(q, catalog).slice(0, 8);
    if (matches.length === 0) return { success: true, groups: [] };

    const stocks = (await loadStocks('PART_AVAILABILITY_SEARCH', matches.map(m => m.id), { query: q })) as (StockRow & { catalogId: string })[];
    const groups = matches
        .map(m => {
            const rows = stocks.filter(s => s.catalogId === m.id).map(({ catalogId: _c, ...row }) => row);
            return {
                catalogId: m.id,
                catalogName: m.name,
                score: Math.round(m.score * 100) / 100,
                stocks: rows,
                totalElsewhere: rows.filter(r => !r.isOwn).reduce((sum, r) => sum + r.surplus, 0),
            };
        })
        .filter(g => g.stocks.length > 0);
    return { success: true, groups };
}

/** Dove e' disponibile, in altri plant, lo stesso articolo di una riga del mio magazzino. */
export async function getPartAvailabilityElsewhere(partId: string): Promise<{ success: boolean; message?: string; stocks: StockRow[] }> {
    const { authorized, message } = await requireRole(READERS);
    if (!authorized) return { success: false, message, stocks: [] };
    const part = await prisma.sparePart.findUnique({ where: { id: partId }, select: { catalogId: true, plantId: true } });
    if (!part?.catalogId) return { success: true, stocks: [] };
    const stocks = await loadStocks('PART_AVAILABILITY_FOR_PART', [part.catalogId], { partId });
    return { success: true, stocks: stocks.filter(s => !s.isOwn && s.surplus > 0).map(({ ...s }) => s) };
}

// --- Trasferimenti ---

export interface TransferRow {
    id: string;
    partName: string;
    quantity: number;
    status: string;
    note: string | null;
    decisionNote: string | null;
    fromPlantId: string;
    fromPlantName: string;
    toPlantId: string;
    toPlantName: string;
    createdAt: string;
    canDecide: boolean;
    canReceive: boolean;
    canCancel: boolean;
}

export async function requestPartTransfer(input: { fromPartId: string; quantity: number; note?: string; toPlantId?: string }) {
    const { authorized, message, session } = await requireRole(READERS);
    if (!authorized) return { success: false, message };
    try {
        const toPlantId = await resolveWritePlantId(input.toPlantId);
        const quantity = Math.floor(Number(input.quantity));
        if (!Number.isFinite(quantity) || quantity < 1) return { success: false, message: 'Indica una quantita\' valida.' };

        const source = await crossPlant('PART_TRANSFER_REQUEST', () => prisma.sparePart.findUnique({
            where: { id: input.fromPartId },
            select: { id: true, name: true, quantity: true, plantId: true, catalogId: true },
        }), { partId: input.fromPartId });
        if (!source || !source.plantId) return { success: false, message: 'Ricambio non trovato.' };
        if (source.plantId === toPlantId) return { success: false, message: 'Il ricambio e\' gia\' nel tuo stabilimento.' };
        if (quantity > source.quantity) return { success: false, message: `Disponibili solo ${source.quantity} pezzi.` };

        const created = await prisma.partTransferRequest.create({
            data: {
                catalogId: source.catalogId,
                partName: source.name,
                fromPlantId: source.plantId,
                toPlantId,
                fromPartId: source.id,
                quantity,
                note: input.note?.trim() || null,
                requestedById: session.user.id,
            },
        });

        const [fromPlant, toPlant] = await runUnscoped(() => Promise.all([
            prisma.plant.findUnique({ where: { id: source.plantId! }, select: { name: true } }),
            prisma.plant.findUnique({ where: { id: toPlantId }, select: { name: true } }),
        ]));
        const approvers = await usersToNotify(source.plantId, ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR']);
        if (approvers.length > 0) {
            await prisma.notification.createMany({
                data: approvers.map(u => ({
                    userId: u.id,
                    title: 'Richiesta di trasferimento ricambio',
                    message: `${toPlant?.name ?? 'Un altro stabilimento'} chiede ${quantity} pz di "${source.name}" da ${fromPlant?.name ?? 'questo stabilimento'}.`,
                    link: '/inventory/availability?tab=transfers',
                })),
            });
        }
        revalidatePath('/inventory/availability');
        return { success: true, message: 'Richiesta inviata allo stabilimento che possiede il ricambio.', id: created.id };
    } catch (e) {
        if (e instanceof PlantScopeError) return { success: false, message: e.message };
        console.error('requestPartTransfer', e);
        return { success: false, message: 'Errore nella richiesta di trasferimento.' };
    }
}

export async function listPartTransfers(): Promise<TransferRow[]> {
    const { authorized, session } = await requireRole(READERS);
    if (!authorized) return [];
    const own = await ownPlantIds();
    const mine = (id: string) => own.all || own.ids.includes(id);
    const canManage = DECIDERS.includes(session.user.role);

    const rows = await prisma.partTransferRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { fromPlant: { select: { name: true } }, toPlant: { select: { name: true } } },
    });
    return rows.map(r => ({
        id: r.id,
        partName: r.partName,
        quantity: r.quantity,
        status: r.status,
        note: r.note,
        decisionNote: r.decisionNote,
        fromPlantId: r.fromPlantId,
        fromPlantName: r.fromPlant.name,
        toPlantId: r.toPlantId,
        toPlantName: r.toPlant.name,
        createdAt: r.createdAt.toISOString(),
        canDecide: r.status === 'REQUESTED' && canManage && mine(r.fromPlantId),
        canReceive: r.status === 'APPROVED' && mine(r.toPlantId),
        canCancel: r.status === 'REQUESTED' && (r.requestedById === session.user.id || (canManage && mine(r.toPlantId))),
    }));
}

async function loadMyTransfer(id: string) {
    // Il filtro per plant mostra la richiesta solo a chi appartiene al plant che cede o a quello che riceve
    return prisma.partTransferRequest.findUnique({ where: { id } });
}

export async function decidePartTransfer(id: string, approve: boolean, decisionNote?: string) {
    const { authorized, message, session } = await requireRole(DECIDERS);
    if (!authorized) return { success: false, message };
    try {
        const req = await loadMyTransfer(id);
        if (!req) return { success: false, message: 'Richiesta non trovata.' };
        const own = await ownPlantIds();
        if (!own.all && !own.ids.includes(req.fromPlantId)) {
            return { success: false, message: 'Solo lo stabilimento che cede il ricambio puo\' decidere.' };
        }
        if (req.status !== 'REQUESTED') return { success: false, message: 'La richiesta e\' gia\' stata gestita.' };

        await prisma.$transaction(async tx => {
            if (approve) {
                const part = await tx.sparePart.findUnique({ where: { id: req.fromPartId } });
                if (!part) throw new Error('Il ricambio non e\' piu\' presente in magazzino.');
                if (part.quantity < req.quantity) throw new Error(`Giacenza insufficiente: ${part.quantity} pz disponibili.`);
                await tx.sparePart.update({ where: { id: part.id }, data: { quantity: part.quantity - req.quantity, lastUpdated: new Date() } });
            }
            await tx.partTransferRequest.update({
                where: { id },
                data: {
                    status: approve ? 'APPROVED' : 'REJECTED',
                    decidedById: session.user.id,
                    decidedAt: new Date(),
                    decisionNote: decisionNote?.trim() || null,
                },
            });
        });

        const targets = await usersToNotify(req.toPlantId, ['PLANT_MANAGER', 'SUPERVISOR', 'MAINTAINER']);
        const ids = [...new Set([req.requestedById, ...targets.map(t => t.id)])];
        await prisma.notification.createMany({
            data: ids.map(userId => ({
                userId,
                title: approve ? 'Trasferimento ricambio approvato' : 'Trasferimento ricambio rifiutato',
                message: approve
                    ? `${req.quantity} pz di "${req.partName}" sono in arrivo: conferma la ricezione quando arrivano.`
                    : `La richiesta di ${req.quantity} pz di "${req.partName}" e' stata rifiutata${decisionNote ? `: ${decisionNote}` : '.'}`,
                link: '/inventory/availability?tab=transfers',
            })),
        });
        revalidatePath('/inventory');
        revalidatePath('/inventory/availability');
        return { success: true, message: approve ? 'Trasferimento approvato: la giacenza e\' stata scalata.' : 'Richiesta rifiutata.' };
    } catch (e) {
        console.error('decidePartTransfer', e);
        return { success: false, message: e instanceof Error ? e.message : 'Errore nella decisione.' };
    }
}

export async function receivePartTransfer(id: string) {
    const { authorized, message } = await requireRole(READERS);
    if (!authorized) return { success: false, message };
    try {
        const req = await loadMyTransfer(id);
        if (!req) return { success: false, message: 'Richiesta non trovata.' };
        const own = await ownPlantIds();
        if (!own.all && !own.ids.includes(req.toPlantId)) {
            return { success: false, message: 'Solo lo stabilimento che riceve puo\' confermare l\'arrivo.' };
        }
        if (req.status !== 'APPROVED') return { success: false, message: 'Il trasferimento non e\' in attesa di ricezione.' };

        // Dati dell'articolo dal plant che ha ceduto (lettura trasversale, solo i campi anagrafici)
        const source = await crossPlant('PART_TRANSFER_RECEIVE', () => prisma.sparePart.findUnique({
            where: { id: req.fromPartId },
            select: { category: true, description: true, vendor: true, unitCost: true },
        }), { transferId: id });

        await prisma.$transaction(async tx => {
            const existing = req.catalogId
                ? await tx.sparePart.findFirst({ where: { plantId: req.toPlantId, catalogId: req.catalogId } })
                : null;
            if (existing) {
                await tx.sparePart.update({ where: { id: existing.id }, data: { quantity: existing.quantity + req.quantity, lastUpdated: new Date() } });
            } else {
                await tx.sparePart.create({
                    data: {
                        name: req.partName,
                        category: source?.category ?? null,
                        description: source?.description ?? null,
                        vendor: source?.vendor ?? null,
                        unitCost: source?.unitCost ?? 0,
                        quantity: req.quantity,
                        minQuantity: 0,
                        plantId: req.toPlantId,
                        catalogId: req.catalogId,
                    },
                });
            }
            await tx.partTransferRequest.update({ where: { id }, data: { status: 'RECEIVED', receivedAt: new Date() } });
        });
        revalidatePath('/inventory');
        revalidatePath('/inventory/availability');
        return { success: true, message: 'Ricezione confermata: la giacenza del tuo stabilimento e\' stata aggiornata.' };
    } catch (e) {
        console.error('receivePartTransfer', e);
        return { success: false, message: 'Errore nella conferma di ricezione.' };
    }
}

export async function cancelPartTransfer(id: string) {
    const { authorized, message, session } = await requireRole(READERS);
    if (!authorized) return { success: false, message };
    const req = await loadMyTransfer(id);
    if (!req) return { success: false, message: 'Richiesta non trovata.' };
    const own = await ownPlantIds();
    const canManageDest = DECIDERS.includes(session.user.role) && (own.all || own.ids.includes(req.toPlantId));
    if (req.status !== 'REQUESTED' || (req.requestedById !== session.user.id && !canManageDest)) {
        return { success: false, message: 'Non puoi annullare questa richiesta.' };
    }
    await prisma.partTransferRequest.update({ where: { id }, data: { status: 'CANCELED' } });
    revalidatePath('/inventory/availability');
    return { success: true, message: 'Richiesta annullata.' };
}

// --- Catalogo di gruppo ---

export interface CatalogEntryOverview {
    id: string;
    name: string;
    category: string | null;
    plants: { plantId: string; plantName: string; quantity: number }[];
}

/** Elenco del catalogo con le giacenze per plant (solo quantita'): serve a individuare doppioni da unire. */
export async function getCatalogOverview(): Promise<CatalogEntryOverview[]> {
    const { authorized } = await requireRole(['ADMIN', 'PLANT_MANAGER']);
    if (!authorized) return [];
    const entries = await prisma.sparePartCatalog.findMany({ orderBy: { name: 'asc' } });
    const stocks = await crossPlant('CATALOG_OVERVIEW', () => prisma.sparePart.findMany({
        where: { catalogId: { not: null } },
        select: { catalogId: true, quantity: true, plantId: true, plant: { select: { name: true } } },
    }));
    return entries.map(e => ({
        id: e.id,
        name: e.name,
        category: e.category,
        plants: stocks.filter(s => s.catalogId === e.id && s.plantId).map(s => ({ plantId: s.plantId as string, plantName: s.plant?.name ?? '-', quantity: s.quantity })),
    }));
}

/** Unisce due voci del catalogo (stesso articolo scritto in modo diverso). Solo admin. */
export async function mergeCatalogEntries(keepId: string, removeId: string) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };
    if (keepId === removeId) return { success: false, message: 'Seleziona due voci diverse.' };
    try {
        await runUnscoped(() => prisma.$transaction([
            prisma.sparePart.updateMany({ where: { catalogId: removeId }, data: { catalogId: keepId } }),
            prisma.partTransferRequest.updateMany({ where: { catalogId: removeId }, data: { catalogId: keepId } }),
            prisma.sparePartCatalog.delete({ where: { id: removeId } }),
        ]));
        revalidatePath('/inventory/catalog');
        return { success: true, message: 'Voci unite.' };
    } catch (e) {
        console.error('mergeCatalogEntries', e);
        return { success: false, message: 'Errore nell\'unione delle voci.' };
    }
}
