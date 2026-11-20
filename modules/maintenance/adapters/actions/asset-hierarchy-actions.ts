'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireLogin, requireRole } from '@/lib/auth-guard';
import { revalidateAssets, getEffectiveSettings } from '@/lib/actions';
import { logAction } from '@/lib/audit';
import { getMaintainerIdentity, scopeWorkOrderWhere } from '@/lib/maintainer-scope';
import { validateParentAssignment } from '../db/asset-hierarchy-queries';
import { getDescendantIds, isSystemAsset, partStockStatus } from '../../domain/asset-hierarchy';
import {
    CLOSED_STATUSES,
    FALLBACK_LABOR_RATE,
    OPEN_STATUSES,
    computeReliability,
} from '../../domain/asset-reliability';

/**
 * Gerarchia degli asset (macchina -> gruppo -> componente) e distinta dei ricambi di una macchina.
 * Le letture le puo' fare qualunque utente connesso, nei limiti del proprio stabilimento (filtro in lib/prisma.ts);
 * le modifiche richiedono un ruolo (come addAsset/updateAsset) e restano nello stabilimento dell'asset.
 */

/** Chi puo' cambiare la posizione di un asset nella gerarchia (stessi ruoli di addAsset/updateAsset). */
const HIERARCHY_ROLES = ['ADMIN', 'PLANT_MANAGER', 'PROCESS_ENGINEER'] as const;
/** Chi puo' modificare la distinta ricambi: i ruoli della gerarchia piu' il supervisor. */
const BOM_ROLES = ['ADMIN', 'PLANT_MANAGER', 'PROCESS_ENGINEER', 'SUPERVISOR'] as const;

const MAX_PART_QUANTITY = 1000;
const MAX_NOTES_LENGTH = 300;

// --- Gerarchia ---

export async function setAssetParent(assetId: string, parentId: string | null): Promise<{ success: boolean; message: string }> {
    const { authorized, message } = await requireRole([...HIERARCHY_ROLES]);
    if (!authorized) return { success: false, message: message ?? 'Non autorizzato' };

    if (typeof assetId !== 'string' || !assetId) return { success: false, message: 'Asset non valido.' };
    if (parentId !== null && (typeof parentId !== 'string' || !parentId)) return { success: false, message: 'Asset padre non valido.' };

    try {
        const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true, plantId: true, parentId: true } });
        if (!asset) return { success: false, message: 'Asset non trovato.' };
        if (asset.parentId === parentId) return { success: true, message: 'Nessuna modifica.' };

        const check = await validateParentAssignment(assetId, parentId, asset.plantId ?? null);
        if (!check.ok) return { success: false, message: check.message };

        await prisma.asset.update({ where: { id: assetId }, data: { parentId } });
        await logAction('SET_ASSET_PARENT', assetId, parentId ? `Asset collegato al padre ${parentId}` : 'Asset reso indipendente');
        revalidatePath('/');
        revalidateAssets();
        return { success: true, message: parentId ? 'Asset collegato al padre.' : 'Asset reso indipendente.' };
    } catch (error) {
        console.error('[asset-hierarchy]', error);
        return { success: false, message: 'Errore durante il salvataggio della gerarchia.' };
    }
}

// --- Distinta dei ricambi ---

export interface AssetBomRow {
    /** Id del legame asset-ricambio. */
    id: string;
    partId: string;
    name: string;
    category: string | null;
    warehouse: string | null;
    /** Ubicazione a magazzino. */
    location: string | null;
    /** Giacenza attuale. */
    stock: number;
    /** Scorta minima. */
    minStock: number;
    /** Pezzi di questo ricambio montati sulla macchina. */
    mounted: number;
    notes: string | null;
    /** Giacenza al minimo o sotto (stessa regola della pagina Magazzino). */
    belowMin: boolean;
    /** Pezzi che mancano per tornare alla scorta minima (0 se non mancano). */
    missing: number;
}

export interface AssetBom {
    success: boolean;
    message?: string;
    rows: AssetBomRow[];
}

