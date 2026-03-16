"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getEnergyMetrics(plantId?: string) {
    try {
        // Find logs for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const logs = await prisma.energyLog.findMany({
            where: {
                date: { gte: thirtyDaysAgo },
                ...(plantId && { plantId })
            },
            orderBy: { date: 'asc' }
        });

        // Group by day for the chart
        const dailyData = new Map<string, { kwh: number, co2: number }>();

        // Let's assume some baseline 
        let totalKwh = 0;
        let totalCo2 = 0;

        logs.forEach((log: any) => {
            const dateStr = log.date.toISOString().split('T')[0];
            const current = dailyData.get(dateStr) || { kwh: 0, co2: 0 };

            current.kwh += log.kwh;
            current.co2 += log.co2Emissions || (log.kwh * 0.25); // fallback CO2 factor

            totalKwh += log.kwh;
            totalCo2 += log.co2Emissions || (log.kwh * 0.25);

            dailyData.set(dateStr, current);
        });

        // Format for Recharts
        const chartData = Array.from(dailyData.entries()).map(([date, data]) => ({
            date,
            kwh: data.kwh,
            co2: data.co2
        }));

        const averageKwh = chartData.length > 0 ? (totalKwh / chartData.length) : 0;

        // Mock baseline for comparison
        const baselineKwh = averageKwh * 1.15; // Assumption: we improved by 15%
        const savingsPercent = ((baselineKwh - averageKwh) / baselineKwh) * 100;

        // NEW: Sustainability Score (0-100)
        let sustainabilityScore = 75; // Base score
        if (savingsPercent > 10) sustainabilityScore += 15;
        else if (savingsPercent > 5) sustainabilityScore += 5;
        else if (savingsPercent < 0) sustainabilityScore -= 10;
        
        // Cap score
        sustainabilityScore = Math.min(100, Math.max(0, sustainabilityScore));

        // NEW: Estimated Costs (Fallback factors)
        const costs = {
            electricity: totalKwh * 0.22, // €/kWh
            co2: totalCo2 * 0.05,        // Potential carbon tax simulator
            total: (totalKwh * 0.22)
        };

        return {
            chartData,
            totalKwh,
            totalCo2,
            averageKwh,
            savingsPercent,
            sustainabilityScore,
            estimatedCosts: costs
        };
    } catch (error) {
        console.error("Failed to fetch energy metrics:", error);
        return {
            chartData: [],
            totalKwh: 0,
            totalCo2: 0,
            averageKwh: 0,
            savingsPercent: 0
        };
    }
}
