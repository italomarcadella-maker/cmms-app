'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-guard';
import { logAction } from '@/lib/audit';
import { OPERATIVE, SUPERVISION, hasRole } from '@/lib/roles';
import { PlantScopeError, resolveWritePlantId } from '@/lib/plant-scope';
import { setStockQuantity, StockConflictError, StockPartNotFoundError } from '@/lib/stock-ledger';
import { inventoryAdjustment, isValidCountedQty, MAX_COUNT_LINES } from '../../domain/stock-count';
import { isStockMovementType } from '../../domain/stock-movement';

/**
 * Storico dei movimenti di magazzino e inventario fisico.
 * I dati seguono il filtro per stabilimento di lib/prisma.ts (StockMovement, StockCount e StockCountLine sono coperti).
 */

const PAGE_SIZE = 50;
const EXPORT_LIMIT = 10_000;

// --- Movimenti ---

export interface StockMovementFilters {
    partId?: string;
    type?: string;
    /** Data iniziale inclusa, "aaaa-mm-gg". */
    from?: string;
    /** Data finale inclusa, "aaaa-mm-gg". */
    to?: string;
    page?: number;
}

export interface StockMovementRow {
    id: string;
    createdAt: string;
    partId: string | null;
    partName: string;
    plantId: string | null;
    type: string;
    delta: number;
    balanceAfter: number;
    reference: string | null;
    note: string | null;
    userName: string | null;
}

export interface StockMovementsResult {
    success: boolean;
    message?: string;
    items: StockMovementRow[];
    total: number;
    page: number;
    pageSize: number;
    /** Nome dell'articolo filtrato (se c'e' un filtro per articolo). */
    partLabel: string | null;
}

const EMPTY: StockMovementsResult = { success: true, items: [], total: 0, page: 1, pageSize: PAGE_SIZE, partLabel: null };

function parseDay(value: string | undefined, endOfDay: boolean): Date | null | 'invalid' {
    if (!value) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'invalid';
    const d = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
    return Number.isNaN(d.getTime()) ? 'invalid' : d;
}

function buildMovementWhere(filters: StockMovementFilters): { where?: Record<string, unknown>; error?: string } {
    const where: Record<string, unknown> = {};
    if (filters.partId) where.partId = String(filters.partId).slice(0, 64);
    if (filters.type) {
        if (!isStockMovementType(filters.type)) return { error: 'Tipo di movimento non valido.' };
        where.type = filters.type;
    }
    const from = parseDay(filters.from, false);
    const to = parseDay(filters.to, true);
    if (from === 'invalid' || to === 'invalid') return { error: 'Data non valida.' };
    if (from && to && from > to) return { error: 'La data iniziale è successiva a quella finale.' };
    if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    return { where };
}

const toRow = (m: {
    id: string; createdAt: Date; partId: string | null; partName: string; plantId: string | null; type: string;
    delta: number; balanceAfter: number; reference: string | null; note: string | null; userName: string | null;
}): StockMovementRow => ({
    id: m.id, createdAt: m.createdAt.toISOString(), partId: m.partId, partName: m.partName, plantId: m.plantId, type: m.type,
    delta: m.delta, balanceAfter: m.balanceAfter, reference: m.reference, note: m.note, userName: m.userName,
});