export async function getAssetBom(assetId: string): Promise<AssetBom> {
    const guard = await requireLogin();
    if (!guard.authorized) return { success: false, message: guard.message ?? 'Non autorizzato', rows: [] };
    if (typeof assetId !== 'string' || !assetId) return { success: false, message: 'Asset non valido', rows: [] };

    try {
        const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true } });
        if (!asset) return { success: false, message: 'Asset non trovato', rows: [] };

        const links = await prisma.assetPart.findMany({
            where: { assetId },
            include: { part: { select: { id: true, name: true, category: true, warehouse: true, location: true, quantity: true, minQuantity: true } } },
        });
        const rows: AssetBomRow[] = links.map(l => {
            const status = partStockStatus(l.part.quantity, l.part.minQuantity);
            return {
                id: l.id,
                partId: l.partId,
                name: l.part.name,
                category: l.part.category ?? null,
                warehouse: l.part.warehouse ?? null,
                location: l.part.location ?? null,
                stock: l.part.quantity,
                minStock: l.part.minQuantity,
                mounted: l.quantity,
                notes: l.notes ?? null,
                belowMin: status.belowMin,
                missing: status.missing,
            };
        }).sort((a, b) => a.name.localeCompare(b.name, 'it'));
        return { success: true, rows };
    } catch (error) {
        console.error('[asset-hierarchy] getAssetBom', error);
        return { success: false, message: 'Errore nel caricamento della distinta', rows: [] };
    }
}

export interface PartCandidate {
    id: string;
    name: string;
    category: string | null;
    location: string | null;
    stock: number;
    minStock: number;
    /** Gia' presente nella distinta di questa macchina. */
    alreadyMounted: boolean;
}

/** Ricambi del magazzino dello stesso stabilimento dell'asset il cui nome (o categoria) contiene le parole cercate. */
export async function searchAssetPartCandidates(assetId: string, query: string): Promise<{ success: boolean; message?: string; parts: PartCandidate[] }> {
    const guard = await requireLogin();
    if (!guard.authorized) return { success: false, message: guard.message ?? 'Non autorizzato', parts: [] };
    if (typeof assetId !== 'string' || !assetId || typeof query !== 'string') return { success: false, message: 'Richiesta non valida', parts: [] };

    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 5).map(w => w.slice(0, 60));
    if (words.length === 0) return { success: true, parts: [] };

    try {
        const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true, plantId: true } });
        if (!asset) return { success: false, message: 'Asset non trovato', parts: [] };

        const [rows, mounted] = await Promise.all([
            prisma.sparePart.findMany({
                where: {
                    plantId: asset.plantId ?? null,
                    AND: words.map(w => ({
                        OR: [
                            { name: { contains: w, mode: 'insensitive' as const } },
                            { category: { contains: w, mode: 'insensitive' as const } },
                        ],
                    })),
                },
                select: { id: true, name: true, category: true, location: true, quantity: true, minQuantity: true },
                orderBy: { name: 'asc' },
                take: 15,
            }),
            prisma.assetPart.findMany({ where: { assetId }, select: { partId: true } }),
        ]);
        const mountedIds = new Set(mounted.map(m => m.partId));
        return {
            success: true,
            parts: rows.map(r => ({
                id: r.id,
                name: r.name,
                category: r.category ?? null,
                location: r.location ?? null,
                stock: r.quantity,
                minStock: r.minQuantity,
                alreadyMounted: mountedIds.has(r.id),
            })),
        };
    } catch (error) {
        console.error('[asset-hierarchy] searchAssetPartCandidates', error);
        return { success: false, message: 'Errore nella ricerca', parts: [] };
    }
}

