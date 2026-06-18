'use server';

import { requireRole, revalidateWorkOrders } from '@/lib/actions';
import { revalidatePath } from 'next/cache';
import { ServiceLocator } from '@/modules/shared/infrastructure/registry/service-locator';
import { PrismaScheduleRepository } from '../db/prisma-schedule-repository';
import { PrismaWorkOrderRepository } from '../db/prisma-work-order-repository';
import { PreventiveSchedule } from '../../domain/entities/preventive-schedule';
import { WorkOrder } from '../../domain/entities/work-order';
import { auth } from '@/auth';
import { assignWorkOrder } from './work-order-actions';
import { prisma } from '@/lib/prisma';

try {
    ServiceLocator.resolve('IScheduleRepository');
} catch {
    ServiceLocator.register('IScheduleRepository', new PrismaScheduleRepository());
}
try {
    ServiceLocator.resolve('IWorkOrderRepository');
} catch {
    ServiceLocator.register('IWorkOrderRepository', new PrismaWorkOrderRepository());
}

const getSchedRepo = () => ServiceLocator.resolve<PrismaScheduleRepository>('IScheduleRepository');
const getWORepo = () => ServiceLocator.resolve<PrismaWorkOrderRepository>('IWorkOrderRepository');

export async function createWorkOrderFromSchedule(scheduleId: string, date: Date, technicianId?: string) {
    try {
        const schedRepo = getSchedRepo();
        const woRepo = getWORepo();

        const schedule = await schedRepo.findById(scheduleId);
        if (!schedule) return { success: false, message: "Schedulazione non trovata" };

        let checklistCreate: any[] = [];
        try {
            const activities = schedule.activities ? JSON.parse(schedule.activities) : [];
            if (Array.isArray(activities)) {
                checklistCreate = activities.map((a: any) => ({
                    label: typeof a === 'string' ? a : a.label || "Attività",
                    completed: false
                }));
            }
        } catch (e) {
            console.error("Error parsing schedule activities", e);
        }

        const newWo = await prisma.workOrder.create({
            data: {
                title: schedule.taskTitle,
                description: schedule.description,
                assetId: schedule.assetId,
                priority: 'MEDIUM',
                category: 'OTHER',
                status: 'OPEN',
                assignedTo: 'Unassigned',
                dueDate: date,
                checklist: {
                    create: checklistCreate
                }
            }
        });

        // Run the schedule instance to update nextDueDate
        const schedEntity = new PreventiveSchedule(schedule.toJSON());
        schedEntity.run(new Date());
        await schedRepo.save(schedEntity);

        if (technicianId) {
            await assignWorkOrder(newWo.id, technicianId, date);
        }

        revalidatePath('/planning/calendar');
        revalidateWorkOrders();
        return { success: true, message: "Ordine creato da schedulazione" };
    } catch (error) {
        console.error("Error creating WO from Schedule:", error);
        return { success: false, message: "Errore creazione ordine" };
    }
}

export async function getPreventiveSchedules() {
    const session = await auth();
    if (!session?.user) return [];
    try {
        const prismaSchedules = await prisma.preventiveSchedule.findMany({
            include: { asset: { select: { name: true, line: true } } },
            orderBy: { nextDueDate: 'asc' }
        });
        return prismaSchedules.map(s => ({
            ...s,
            assetName: s.asset.name,
            assetLine: s.asset.line,
            activities: s.activities ? JSON.parse(s.activities) : [],
            lastRunDate: s.lastRunDate ? s.lastRunDate.toISOString() : null,
            nextDueDate: s.nextDueDate.toISOString()
        }));
    } catch (error) {
        return [];
    }
}

export async function getAssetSchedules(assetId: string) {
    try {
        const prismaSchedules = await prisma.preventiveSchedule.findMany({
            where: { assetId },
            include: { asset: { select: { name: true, line: true } } },
            orderBy: { nextDueDate: 'asc' }
        });
        return prismaSchedules.map(s => ({
            ...s,
            assetName: s.asset.name,
            assetLine: s.asset.line,
            activities: s.activities ? JSON.parse(s.activities) : [],
            lastRunDate: s.lastRunDate ? s.lastRunDate.toISOString() : null,
            nextDueDate: s.nextDueDate.toISOString()
        }));
    } catch (error) {
        return [];
    }
}

export async function createPreventiveSchedule(data: {
    title: string;
    description: string;
    assetId: string;
    frequency: string;
    frequencyDays: number;
    activities: any[];
    firstDate: Date;
}) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return { success: false, message: 'Non autorizzato' };
    }

    try {
        const schedRepo = getSchedRepo();
        const schedule = new PreventiveSchedule({
            taskTitle: data.title,
            description: data.description,
            assetId: data.assetId,
            frequency: data.frequency,
            frequencyDays: data.frequencyDays,
            activities: JSON.stringify(data.activities),
            nextDueDate: new Date(data.firstDate)
        });
        await schedRepo.save(schedule);
        revalidatePath('/maintenance/schedule');
        return { success: true, message: 'Schedulazione creata con successo' };
    } catch (error) {
        console.error("Create Sched Error:", error);
        return { success: false, message: 'Errore creazione schedulazione' };
    }
}

export async function deletePreventiveSchedule(id: string) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') return { success: false, message: 'Non autorizzato' };
    try {
        const schedRepo = getSchedRepo();
        await schedRepo.delete(id);
        revalidatePath('/maintenance/schedule');
        return { success: true, message: 'Schedulazione eliminata con successo' };
    } catch (error) {
        return { success: false, message: 'Errore eliminazione' };
    }
}

export async function updatePreventiveSchedule(id: string, nextDueDate: Date) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') return { success: false, message: 'Non autorizzato' };

    try {
        const schedRepo = getSchedRepo();
        const schedule = await schedRepo.findById(id);
        if (!schedule) return { success: false, message: "Schedulazione non trovata" };

        const updated = new PreventiveSchedule({
            ...schedule.toJSON(),
            nextDueDate
        });
        await schedRepo.save(updated);

        revalidatePath('/maintenance/schedule');
        revalidatePath('/maintenance');
        return { success: true, message: 'Data aggiornata' };
    } catch (error) {
        return { success: false, message: 'Errore aggiornamento data' };
    }
}