/** Movimenti di magazzino, dal piu' recente, 50 per pagina. */
export async function getStockMovements(filters: StockMovementFilters = {}): Promise<StockMovementsResult> {
    const guard = await requireRole(OPERATIVE);
    if (!guard.authorized) return { ...EMPTY, success: false, message: guard.message ?? 'Non autorizzato' };
    const built = buildMovementWhere(filters);
    if (built.error) return { ...EMPTY, success: false, message: built.error };
    const page = Number.isInteger(filters.page) && (filters.page as number) > 0 ? Math.min(filters.page as number, 100_000) : 1;
    try {
        const [total, rows] = await Promise.all([
            prisma.stockMovement.count({ where: built.where }),
            prisma.stockMovement.findMany({
                where: built.where,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * PAGE_SIZE,
                take: PAGE_SIZE,
            }),
        ]);
        let partLabel: string | null = null;
        if (filters.partId) {
            const part = await prisma.sparePart.findUnique({ where: { id: String(filters.partId).slice(0, 64) }, select: { name: true } });
            partLabel = part?.name ?? rows[0]?.partName ?? null;
        }
        return { success: true, items: rows.map(toRow), total, page, pageSize: PAGE_SIZE, partLabel };
    } catch (error) {
        console.error('[stock-actions] getStockMovements', error);
        return { ...EMPTY, success: false, message: 'Impossibile caricare lo storico dei movimenti.' };
    }
}

/** Tutti i movimenti che corrispondono ai filtri (fino a 10.000), per l'esportazione in CSV. */
export async function exportStockMovements(filters: Omit<StockMovementFilters, 'page'> = {}): Promise<{ success: boolean; message?: string; items: StockMovementRow[]; truncated: boolean }> {
    const guard = await requireRole(OPERATIVE);
    if (!guard.authorized) return { success: false, message: guard.message ?? 'Non autorizzato', items: [], truncated: false };
    const built = buildMovementWhere(filters);
    if (built.error) return { success: false, message: built.error, items: [], truncated: false };
    try {
        const rows = await prisma.stockMovement.findMany({
            where: built.where,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: EXPORT_LIMIT + 1,
        });
        return { success: true, items: rows.slice(0, EXPORT_LIMIT).map(toRow), truncated: rows.length > EXPORT_LIMIT };
    } catch (error) {
        console.error('[stock-actions] exportStockMovements', error);
        return { success: false, message: 'Esportazione non riuscita.', items: [], truncated: false };
    }
}

export interface PartSearchHit { id: string; name: string; plantId: string | null; warehouse: string | null; quantity: number }

/** Ricerca di articoli per nome (per il filtro dello storico). */
export async function searchStockParts(query: string): Promise<PartSearchHit[]> {
    const guard = await requireRole(OPERATIVE);
    if (!guard.authorized) return [];
    const q = String(query ?? '').trim().slice(0, 80);
    if (q.length < 2) return [];
    try {
        return await prisma.sparePart.findMany({
            where: { name: { contains: q, mode: 'insensitive' } },
            select: { id: true, name: true, plantId: true, warehouse: true, quantity: true },
            orderBy: { name: 'asc' },
            take: 15,
        });
    } catch (error) {
        console.error('[stock-actions] searchStockParts', error);
        return [];
    }
}

// --- Inventario fisico ---

type Result = { success: boolean; message: string; id?: string };
const ok = (message: string, id?: string): Result => ({ success: true, message, id });
const fail = (message: string): Result => ({ success: false, message });

class UserFacingError extends Error { }

export interface StockCountOptions {
    plants: { id: string; name: string }[];
    /** Combinazioni presenti in magazzino, per i filtri facoltativi di avvio. */
    combos: { plantId: string | null; warehouse: string | null; category: string | null }[];
    canStart: boolean;
}

/** Stabilimenti e filtri disponibili per avviare un inventario. */
export async function getStockCountOptions(): Promise<StockCountOptions> {
    const guard = await requireRole(OPERATIVE);
    if (!guard.authorized) return { plants: [], combos: [], canStart: false };
    try {
        const [plants, combos] = await Promise.all([
            prisma.plant.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
            prisma.sparePart.groupBy({ by: ['plantId', 'warehouse', 'category'] }),
        ]);
        return {
            plants,
            combos: combos.map(c => ({ plantId: c.plantId, warehouse: c.warehouse, category: c.category })),
            canStart: hasRole(guard.session.user.role, SUPERVISION),
        };
    } catch (error) {
        console.error('[stock-actions] getStockCountOptions', error);
        return { plants: [], combos: [], canStart: false };
    }
}