export async function setAssetPart(assetId: string, partId: string, quantity: number, notes?: string | null): Promise<{ success: boolean; message: string }> {
    const { authorized, message } = await requireRole([...BOM_ROLES]);
    if (!authorized) return { success: false, message: message ?? 'Non autorizzato' };

    if (typeof assetId !== 'string' || !assetId || typeof partId !== 'string' || !partId) return { success: false, message: 'Dati non validi.' };
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_PART_QUANTITY) {
        return { success: false, message: `La quantita' deve essere un numero intero tra 1 e ${MAX_PART_QUANTITY}.` };
    }
    const cleanNotes = typeof notes === 'string' ? notes.trim().slice(0, MAX_NOTES_LENGTH) : '';

    try {
        const [asset, part] = await Promise.all([
            prisma.asset.findUnique({ where: { id: assetId }, select: { id: true, plantId: true } }),
            prisma.sparePart.findUnique({ where: { id: partId }, select: { id: true, plantId: true } }),
        ]);
        if (!asset) return { success: false, message: 'Asset non trovato.' };
        if (isSystemAsset(asset.id)) return { success: false, message: 'Gli asset di sistema non hanno una distinta ricambi.' };
        if (!part) return { success: false, message: 'Ricambio non trovato.' };
        if ((part.plantId ?? null) !== (asset.plantId ?? null)) {
            return { success: false, message: 'Il ricambio deve essere dello stesso stabilimento della macchina.' };
        }

        await prisma.assetPart.upsert({
            where: { assetId_partId: { assetId, partId } },
            create: { assetId, partId, quantity: qty, notes: cleanNotes || null },
            update: { quantity: qty, notes: cleanNotes || null },
        });
        await logAction('SET_ASSET_PART', assetId, `Ricambio ${partId} in distinta, quantita' ${qty}`);
        revalidatePath(`/assets/${assetId}`);
        return { success: true, message: 'Distinta aggiornata.' };
    } catch (error) {
        console.error('[asset-hierarchy] setAssetPart', error);
        return { success: false, message: 'Errore durante il salvataggio della distinta.' };
    }
}

export async function removeAssetPart(assetId: string, partId: string): Promise<{ success: boolean; message: string }> {
    const { authorized, message } = await requireRole([...BOM_ROLES]);
    if (!authorized) return { success: false, message: message ?? 'Non autorizzato' };

    if (typeof assetId !== 'string' || !assetId || typeof partId !== 'string' || !partId) return { success: false, message: 'Dati non validi.' };

    try {
        // Il filtro per stabilimento passa dall'asset: fuori dal proprio non si cancella nulla
        const result = await prisma.assetPart.deleteMany({ where: { assetId, partId } });
        if (result.count === 0) return { success: false, message: 'Il ricambio non e\' nella distinta.' };
        await logAction('REMOVE_ASSET_PART', assetId, `Ricambio ${partId} tolto dalla distinta`);
        revalidatePath(`/assets/${assetId}`);
        return { success: true, message: 'Ricambio tolto dalla distinta.' };
    } catch (error) {
        console.error('[asset-hierarchy] removeAssetPart', error);
        return { success: false, message: 'Errore durante la rimozione.' };
    }
}

// --- Indicatori aggregati del gruppo ---

export interface AssetRollupContributor {
    assetId: string;
    name: string;
    faultsLast12Months: number;
    openOrders: number;
}

export interface AssetRollup {
    success: boolean;
    message?: string;
    /** Vero per un manutentore: i numeri riguardano solo gli ordini che puo' vedere. */
    restricted: boolean;
    /** Asset considerati: quello indicato e tutti i suoi discendenti. */
    assetCount: number;
    descendantCount: number;
    /** Guasti chiusi aperti negli ultimi 12 mesi (stessa definizione della scheda dell'asset). */
    faultsLast12Months: number;
    /** Ordini ancora da lavorare, di qualunque tipo. */
    openOrders: number;
    /** Di cui guasti. */
    openFaults: number;
    /** Ricambi e manodopera dei guasti chiusi (storico completo), in euro. */
    totalCost: number;
    /** Chi contribuisce, dal piu' carico; solo gli asset con almeno un guasto o un ordine aperto. */
    contributors: AssetRollupContributor[];
}

const EMPTY_ROLLUP: AssetRollup = {
    success: false,
    restricted: false,
    assetCount: 0,
    descendantCount: 0,
    faultsLast12Months: 0,
    openOrders: 0,
    openFaults: 0,
    totalCost: 0,
    contributors: [],
};

