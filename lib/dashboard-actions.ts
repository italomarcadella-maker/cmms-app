"use server";

import { scopedCache } from "@/lib/scoped-cache";
import { getPlantScope, userScopeWhere } from "@/lib/plant-scope";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { subDays, format, startOfDay, endOfDay } from "date-fns";
import { it } from "date-fns/locale";
import { getEffectiveSettings } from "@/lib/actions";
import { getMaintainerIdentity, getMaintainerWorkOrderFilter } from "@/lib/maintainer-scope";
import { maintainerWorkOrderWhere, withMaintainerFilter } from "@/modules/maintenance/domain/maintainer-visibility";

const getDetailedDashboardStatsCached = scopedCache(
    async () => {
        try {
            // Execute parallel aggregation queries instead of counting locally
            const [
                assetStats,
                woStats,
                openHighPriorityCount,
                overdueCount,
                lowStockCount
            ] = await Promise.all([
                // 1. Asset Stats (Total, Active, Offline, AvgHealth) in one go if possible, but distinct queries are cleaner for Prisma
                prisma.asset.aggregate({
                    _count: {
                        id: true,
                        _all: true // Total
                    },
                    _avg: {
                        healthScore: true
                    }
                }),
                // 2. WO Basic Counts
                prisma.workOrder.groupBy({
                    by: ['status'],
                    _count: { id: true }
                }),
                // 3. High Priority Open
                prisma.workOrder.count({ where: { priority: 'STOPPED', status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
                // 4. Overdue
                prisma.workOrder.count({ where: { dueDate: { lt: new Date() }, status: { notIn: ['CLOSED', 'COMPLETED', 'CANCELED'] } } }),
                // 5. Low Stock
                prisma.sparePart.count({ where: { quantity: { lte: prisma.sparePart.fields.minQuantity } } })
            ]);

            // Refine Asset Status Counts
            const [activeAssets, offlineAssets, totalSpareParts] = await Promise.all([
                prisma.asset.count({ where: { status: 'OPERATIONAL' } }),
                prisma.asset.count({ where: { status: 'OFFLINE' } }),
                prisma.sparePart.count()
            ]);

            // Parse WO Grouped Stats
            const totalWorkOrders = woStats.reduce((acc, curr) => acc + (curr._count?.id || 0), 0);
            const openStatuses = new Set(['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL']);
            const openWorkOrders = woStats
                .filter(g => openStatuses.has(g.status))
                .reduce((acc, curr) => acc + (curr._count?.id || 0), 0);

            return {
                totalAssets: assetStats._count._all || 0,
                activeAssets,
                offlineAssets,
                totalWorkOrders,
                openWorkOrders,
                highPriorityOpen: openHighPriorityCount,
                overdueWorkOrders: overdueCount,
                avgHealth: Math.round(assetStats._avg.healthScore || 0),
                lowStockCount,
                totalSpareParts
            };
        } catch (error) {
            console.error("Dashboard Stats Error:", error);
            // ... fallback return ...
            return {
                totalAssets: 0,
                activeAssets: 0,
                offlineAssets: 0,
                totalWorkOrders: 0,
                openWorkOrders: 0,
                highPriorityOpen: 0,
                overdueWorkOrders: 0,
                avgHealth: 0,
                lowStockCount: 0,
            totalSpareParts: 0
            };
        }
    },
    ['dashboard-stats'],
    { revalidate: 60, tags: ['dashboard'] }
);

/**
 * Disponibilita' delle macchine: quante sono ferme tra quelle in uso. Ferma = stato "fermo" oppure con un guasto aperto che la blocca
 * (priorita' "fermo macchina"). Gli asset di sistema (segnaposto delle richieste) non sono macchine e non contano.
 */
const getAssetAvailabilityCached = scopedCache(
    async () => {
        try {
            const [assets, stoppedFaults] = await Promise.all([
                prisma.asset.findMany({ where: { NOT: { id: { startsWith: 'SYS-' } } }, select: { id: true, status: true } }),
                prisma.workOrder.findMany({
                    where: { type: 'FAULT', priority: 'STOPPED', status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'ON_HOLD', 'PENDING_REVIEW'] } },
                    select: { assetId: true },
                }),
            ]);
            const inUse = assets.filter(a => a.status !== 'DECOMMISSIONED' && a.status !== 'STORAGE');
            const stoppedByFault = new Set(stoppedFaults.map(f => f.assetId));
            const stopped = inUse.filter(a => a.status === 'OFFLINE' || stoppedByFault.has(a.id)).length;
            return { inUse: inUse.length, stopped };
        } catch (error) {
            console.error('[dashboard-actions] availability', error);
            return { inUse: 0, stopped: 0 };
        }
    },
    ['dashboard-asset-availability'],
    { revalidate: 60, tags: ['dashboard', 'work-orders'] }
);

export async function getAssetAvailability() {
    const session = await auth();
    if (!session?.user) return { inUse: 0, stopped: 0 };
    return getAssetAvailabilityCached();
}

export async function getDetailedDashboardStats() {
    const session = await auth();
    if (!session?.user) {
        return {
            totalAssets: 0,
            activeAssets: 0,
            offlineAssets: 0,
            totalWorkOrders: 0,
            openWorkOrders: 0,
            highPriorityOpen: 0,
            overdueWorkOrders: 0,
            avgHealth: 0,
            lowStockCount: 0,
            totalSpareParts: 0
        };
    }
    return getDetailedDashboardStatsCached();
}

export const getAssetStatusDistribution = scopedCache(
    async () => {
        try {
            const distribution = await prisma.asset.groupBy({
                by: ['status'],
                _count: { status: true }
            });

            // Ensure all statuses are represented for charts even if 0
            const map = {
                'OPERATIONAL': 0,
                'MAINTENANCE': 0,
                'OFFLINE': 0,
                'PLANNED_DOWNTIME': 0
            };

            distribution.forEach(d => {
                if (d.status in map) {
                    map[d.status as keyof typeof map] = d._count.status;
                }
            });

            return Object.entries(map).map(([name, value]) => ({ name, value }));
        } catch (error) {
            console.error('[dashboard-actions]', error);
            return [];
        }
    },
    ['asset-distribution'],
    { revalidate: 60 }
);

export const getWorkOrderTrends = scopedCache(
    async (days = 7) => {
        try {
            const endDate = new Date();
            const startDate = subDays(endDate, days);

            // Group by created date
            const createdRaw = await prisma.workOrder.groupBy({
                by: ['createdAt'],
                _count: { id: true },
                where: { createdAt: { gte: startDate } }
            });

            // Group by completed date
            // Group by completed date (Approximation using creation date as we lack completedAt)
            const completedRaw = await prisma.workOrder.groupBy({
                by: ['createdAt'],
                _count: { id: true },
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: startDate }
                }
            });

            // Normalize to day strings
            const trendMap = new Map<string, { date: string, created: number, completed: number }>();

            const recentWOs = await prisma.workOrder.findMany({
                where: { createdAt: { gte: startDate } },
                select: { createdAt: true, status: true }
            });

            const trendData: Record<string, { fullDate: Date, date: string, created: number, completed: number }> = {};

            // init buckets
            for (let i = 0; i <= days; i++) {
                const d = subDays(endDate, days - i); // Go from oldest to newest
                const key = format(d, 'yyyy-MM-dd');
                trendData[key] = {
                    fullDate: d,
                    date: format(d, 'dd MMM', { locale: it }),
                    created: 0,
                    completed: 0
                };
            }

            recentWOs.forEach(wo => {
                const cKey = format(wo.createdAt, 'yyyy-MM-dd');
                if (trendData[cKey]) trendData[cKey].created++;

                // Without updatedAt, we can't accurately plot completion day. 
                // We could infer it if needed, but for now let's just count completed if created recently (which is wrong but safe)
                // Or better, just don't plot completion trend if we don't have the data.
                // Let's assume completed date is same as created for 'quick' jobs or just skip specific completion tracking line 
                // in UI if stats are 0.
                if (wo.status === 'COMPLETED' || wo.status === 'CLOSED') {
                    if (trendData[cKey]) trendData[cKey].completed++; // Fallback: completed same day as created (approx)
                }
            });

            return Object.values(trendData)
                .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime())
                .map(t => ({
                    ...t,
                    fullDate: t.fullDate.toISOString()
                }));
        } catch (error) {
            console.error("Trend Error:", error);
            return [];
        }
    },
    ['work-order-trends'],
    { revalidate: 60 }
);

