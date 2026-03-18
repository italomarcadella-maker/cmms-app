"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { format, subDays, parseISO, startOfWeek, startOfMonth, endOfWeek, endOfMonth, differenceInDays, isWithinInterval } from "date-fns";
import { it } from "date-fns/locale";


export async function getEnergyMetrics(plantId?: string, startDateStr?: string, endDateStr?: string) {
    try {
        const now = new Date();
        const endDate = endDateStr ? parseISO(endDateStr) : now;
        const startDate = startDateStr ? parseISO(startDateStr) : subDays(endDate, 30);
        
        const daysInRange = differenceInDays(endDate, startDate);
        const bucketFormat = daysInRange > 60 ? 'yyyy-MM' : daysInRange > 14 ? 'I-yyyy' : 'yyyy-MM-dd';

        // Fetch readings with enough history to find the first base reading
        const historyStart = subDays(startDate, 365); 

        const meterReadings = await prisma.meterReading.findMany({
            where: { 
                date: { gte: historyStart, lte: endDate },
            },
            include: { meter: true },
            orderBy: { date: 'asc' }
        });

        const hasAnyReadings = meterReadings.length > 0;
        
        // Group by meter
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
            
            for (let i = 1; i < readings.length; i++) {
                const current = readings[i];
                const prev = readings[i - 1];
                
                // Effective consumption between these two points
                const delta = Math.max(0, current.value - prev.value);
                
                // If the CURRENT reading is within the requested range, add to totals and buckets
                if (current.date >= startDate && current.date <= endDate) {
                    if (meter.type === 'ELEC') totalKwh += delta;
                    else if (meter.type === 'WATER') totalWater += delta;
                    else if (meter.type === 'GAS') totalGas += delta;

                    const bucketKey = format(current.date, bucketFormat);
                    if (!bucketData.has(bucketKey)) {
                        let label: string;
                        if (bucketFormat === 'yyyy-MM') label = format(current.date, 'MMM yyyy', { locale: it });
                        else if (bucketFormat === 'I-yyyy') label = `Sett ${format(current.date, 'I', { locale: it })}`;
                        else label = format(current.date, 'dd MMM', { locale: it });
                        
                        bucketData.set(bucketKey, { kwh: 0, co2: 0, water: 0, gas: 0, label });
                    }

                    const stats = bucketData.get(bucketKey)!;
                    if (meter.type === 'ELEC') stats.kwh += delta;
                    else if (meter.type === 'WATER') stats.water += delta;
                    else if (meter.type === 'GAS') stats.gas += delta;
                }
            }
        });

        const chartData = Array.from(bucketData.entries())
            .map(([key, d]) => ({ ...d, key, co2: d.kwh * 0.44 }))
            .sort((a, b) => a.key.localeCompare(b.key));

        const totalCo2 = totalKwh * 0.44;

        // Insights qualitativi in Italiano
        const aiInsights = [
            {
                title: "Analisi Pattern Energetico",
                content: `Consumo totale di ${totalKwh.toFixed(0)} kWh rilevato tramite ${meterReadings.length} letture puntuali. I trend mostrano l'assorbimento cumulativo per periodo.`,
                type: "info"
            },
            {
                title: "Impatto CO2",
                content: `Emissioni stimate pari a ${totalCo2.toFixed(0)} kg CO2. Equivalgono a circa ${Math.round(totalCo2 / 20)} alberi necessari per la compensazione.`,
                type: "warning"
            }
        ];

        return {
            chartData,
            totalKwh,
            totalCo2,
            totalWater,
            totalGas,
            averageKwh: daysInRange > 0 ? totalKwh / daysInRange : totalKwh,
            savingsPercent: 0,
            sustainabilityScore: totalKwh > 0 ? 82 : 0,
            estimatedCosts: { 
                electricity: totalKwh * 0.22, 
                water: totalWater * 0.85, 
                total: (totalKwh * 0.22) + (totalWater * 0.85) 
            },
            aiInsights,
            hasReadingsHistory: hasAnyReadings
        };
    } catch (error) {
        console.error("getEnergyMetrics Error:", error);
        return {
            chartData: [],
            totalKwh: 0,
            totalCo2: 0,
            totalWater: 0,
            totalGas: 0,
            averageKwh: 0,
            savingsPercent: 0,
            sustainabilityScore: 0,
            estimatedCosts: { electricity: 0, water: 0, total: 0 },
            hasReadingsHistory: false
        };
    }
}