export async function getAssetRollup(assetId: string): Promise<AssetRollup> {
    const guard = await requireLogin();
    if (!guard.authorized) return { ...EMPTY_ROLLUP, message: guard.message ?? 'Non autorizzato' };
    if (typeof assetId !== 'string' || !assetId) return { ...EMPTY_ROLLUP, message: 'Asset non valido' };

    try {
        const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true, plantId: true } });
        if (!asset) return { ...EMPTY_ROLLUP, message: 'Asset non trovato' };

        const restricted = !!(await getMaintainerIdentity());

        // Gli asset dello stabilimento: bastano per ricavare i discendenti (la gerarchia non esce dallo stabilimento)
        const plantAssets = await prisma.asset.findMany({
            where: { plantId: asset.plantId ?? null },
            select: { id: true, name: true, parentId: true, plantId: true },
        });
        const descendantIds = getDescendantIds(plantAssets, assetId);
        const ids = [assetId, ...descendantIds];
        const names = new Map(plantAssets.map(a => [a.id, a.name]));

        const [closedFaults, openOrders] = await Promise.all([
            prisma.workOrder.findMany({
                where: await scopeWorkOrderWhere({ assetId: { in: ids }, type: 'FAULT', status: { in: [...CLOSED_STATUSES] } }),
                select: {
                    assetId: true,
                    createdAt: true,
                    laborLogs: { select: { hours: true, technicianId: true } },
                    partsUsed: { select: { quantity: true, unitCost: true } },
                },
            }),
            prisma.workOrder.findMany({
                where: await scopeWorkOrderWhere({ assetId: { in: ids }, status: { in: [...OPEN_STATUSES] } }),
                select: { assetId: true, type: true },
            }),
        ]);

        // Tariffe: stessa regola di getAssetReliability (tecnico se > 0, altrimenti predefinita dello stabilimento)
        const techIds = Array.from(new Set(closedFaults.flatMap(f => f.laborLogs.map(l => l.technicianId)).filter((x): x is string => !!x)));
        const [technicians, settings] = await Promise.all([
            techIds.length ? prisma.technician.findMany({ where: { id: { in: techIds } }, select: { id: true, hourlyRate: true } }) : Promise.resolve([]),
            getEffectiveSettings(asset.plantId ?? null),
        ]);
        const rates = new Map<string, number>(technicians.map(t => [t.id, t.hourlyRate]));
        const defaultRate = settings?.defaultLaborHourlyRate ?? FALLBACK_LABOR_RATE;

        const now = new Date();
        const total = computeReliability(closedFaults, rates, defaultRate, now);

        const faultsByAsset = new Map<string, typeof closedFaults>();
        for (const f of closedFaults) {
            const list = faultsByAsset.get(f.assetId);
            if (list) list.push(f);
            else faultsByAsset.set(f.assetId, [f]);
        }
        const openByAsset = new Map<string, number>();
        for (const o of openOrders) openByAsset.set(o.assetId, (openByAsset.get(o.assetId) ?? 0) + 1);

        const contributors: AssetRollupContributor[] = ids
            .map(id => ({
                assetId: id,
                name: names.get(id) ?? id,
                faultsLast12Months: computeReliability(faultsByAsset.get(id) ?? [], rates, defaultRate, now).faultsLast12Months,
                openOrders: openByAsset.get(id) ?? 0,
            }))
            .filter(c => c.faultsLast12Months > 0 || c.openOrders > 0)
            .sort((a, b) => b.faultsLast12Months - a.faultsLast12Months || b.openOrders - a.openOrders || a.name.localeCompare(b.name, 'it'));

        return {
            success: true,
            restricted,
            assetCount: ids.length,
            descendantCount: descendantIds.length,
            faultsLast12Months: total.faultsLast12Months,
            openOrders: openOrders.length,
            openFaults: openOrders.filter(o => String(o.type) === 'FAULT').length,
            totalCost: total.totalCost,
            contributors,
        };
    } catch (error) {
        console.error('[asset-hierarchy] getAssetRollup', error);
        return { ...EMPTY_ROLLUP, message: 'Errore nel calcolo degli indicatori del gruppo' };
    }
}