const getRecentWorkOrdersCached = scopedCache(
    async (limit = 5, visibility: Record<string, unknown> | null = null) => {
        try {
            const wos = await prisma.workOrder.findMany({
                where: withMaintainerFilter({}, visibility),
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { asset: true }
            });

            return wos.map(wo => ({
                ...wo,
                dueDate: wo.dueDate ? wo.dueDate.toISOString() : null,
                createdAt: wo.createdAt.toISOString(),
            }));
        } catch (error) {
            console.error('[dashboard-actions]', error);
            return [];
        }
    },
    ['recent-work-orders'],
    { revalidate: 30, tags: ['dashboard'] }
);

export async function getRecentWorkOrders(limit = 5) {
    return getRecentWorkOrdersCached(limit, await getMaintainerWorkOrderFilter());
}

const getOverdueWorkOrdersCached = scopedCache(
    async (limit = 5, visibility: Record<string, unknown> | null = null) => {
        try {
            const wos = await prisma.workOrder.findMany({
                take: limit,
                where: withMaintainerFilter({
                    dueDate: { lt: new Date() },
                    status: { notIn: ['CLOSED', 'COMPLETED', 'CANCELED'] }
                }, visibility),
                orderBy: { dueDate: 'asc' }, // Most overdue first
                include: { asset: true }
            });

            return wos.map(wo => ({
                ...wo,
                dueDate: wo.dueDate ? wo.dueDate.toISOString() : null,
                createdAt: wo.createdAt.toISOString(),
            }));
        } catch (error) {
            console.error('[dashboard-actions]', error);
            return [];
        }
    },
    ['overdue-work-orders'],
    { revalidate: 30, tags: ['dashboard'] }
);

