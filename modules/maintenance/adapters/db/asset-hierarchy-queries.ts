import { prisma } from '@/lib/prisma';
import { checkParentAssignment, type HierarchyItem, type ParentCheck } from '../../domain/asset-hierarchy';

/**
 * Letture di supporto alla gerarchia degli asset, usate dalle azioni del server.
 * NON e' un file 'use server': le funzioni non sono richiamabili dal browser.
 */

/**
 * Verifica se `assetId` (null per un asset nuovo) puo' avere `parentId` come padre, nello stabilimento `plantId`.
 * Legge gli asset dello stabilimento (servono per ricavare discendenti e livelli) piu' l'asset e il padre candidato.
 */
export async function validateParentAssignment(assetId: string | null, parentId: string | null, plantId: string | null): Promise<ParentCheck> {
    if (assetId === null && parentId === null) return { ok: true };
    const extra = [assetId, parentId].filter((v): v is string => !!v).map(id => ({ id }));
    const rows = await prisma.asset.findMany({
        where: { OR: [{ plantId }, ...extra] },
        select: { id: true, parentId: true, plantId: true },
    });
    // Se lo stabilimento cambia, l'asset va valutato nel nuovo (le righe lette riportano ancora il vecchio)
    const items: HierarchyItem[] = rows.map(r => (r.id === assetId ? { ...r, plantId } : r));
    return checkParentAssignment(items, assetId, parentId, plantId);
}

/** Quanti asset hanno `assetId` come padre diretto. */
export async function countChildAssets(assetId: string): Promise<number> {
    return prisma.asset.count({ where: { parentId: assetId } });
}
