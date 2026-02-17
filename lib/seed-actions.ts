'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { addDays, subDays } from 'date-fns';

export async function seedEnergyData() {
    try {
        // 1. Check if meters exist, if not create them
        const metersData = [
            { name: 'Contatore Generale (Elec)', type: 'ELEC', unit: 'kWh', location: 'Cabina MT' },
            { name: 'Reparto Produzione (Elec)', type: 'ELEC', unit: 'kWh', location: 'Quadro A' },
            { name: 'Ingresso Acqua', type: 'WATER', unit: 'm3', location: 'Locale Tecnico' },
            { name: 'Gas Centrale Termica', type: 'GAS', unit: 'm3', location: 'Esterno' }
        ];

        let meters = await prisma.meter.findMany();

        if (meters.length === 0) {
            console.log("Seeding Meters...");
            for (const m of metersData) {
                await prisma.meter.create({ data: m });
            }
            meters = await prisma.meter.findMany();
        }

        // 2. Generate Readings for last 90 days
        const endDate = new Date();
        const startDate = subDays(endDate, 90);

        console.log("Seeding Readings...");

        // Baseline values
        const baselines: Record<string, number> = {
            'ELEC': 150000,
            'WATER': 45000,
            'GAS': 12000
        };

        const dailyIncrements: Record<string, number> = {
            'ELEC': 450, // ~450 kWh/day
            'WATER': 15, // ~15 m3/day
            'GAS': 40    // ~40 m3/day
        };

        let count = 0;

        for (const meter of meters) {
            // Check if readings already exist to avoid duplicates/overwrite if not needed
            // For now, we assume if user asks to seed, we might want to fill gaps or we check last reading.
            const lastReading = await prisma.meterReading.findFirst({
                where: { meterId: meter.id },
                orderBy: { date: 'desc' }
            });

            let currentValue = lastReading ? lastReading.value : (baselines[meter.type] || 0);
            let currentDate = lastReading ? addDays(lastReading.date, 1) : startDate;

            if (currentDate > endDate) continue; // Up to date

            const daysToFill = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

            const readingsToInsert = [];

            for (let i = 0; i < daysToFill; i++) {
                // Add some randomness
                const baseInc = dailyIncrements[meter.type] || 10;
                const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 - 1.2
                const increment = baseInc * randomFactor;

                // Simulate weekend drop for Elec/Gas
                const dayOfWeek = currentDate.getDay();
                let weekendFactor = 1;
                if (dayOfWeek === 0 || dayOfWeek === 6) weekendFactor = 0.3;

                currentValue += (increment * weekendFactor);

                readingsToInsert.push({
                    meterId: meter.id,
                    date: new Date(currentDate),
                    value: parseFloat(currentValue.toFixed(2)),
                    isAnomaly: false
                });

                currentDate = addDays(currentDate, 1);
            }

            if (readingsToInsert.length > 0) {
                await prisma.meterReading.createMany({
                    data: readingsToInsert
                });
                count += readingsToInsert.length;
            }
        }

        revalidatePath('/energy');
        return { success: true, message: `Generati ${count} nuovi datapoint di lettura.` };

    } catch (error) {
        console.error("Seeding Error:", error);
        return { success: false, message: "Errore durante il popolamento dati." };
    }
}
