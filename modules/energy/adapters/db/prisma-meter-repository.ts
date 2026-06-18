import { IMeterRepository } from '../../domain/ports/meter-repository';
import { Meter } from '../../domain/entities/meter';
import { MeterMapper } from './energy-mapper';
import { prisma } from '@/lib/prisma';

export class PrismaMeterRepository implements IMeterRepository {
    async findById(id: string): Promise<Meter | null> {
        const raw = await prisma.meter.findUnique({
            where: { id }
        });
        return raw ? MeterMapper.toDomain(raw) : null;
    }

    async findAll(): Promise<Meter[]> {
        const raws = await prisma.meter.findMany({
            orderBy: { name: 'asc' }
        });
        return raws.map(MeterMapper.toDomain);
    }

    async save(meter: Meter): Promise<Meter> {
        const prismaData = MeterMapper.toPrisma(meter);
        let saved;
        if (meter.id) {
            saved = await prisma.meter.update({
                where: { id: meter.id },
                data: prismaData as any
            });
        } else {
            saved = await prisma.meter.create({
                data: prismaData as any
            });
        }
        return MeterMapper.toDomain(saved);
    }

    async delete(id: string): Promise<boolean> {
        try {
            await prisma.meter.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            console.error(`Error deleting meter ${id}:`, error);
            return false;
        }
    }
}
