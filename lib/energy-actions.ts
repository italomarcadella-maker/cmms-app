"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getEnergyMetrics(plantId?: string, days: number = 30) {
    try {
        const now = new Date();
        const startOfRequestedPeriod = new Date(now);
        startOfRequestedPeriod.setDate(now.getDate() - days);
        
        // Fetch up to 365 days to ensure we have context and historical deltas
        const historyStart = new Date(now);
        historyStart.setDate(now.getDate() - 365);

        const meterReadings = await prisma.meterReading.findMany({
            where: { 
                date: { gte: historyStart },
                // If plantId is provided, should we filter? Original didn't filter meterReadings by plantId
                // because MeterReading is linked to Meter, not directly to Plant.
                // Assuming all meters are relevant or filtering happens later.
            },
            include: { meter: true },
            orderBy: { date: 'asc' }
        });

        const hasAnyReadings = meterReadings.length > 0;
        const dailyData = new Map<string, { kwh: number, co2: number, water: number, gas: number }>();
        
        // Group by meter to calculate deltas
        const meterGroups = new Map<string, typeof meterReadings>();
        meterReadings.forEach((r: any) => {
            const list = meterGroups.get(r.meterId) || [];
            list.push(r);
            meterGroups.set(r.meterId, list);
        });

        meterGroups.forEach((readings, meterId) => {
            const meter = readings[0].meter;
            
            for (let i = 1; i < readings.length; i++) {
                const current = readings[i];
                const prev = readings[i - 1];
                let totalDelta = current.value - prev.value;

                if (totalDelta < 0) totalDelta = 0; // Filter anomalies

                // Distribute delta over the days between readings
                const diffTime = Math.abs(current.date.getTime() - prev.date.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                const dailyIncrement = totalDelta / diffDays;

                for (let d = 0; d < diffDays; d++) {
                    const dayDate = new Date(prev.date);
                    dayDate.setDate(dayDate.getDate() + d + 1);
                    
                    if (dayDate > current.date) break;
                    
                    const dateStr = dayDate.toISOString().split('T')[0];
                    const stats = dailyData.get(dateStr) || { kwh: 0, co2: 0, water: 0, gas: 0 };
                    
                    if (meter.type === 'ELEC') stats.kwh += dailyIncrement;
                    else if (meter.type === 'WATER') stats.water += dailyIncrement;
                    else if (meter.type === 'GAS') stats.gas += dailyIncrement;
                    
                    dailyData.set(dateStr, stats);
                }
            }
        });

        // Calculate totals and chart data for the requested period
        let totalWater = 0;
        let totalKwh = 0;
        let totalCo2 = 0;
        
        const chartData: any[] = [];
        const requestedPeriodDateStr = startOfRequestedPeriod.toISOString().split('T')[0];

        // We want accurate totals for the requested window
        dailyData.forEach((stats, dateStr) => {
            if (dateStr >= requestedPeriodDateStr) {
                totalKwh += stats.kwh;
                totalWater += stats.water;
                
                const dayCo2 = stats.kwh * 0.44;
                totalCo2 += dayCo2;

                chartData.push({
                    date: dateStr,
                    kwh: stats.kwh,
                    co2: dayCo2,
                    water: stats.water,
                    gas: stats.gas
                });
            }
        });

        chartData.sort((a, b) => a.date.localeCompare(b.date));

        // Period-over-Period Savings
        // We compare the current period with the immediate previous one of the same length
        const prevPeriodStart = new Date(startOfRequestedPeriod);
        prevPeriodStart.setDate(prevPeriodStart.getDate() - days);
        const prevPeriodDateStr = prevPeriodStart.toISOString().split('T')[0];

        let prevTotalKwh = 0;
        dailyData.forEach((stats, dateStr) => {
            if (dateStr >= prevPeriodDateStr && dateStr < requestedPeriodDateStr) {
                prevTotalKwh += stats.kwh;
            }
        });

        const kwhSavingsPercent = prevTotalKwh > 0 
            ? ((prevTotalKwh - totalKwh) / prevTotalKwh) * 100 
            : 0;

        const averageKwh = days > 0 ? (totalKwh / days) : 0;
        const maxKwh = chartData.length > 0 ? Math.max(...chartData.map((d: any) => d.kwh), 0) : 0;
        const peakDays = chartData.filter((d: any) => d.kwh > averageKwh * 1.5).length;


        let sustainabilityScore = 70; // baseline
        if (hasAnyReadings) {
            sustainabilityScore = 65 + Math.min(35, Math.max(-20, kwhSavingsPercent * 1.5));
            if (peakDays > 5) sustainabilityScore -= 10;
        } else {
            sustainabilityScore = 0;
        }
        
        sustainabilityScore = Math.round(Math.min(100, Math.max(0, sustainabilityScore)));

        const costs = {
            electricity: totalKwh * 0.22,
            water: totalWater * 0.85, 
            total: (totalKwh * 0.22) + (totalWater * 0.85)
        };

        const aiInsights = [];
        if (peakDays > 0) {
            aiInsights.push({
                title: "Ottimizzazione Picchi Energetici",
                content: `Rilevati ${peakDays} giorni con consumi superiori del 50% alla media. Stabilizzando questi picchi potresti risparmiare significativamente.`,
                suggestion: "Programmare i cicli di riscaldamento degli estrusori in modalità scaglionata.",
                type: "warning",
                savings: `€ ${((maxKwh - averageKwh) * peakDays * 0.22).toFixed(0)} / periodo`
            });
        }

        if (totalWater > (days * 5)) {
            aiInsights.push({
                title: "Analisi Flusso Idrico",
                content: `Il consumo di ${totalWater.toLocaleString()} m³ indica un utilizzo intensivo degli impianti di raffreddamento.`,
                suggestion: "Verificare l'efficienza degli scambiatori di calore sulla linea 2.",
                type: "info",
                savings: "Ottimizzazione operativa"
            });
        }

        if (kwhSavingsPercent > 1) {
            aiInsights.push({
                title: "Efficienza in Miglioramento",
                content: `Riduzione del ${kwhSavingsPercent.toFixed(1)}% rispetto al periodo precedente.`,
                suggestion: "Continuare il monitoraggio dei parametri di processo correnti.",
                type: "success",
                savings: `€ ${(prevTotalKwh * 0.22 * (kwhSavingsPercent/100)).toFixed(0)} risparmiati`
            });
        }

        return {
            chartData,
            totalKwh,
            totalCo2,
            totalWater,
            averageKwh,
            savingsPercent: kwhSavingsPercent,
            sustainabilityScore,
            estimatedCosts: costs,
            aiInsights: aiInsights.length > 0 ? aiInsights : undefined,
            hasReadingsHistory: hasAnyReadings
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
