'use server';

import { subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { requireRole, getEffectiveSettings } from '@/lib/actions';
import { crossPlant, getPlantScope } from '@/lib/plant-scope';
import { normalizeKey } from '../../../shared/domain/text-matching';

/**
 * Confronto tra stabilimenti.
 * - getPlantComparison: indicatori per ciascuno degli stabilimenti VISIBILI all'utente (filtro normale per plant).
 * - getModelBenchmark: confronto della stessa macchina (costruttore + modello) in tutti gli stabilimenti. E' una
 *   lettura trasversale (registrata nell'audit log) che restituisce solo valori aggregati con il nome del plant.
 */

const OPEN_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'ON_HOLD', 'PENDING_REVIEW'] as const;
const REAL_ASSET = { id: { not: { startsWith: 'SYS-' } } };

export interface PlantKpi {
    plantId: string;
    plantName: string;
    assets: number;
    avgHealth: number | null;
    assetsOffline: number;
    openOrders: number;
    overdueOrders: number;
    faults30d: number;
    downtimeMin90d: number;
    downtimeCost90d: number;
    lowStock: number;
    energyKwh30d: number;
}

export async function getPlantComparison(): Promise<{ success: boolean; message?: string; plants: PlantKpi[] }> {
    const { authorized, message } = await requireRole(['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'PROCESS_ENGINEER']);
    if (!authorized) return { success: false, message, plants: [] };

    const now = new Date();
    const since30 = subDays(now, 30);
    const since90 = subDays(now, 90);

    const plants = await prisma.plant.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });
    if (plants.length === 0) return { success: true, plants: [] };

    const [assetStats, offline, open, overdue, faults, ewos, parts, energy] = await Promise.all([
        prisma.asset.groupBy({ by: ['plantId'], where: REAL_ASSET, _count: { _all: true }, _avg: { healthScore: true } }),
        prisma.asset.groupBy({ by: ['plantId'], where: { ...REAL_ASSET, status: 'OFFLINE' }, _count: { _all: true } }),
        prisma.workOrder.groupBy({ by: ['plantId'], where: { status: { in: [...OPEN_STATUSES] } }, _count: { _all: true } }),
        prisma.workOrder.groupBy({ by: ['plantId'], where: { status: { in: [...OPEN_STATUSES] }, dueDate: { lt: now } }, _count: { _all: true } }),
        prisma.workOrder.groupBy({ by: ['plantId'], where: { type: 'FAULT', createdAt: { gte: since30 } }, _count: { _all: true } }),
        prisma.eWO.findMany({ where: { createdAt: { gte: since90 } }, select: { totalDowntimeMin: true, workOrder: { select: { plantId: true } } } }),
        prisma.sparePart.findMany({ select: { plantId: true, quantity: true, minQuantity: true } }),
        prisma.energyLog.groupBy({ by: ['plantId'], where: { date: { gte: since30 } }, _sum: { kwhConsumed: true } }),
    ]);

    const countBy = <T extends { plantId: string | null; _count: { _all: number } }>(rows: T[], id: string) =>
        rows.find(r => r.plantId === id)?._count._all ?? 0;

    const result: PlantKpi[] = [];
    for (const p of plants) {
        const stats = assetStats.find(r => r.plantId === p.id);
        const downtime = ewos
            .filter(e => e.workOrder?.plantId === p.id)
            .reduce((sum, e) => sum + (e.totalDowntimeMin ?? 0), 0);
        const settings = await getEffectiveSettings(p.id);
        result.push({
            plantId: p.id,
            plantName: p.name,
            assets: stats?._count._all ?? 0,
            avgHealth: stats?._avg.healthScore != null ? Math.round(stats._avg.healthScore) : null,
            assetsOffline: countBy(offline, p.id),
            openOrders: countBy(open, p.id),
            overdueOrders: countBy(overdue, p.id),
            faults30d: countBy(faults, p.id),
            downtimeMin90d: downtime,
            downtimeCost90d: Math.round(downtime * (settings?.downtimeCostPerMinute ?? 0)),
            lowStock: parts.filter(x => x.plantId === p.id && x.quantity <= x.minQuantity).length,
            energyKwh30d: Math.round(energy.find(r => r.plantId === p.id)?._sum.kwhConsumed ?? 0),
        });
    }
    return { success: true, plants: result };
}

