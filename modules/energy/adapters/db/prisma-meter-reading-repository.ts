import { IMeterReadingRepository } from '../../domain/ports/meter-reading-repository';
import { MeterReading } from '../../domain/entities/meter-reading';
import { MeterReadingMapper } from './energy-mapper';
import { prisma } from '@/lib/prisma';

export class PrismaMeterReadingRepository implements IMeterReadingRepository {
    async findById(id: string): Promise<MeterReading | null> {
        const raw = await prisma.meterReading.findUnique({
            where: { id }
        });
        return raw ? MeterReadingMapper.toDomain(raw) : null;
    }

    async findByMeterId(meterId: string): Promise<MeterReading[]> {
        const raws = await prisma.meterReading.findMany({
            where: { meterId },
            orderBy: { date: 'desc' }
        });
        return raws.map(MeterReadingMapper.toDomain);
    }

    async findAll(): Promise<MeterReading[]> {
        const raws = await prisma.meterReading.findMany({
            orderBy: { date: 'desc' }
        });
        return raws.map(MeterReadingMapper.toDomain);
    }

    async save(reading: MeterReading): Promise<MeterReading> {
        const prismaData = MeterReadingMapper.toPrisma(reading);
        let saved;
        if (reading.id) {
            saved = await prisma.meterReading.update({
                where: { id: reading.id },
                data: prismaData as any
            });
        } else {
            saved = await prisma.meterReading.create({
                data: prismaData as any
            });
        }
        return MeterReadingMapper.toDomain(saved);
    }

    async delete(id: string): Promise<boolean> {
        try {
            await prisma.meterReading.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            console.error(`Error deleting meter reading ${id}:`, error);
            return false;
        }
    }
}
