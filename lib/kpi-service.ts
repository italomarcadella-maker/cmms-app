import { prisma } from "@/lib/prisma";
import { differenceInMinutes, eachDayOfInterval, format, getDay, isWithinInterval, parse, startOfDay, endOfDay } from "date-fns";

interface ReliabilityMetrics {
    periodStart: Date;
    periodEnd: Date;
    totalScheduledTimeMinutes: number; // TPT
    totalDowntimeMinutes: number;      // TDT
    realOperatingTimeMinutes: number;  // ROT = TPT - TDT
    numberOfFailures: number;          // N
    mtbf: number;                      // Hours
    mttr: number;                      // Hours
    availability: number;              // %
}

export async function calculateLineReliability(
    lineName: string,
    startDate: Date,
    endDate: Date
): Promise<ReliabilityMetrics> {

    // 1. Get Line Schedule Configuration
    const lineConfig = await prisma.productionLine.findUnique({
        where: { line: lineName }
    });

    if (!lineConfig) {
        throw new Error(`Configurazione linea '${lineName}' non trovata.`);
    }

    // 2. Calculate Theoretical Production Time (TPT)
    let totalScheduledMinutes = 0;
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    days.forEach(day => {
        const d = getDay(day); // 0=Sun, 1=Mon...
        let startStr = "";
        let endStr = "";
        let isProduction = false;

        // Apply Logic: 
        // Standard Mon-Fri (or configured range)
        if (d >= lineConfig.prodStartDay && d <= lineConfig.prodEndDay) {
            startStr = lineConfig.prodStartTime;
            endStr = lineConfig.prodEndTime;
            isProduction = true;
        }

        // Note: Currently we don't have separate "Production Weekend Override" fields in schema, 
        // only Maintenance overrides. Assuming Production is strictly defined by startDay/endDay for now 
        // or we treat the whole block as standard.
        // If the user sets '3 Shifts' (Mon-Fri 00:00-23:59), that covers 24h.

        if (isProduction) {
            const dateStr = format(day, 'yyyy-MM-dd');
            const start = parse(`${dateStr} ${startStr}`, 'yyyy-MM-dd HH:mm', new Date());
            const end = parse(`${dateStr} ${endStr}`, 'yyyy-MM-dd HH:mm', new Date());

            // Handle overnight shifts if needed (end < start) -> add 1 day? 
            // For now assuming daily blocks as per UI (06:00-22:00 same day).
            if (end < start) {
                // If end is smaller, it likely means next day, but our current logic is per-day.
                // The current UI inputs imply daily start/end. 23:59 is max.
            }

            const minutes = differenceInMinutes(end, start);
            if (minutes > 0) totalScheduledMinutes += minutes;
        }
    });

    // 3. Fetch Failures (WorkOrders with EWO and STOPPAGE)
    // Find assets on this line first
    const assets = await prisma.asset.findMany({
        where: { line: lineName },
        select: { id: true }
    });
    const assetIds = assets.map(a => a.id);

    const failures = await prisma.workOrder.findMany({
        where: {
            assetId: { in: assetIds },
            createdAt: { gte: startDate, lte: endDate }, // Filter by period
            type: 'FAULT', // Only faults
            ewoFilled: true, // Only if EWO is filled (where we have downtime data)
            ewo: {
                productionImpact: 'STOPPAGE' // Only line stoppages count for MTBF generally
            }
        },
        include: {
            ewo: true
        }
    });

    // 4. Calculate Total Downtime
    let totalDowntimeMinutes = 0;
    const numberOfFailures = failures.length;

    failures.forEach(f => {
        if (f.ewo?.totalDowntimeMin) {
            totalDowntimeMinutes += f.ewo.totalDowntimeMin;
        }
    });

    // 5. Compute Metrics
    const realOperatingTimeMinutes = Math.max(0, totalScheduledMinutes - totalDowntimeMinutes);

    // MTBF = Operating Time / Failures
    const mtbf = numberOfFailures > 0
        ? (realOperatingTimeMinutes / 60) / numberOfFailures
        : (realOperatingTimeMinutes / 60); // If 0 failures, MTBF is technically infinite or equal to uptime

    // MTTR = Total Downtime / Failures
    const mttr = numberOfFailures > 0
        ? (totalDowntimeMinutes / 60) / numberOfFailures
        : 0;

    // Availability = ROT / TPT
    const availability = totalScheduledMinutes > 0
        ? (realOperatingTimeMinutes / totalScheduledMinutes) * 100
        : 100;

    return {
        periodStart: startDate,
        periodEnd: endDate,
        totalScheduledTimeMinutes: totalScheduledMinutes,
        totalDowntimeMinutes,
        realOperatingTimeMinutes,
        numberOfFailures,
        mtbf: parseFloat(mtbf.toFixed(2)),
        mttr: parseFloat(mttr.toFixed(2)),
        availability: parseFloat(availability.toFixed(2))
    };
}
