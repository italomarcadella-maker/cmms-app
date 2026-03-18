"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getEnergyMetrics(plantId?: string, days: number = 30) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const [meterReadings] = await Promise.all([
            prisma.meterReading.findMany({
                where: { date: { gte: startDate } },
                include: { meter: true },
                orderBy: { date: 'asc' }
            })
        ]);

        const dailyData = new Map<string, { kwh: number, co2: number, water: number, gas: number }>();

        // Process MeterReadings (The real data source mentioned by the user)
        let totalWater = 0;
        let totalGas = 0;
        let totalKwh = 0;
        let totalCo2 = 0;

        // Group readings by meter to calculate deltas
        const meterGroups = new Map<string, any[]>();
        meterReadings.forEach((reading: any) => {
            const list = meterGroups.get(reading.meterId) || [];
            list.push(reading);
            meterGroups.set(reading.meterId, list);
        });

        meterGroups.forEach((readings, meterId) => {
            const meter = readings[0].meter;
            for (let i = 1; i < readings.length; i++) {
                const current = readings[i];
                const prev = readings[i - 1];
                let consumption = current.value - prev.value;

                // Anomaly filter
                if (consumption < 0) consumption = 0;

                const dateStr = current.date.toISOString().split('T')[0];
                const data = dailyData.get(dateStr) || { kwh: 0, co2: 0, water: 0, gas: 0 };

                if (meter.type === 'ELEC') {
                    data.kwh += consumption;
                    totalKwh += consumption;
                    const co2 = consumption * 0.44; // standard IT conversion factor
                    data.co2 += co2;
                    totalCo2 += co2;
                } else if (meter.type === 'WATER') {
                    data.water += consumption;
                    totalWater += consumption;
                } else if (meter.type === 'GAS') {
                    data.gas += consumption;
                    totalGas += consumption;
                }
                dailyData.set(dateStr, data);
            }
        });

        const chartData = Array.from(dailyData.entries()).map(([date, data]: [string, any]) => ({
            date,
            kwh: data.kwh,
            co2: data.co2 || (data.kwh * 0.44), // standard IT conversion factor
            water: data.water,
            gas: data.gas
        })).sort((a, b) => a.date.localeCompare(b.date));

        // Period-over-Period Calculation
        const midPoint = Math.floor(chartData.length / 2);
        const currentPeriodData = chartData.slice(midPoint);
        const previousPeriodData = chartData.slice(0, midPoint);
        
        const currentAvg = currentPeriodData.length > 0 
            ? currentPeriodData.reduce((acc, curr: any) => acc + curr.kwh, 0) / (currentPeriodData.length || 1)
            : 0;
        const previousAvg = previousPeriodData.length > 0 
            ? previousPeriodData.reduce((acc, curr: any) => acc + curr.kwh, 0) / (previousPeriodData.length || 1)
            : 0;
            
        const averageKwh = currentAvg;
        const kwhSavingsPercent = previousAvg > 0 ? ((previousAvg - currentAvg) / previousAvg) * 100 : 0;

        // Peak analysis for real AI insights
        const maxKwh = chartData.length > 0 ? Math.max(...chartData.map((d: any) => d.kwh), 0) : 0;
        const avgKwhLimit = averageKwh * 1.5;
        const peakDays = chartData.filter((d: any) => d.kwh > avgKwhLimit).length;

        let sustainabilityScore = 0; 
        if (totalKwh > 0 || totalWater > 0) {
            sustainabilityScore = 50 + Math.min(50, Math.max(0, kwhSavingsPercent * 2));
        }
        
        sustainabilityScore = Math.round(Math.min(100, Math.max(0, sustainabilityScore)));

        const costs = {
            electricity: totalKwh * 0.22,
            water: totalWater * 0.85, 
            total: (totalKwh * 0.22) + (totalWater * 0.85)
        };

        const aiInsights = [];
        
        if (peakDays > 0) {
            const potentialSavings = (maxKwh - averageKwh) * peakDays * 0.22;
            aiInsights.push({
                title: "Ottimizzazione Picchi Energetici",
                content: `Rilevati ${peakDays} giorni con consumi superiori del 50% alla media. Stabilizzando questi picchi potresti risparmiare significativamente.`,
                suggestion: "Programmare i cicli di riscaldamento degli estrusori in modalità scaglionata.",
                type: "warning",
                savings: `€ ${potentialSavings.toFixed(0)} / periodo`
            });
        }

        if (totalWater > (days * 10)) { 
            aiInsights.push({
                title: "Analisi Flusso Idrico",
                content: `Il consumo di ${totalWater.toLocaleString()} m³ indica un utilizzo intensivo degli impianti di raffreddamento.`,
                suggestion: "Verificare l'efficienza degli scambiatori di calore sulla linea 2.",
                type: "info",
                savings: "Ottimizzazione operativa"
            });
        }

        if (kwhSavingsPercent > 2) {
            aiInsights.push({
                title: "Efficienza in Miglioramento",
                content: `Riduzione del ${kwhSavingsPercent.toFixed(1)}% rispetto al periodo precedente grazie alle nuove SOP.`,
                suggestion: "Continuare il monitoraggio dei parametri di processo correnti.",
                type: "success",
                savings: `€ ${(totalKwh * 0.22 * (kwhSavingsPercent/100)).toFixed(0)} risparmiati`
            });
        }

        return {
            chartData,
            totalKwh,
            totalCo2: totalCo2 || (totalKwh * 0.44), // Re-using standard factor
            totalWater,
            averageKwh,
            savingsPercent: kwhSavingsPercent,
            sustainabilityScore,
            estimatedCosts: costs,
            aiInsights: aiInsights.length > 0 ? aiInsights : undefined
        };
    } catch (error) {
        console.error("Failed to fetch energy metrics:", error);
        return {
            chartData: [],
            totalKwh: 0,
            totalCo2: 0,
            totalWater: 0,
            averageKwh: 0,
            savingsPercent: 0,
            sustainabilityScore: 0,
            estimatedCosts: { electricity: 0, water: 0, total: 0 }
        };
    }
}
