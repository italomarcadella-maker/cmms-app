"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { format, subDays, parseISO, startOfWeek, startOfMonth, endOfWeek, endOfMonth, differenceInDays, isWithinInterval } from "date-fns";
import { it } from "date-fns/locale";


export async function getEnergyMetrics(plantId?: string, startDateStr?: string, endDateStr?: string) {
    try {
        const now = new Date();
        let endDate = endDateStr ? parseISO(endDateStr) : now;
        let startDate = startDateStr ? parseISO(startDateStr) : subDays(endDate, 30);
        
        // Fix inverted date range
        if (startDate > endDate) {
            const temp = startDate;
            startDate = endDate;
            endDate = temp;
        }

        const daysInRange = differenceInDays(endDate, startDate);
        
        // Fetch ALL readings up to the end date
        const historyStart = subDays(startDate, 365); 

        const meterReadings = await prisma.meterReading.findMany({
            where: { 
                date: { lte: endDate },
            },
            include: { meter: true },
            orderBy: { date: 'asc' }
        });

        const hasAnyReadings = meterReadings.length > 0;
        
        // Group by meter and find baseline readings
        const meterGroups = new Map<string, any[]>();
        const baselines = new Map<string, number>();

        meterReadings.forEach((r: any) => {
            if (!meterGroups.has(r.meterId)) {
                meterGroups.set(r.meterId, []);
            }
            meterGroups.get(r.meterId)!.push(r);
            
            // Baseline is the last reading before or at startDate
            if (r.date <= startDate) {
                baselines.set(r.meterId, r.value);
            }
        });

        const readingPoints = new Map<string, { kwh: number, co2: number, water: number, gas: number, label: string }>();

        let totalKwh = 0;
        let totalWater = 0;
        let totalGas = 0;

        // Process all readings to find totals in range
        meterGroups.forEach((readings, meterId) => {
            const meter = readings[0].meter;
            const baseline = baselines.get(meterId) || readings[0].value;
            
            for (let i = 0; i < readings.length; i++) {
                const current = readings[i];
                
                // Effective consumption desde base
                const cumulativeDelta = Math.max(0, current.value - baseline);
                
                // Total calculation (reading-to-reading delta)
                if (i > 0) {
                    const prev = readings[i-1];
                    const stepDelta = Math.max(0, current.value - prev.value);
                    if (current.date >= startDate && current.date <= endDate) {
                        if (meter.type === 'ELEC') totalKwh += stepDelta;
                        else if (meter.type === 'WATER') totalWater += stepDelta;
                        else if (meter.type === 'GAS') totalGas += stepDelta;
                    }
                }

                // Add to chart if in range
                if (current.date >= startDate && current.date <= endDate) {
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
                    // For the chart, we show the cumulative consumption from the start of the period
                    // to obtain a "progressive" line as requested
                    if (meter.type === 'ELEC') stats.kwh += cumulativeDelta;
                    else if (meter.type === 'WATER') stats.water += cumulativeDelta;
                    else if (meter.type === 'GAS') stats.gas += cumulativeDelta;
                }
            }
        });

        // Add a starting point at startDate if not present
        const startKey = startDate.toISOString();
        if (!readingPoints.has(startKey)) {
            readingPoints.set(startKey, { 
                kwh: 0, 
                co2: 0, 
                water: 0, 
                gas: 0, 
                label: format(startDate, 'dd MMM HH:mm', { locale: it }) 
            });
        }

        const chartData = Array.from(readingPoints.entries())
            .map(([date, d]) => ({ ...d, date, co2: d.kwh * 0.44 }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const totalCo2 = totalKwh * 0.44;

        // Insights qualitativi in Italiano
        const aiInsights = [
            {
                title: "Andamento Progressivo",
                content: `Il grafico mostra l'accumulo dei consumi dall'inizio del periodo (${format(startDate, 'dd/MM')}). Ogni punto rappresenta una misura reale integrata nella serie storica.`,
                type: "info",
                suggestion: "Analizza la pendenza della curva per individuare periodi di alto carico",
                savings: "-8% con monitoraggio continuo"
            },
            {
                title: "Impatto Ambientale",
                content: `Emissioni totali di ${totalCo2.toFixed(0)} kg CO2 calcolate sulle misure effettive. Necessari circa ${Math.round(totalCo2 / 20)} alberi per la compensazione.`,
                type: "warning",
                suggestion: "Ottimizza l'efficienza dei sistemi HVAC durante i picchi",
                savings: "Zero carichi fantasma"
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

