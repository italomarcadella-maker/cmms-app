import { IScheduleRepository } from '../../domain/ports/schedule-repository';
import { PreventiveSchedule } from '../../domain/entities/preventive-schedule';
import { ScheduleMapper } from './schedule-mapper';
import { prisma } from '@/lib/prisma';

export class PrismaScheduleRepository implements IScheduleRepository {
    async findById(id: string): Promise<PreventiveSchedule | null> {
        const raw = await prisma.preventiveSchedule.findUnique({
            where: { id }
        });
        return raw ? ScheduleMapper.toDomain(raw) : null;
    }

    async findByAssetId(assetId: string): Promise<PreventiveSchedule[]> {
        const raws = await prisma.preventiveSchedule.findMany({
            where: { assetId }
        });
        return raws.map(ScheduleMapper.toDomain);
    }

    async findAll(): Promise<PreventiveSchedule[]> {
        const raws = await prisma.preventiveSchedule.findMany();
        return raws.map(ScheduleMapper.toDomain);
    }

    async save(schedule: PreventiveSchedule): Promise<PreventiveSchedule> {
        const prismaData = ScheduleMapper.toPrisma(schedule);
        let saved;
        if (schedule.id) {
            saved = await prisma.preventiveSchedule.update({
                where: { id: schedule.id },
                data: prismaData as any
            });
        } else {
            saved = await prisma.preventiveSchedule.create({
                data: prismaData as any
            });
        }
        return ScheduleMapper.toDomain(saved);
    }

    async delete(id: string): Promise<boolean> {
        try {
            await prisma.preventiveSchedule.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            console.error(`Error deleting schedule ${id}:`, error);
            return false;
        }
    }
}