export interface StockCountListItem {
    id: string;
    plantId: string;
    plantName: string;
    status: string;
    note: string | null;
    createdByName: string;
    createdAt: string;
    closedAt: string | null;
    totalLines: number;
    countedLines: number;
}

export async function listStockCounts(): Promise<StockCountListItem[]> {
    const guard = await requireRole(OPERATIVE);
    if (!guard.authorized) return [];
    try {
        const counts = await prisma.stockCount.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { plant: { select: { name: true } }, _count: { select: { lines: true } } },
        });
        if (counts.length === 0) return [];
        const counted = await prisma.stockCountLine.groupBy({
            by: ['countId'],
            where: { countId: { in: counts.map(c => c.id) }, countedQty: { not: null } },
            _count: { _all: true },
        });
        const countedBy = new Map(counted.map(c => [c.countId, c._count._all]));
        return counts.map(c => ({
            id: c.id,
            plantId: c.plantId,
            plantName: c.plant.name,
            status: c.status,
            note: c.note,
            createdByName: c.createdByName,
            createdAt: c.createdAt.toISOString(),
            closedAt: c.closedAt ? c.closedAt.toISOString() : null,
            totalLines: c._count.lines,
            countedLines: countedBy.get(c.id) ?? 0,
        }));
    } catch (error) {
        console.error('[stock-actions] listStockCounts', error);
        return [];
    }
}

export interface StockCountLineRow {
    partId: string;
    partName: string;
    expectedQty: number;
    countedQty: number | null;
    warehouse: string | null;
    location: string | null;
    category: string | null;
    /** Solo per chi coordina (ruoli SUPERVISION): serve al valore dello scostamento. */
    unitCost: number | null;
    /** Giacenza a sistema adesso (puo' essere diversa da quella attesa all'apertura). */
    currentQty: number | null;
}

export interface StockCountDetail {
    id: string;
    plantId: string;
    plantName: string;
    status: string;
    note: string | null;
    createdByName: string;
    createdAt: string;
    closedAt: string | null;
    canManage: boolean;
    lines: StockCountLineRow[];
}

export async function getStockCount(countId: string): Promise<{ success: boolean; message?: string; count?: StockCountDetail }> {
    const guard = await requireRole(OPERATIVE);
    if (!guard.authorized) return { success: false, message: guard.message ?? 'Non autorizzato' };
    try {
        const count = await prisma.stockCount.findUnique({
            where: { id: String(countId) },
            include: {
                plant: { select: { name: true } },
                lines: {
                    orderBy: { partName: 'asc' },
                    include: { part: { select: { warehouse: true, location: true, category: true, unitCost: true, quantity: true } } },
                },
            },
        });
        if (!count) return { success: false, message: 'Inventario non trovato.' };
        const canManage = hasRole(guard.session.user.role, SUPERVISION);
        return {
            success: true,
            count: {
                id: count.id,
                plantId: count.plantId,
                plantName: count.plant.name,
                status: count.status,
                note: count.note,
                createdByName: count.createdByName,
                createdAt: count.createdAt.toISOString(),
                closedAt: count.closedAt ? count.closedAt.toISOString() : null,
                canManage,
                lines: count.lines.map(l => ({
                    partId: l.partId,
                    partName: l.partName,
                    expectedQty: l.expectedQty,
                    countedQty: l.countedQty,
                    warehouse: l.part?.warehouse ?? null,
                    location: l.part?.location ?? null,
                    category: l.part?.category ?? null,
                    unitCost: canManage && l.part ? l.part.unitCost : null,
                    currentQty: l.part ? l.part.quantity : null,
                })),
            },
        };
    } catch (error) {
        console.error('[stock-actions] getStockCount', error);
        return { success: false, message: 'Impossibile caricare l\'inventario.' };
    }
}