export async function getOverdueWorkOrders(limit = 5) {
    return getOverdueWorkOrdersCached(limit, await getMaintainerWorkOrderFilter());
}

const getHighPrioritySafetyRequestsCached = scopedCache(
    async (limit = 5, visibility: Record<string, unknown> | null = null) => {
        try {
            const requests = await prisma.workOrder.findMany({
                take: limit,
                where: withMaintainerFilter({
                    OR: [
                        { category: 'SAFETY' },
                        { assetId: 'SYS-SAFETY' }
                    ],
                    priority: { in: ['HIGH', 'MEDIUM', 'STOPPED', 'LOW', 'WORKING'] },
                    status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL'] }
                }, visibility),
                orderBy: [
                    { createdAt: 'desc' }
                ],
                include: { asset: true }
            });

            return requests.map(req => ({
                ...req,
                dueDate: req.dueDate ? req.dueDate.toISOString() : null,
                createdAt: req.createdAt.toISOString(),
            }));
        } catch (error) {
            console.error("Safety Requests Error:", error);
            return [];
        }
    },
    ['high-priority-safety-requests'],
    { revalidate: 30, tags: ['dashboard'] }
);

export async function getHighPrioritySafetyRequests(limit = 5) {
    return getHighPrioritySafetyRequestsCached(limit, await getMaintainerWorkOrderFilter());
}

