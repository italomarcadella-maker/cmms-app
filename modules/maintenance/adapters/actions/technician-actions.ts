'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ServiceLocator } from '@/modules/shared/infrastructure/registry/service-locator';
import { PrismaTechnicianRepository } from '../db/prisma-technician-repository';
import { Technician } from '../../domain/entities/technician';

// Register dependencies if not registered
try {
    ServiceLocator.resolve('ITechnicianRepository');
} catch {
    ServiceLocator.register('ITechnicianRepository', new PrismaTechnicianRepository());
}

const getTechRepo = () => ServiceLocator.resolve<PrismaTechnicianRepository>('ITechnicianRepository');

export async function addTechnician(data: { name: string; specialty: string; hourlyRate: number; email: string }) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') return { success: false, message: 'Non autorizzato' };

    try {
        // Find User
        const user = await prisma.user.findUnique({ where: { email: data.email } });
        if (!user) {
            return { success: false, message: 'Utente non trovato. Devi prima creare un account Utente con questa email.' };
        }

        // Check if user is already a technician
        const techRepo = getTechRepo();
        const existingTech = await techRepo.findByUserId(user.id);
        if (existingTech) {
            return { success: false, message: 'Questo utente è già un tecnico.' };
        }

        const techEntity = new Technician({
            name: data.name,
            specialty: data.specialty,
            hourlyRate: data.hourlyRate,
            userId: user.id
        });

        const newTech = await techRepo.save(techEntity);

        revalidatePath('/settings');
        return { success: true, message: 'Tecnico aggiunto e collegato all\'utente.', data: newTech.toJSON() };
    } catch (error) {
        console.error("Add Technician Error:", error);
        return { success: false, message: 'Errore aggiunta tecnico: ' + (error as any).message };
    }
}

export async function deleteTechnician(id: string) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') return { success: false, message: 'Non autorizzato' };
    try {
        const techRepo = getTechRepo();
        await techRepo.delete(id);
        return { success: true, message: 'Tecnico eliminato' };
    } catch (error) {
        return { success: false, message: 'Errore eliminazione' };
    }
}

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

export async function setTechnicianStatus(userId: string, date: Date, status: string, shift?: string, notes?: string) {
    try {
        const normalizedDate = new Date(date);
        normalizedDate.setHours(0, 0, 0, 0);

        const record = await prisma.technicianAvailability.upsert({
            where: {
                userId_date: {
                    userId,
                    date: normalizedDate
                }
            },
            update: {
                status,
                shift: shift || null,
                notes
            } as any,
            create: {
                userId,
                date: normalizedDate,
                status,
                shift: shift || null,
                notes
            } as any
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
                    in: ["MAINTAINER", "SUPERVISOR"]
                }
            },
            select: {
                id: true,
                name: true,
                role: true,
                image: true,
                email: true,
                technicianProfile: {
                    select: {
                        id: true
                    }
                }
            }
        });
        return technicians;
    } catch (error) {
        console.error("[getAllTechnicians] Error:", error);
        throw new Error("Failed to fetch technicians: " + (error instanceof Error ? error.message : String(error)));
    }
}

export async function checkTechnicianAvailabilityForDate(userId: string, date: Date) {
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
