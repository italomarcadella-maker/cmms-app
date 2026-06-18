import { PreventiveSchedule as PrismaSchedule } from '@prisma/client';
import { PreventiveSchedule } from '../../domain/entities/preventive-schedule';

export class ScheduleMapper {
    public static toDomain(prismaSchedule: PrismaSchedule): PreventiveSchedule {
        return new PreventiveSchedule({
            id: prismaSchedule.id,
            taskTitle: prismaSchedule.taskTitle,
            description: prismaSchedule.description,
            frequency: prismaSchedule.frequency,
            frequencyDays: prismaSchedule.frequencyDays,
            activities: prismaSchedule.activities,
            lastRunDate: prismaSchedule.lastRunDate,
            nextDueDate: prismaSchedule.nextDueDate,
            assignedToId: prismaSchedule.assignedToId,
            assetId: prismaSchedule.assetId
        });
    }

    public static toPrisma(domainSchedule: PreventiveSchedule): Omit<PrismaSchedule, 'createdAt' | 'updatedAt'> {
        const prismaData: any = {
            taskTitle: domainSchedule.taskTitle,
            description: domainSchedule.description,
            frequency: domainSchedule.frequency,
            frequencyDays: domainSchedule.frequencyDays,
            activities: domainSchedule.activities,
            lastRunDate: domainSchedule.lastRunDate || null,
            nextDueDate: domainSchedule.nextDueDate,
            assignedToId: domainSchedule.assignedToId || null,
            assetId: domainSchedule.assetId
        };

        if (domainSchedule.id) {
            prismaData.id = domainSchedule.id;
        }

        return prismaData;
    }
}
