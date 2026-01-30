"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { subDays, format, startOfDay, endOfDay } from "date-fns";
import { it } from "date-fns/locale";

export async function getDetailedDashboardStats() {
    const session = await auth();
    if (!session?.user) return null;

    try {
        const [
            totalAssets,
            activeAssets,
            offlineAssets,
            totalWorkOrders,
            openWorkOrders,
            highPriorityOpen,
            overdueWorkOrders
        ] = await Promise.all([
            prisma.asset.count(),
            prisma.asset.count({ where: { status: 'OPERATIONAL' } }),
            prisma.asset.count({ where: { status: 'OFFLINE' } }),
            prisma.workOrder.count(),
            prisma.workOrder.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL'] } } }),
            prisma.workOrder.count({ where: { priority: 'HIGH', status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
            prisma.workOrder.count({ where: { dueDate: { lt: new Date() }, status: { notIn: ['CLOSED', 'COMPLETED', 'CANCELED'] } } })
        ]);

        // Calculate Average Health Score
        const assets = await prisma.asset.findMany({ select: { healthScore: true } });
        const avgHealth = assets.length > 0
            ? Math.round(assets.reduce((sum, a) => sum + a.healthScore, 0) / assets.length)
            : 0;

        return {
            totalAssets,
            activeAssets,
            offlineAssets,
            totalWorkOrders,
            openWorkOrders,
            highPriorityOpen,
            overdueWorkOrders,
            avgHealth
        };
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return null;
    }
}

export async function getAssetStatusDistribution() {
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
        return [];
    }
}

export async function getWorkOrderTrends(days = 7) {
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
        const completedRaw = await prisma.workOrder.groupBy({
            by: ['updatedAt'], // Approximation for completion time if not tracked separately
            _count: { id: true },
            where: {
                status: 'COMPLETED',
                updatedAt: { gte: startDate }
            }
        });

        // Normalize to day strings
        const trendMap = new Map<string, { date: string, created: number, completed: number }>();

        // Init map with 0s for all days
        for (let i = 0; i <= days; i++) {
            const d = subDays(endDate, days - i);
            const dateStr = format(d, 'yyyy-mm-dd'); // sorting key
            const displayStr = format(d, 'dd MMM', { locale: it });
            trendMap.set(dateStr, { date: displayStr, created: 0, completed: 0 });
        }

        // Fill Data - Note: prisma groupBy returns specific timestamps, we need to bin them
        // Re-fetching efficient way: Fetch all relevant WOs and aggregate in JS for small datasets (<1000 items)
        // For larger, use raw SQL date_trunc. Let's stick to simple fetch for safety/portability.

        const recentWOs = await prisma.workOrder.findMany({
            where: { createdAt: { gte: startDate } },
            select: { createdAt: true, status: true, updatedAt: true }
        });

        const trendData: Record<string, { fullDate: Date, date: string, created: number, completed: number }> = {};

        // init buckets
        for (let i = 0; i < days; i++) {
            const d = subDays(endDate, i);
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

            if ((wo.status === 'COMPLETED' || wo.status === 'CLOSED') && wo.updatedAt) {
                const uKey = format(wo.updatedAt, 'yyyy-MM-dd');
                if (trendData[uKey]) trendData[uKey].completed++;
            }
        });

        return Object.values(trendData).sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
    } catch (error) {
        console.error("Trend Error:", error);
        return [];
    }
}
