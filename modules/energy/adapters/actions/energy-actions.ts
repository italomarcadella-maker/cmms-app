'use server';

import { revalidatePath } from 'next/cache';
import { ServiceLocator } from '@/modules/shared/infrastructure/registry/service-locator';
import { PrismaMeterRepository } from '../db/prisma-meter-repository';
import { PrismaMeterReadingRepository } from '../db/prisma-meter-reading-repository';
import { Meter } from '../../domain/entities/meter';
import { makeRecordMeterReading } from '../../domain/use-cases/record-meter-reading';
import { requireRole } from '@/lib/auth-guard';
import { getEffectiveSettings } from '@/lib/actions';

import { format, subDays, addDays, parseISO, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";

// Register dependencies if not registered
try {
    ServiceLocator.resolve('IMeterRepository');
} catch {
    ServiceLocator.register('IMeterRepository', new PrismaMeterRepository());
}
try {
    ServiceLocator.resolve('IMeterReadingRepository');
} catch {
    ServiceLocator.register('IMeterReadingRepository', new PrismaMeterReadingRepository());
}

const getMeterRepo = () => ServiceLocator.resolve<PrismaMeterRepository>('IMeterRepository');
const getReadingRepo = () => ServiceLocator.resolve<PrismaMeterReadingRepository>('IMeterReadingRepository');

// --- Ported Actions ---

export async function getMeters() {
    try {
        const repo = getMeterRepo();
        const meters = await repo.findAll();
        return meters.map(m => m.toJSON());
    } catch (error) {
        console.error("Failed to fetch meters:", error);
        return [];
    }
}

export async function createMeter(data: any) {
    const { authorized } = await requireRole(['ADMIN', 'PLANT_MANAGER', 'PROCESS_ENGINEER']);
    if (!authorized) throw new Error('Non autorizzato');
    const repo = getMeterRepo();
    const meterEntity = new Meter({
        name: data.name,
        type: data.type,
        unit: data.unit,
        serialNumber: data.serialNumber,
        location: data.location,
        installationDate: data.installationDate ? new Date(data.installationDate) : undefined
    });
    await repo.save(meterEntity);
    revalidatePath('/energy');
    revalidatePath('/energy/meters');
}

export async function deleteMeter(id: string) {
    const { authorized } = await requireRole(['ADMIN', 'PLANT_MANAGER', 'PROCESS_ENGINEER']);
    if (!authorized) throw new Error('Non autorizzato');
    const repo = getMeterRepo();
    await repo.delete(id);
    revalidatePath('/energy');
    revalidatePath('/energy/meters');
}

export async function getMeterReadings(meterId: string) {
    const repo = getReadingRepo();
    const readings = await repo.findByMeterId(meterId);
    // Return format matching legacy UI expectations
    return readings.slice(0, 50).map(r => {
        const json = r.toJSON();
        return {
            ...json,
            date: json.date.toISOString().split('T')[0]
        };
    });
}

export async function addMeterReading(data: { meterId: string, value: number, date: string }) {
    const { authorized } = await requireRole(['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'PROCESS_ENGINEER', 'MAINTAINER']);
    if (!authorized) return { success: false, isAnomaly: false, aiAnalysis: null as string | null };
    const recordMeterReading = makeRecordMeterReading(getMeterRepo(), getReadingRepo());
    let isAnomaly: boolean;
    let aiAnalysis: string | null;
    try {
        ({ isAnomaly, aiAnalysis } = await recordMeterReading(data));
    } catch (e) {
        // Un contatore ha una sola lettura per data: un doppio invio non deve duplicare i consumi
        if ((e as { code?: string })?.code === 'P2002') {
            return { success: false, isAnomaly: false, aiAnalysis: null as string | null, message: 'Esiste gia\' una lettura di questo contatore per la stessa data.' };
        }
        throw e;
    }

    revalidatePath('/energy');
    return { success: true, isAnomaly, aiAnalysis };
}

export async function getAllMeterReadings() {
    const { authorized } = await requireRole(['ADMIN', 'PLANT_MANAGER', 'PROCESS_ENGINEER']);
    if (!authorized) return [];
    const readings = await getReadingRepo().findWithMeter();

    return readings
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map((r) => ({
            ...r,
            meterName: r.meter.name,
            meterType: r.meter.type,
            meterSerial: r.meter.serialNumber || 'N/A',
            meterLocation: r.meter.location || 'N/A',
            unit: r.meter.unit,
            date: r.date.toISOString().split('T')[0]
        }));
}

export async function getEnergyStats(days: number = 30) {
    try {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const startOfTrend = subDays(new Date(), days);

        const meters = (await getMeterRepo().findAll()).map(m => m.toJSON());

        const readings = await getReadingRepo().findWithMeter({ from: subDays(new Date(), 365) });

        const totals = {
            currentMonth: { ELEC: 0, WATER: 0, GAS: 0 },
            lastMonth: { ELEC: 0, WATER: 0, GAS: 0 }
        };

        const dailyTrends = new Map<string, { date: string, elec: number, water: number, gas: number }>();
        const meterDailyTrends = new Map<string, Map<string, number>>();

        for (let d = 0; d <= days; d++) {
            const date = addDays(startOfTrend, d);
            const key = format(date, 'yyyy-MM-dd');
            dailyTrends.set(key, { date: key, elec: 0, water: 0, gas: 0 });
        }

        meters.forEach(m => meterDailyTrends.set(m.id!, new Map()));

        for (const meter of meters) {
            const meterReadings = readings
                .filter(r => r.meterId === meter.id)
                .sort((a, b) => a.date.getTime() - b.date.getTime());

            for (let i = 1; i < meterReadings.length; i++) {
                const current = meterReadings[i];
                const prev = meterReadings[i - 1];

                let consumption = current.value - prev.value;

                if ((prev.value === 0 && consumption > 5000) || consumption < 0) {
                    consumption = 0;
                }

                const diffTime = Math.abs(current.date.getTime() - prev.date.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const validDays = diffDays > 0 ? diffDays : 1;
                const dailyConsumption = consumption / validDays;

                for (let d = 0; d < validDays; d++) {
                    const targetDate = addDays(prev.date, d + 1);

                    if (targetDate > current.date) break;

                    const targetDateKey = format(targetDate, 'yyyy-MM-dd');

                    if (targetDate >= currentMonthStart && targetDate <= now) {
                        if (totals.currentMonth[meter.type as keyof typeof totals.currentMonth] !== undefined) {
                            totals.currentMonth[meter.type as keyof typeof totals.currentMonth] += dailyConsumption;
                        }
                    } else if (targetDate >= lastMonthStart && targetDate <= lastMonthEnd) {
                        if (totals.lastMonth[meter.type as keyof typeof totals.lastMonth] !== undefined) {
                            totals.lastMonth[meter.type as keyof typeof totals.lastMonth] += dailyConsumption;
                        }
                    }

                    if (targetDate >= startOfTrend) {
                        const entry = dailyTrends.get(targetDateKey);
                        if (entry) {
                            if (meter.type === 'ELEC') entry.elec += dailyConsumption;
                            if (meter.type === 'WATER') entry.water += dailyConsumption;
                            if (meter.type === 'GAS') entry.gas += dailyConsumption;
                        }

                        const mTrend = meterDailyTrends.get(meter.id!);
                        if (mTrend) {
                            const existing = mTrend.get(targetDateKey) || 0;
                            mTrend.set(targetDateKey, existing + dailyConsumption);
                        }
                    }
                }
            }
        }

        const trends = Array.from(dailyTrends.values())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const trendDates = trends.map(t => t.date);

        const meterHistory: Record<string, Array<{ date: string, consumption: number }>> = {};
        meters.forEach(m => {
            const mTrendMap = meterDailyTrends.get(m.id!);
            meterHistory[m.id!] = trendDates.map(date => ({
                date,
                consumption: mTrendMap?.get(date) || 0
            }));
        });

        return {
            currentMonth: totals.currentMonth,
            lastMonth: totals.lastMonth,
            trends,
            meterHistory,
            meters
        };

    } catch (error) {
        console.error("getEnergyStats Error:", error);
        return {
            currentMonth: { ELEC: 0, WATER: 0, GAS: 0 },
            lastMonth: { ELEC: 0, WATER: 0, GAS: 0 },
            trends: [],
            meterHistory: {},
            meters: []
        };
    }
}

export async function getEnergyMetrics(plantId?: string, startDateStr?: string, endDateStr?: string) {
    try {
        const now = new Date();
        let endDate = endDateStr ? parseISO(endDateStr) : now;
        let startDate = startDateStr ? parseISO(startDateStr) : subDays(endDate, 30);
        
        if (startDate > endDate) {
            const temp = startDate;
            startDate = endDate;
            endDate = temp;
        }

        const daysInRange = differenceInDays(endDate, startDate);
        const meterReadings = await getReadingRepo().findWithMeter({ to: endDate });

        const hasAnyReadings = meterReadings.length > 0;
        
        const meterGroups = new Map<string, any[]>();
        const baselines = new Map<string, number>();

        meterReadings.forEach((r: any) => {
            if (!meterGroups.has(r.meterId)) {
                meterGroups.set(r.meterId, []);
            }
            meterGroups.get(r.meterId)!.push(r);
            if (r.date <= startDate) {
                baselines.set(r.meterId, r.value);
            }
        });

        const readingPoints = new Map<string, any>();
        const activeMeters = new Map<string, string>();

        let totalKwh = 0;
        let totalWater = 0;
        let totalGas = 0;

        meterGroups.forEach((readings, meterId) => {
            const meter = readings[0].meter;
            activeMeters.set(meter.name, meter.type);
            
            const firstInRangeIdx = readings.findIndex(r => r.date >= startDate && r.date <= endDate);
            if (firstInRangeIdx === -1) return;

            const baselineReading = firstInRangeIdx > 0 ? readings[firstInRangeIdx - 1] : readings[0];
            const baselineValue = baselineReading.value;

            for (let i = firstInRangeIdx; i < readings.length; i++) {
                const current = readings[i];
                if (current.date > endDate) break;

                const cumulativeDelta = Math.max(0, current.value - baselineValue);
                
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
                stats[meter.name] = cumulativeDelta;
                
                if (meter.type === 'ELEC') stats.totalKwh += cumulativeDelta;
                else if (meter.type === 'WATER') stats.totalWater += cumulativeDelta;
                else if (meter.type === 'GAS') stats.totalGas += cumulativeDelta;
            }
        });

        const chartData = Array.from(readingPoints.values())
            .sort((a, b) => a.date.localeCompare(b.date));

        const settings = await getEffectiveSettings();
        const co2Factor = settings?.co2FactorPerKwh ?? 0.44;
        const electricityPrice = settings?.electricityPricePerKwh ?? 0.22;
        const waterPrice = settings?.waterPricePerM3 ?? 0.85;

        const totalCo2 = totalKwh * co2Factor;

        // Compare against the immediately preceding period of equal length to get a real
        // savings % and sustainability score, instead of a fixed value. If there isn't enough
        // history before `startDate`, both are null so the UI can show an honest "N/D".
        const rangeMs = endDate.getTime() - startDate.getTime();
        const prevStart = new Date(startDate.getTime() - rangeMs);
        const prevEnd = startDate;

        let previousTotalKwh = 0;
        let hasPreviousPeriodData = false;
        meterGroups.forEach((readings, meterId) => {
            const meter = readings[0].meter;
            if (meter.type !== 'ELEC') return;
            for (let i = 1; i < readings.length; i++) {
                const cur = readings[i];
                const prev = readings[i - 1];
                if (cur.date >= prevStart && cur.date <= prevEnd) {
                    previousTotalKwh += Math.max(0, cur.value - prev.value);
                    hasPreviousPeriodData = true;
                }
            }
        });

        const savingsPercent = hasPreviousPeriodData && previousTotalKwh > 0
            ? Math.round(100 * (previousTotalKwh - totalKwh) / previousTotalKwh)
            : null;
        const sustainabilityScore = savingsPercent !== null
            ? Math.max(0, Math.min(100, Math.round(50 + savingsPercent)))
            : null;

        const hasSteepSlope = chartData.length > 2 && (totalKwh / (daysInRange || 1)) > 50;

        const aiInsights = [
            {
                title: "Analisi Pattern di Consumo",
                content: hasSteepSlope
                    ? `Attenzione: rilevata pendenza elevata nell'assorbimento elettrico (${(totalKwh/(daysInRange || 1)).toFixed(1)} kWh/giorno).`
                    : `Andamento regolare. Il consumo progressivo mostra un carico costante coerente con i benchmark.`,
                type: hasSteepSlope ? "warning" : "success",
                suggestion: "Controlla eventuali dimenticanze di spegnimento a fine turno",
                savings: savingsPercent !== null ? `${savingsPercent > 0 ? '-' : '+'}${Math.abs(savingsPercent)}% rispetto al periodo precedente` : "Dati insufficienti per un confronto"
            },
            {
                title: "Impatto Green",
                content: `Emissioni totali di ${totalCo2.toFixed(0)} kg CO2 nel periodo. Compensazione equivalente: ${Math.round(totalCo2 / 20)} alberi.`,
                type: "info",
                suggestion: "Pianifica interventi di efficientamento sui motori più vecchi",
                savings: `Fattore emissione: ${co2Factor} kg/kWh`
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
            savingsPercent,
            sustainabilityScore,
            estimatedCosts: {
                electricity: totalKwh * electricityPrice,
                water: totalWater * waterPrice,
                total: (totalKwh * electricityPrice) + (totalWater * waterPrice)
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
            savingsPercent: null,
            sustainabilityScore: null,
            estimatedCosts: { electricity: 0, water: 0, total: 0 },
            hasReadingsHistory: false
        };
    }
}
