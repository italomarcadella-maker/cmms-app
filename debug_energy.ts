
import { getEnergyStats } from './lib/actions';
import { prisma } from './lib/prisma';

async function main() {
    console.log("--- DEBUGGING ENERGY STATS ---");
    try {
        const stats = await getEnergyStats();
        console.log("Current Month:", stats.currentMonth);
        console.log("Last Month:", stats.lastMonth);
        console.log("Trends Count:", stats.trends.length);
        if (stats.trends.length > 0) {
            console.log("First Trend:", stats.trends[0]);
            console.log("Last Trend:", stats.trends[stats.trends.length - 1]);
        }

        console.log("Meters Count:", stats.meters.length);
        if (stats.meters.length > 0) {
            const mId = stats.meters[0].id;
            console.log(`History for meter ${mId}:`, stats.meterHistory[mId]?.length || 0);
            if (stats.meterHistory[mId]?.length > 0) {
                console.log(`Sample history item:`, stats.meterHistory[mId][0]);
            }
        }
    } catch (e) {
        console.error("Error fetching stats:", e);
    }
}

main();
