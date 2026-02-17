
// import { getEnergyStats } from "@/lib/actions"; // This will be hard to mock prisma
// Instead I will extract the logic to a pure function if possible? 
// Or I create a script that mocks the data array and runs the logic.

// Code content of the script `repro_energy_logic.ts`
const calculateStats = (readings: any[], meters: any[]) => {
    // Copy-paste logic from actions.ts for testing
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfTrend = new Date();
    startOfTrend.setDate(startOfTrend.getDate() - 30);

    const totals = {
        currentMonth: { ELEC: 0, WATER: 0, GAS: 0 },
        lastMonth: { ELEC: 0, WATER: 0, GAS: 0 }
    };

    // ... (rest of logic) ...
    // I will inline the logic here to verify it.

    const dailyTrends = new Map<string, { date: string, elec: number, water: number, gas: number }>();
    for (let d = 0; d <= 30; d++) {
        const date = new Date(startOfTrend);
        date.setDate(date.getDate() + d);
        const key = date.toISOString().split('T')[0];
        dailyTrends.set(key, { date: key, elec: 0, water: 0, gas: 0 });
    }

    for (const meter of meters) {
        const meterReadings = readings.filter(r => r.meterId === meter.id).sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

        for (let i = 1; i < meterReadings.length; i++) {
            const current = meterReadings[i];
            const prev = meterReadings[i - 1];

            // Calculate consumption (Delta)
            let consumption = current.value - prev.value;

            // Heuristic: Ignore "Initial Reading" jump (from 0 to X) or massive resets
            if (prev.value === 0 || consumption > 50000 || consumption < 0) {
                consumption = 0;
            }

            const diffTime = Math.abs(current.date.getTime() - prev.date.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const validDays = diffDays > 0 ? diffDays : 1;
            const dailyConsumption = consumption / validDays;

            for (let d = 0; d < validDays; d++) {
                const targetDate = new Date(prev.date);
                targetDate.setDate(targetDate.getDate() + d + 1);

                if (targetDate > current.date) break;

                const targetDateKey = targetDate.toISOString().split('T')[0];

                if (targetDate >= currentMonthStart && targetDate <= now) {
                    if (totals.currentMonth[meter.type as keyof typeof totals.currentMonth] !== undefined) {
                        totals.currentMonth[meter.type as keyof typeof totals.currentMonth] += dailyConsumption;
                    }
                }
            }
        }
    }
    return totals;
}

// Test Data
const meters = [{ id: 'm1', type: 'ELEC' }];
const now = new Date();
const today = new Date(now);
const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);

// Scenario: Normal Usage
const readings1 = [
    { meterId: 'm1', date: monthAgo, value: 1000 },
    { meterId: 'm1', date: today, value: 1100 }
];
// Delta = 100. Days = 30. Daily = 3.33.

// Scenario: "Last Reading" Bug?
// Reading 1: 1000. Reading 2: 1100. 
// If result is 1100 -> BUG.
// If result is ~3.33 * 17 (days in Feb) -> OK.

console.log("Normal Scenario:", JSON.stringify(calculateStats(readings1, meters), null, 2));

const readingsBug = [
    { meterId: 'm1', date: monthAgo, value: 0 },
    { meterId: 'm1', date: today, value: 186000 }
];
console.log("Bug Scenario (Should be 0):", JSON.stringify(calculateStats(readingsBug, meters), null, 2));