const clean = (v: string | null | undefined, max: number) => (v?.trim().slice(0, max) || null);

/**
 * Apre un inventario per uno stabilimento: una riga per ogni articolo (filtrabili per magazzino e categoria) con la
 * giacenza attesa di adesso. Un solo inventario aperto per stabilimento; al massimo 3000 righe.
 */
export async function startStockCount(input: { plantId?: string; warehouse?: string; category?: string; note?: string } = {}): Promise<Result> {
    const guard = await requireRole(SUPERVISION);
    if (!guard.authorized) return fail(guard.message ?? 'Non autorizzato');
    const warehouse = clean(input.warehouse, 120);
    const category = clean(input.category, 120);
    try {
        const plantId = await resolveWritePlantId(input.plantId);
        const user = guard.session.user;

        const id = await prisma.$transaction(async tx => {
            // Blocco per stabilimento: due avvii contemporanei non creano due inventari aperti
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`stockcount:${plantId}`}))`;
            const open = await tx.stockCount.findFirst({ where: { plantId, status: 'OPEN' }, select: { id: true } });
            if (open) throw new UserFacingError('C\'è già un inventario aperto per questo stabilimento: chiudilo prima di avviarne un altro.');

            const parts = await tx.sparePart.findMany({
                where: { plantId, ...(warehouse ? { warehouse } : {}), ...(category ? { category } : {}) },
                select: { id: true, name: true, quantity: true },
                orderBy: { name: 'asc' },
                take: MAX_COUNT_LINES + 1,
            });
            if (parts.length === 0) throw new UserFacingError('Nessun articolo corrisponde ai filtri scelti.');
            if (parts.length > MAX_COUNT_LINES) {
                throw new UserFacingError(`Gli articoli sono più di ${MAX_COUNT_LINES.toLocaleString('it-IT')}: restringi l'inventario con un filtro per magazzino o categoria.`);
            }

            const scope = [warehouse && `magazzino "${warehouse}"`, category && `categoria "${category}"`].filter(Boolean).join(', ');
            const created = await tx.stockCount.create({
                data: {
                    plantId,
                    status: 'OPEN',
                    note: clean(input.note, 300) ?? (scope ? `Solo ${scope}` : null),
                    createdById: user.id ?? null,
                    createdByName: user.name ?? 'Utente',
                },
            });
            await tx.stockCountLine.createMany({
                data: parts.map(p => ({ countId: created.id, partId: p.id, partName: p.name, expectedQty: p.quantity })),
            });
            return created.id;
        }, { timeout: 60_000, maxWait: 10_000 });

        await logAction('STOCK_COUNT_START', id, [warehouse, category].filter(Boolean).join(' / ') || undefined);
        revalidatePath('/inventory/counts');
        return ok('Inventario avviato.', id);
    } catch (e) {
        if (e instanceof UserFacingError || e instanceof PlantScopeError) return fail(e.message);
        console.error('[stock-actions] startStockCount', e);
        return fail('Impossibile avviare l\'inventario.');
    }
}

/** Registra (o cancella, con null) la quantità contata di una riga. Solo su un inventario aperto. */
export async function saveCountLine(countId: string, partId: string, countedQty: number | null): Promise<Result> {
    const guard = await requireRole(OPERATIVE);
    if (!guard.authorized) return fail(guard.message ?? 'Non autorizzato');
    if (countedQty !== null && !isValidCountedQty(countedQty)) return fail('Indica un numero intero maggiore o uguale a zero.');
    try {
        const res = await prisma.stockCountLine.updateMany({
            where: { countId: String(countId), partId: String(partId), count: { status: 'OPEN' } },
            data: { countedQty },
        });
        if (res.count === 1) return ok('Conteggio salvato.');
        const count = await prisma.stockCount.findUnique({ where: { id: String(countId) }, select: { status: true } });
        if (!count) return fail('Inventario non trovato.');
        if (count.status !== 'OPEN') return fail('L\'inventario è già chiuso: il conteggio non si può più modificare.');
        return fail('Articolo non presente in questo inventario.');
    } catch (error) {
        console.error('[stock-actions] saveCountLine', error);
        return fail('Conteggio non salvato.');
    }
}

