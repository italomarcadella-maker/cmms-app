"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getTechnicianAvailability(startDate: Date, endDate: Date) {
    try {
        const availability = await prisma.technicianAvailability.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                user: {
                    select: {
                        name: true,
                        role: true
                    }
                }
            }
        });
        return availability;
    } catch (error) {
        console.error("[getTechnicianAvailability] Error:", error);
        throw new Error("Failed to fetch availability: " + (error instanceof Error ? error.message : String(error)));
    }
}

export async function setTechnicianStatus(userId: string, date: Date, status: string, notes?: string) {
    try {
        // Normalize date to start of day to avoid time mismatch
        const normalizedDate = new Date(date);
        normalizedDate.setHours(0, 0, 0, 0);

        // Upsert: Create if not exists, Update if exists
        const record = await prisma.technicianAvailability.upsert({
            where: {
                userId_date: {
                    userId,
                    date: normalizedDate
                }
            },
            update: {
                status,
                notes
            },
            create: {
                userId,
                date: normalizedDate,
                status,
                notes
            }
        });

        revalidatePath("/technicians/calendar");
        return record;
    } catch (error) {
        console.error("[setTechnicianStatus] Error:", error);
        throw new Error("Failed to set technician status: " + (error instanceof Error ? error.message : String(error)));
    }
}

export async function getAllTechnicians() {
    try {
        const technicians = await prisma.user.findMany({
            where: {
                role: {
                    in: ["MAINTAINER", "SUPERVISOR", "ADMIN"]
                }
            },
            select: {
                id: true,
                name: true,
                role: true,
                image: true,
                email: true
            }
        });
        return technicians;
    } catch (error) {
        console.error("[getAllTechnicians] Error:", error);
        throw new Error("Failed to fetch technicians: " + (error instanceof Error ? error.message : String(error)));
    }
}

export async function checkTechnicianAvailabilityForDate(userId: string, date: Date) {
    // Normalize date
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const availability = await prisma.technicianAvailability.findUnique({
        where: {
            userId_date: {
                userId,
                date: normalizedDate
            }
        }
    });

    if (!availability || availability.status === 'AVAILABLE') {
        return { available: true };
    }

    return {
        available: false,
        status: availability.status,
        notes: availability.notes
    };
}
