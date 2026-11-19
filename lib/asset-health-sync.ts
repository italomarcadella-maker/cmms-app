import { prisma } from '@/lib/prisma';
import { isSystemAssetId } from '@/lib/system-assets';
import {
    computeAssetHealth,
    parseHealthConfig,
    windowStart,
    type AssetHealthResult,
    type HealthConfig,
    type HealthOrder,
    type HealthPlan,
} from '@/modules/maintenance/domain/asset-health';

/**
 * Calcolo e aggiornamento del punteggio di salute degli asset (regola in modules/maintenance/domain/asset-health.ts).
 * NON e' un file 'use server': le funzioni non sono richiamabili dal browser, si usano dalle azioni, dalle rotte cron e dallo scheduler.
 *
 * Il calcolo e' sempre sull'intero asset (tutti gli ordini, non solo quelli visibili a un manutentore): i dati alla base
 * sono aggregati e il risultato contiene solo conteggi e punteggi, mai titoli o dettagli degli ordini.
 * Le letture passano dal filtro per stabilimento di `prisma` (nei job di sistema: dentro `runUnscoped`).
 */

const OPEN_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'ON_HOLD', 'PENDING_REVIEW'];
const CLOSED_STATUSES = ['COMPLETED', 'CLOSED'];

export async function loadHealthConfig(): Promise<HealthConfig> {
    try {
        const row = await prisma.systemSettings.findUnique({ where: { id: 'settings' }, select: { healthConfig: true } });
        return parseHealthConfig(row?.healthConfig ?? null);
    } catch (error) {
        console.error('[asset-health-sync] loadHealthConfig', error);
        return parseHealthConfig(null);
    }
}

export interface AssetHealthEntry {
    assetId: string;
    /** Punteggio salvato oggi in Asset.healthScore. */
    storedScore: number;
    health: AssetHealthResult;
}

/**
 * Punteggio di piu' asset con UNA query per tabella (asset, ordini, conteggio ordini, piani).
 * `assetIds` null = tutti gli asset visibili (gli asset di sistema SYS-* sono sempre esclusi).
 */
export async function computeHealthForAssets(
    assetIds: readonly string[] | null,
    config?: HealthConfig,
    now: Date = new Date(),
): Promise<Map<string, AssetHealthEntry>> {
    const cfg = config ?? (await loadHealthConfig());
    const ids = assetIds ? assetIds.filter(id => typeof id === 'string' && id && !isSystemAssetId(id)) : null;
    const out = new Map<string, AssetHealthEntry>();
    if (ids && ids.length === 0) return out;

    const assetWhere = ids ? { id: { in: ids } } : { NOT: { id: { startsWith: 'SYS-' } } };
    const childWhere = ids ? { assetId: { in: ids } } : { NOT: { assetId: { startsWith: 'SYS-' } } };
    const from = windowStart(now, cfg.windowMonths);

    const [assets, orders, totals, plans] = await Promise.all([
        prisma.asset.findMany({ where: assetWhere, select: { id: true, createdAt: true, healthScore: true } }),
        prisma.workOrder.findMany({
            where: {
                ...childWhere,
                status: { not: 'CANCELED' },
                // Le richieste create in automatico dall'AI (riordini, "Controllo Salute") non sono eventi della macchina
                category: { not: 'AI_SUGGESTION' },
                OR: [
                    { type: 'FAULT', status: { in: OPEN_STATUSES as never[] } },
                    { type: { in: ['FAULT', 'REQUEST'] as never[] }, createdAt: { gte: from } },
                    { type: 'ROUTINE', status: { in: CLOSED_STATUSES as never[] }, completedAt: { gte: from } },
                ],
            },
            select: { assetId: true, type: true, priority: true, status: true, createdAt: true, dueDate: true, completedAt: true },
        }),
        prisma.workOrder.groupBy({ by: ['assetId'], where: { ...childWhere, status: { not: 'CANCELED' } }, _count: { _all: true } }),
        prisma.preventiveSchedule.findMany({ where: childWhere, select: { assetId: true, nextDueDate: true } }),
    ]);

    const ordersBy = new Map<string, HealthOrder[]>();
    for (const o of orders) {
        const list = ordersBy.get(o.assetId) ?? [];
        list.push({ type: String(o.type), priority: String(o.priority), status: String(o.status), createdAt: o.createdAt, dueDate: o.dueDate, completedAt: o.completedAt });
        ordersBy.set(o.assetId, list);
    }
    const totalBy = new Map<string, number>(totals.map(t => [t.assetId, t._count._all]));
    const plansBy = new Map<string, HealthPlan[]>();
    for (const p of plans) {
        const list = plansBy.get(p.assetId) ?? [];
        list.push({ nextDueDate: p.nextDueDate });
        plansBy.set(p.assetId, list);
    }

    for (const a of assets) {
        if (isSystemAssetId(a.id)) continue;
        out.set(a.id, {
            assetId: a.id,
            storedScore: a.healthScore,
            health: computeAssetHealth({
                assetCreatedAt: a.createdAt,
                orders: ordersBy.get(a.id) ?? [],
                plans: plansBy.get(a.id) ?? [],
                totalOrders: totalBy.get(a.id) ?? 0,
                now,
            }, cfg),
        });
    }
    return out;
}

