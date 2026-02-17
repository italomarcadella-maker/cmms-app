
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEnergyData() {
    console.log("Checking Energy Data...");

    try {
        const meters = await prisma.meter.findMany();
        console.log(`Found ${meters.length} meters.`);

        for (const meter of meters) {
            console.log(`\nMeter: ${meter.name} (${meter.type})`);
            const readings = await prisma.meterReading.findMany({
                where: { meterId: meter.id },
                orderBy: { date: 'desc' },
                take: 10
            });

            if (readings.length === 0) {
                console.log("  No readings found.");
                continue;
            }

            console.log("  Last 10 readings:");
            for (let i = 0; i < readings.length; i++) {
                const r = readings[i];
                let diff = 0;
                if (i < readings.length - 1) {
                    diff = r.value - readings[i+1].value;
                }
                console.log(`    Date: ${r.date.toISOString().split('T')[0]}, Value: ${r.value}, Diff from prev: ${diff.toFixed(2)}`);
            }
        }

    } catch (error) {
        console.error("Error checking data:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkEnergyData();
