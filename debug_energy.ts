
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugEnergy() {
    console.log("Debugging getEnergyStats...");

    const now = new Date();
    const startOfTrend = new Date();
    startOfTrend.setDate(startOfTrend.getDate() - 30);

    console.log(`Time Window: ${startOfTrend.toISOString()} to ${now.toISOString()}`);

    // Fetch all meters
    const meters = await prisma.meter.findMany();
    console.log(`Meters found: ${meters.length}`);

    // Fetch readings
    const readings = await prisma.meterReading.findMany({
        where: {
            date: { gte: new Date(new Date().setDate(new Date().getDate() - 60)) }
        },
        include: {
            meter: true
        },
        orderBy: { date: 'asc' }
    });
    console.log(`Readings found (last 60 days): ${readings.length}`);

    const dailyTrends = new Map<string, { date: string, elec: number, water: number, gas: number }>();

    // Initialize daily trends
    for (let d = 0; d <= 30; d++) {
        const date = new Date(startOfTrend);
        date.setDate(date.getDate() + d);
        const key = date.toISOString().split('T')[0];
        dailyTrends.set(key, { date: key, elec: 0, water: 0, gas: 0 });
    }
    console.log(`Initialized ${dailyTrends.size} daily trend buckets.`);

    for (const meter of meters) {
        const meterReadings = readings.filter(r => r.meterId === meter.id).sort((a, b) => a.date.getTime() - b.date.getTime());
        console.log(`Processing Meter: ${meter.name} (${meter.type}): ${meterReadings.length} readings.`);

        for (let i = 1; i < meterReadings.length; i++) {
            const current = meterReadings[i];
            const prev = meterReadings[i - 1];

            let consumption = current.value - prev.value;
            const originalConsumption = consumption;

            if ((prev.value === 0 && consumption > 5000) || consumption < 0) {
                consumption = 0;
            }

            const diffTime = Math.abs(current.date.getTime() - prev.date.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const validDays = diffDays > 0 ? diffDays : 1;
            const dailyConsumption = consumption / validDays;

            console.log(`  Reading pair: ${prev.date.toISOString().split('T')[0]} (${prev.value}) -> ${current.date.toISOString().split('T')[0]} (${current.value})`);
            console.log(`  Diff: ${originalConsumption}, Adjusted: ${consumption}, Days: ${validDays}, Daily: ${dailyConsumption.toFixed(2)}`);

            for (let d = 0; d < validDays; d++) {
                const targetDate = new Date(prev.date);
                targetDate.setDate(targetDate.getDate() + d + 1);

                if (targetDate > current.date) break;

                const targetDateKey = targetDate.toISOString().split('T')[0];

                // Debug trend matching
                if (targetDate >= startOfTrend) {
                    const entry = dailyTrends.get(targetDateKey);
                    if (entry) {
                        if (meter.type === 'ELEC') entry.elec += dailyConsumption;
                        if (meter.type === 'WATER') entry.water += dailyConsumption;
                        if (meter.type === 'GAS') entry.gas += dailyConsumption;
                        // console.log(`    -> Added to ${targetDateKey}: ${dailyConsumption.toFixed(2)}`);
                    } else {
                        // console.log(`    -> Key ${targetDateKey} not in dailyTrends (Range: ${startOfTrend.toISOString().split('T')[0]} - ${now.toISOString().split('T')[0]})`);
                    }
                }
            }
        }
    }

    const trends = Array.from(dailyTrends.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    console.log("\nFinal Trends Sample (first 5):");
    console.log(trends.slice(0, 5));
    console.log("Trends with data:", trends.filter(t => t.elec > 0 || t.water > 0 || t.gas > 0).length);
}

debugEnergy()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