/**
 * Chiude l'inventario. Con `apply` porta la giacenza di ogni articolo CONTATO al valore contato (movimento INVENTORY,
 * delta rispetto alla giacenza di adesso), tutto in un'unica transazione: se una riga non si può applicare, non cambia nulla
 * e l'inventario resta aperto. Senza `apply` chiude senza toccare le giacenze. Le righe non contate non si toccano mai.
 */
export async function closeStockCount(countId: string, options: { apply: boolean }): Promise<Result & { adjusted?: number; unchanged?: number; notCounted?: number }> {
    const guard = await requireRole(SUPERVISION);
    if (!guard.authorized) return fail(guard.message ?? 'Non autorizzato');
    const apply = options?.apply === true;
    const id = String(countId);
    try {
        const stats = await prisma.$transaction(async tx => {
            const claimed = await tx.stockCount.updateMany({ where: { id, status: 'OPEN' }, data: { status: 'CLOSED', closedAt: new Date() } });
            if (claimed.count !== 1) {
                const existing = await tx.stockCount.findUnique({ where: { id }, select: { status: true } });
                throw new UserFacingError(existing ? 'L\'inventario è già stato chiuso.' : 'Inventario non trovato.');
            }
            const lines = await tx.stockCountLine.findMany({ where: { countId: id }, orderBy: { partName: 'asc' } });
            const countedLines = lines.filter(l => l.countedQty !== null);
            let adjusted = 0;
            let unchanged = 0;
            if (apply) {
                const actor = { id: guard.session.user.id ?? null, name: guard.session.user.name ?? null };
                for (const line of countedLines) {
                    const counted = line.countedQty as number;
                    const r = await setStockQuantity(tx, {
                        partId: line.partId,
                        newQuantity: counted,
                        type: 'INVENTORY',
                        reference: `SC:${id}`,
                        actor,
                        noteFor: current => inventoryAdjustment(line.expectedQty, counted, current)?.note ?? null,
                    });
                    if (r.delta === 0) unchanged++; else adjusted++;
                }
            }
            return { adjusted, unchanged, notCounted: lines.length - countedLines.length };
        }, { timeout: 120_000, maxWait: 10_000 });

        await logAction(apply ? 'STOCK_COUNT_CLOSE_APPLY' : 'STOCK_COUNT_CLOSE', id, apply ? `${stats.adjusted} giacenze aggiornate` : undefined);
        revalidatePath('/inventory/counts');
        revalidatePath('/inventory/movements');
        if (apply) revalidatePath('/inventory');
        return {
            ...ok(apply
                ? `Inventario chiuso: ${stats.adjusted} giacenze aggiornate, ${stats.unchanged} già corrette${stats.notCounted ? `, ${stats.notCounted} non contate (invariate)` : ''}.`
                : `Inventario chiuso senza modificare le giacenze${stats.notCounted ? ` (${stats.notCounted} righe non contate)` : ''}.`, id),
            ...stats,
        };
    } catch (e) {
        if (e instanceof UserFacingError) return fail(e.message);
        if (e instanceof StockConflictError) return fail('Una giacenza è cambiata mentre si chiudeva l\'inventario: riprova. Non è stato modificato nulla.');
        if (e instanceof StockPartNotFoundError) return fail('Un articolo dell\'inventario non esiste più: non è stato modificato nulla. Chiudi senza aggiornare le giacenze oppure riavvia l\'inventario.');
        console.error('[stock-actions] closeStockCount', e);
        return fail('Chiusura non riuscita: non è stato modificato nulla.');
    }
}