export const getMaintenanceMetrics = scopedCache(
    async (months = 6) => {
        try {
            const startDate = subDays(new Date(), months * 30);

            // Fetch completed break-fix WOs (FAULT) with related costs
            const completedFaults = await prisma.workOrder.findMany({
                where: {
                    type: 'FAULT',
                    status: { in: ['COMPLETED', 'CLOSED'] },
                    createdAt: { gte: startDate }
                },
                include: {
                    partsUsed: true,
                    laborLogs: true
                },
                orderBy: { createdAt: 'asc' }
            });

            const [technicians, settings] = await Promise.all([
                prisma.technician.findMany(),
                getEffectiveSettings()
            ]);
            const techRateMap = new Map(technicians.map(t => [t.id, t.hourlyRate]));
            const defaultHourlyRate = settings?.defaultLaborHourlyRate ?? 30;

            let totalRepairTimeHours = 0;
            let repairCount = 0;
            let repairsWithHours = 0;
            let totalCost = 0;

            const monthlyDataMap = new Map<string, { mttrSum: number, mttrCount: number, mtbfSum: number, mtbfCount: number, cost: number, count: number }>();

            // Initialize months
            for (let i = 5; i >= 0; i--) {
                const d = subDays(new Date(), i * 30);
                const monthName = format(d, 'MMM', { locale: it });
                monthlyDataMap.set(monthName, { mttrSum: 0, mttrCount: 0, mtbfSum: 0, mtbfCount: 0, cost: 0, count: 0 });
            }

            // MTBF (real): for assets with 2+ faults in the window, average the time between
            // consecutive faults. Diffs are attributed to the month of the later fault, so the
            // monthly trend reflects actual failure intervals instead of a fixed-hours/count guess.
            const faultsByAsset = new Map<string, { createdAt: Date }[]>();

            for (const woItem of completedFaults) {
                const wo = woItem as any;
                const monthName = format(wo.createdAt, 'MMM', { locale: it });

                // MTTR
                // Il tempo di riparazione si calcola solo sugli interventi con ore registrate: senza ore non si inventa un valore
                const woHours = wo.laborLogs.reduce((sum: number, log: any) => sum + log.hours, 0);
                const hasHours = wo.laborLogs.length > 0;
                if (hasHours) { totalRepairTimeHours += woHours; repairsWithHours++; }
                repairCount++;

                // Cost
                const partsCost = wo.partsUsed.reduce((sum: number, part: any) => sum + (part.quantity * part.unitCost), 0);
                const laborCost = wo.laborLogs.reduce((sum: number, log: any) => sum + (log.hours * (techRateMap.get(log.technicianId) || defaultHourlyRate)), 0);
                const woCost = partsCost + laborCost;
                totalCost += woCost;

                if (monthlyDataMap.has(monthName)) {
                    const entry = monthlyDataMap.get(monthName)!;
                    if (hasHours) { entry.mttrSum += woHours; entry.mttrCount++; }
                    entry.cost += woCost;
                    entry.count++;
                    monthlyDataMap.set(monthName, entry);
                }

                const arr = faultsByAsset.get(wo.assetId) || [];
                arr.push({ createdAt: wo.createdAt });
                faultsByAsset.set(wo.assetId, arr);
            }

            const allMtbfSamplesHours: number[] = [];
            for (const faults of faultsByAsset.values()) {
                for (let i = 1; i < faults.length; i++) {
                    const diffHours = (faults[i].createdAt.getTime() - faults[i - 1].createdAt.getTime()) / (1000 * 60 * 60);
                    allMtbfSamplesHours.push(diffHours);

                    const monthName = format(faults[i].createdAt, 'MMM', { locale: it });
                    if (monthlyDataMap.has(monthName)) {
                        const entry = monthlyDataMap.get(monthName)!;
                        entry.mtbfSum += diffHours;
                        entry.mtbfCount++;
                        monthlyDataMap.set(monthName, entry);
                    }
                }
            }

            const mttr = repairsWithHours > 0 ? Math.round((totalRepairTimeHours / repairsWithHours) * 10) / 10 : 0;
            // MTBF Global: average interval between consecutive faults on the same asset.
            // 0 means not enough data yet (no asset had 2+ faults in the window).
            const mtbf = allMtbfSamplesHours.length > 0
                ? Math.round(allMtbfSamplesHours.reduce((a, b) => a + b, 0) / allMtbfSamplesHours.length)
                : 0;

            // Cost Stats
            const avgCost = repairCount > 0 ? Math.round(totalCost / repairCount) : 0;

            // Monthly Trend Data
            const monthlyData = Array.from(monthlyDataMap.entries()).map(([name, data]) => {
                const monthMttr = data.mttrCount > 0 ? Math.round((data.mttrSum / data.mttrCount) * 10) / 10 : 0;
                const monthMtbf = data.mtbfCount > 0 ? Math.round(data.mtbfSum / data.mtbfCount) : mtbf;

                return {
                    name,
                    mttr: monthMttr || mttr, // Use global avg if no data for smooth chart
                    mtbf: monthMtbf,
                    cost: Math.round(data.cost)
                };
            });

            return {
                mttr,
                mtbf,
                avgCost,
                totalCost,
                trend: monthlyData
            };

        } catch (error) {
            console.error(error);
            return { mttr: 0, mtbf: 0, trend: [] };
        }
    },
    ['maintenance-metrics'],
    { revalidate: 300 }
);

const getAreaStatusCached = scopedCache(
    async () => {
        try {
            const [production, facilities, workshop, improvement] = await Promise.all([
                // Production: WOs on assets with a defined line
                prisma.workOrder.count({
                    where: {
                        status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL'] },
                        asset: { line: { not: null } }
                    }
                }),
                // Facilities: WOs on FACILITY assets or SYS-PLANT
                prisma.workOrder.count({
                    where: {
                        status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL'] },
                        OR: [
                            { asset: { type: 'FACILITY' } },
                            { assetId: 'SYS-PLANT' },
                            { category: 'OTHER' } // 'Impianti' in wizard uses OTHER category
                        ]
                    }
                }),
                // Workshop: WOs on assets in location 'OFFICINA'
                prisma.workOrder.count({
                    where: {
                        status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL'] },
                        OR: [
                            { asset: { location: { contains: 'OFFICINA', mode: 'insensitive' } } },
                            { category: 'MECHANICAL' },
                            { assetId: 'SYS-WORKSHOP' }
                        ]
                    }
                }),
                // Improvement: WOs of category IMPROVEMENT or KAIZEN assets
                prisma.workOrder.count({
                    where: {
                        status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL'] },
                        OR: [
                            { category: 'IMPROVEMENT' },
                            { asset: { type: 'KAIZEN' } },
                            { assetId: 'SYS-KAIZEN' }
                        ]
                    }
                })
            ]);

            return { production, facilities, workshop, improvement };
        } catch (error) {
            console.error("Area Status Error:", error);
            return { production: 0, facilities: 0, workshop: 0, improvement: 0 };
        }
    },
    ['area-status'],
    { revalidate: 30, tags: ['dashboard'] }
);

