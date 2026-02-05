"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface CostData {
    totalLaborCost: number;
    totalPartsCost: number;
    totalCost: number;
    topAssets: { name: string; cost: number }[];
    costByDepartment: { department: string; cost: number }[];
}

export async function getCostAnalytics(period: 'MONTH' | 'YEAR' | 'ALL'): Promise<CostData> {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    let dateFilter: any = {};
    const now = new Date();

    if (period === 'MONTH') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { createdAt: { gte: startOfMonth } };
    } else if (period === 'YEAR') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        dateFilter = { createdAt: { gte: startOfYear } };
    }

    // Fetch Completed WOs with Costs
    const wos = await prisma.workOrder.findMany({
        where: {
            ...dateFilter,
            status: { in: ['COMPLETED', 'CLOSED'] }
        },
        include: {
            partsUsed: true,
            laborLogs: true,
            asset: true // Need asset info for grouping
        }
    });

    // Technicians for rates
    const technicians = await prisma.technician.findMany();
    const techMap = new Map(technicians.map(t => [t.id, t.hourlyRate]));

    let totalLaborCost = 0;
    let totalPartsCost = 0;
    const assetCosts: Record<string, number> = {};
    const deptCosts: Record<string, number> = {};

    for (const wo of wos) {
        // Parts Cost
        const woPartsCost = wo.partsUsed.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0);
        totalPartsCost += woPartsCost;

        // Labor Cost
        const woLaborCost = wo.laborLogs.reduce((sum, l) => {
            const rate = techMap.get(l.technicianId) || 0;
            return sum + (l.hours * rate);
        }, 0);
        totalLaborCost += woLaborCost;

        const woTotal = woPartsCost + woLaborCost;

        // Group by Asset
        if (wo.asset) {
            assetCosts[wo.asset.name] = (assetCosts[wo.asset.name] || 0) + woTotal;

            // Group by Dept
            const dept = wo.asset.department || "General";
            deptCosts[dept] = (deptCosts[dept] || 0) + woTotal;
        }
    }

    // Transform for UI
    const topAssets = Object.entries(assetCosts)
        .map(([name, cost]) => ({ name, cost }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 10);

    const costByDepartment = Object.entries(deptCosts)
        .map(([department, cost]) => ({ department, cost }))
        .sort((a, b) => b.cost - a.cost);

    return {
        totalLaborCost,
        totalPartsCost,
        totalCost: totalLaborCost + totalPartsCost,
        topAssets,
        costByDepartment
    };
}
