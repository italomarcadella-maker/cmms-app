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
        
        // Fetch readings with history
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

        const readingPoints = new Map<string, { kwh: number, co2: number, water: number, gas: number, label: string }>();

        let totalKwh = 0;
        let totalWater = 0;
        let totalGas = 0;

        meterGroups.forEach((readings) => {
            const meter = readings[0].meter;
            
            for (let i = 1; i < readings.length; i++) {
                const current = readings[i];
                const prev = readings[i - 1];
                const delta = Math.max(0, current.value - prev.value);
                
                if (current.date >= startDate && current.date <= endDate) {
                    if (meter.type === 'ELEC') totalKwh += delta;
                    else if (meter.type === 'WATER') totalWater += delta;
                    else if (meter.type === 'GAS') totalGas += delta;

                    const dateKey = current.date.toISOString();
                    if (!readingPoints.has(dateKey)) {
                        readingPoints.set(dateKey, { 
                            kwh: 0, 
                            co2: 0, 
                            water: 0, 
                            gas: 0, 
                            label: format(current.date, 'dd MMM HH:mm', { locale: it }) 
                        });
                    }

                    const stats = readingPoints.get(dateKey)!;
                    if (meter.type === 'ELEC') stats.kwh += delta;
                    else if (meter.type === 'WATER') stats.water += delta;
                    else if (meter.type === 'GAS') stats.gas += delta;
                }
            }
        });

        const chartData = Array.from(readingPoints.entries())
            .map(([date, d]) => ({ ...d, date, co2: d.kwh * 0.44 }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const totalCo2 = totalKwh * 0.44;

        // Insights qualitativi in Italiano
        const aiInsights = [
            {
                title: "Analisi Misure Puntuali",
                content: `Visualizzazione di ${chartData.length} misure dirette rilevate dai contatori nel periodo selezionato. Consumo totale di ${totalKwh.toFixed(0)} kWh.`,
                type: "info",
                suggestion: "Controlla i picchi tra le singole letture",
                savings: "-5% ottimizzando i carichi"
            },
            {
                title: "Impatto CO2",
                content: `Emissioni stimate pari a ${totalCo2.toFixed(0)} kg CO2. Equivalgono a circa ${Math.round(totalCo2 / 20)} alberi necessari per la compensazione.`,
                type: "warning",
                suggestion: "Usa energia da fonti rinnovabili",
                savings: "Compensazione 100%"
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