export async function getAreaStatus() {
    return getAreaStatusCached();
}

const getTechnicianPresenceCached = scopedCache(
    async () => {
        try {
            const userScope = userScopeWhere(await getPlantScope());
            // 1. Get all users with role MAINTAINER
            const maintainers = await prisma.user.findMany({
                where: { role: "MAINTAINER", isActive: true, ...userScope },
                select: { id: true, name: true }
            });

            const totalMaintainers = maintainers.length;
            if (totalMaintainers === 0) return { presentCount: 0, totalCount: 0, percentage: 0, absentees: [] };

            // 2. Get availability for TODAY
            const today = startOfDay(new Date());
            const tomorrow = endOfDay(new Date());

            const availability = await prisma.technicianAvailability.findMany({
                where: {
                    date: { gte: today, lte: tomorrow }
                },
                include: { user: true }
            });

            // 3. Identification of absentees
            const absentStatuses = ['VACATION', 'SICK', 'PERMIT', 'TRAINING'];

            const absentRecords = availability.filter(a => absentStatuses.includes(a.status));
            const absentees = absentRecords.map(a => ({
                name: a.user.name || 'Tecnico',
                reason: a.status
            }));

            const presentCount = totalMaintainers - absentees.length;
            const percentage = Math.round((presentCount / totalMaintainers) * 100);

            return {
                presentCount,
                totalCount: totalMaintainers,
                percentage,
                absentees
            };

        } catch (error) {
            console.error("Presence Error:", error);
            return { presentCount: 0, totalCount: 0, percentage: 0, absentees: [] };
        }
    },
    ['technician-presence'],
    { revalidate: 30, tags: ['dashboard'] }
);

export async function getTechnicianPresence() {
    return getTechnicianPresenceCached();
}

const getUpcomingScheduleCached = scopedCache(
    async (days = 3, visibility: Record<string, unknown> | null = null, planIds: string[] | null = null) => {
        try {
            const startDate = startOfDay(new Date());
            const endDate = endOfDay(new Date(new Date().setDate(new Date().getDate() + days)));

            // 1. Fetch WorkOrders due in range
            const wos = await prisma.workOrder.findMany({
                where: withMaintainerFilter({
                    dueDate: { gte: startDate, lte: endDate },
                    status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL', 'ASSIGNED'] }
                }, visibility),
                include: { asset: true },
                orderBy: { dueDate: 'asc' }
            });

            // 2. Fetch Planned Schedules due in range
            // Un manutentore (planIds = id utente e tecnico) vede i piani suoi o ancora senza assegnatario
            const schedules = await prisma.preventiveSchedule.findMany({
                where: {
                    nextDueDate: { gte: startDate, lte: endDate },
                    ...(planIds ? { OR: [{ assignedToId: null }, { assignedToId: { in: planIds } }] } : {}),
                },
                include: { asset: true },
                orderBy: { nextDueDate: 'asc' }
            });

            // 3. Merge and formatting
            const combined = [
                ...wos.map(wo => ({
                    id: wo.id,
                    title: wo.title,
                    asset: wo.asset.name,
                    date: wo.dueDate!,
                    type: 'WO' as const,
                    priority: wo.priority,
                    status: wo.status
                })),
                ...schedules.map(sch => ({
                    id: sch.id,
                    title: sch.taskTitle,
                    asset: sch.asset.name,
                    date: sch.nextDueDate,
                    type: 'PM' as const,
                    priority: 'PLANNED',
                    status: 'SCHEDULED'
                }))
            ].sort((a, b) => a.date.getTime() - b.date.getTime());

            return combined.map(item => ({
                ...item,
                date: item.date.toISOString(), // Serialize for client
                formattedDate: format(item.date, 'EEEE dd MMM', { locale: it })
            }));

        } catch (error) {
            console.error("Schedule Error:", error);
            return [];
        }
    },
    ['upcoming-schedule'],
    { revalidate: 30, tags: ['dashboard'] }
);

export async function getUpcomingSchedule(days = 3) {
    const who = await getMaintainerIdentity();
    return getUpcomingScheduleCached(days, who ? maintainerWorkOrderWhere(who) : null, who ? [who.userId, ...(who.technicianId ? [who.technicianId] : [])] : null);
}