export interface ModelPlantStats {
    plantName: string;
    isOwn: boolean;
    assets: number;
    faults: number;
    faultsPerAsset: number;
    downtimeMin: number;
    avgHealth: number | null;
}

export interface ModelBenchmarkRow {
    key: string;
    vendor: string | null;
    model: string;
    totalAssets: number;
    plants: ModelPlantStats[];
    /** Presente in almeno due stabilimenti: il confronto ha senso. */
    comparable: boolean;
    insight: string | null;
}

export async function getModelBenchmark(): Promise<{ success: boolean; message?: string; rows: ModelBenchmarkRow[] }> {
    const { authorized, message } = await requireRole(['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'PROCESS_ENGINEER']);
    if (!authorized) return { success: false, message, rows: [] };

    const scope = await getPlantScope();
    const ownIds = scope.mode === 'all' || scope.mode === 'bypass' ? scope.allowedPlantIds : scope.plantIds;
    const since = subDays(new Date(), 365);

    const { assets, faults } = await crossPlant('MODEL_BENCHMARK', async () => ({
        assets: await prisma.asset.findMany({
            where: { ...REAL_ASSET, plantId: { not: null } },
            select: { id: true, vendor: true, model: true, plantId: true, healthScore: true, plant: { select: { name: true } } },
        }),
        faults: await prisma.workOrder.findMany({
            where: { type: 'FAULT', createdAt: { gte: since } },
            select: { assetId: true, ewo: { select: { totalDowntimeMin: true } } },
        }),
    }));

    const faultsByAsset = new Map<string, { count: number; downtime: number }>();
    for (const f of faults) {
        const cur = faultsByAsset.get(f.assetId) ?? { count: 0, downtime: 0 };
        cur.count += 1;
        cur.downtime += f.ewo?.totalDowntimeMin ?? 0;
        faultsByAsset.set(f.assetId, cur);
    }

    const groups = new Map<string, ModelBenchmarkRow & { byPlant: Map<string, { name: string; ids: string[]; health: number[] }> }>();
    for (const a of assets) {
        const key = normalizeKey(`${a.vendor ?? ''} ${a.model}`);
        if (!key) continue;
        let g = groups.get(key);
        if (!g) {
            g = { key, vendor: a.vendor, model: a.model, totalAssets: 0, plants: [], comparable: false, insight: null, byPlant: new Map() };
            groups.set(key, g);
        }
        g.totalAssets += 1;
        const bp = g.byPlant.get(a.plantId as string) ?? { name: a.plant?.name ?? '-', ids: [], health: [] };
        bp.ids.push(a.id);
        bp.health.push(a.healthScore);
        g.byPlant.set(a.plantId as string, bp);
    }

    const rows: ModelBenchmarkRow[] = [];
    for (const g of groups.values()) {
        g.plants = [...g.byPlant.entries()].map(([plantId, bp]) => {
            const stats = bp.ids.reduce((acc, id) => {
                const f = faultsByAsset.get(id);
                return { count: acc.count + (f?.count ?? 0), downtime: acc.downtime + (f?.downtime ?? 0) };
            }, { count: 0, downtime: 0 });
            return {
                plantName: bp.name,
                isOwn: ownIds.includes(plantId),
                assets: bp.ids.length,
                faults: stats.count,
                faultsPerAsset: Math.round((stats.count / bp.ids.length) * 10) / 10,
                downtimeMin: stats.downtime,
                avgHealth: bp.health.length ? Math.round(bp.health.reduce((s, h) => s + h, 0) / bp.health.length) : null,
            };
        }).sort((a, b) => b.faultsPerAsset - a.faultsPerAsset);
        g.comparable = g.plants.length >= 2;
        if (g.comparable) {
            const worst = g.plants[0];
            const best = g.plants[g.plants.length - 1];
            if (worst.faultsPerAsset > best.faultsPerAsset) {
                const fmt = (n: number) => String(n).replace('.', ',');
                g.insight = `${worst.plantName}: ${fmt(worst.faultsPerAsset)} guasti/anno per macchina, contro ${fmt(best.faultsPerAsset)} di ${best.plantName}. Vale la pena confrontare piani di manutenzione e modalita' d'uso.`;
            }
        }
        const { byPlant: _omit, ...row } = g;
        rows.push(row);
    }

    rows.sort((a, b) => Number(b.comparable) - Number(a.comparable) || b.totalAssets - a.totalAssets);
    return { success: true, rows };
}
