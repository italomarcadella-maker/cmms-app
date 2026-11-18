import { IMeterReadingRepository, MeterReadingWithMeter } from '../../domain/ports/meter-reading-repository';
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

    async findRecentByMeterId(meterId: string, limit: number): Promise<MeterReading[]> {
        const raws = await prisma.meterReading.findMany({
            where: { meterId },
            orderBy: { date: 'desc' },
            take: limit
        });
        return raws.map(MeterReadingMapper.toDomain);
    }

    async findAll(): Promise<MeterReading[]> {
        const raws = await prisma.meterReading.findMany({
            orderBy: { date: 'desc' }
        });
        return raws.map(MeterReadingMapper.toDomain);
    }

    async findWithMeter(range?: { from?: Date; to?: Date }): Promise<MeterReadingWithMeter[]> {
        const date: { gte?: Date; lte?: Date } = {};
        if (range?.from) date.gte = range.from;
        if (range?.to) date.lte = range.to;

        const raws = await prisma.meterReading.findMany({
            where: Object.keys(date).length > 0 ? { date } : undefined,
            include: { meter: true },
            orderBy: { date: 'asc' }
        });

        return raws.map((r) => ({
            id: r.id,
            meterId: r.meterId,
            date: r.date,
            value: r.value,
            isAnomaly: r.isAnomaly,
            aiAnalysis: r.aiAnalysis,
            meter: {
                id: r.meter.id,
                name: r.meter.name,
                type: r.meter.type,
                unit: r.meter.unit,
                serialNumber: r.meter.serialNumber,
                location: r.meter.location,
            },
        }));
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
