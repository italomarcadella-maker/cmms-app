"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { format, subDays, parseISO, startOfWeek, startOfMonth, endOfWeek, endOfMonth, differenceInDays, isWithinInterval } from "date-fns";

export async function getEnergyMetrics(plantId?: string, startDateStr?: string, endDateStr?: string) {
    try {
        const now = new Date();
        const endDate = endDateStr ? parseISO(endDateStr) : now;
        const startDate = startDateStr ? parseISO(startDateStr) : subDays(endDate, 30);
        
        const daysInRange = differenceInDays(endDate, startDate);
        const bucketType: 'week' | 'month' | 'day' = daysInRange > 60 ? 'month' : daysInRange > 14 ? 'week' : 'day';

        // Fetch readings with a buffer to find deltas at the edges
        const historyStart = subDays(startDate, 60); 

        const meterReadings = await prisma.meterReading.findMany({
            where: { 
                date: { gte: historyStart, lte: endDate },
            },
            include: { meter: true },
            orderBy: { date: 'asc' }
        });

        const hasAnyReadings = meterReadings.length > 0;
        
        // Group by meter to calculate true deltas within the period
        const meterGroups = new Map<string, any[]>();
        meterReadings.forEach((r: any) => {
            const list = meterGroups.get(r.meterId) || [];
            list.push(r);
            meterGroups.set(r.meterId, list);
        });

        const bucketData = new Map<string, { kwh: number, co2: number, water: number, gas: number, label: string }>();

        let totalKwh = 0;
        let totalWater = 0;
        let totalGas = 0;

        meterGroups.forEach((readings) => {
            const meter = readings[0].meter;
            
            // Calculate total for the requested period for this meter
            const readingsInPeriod = readings.filter(r => isWithinInterval(r.date, { start: startDate, end: endDate }));
            if (readingsInPeriod.length >= 1) {
                // Find the reading just before the period to get the starting value
                const beforeReading = readings.filter(r => r.date < startDate).pop();
                const firstVal = beforeReading ? beforeReading.value : readingsInPeriod[0].value;
                const lastVal = readingsInPeriod[readingsInPeriod.length - 1].value;
                
                const periodDelta = Math.max(0, lastVal - firstVal);
                if (meter.type === 'ELEC') totalKwh += periodDelta;
                else if (meter.type === 'WATER') totalWater += periodDelta;
                else if (meter.type === 'GAS') totalGas += periodDelta;
            }

            // Bucket aggregation for the chart
            for (let i = 1; i < readings.length; i++) {
                const current = readings[i];
                const prev = readings[i-1];
                
                // If the interval overlaps with our requested range
                if (current.date >= startDate && prev.date <= endDate) {
                    const delta = Math.max(0, current.value - prev.value);
                    
                    // Assign the delta to a bucket (we use the current reading date to bucket)
                    let bucketKey: string;
                    let bucketLabel: string;
                    
                    if (bucketType === 'month') {
                        const d = startOfMonth(current.date);
                        bucketKey = format(d, 'yyyy-MM');
                        bucketLabel = format(d, 'MMM yyyy');
                    } else if (bucketType === 'week') {
                        const d = startOfWeek(current.date);
                        bucketKey = format(d, 'yyyy-ww');
                        bucketLabel = `Sett. ${format(d, 'ww')}`;
                    } else {
                        bucketKey = format(current.date, 'yyyy-MM-dd');
                        bucketLabel = format(current.date, 'dd MMM');
                    }

                    const stats = bucketData.get(bucketKey) || { kwh: 0, co2: 0, water: 0, gas: 0, label: bucketLabel };
                    if (meter.type === 'ELEC') stats.kwh += delta;
                    else if (meter.type === 'WATER') stats.water += delta;
                    else if (meter.type === 'GAS') stats.gas += delta;
                    
                    bucketData.set(bucketKey, stats);
                }
            }
        });

        const chartData = Array.from(bucketData.entries())
            .map(([key, d]) => ({ ...d, key, co2: d.kwh * 0.44 }))
            .sort((a, b) => a.key.localeCompare(b.key));


        const totalCo2 = totalKwh * 0.44;

        // Period-over-Period Savings (Estimated based on daily average)
        const avgDailyKwh = daysInRange > 0 ? totalKwh / daysInRange : 0;
        
        // Sustainability Score Logic
        let sustainabilityScore = 70; 
        if (hasAnyReadings) {
            // Placeholder: real score would compare vs benchmark
            sustainabilityScore = 75; 
        } else {
            sustainabilityScore = 0;
        }

        const costs = {
            electricity: totalKwh * 0.22,
            water: totalWater * 0.85, 
            total: (totalKwh * 0.22) + (totalWater * 0.85)
        };

        const aiInsights = [];
        if (totalKwh > 500) {
            aiInsights.push({
                title: "Analisi Consumi Energetici",
                content: `Consumo totale di ${totalKwh.toFixed(0)} kWh nel periodo selezionato.`,
                suggestion: "Il monitoraggio puntuale indica picchi in corrispondenza delle letture più ravvicinate.",
                type: "info",
                savings: "Ottimizzazione possibile"
            });
        }

        return {
            chartData,
            totalKwh,
            totalCo2,
            totalWater,
            totalGas,
            averageKwh: avgDailyKwh,
            savingsPercent: 0, // Simplified for now
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
