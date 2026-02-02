
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";

export async function checkAndGeneratePreventiveWorkOrders() {
    try {
        const today = new Date();

        // 1. Find all schedules due
        const dueSchedules = await prisma.preventiveSchedule.findMany({
            where: {
                nextDueDate: {
                    lte: today,
                },
            },
            take: 50, // Batch limit to prevent timeouts
            include: {
                asset: true,
            },
        });

        if (dueSchedules.length === 0) {
            return { success: true, count: 0, message: "No schedules due." };
        }

        let generatedCount = 0;
        const errors: string[] = [];

        // 2. Process each schedule
        for (const schedule of dueSchedules) {
            try {
                await prisma.$transaction(async (tx) => {
                    // Create Work Order
                    await tx.workOrder.create({
                        data: {
                            title: `[AUTO] ${schedule.taskTitle}`,
                            description: `${schedule.description}\n\nGenerated from Preventive Schedule: ${schedule.frequency}`,
                            priority: "MEDIUM", // Default for routine
                            type: "ROUTINE",
                            category: "PREVENTIVE",
                            status: "OPEN",
                            assetId: schedule.assetId,
                            dueDate: addDays(today, 7), // Give 1 week to complete by default
                            originScheduleId: schedule.id,
                        },
                    });

                    // Calculate next due date
                    // If frequencyDays is 0 or null, default to 30 to avoid infinite loops if data is bad
                    const daysToAdd = schedule.frequencyDays > 0 ? schedule.frequencyDays : 30;
                    const nextDate = addDays(today, daysToAdd);

                    // Update Schedule
                    await tx.preventiveSchedule.update({
                        where: { id: schedule.id },
                        data: {
                            lastRunDate: today,
                            nextDueDate: nextDate,
                        },
                    });
                });
                generatedCount++;
            } catch (err: any) {
                console.error(`Error processing schedule ${schedule.id}:`, err);
                errors.push(`Schedule ${schedule.id}: ${err.message}`);
            }
        }

        return {
            success: true,
            count: generatedCount,
            errors: errors.length > 0 ? errors : undefined,
        };

    } catch (error: any) {
        console.error("Scheduler Fatal Error:", error);
        return { success: false, error: error.message };
    }
}