/**
 * Ricalcola e SCRIVE Asset.healthScore solo se il punteggio e' valutabile (se non lo e' non scrive nulla) e cambiato.
 * Restituisce il punteggio calcolato (null se non valutabile o asset non trovato).
 */
export async function refreshAssetHealthNow(assetId: string): Promise<number | null> {
    const map = await computeHealthForAssets([assetId]);
    const entry = map.get(assetId);
    if (!entry || entry.health.score === null) return null;
    if (entry.health.score !== entry.storedScore) {
        await prisma.asset.update({ where: { id: assetId }, data: { healthScore: entry.health.score } });
    }
    return entry.health.score;
}

/** Come refreshAssetHealthNow, ma non lancia mai: da usare dopo le azioni principali, che non devono fallire per questo. */
export async function safeRefreshAssetHealth(assetId: string | null | undefined): Promise<void> {
    if (!assetId) return;
    try {
        await refreshAssetHealthNow(assetId);
    } catch (error) {
        console.error('[asset-health-sync] refreshAssetHealth', assetId, error);
    }
}

/** Ricalcola l'asset a cui appartiene l'ordine (per ordini noti solo per id). Non lancia mai. */
export async function safeRefreshHealthOfOrder(workOrderId: string | null | undefined): Promise<void> {
    if (!workOrderId) return;
    try {
        const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId }, select: { assetId: true } });
        if (wo) await refreshAssetHealthNow(wo.assetId);
    } catch (error) {
        console.error('[asset-health-sync] refreshHealthOfOrder', workOrderId, error);
    }
}

export interface RefreshAllResult {
    evaluated: number;
    updated: number;
    notEvaluable: number;
}

/** Ricalcola tutti gli asset visibili (nel cron: dentro runUnscoped). Scrive solo i punteggi valutabili e cambiati. */
export async function refreshAllAssetHealthNow(): Promise<RefreshAllResult> {
    const map = await computeHealthForAssets(null);
    let updated = 0, notEvaluable = 0;
    for (const entry of map.values()) {
        if (entry.health.score === null) { notEvaluable++; continue; }
        if (entry.health.score === entry.storedScore) continue;
        try {
            await prisma.asset.update({ where: { id: entry.assetId }, data: { healthScore: entry.health.score } });
            updated++;
        } catch (error) {
            console.error('[asset-health-sync] refreshAll', entry.assetId, error);
        }
    }
    return { evaluated: map.size, updated, notEvaluable };
}
