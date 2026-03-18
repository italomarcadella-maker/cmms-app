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

        const readingPoints = new Map<string, any>();
        const activeMeters = new Map<string, string>(); // name -> type

        let totalKwh = 0;
        let totalWater = 0;
        let totalGas = 0;

        meterGroups.forEach((readings, meterId) => {
            const meter = readings[0].meter;
            activeMeters.set(meter.name, meter.type);
            
            // Baseline is the last reading strictly before the first reading in range
            const firstInRangeIdx = readings.findIndex(r => r.date >= startDate && r.date <= endDate);
            if (firstInRangeIdx === -1) return;

            const baselineReading = firstInRangeIdx > 0 ? readings[firstInRangeIdx - 1] : readings[0];
            const baselineValue = baselineReading.value;

            for (let i = firstInRangeIdx; i < readings.length; i++) {
                const current = readings[i];
                if (current.date > endDate) break;

                const cumulativeDelta = Math.max(0, current.value - baselineValue);
                
                // Total calculation
                if (i > 0) {
                    const prev = readings[i-1];
                    const stepDelta = Math.max(0, current.value - prev.value);
                    if (current.date >= startDate && current.date <= endDate) {
                        if (meter.type === 'ELEC') totalKwh += stepDelta;
                        else if (meter.type === 'WATER') totalWater += stepDelta;
                        else if (meter.type === 'GAS') totalGas += stepDelta;
                    }
                }

                const dateKey = current.date.toISOString();
                if (!readingPoints.has(dateKey)) {
                    readingPoints.set(dateKey, { 
                        date: dateKey,
                        label: format(current.date, 'dd MMM HH:mm', { locale: it }),
                        totalKwh: 0,
                        totalWater: 0,
                        totalGas: 0
                    });
                }

                const stats = readingPoints.get(dateKey)!;
                // Individual meter data for multi-line chart
                stats[meter.name] = cumulativeDelta;
                
                // Aggregated data for compatibility
                if (meter.type === 'ELEC') stats.totalKwh += cumulativeDelta;
                else if (meter.type === 'WATER') stats.totalWater += cumulativeDelta;
                else if (meter.type === 'GAS') stats.totalGas += cumulativeDelta;
            }
        });

        const chartData = Array.from(readingPoints.values())
            .sort((a, b) => a.date.localeCompare(b.date));

        const totalCo2 = totalKwh * 0.44;

        // AI Pattern/Anomaly detection
        const hasSteepSlope = chartData.length > 2 && (totalKwh / (daysInRange || 1)) > 50;

        const aiInsights = [
            {
                title: "Analisi Pattern di Consumo",
                content: hasSteepSlope 
                    ? `Attenzione: rilevata pendenza elevata nell'assorbimento elettrico (${(totalKwh/(daysInRange || 1)).toFixed(1)} kWh/giorno).`
                    : `Andamento regolare. Il consumo progressivo mostra un carico costante coerente con i benchmark.`,
                type: hasSteepSlope ? "warning" : "success",
                suggestion: "Controlla eventuali dimenticanze di spegnimento a fine turno",
                savings: "-12% con gestione carichi"
            },
            {
                title: "Impatto Green",
                content: `Emissioni totali di ${totalCo2.toFixed(0)} kg CO2 nel periodo. Compensazione equivalente: ${Math.round(totalCo2 / 20)} alberi.`,
                type: "info",
                suggestion: "Pianifica interventi di efficientamento sui motori più vecchi",
                savings: "Zero emissioni nette"
            }
        ];

        return {
            chartData,
            activeMeters: Array.from(activeMeters.entries()).map(([name, type]) => ({ name, type })),
            totalKwh,
            totalCo2,
            totalWater,
            totalGas,
            averageKwh: daysInRange > 0 ? totalKwh / daysInRange : totalKwh,
            savingsPercent: 0,
            sustainabilityScore: totalKwh > 0 ? 85 : 0,
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

