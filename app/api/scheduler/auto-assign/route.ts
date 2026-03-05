import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignWorkOrder } from "@/lib/actions";
import { addDays, startOfDay, isSameDay } from "date-fns";

export async function POST(request: Request) {
    try {
        // 1. Fetch unassigned work orders, ordered by priority (HIGH first) and creation date
        const unassignedWOs = await prisma.workOrder.findMany({
            where: {
                assignedTechnicianId: null,
                status: "OPEN"
            },
            orderBy: [
                { priority: "desc" },
                { createdAt: "asc" }
            ]
        });

        if (unassignedWOs.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: "Nessun ordine da assegnare." });
        }

        // 2. Fetch all technicians
        const technicians = await prisma.technician.findMany({
            include: {
                user: true
            }
        });

        if (technicians.length === 0) {
            return NextResponse.json({ success: false, message: "Nessun tecnico configurato nel sistema." });
        }

        // 3. Fetch technician availability for the next 7 days
        const today = startOfDay(new Date());
        const upToDate = addDays(today, 7);

        const availability = await prisma.technicianAvailability.findMany({
            where: {
                date: {
                    gte: today,
                    lte: upToDate
                }
            }
        });

        // 4. Fetch current workload (assigned WOs) for the next 7 days to balance the load
        const assignedWOs = await prisma.workOrder.findMany({
            where: {
                assignedTechnicianId: { not: null },
                status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
                dueDate: {
                    gte: today,
                    lte: upToDate
                }
            }
        });

        let assignedCount = 0;
        const errors: string[] = [];

        // 5. Auto-assign logic
        for (const wo of unassignedWOs) {
            let bestTechId: string | null = null;
            let bestDate: Date | null = null;
            let minLoad = Infinity;

            // Simple search: find the earliest day with the least loaded available technician
            for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
                const targetDate = addDays(today, dayOffset);

                // Shuffle technicians or just iterate. We iterate.
                for (const tech of technicians) {
                    // Check if tech is available on targetDate
                    const dayStatus = availability.find(
                        a => a.userId === tech.userId && isSameDay(new Date(a.date), targetDate)
                    );

                    const isUnavailable = dayStatus && dayStatus.status !== "AVAILABLE";
                    if (isUnavailable) continue;

                    // Calculate workload for this tech on this day
                    const currentLoad = assignedWOs.filter(
                        aWo => aWo.assignedTechnicianId === tech.id && aWo.dueDate && isSameDay(new Date(aWo.dueDate), targetDate)
                    ).length;

                    if (currentLoad < minLoad) {
                        minLoad = currentLoad;
                        bestTechId = tech.id;
                        bestDate = targetDate;
                    }
                }

                // If we found a suitable candidate on this day with less than 3 jobs, break early and assign
                if (bestTechId && minLoad < 3) {
                    break;
                }
            }

            if (bestTechId && bestDate) {
                // We found a slot
                try {
                    // We can reuse the existing assignWorkOrder logic which creates relationships and notifications
                    const res = await assignWorkOrder(wo.id, bestTechId, bestDate);
                    if (res.success) {
                        assignedCount++;
                        // Update our in-memory tracking of workload
                        assignedWOs.push({
                            id: wo.id,
                            assignedTechnicianId: bestTechId,
                            dueDate: bestDate,
                            status: "ASSIGNED"
                        } as any);
                    } else {
                        errors.push(`Errore assgnazione ${wo.id}: ${res.message}`);
                    }
                } catch (e: any) {
                    errors.push(`Errore critico assegnazione ${wo.id}: ${e.message}`);
                }
            } else {
                errors.push(`Nessuno slot trovato per ${wo.id}`);
            }
        }

        return NextResponse.json({
            success: true,
            count: assignedCount,
            total: unassignedWOs.length,
            errors: errors.length > 0 ? errors : undefined,
            message: `Pianificati ${assignedCount} su ${unassignedWOs.length} ordini.`
        });

    } catch (error: any) {
        console.error("Auto-Assign Fatal Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
