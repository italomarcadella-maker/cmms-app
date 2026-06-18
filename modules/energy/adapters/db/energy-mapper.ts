import { Meter as PrismaMeter, MeterReading as PrismaMeterReading } from '@prisma/client';
import { Meter } from '../../domain/entities/meter';
import { MeterReading } from '../../domain/entities/meter-reading';

export class MeterMapper {
    static toDomain(raw: PrismaMeter): Meter {
        return new Meter({
            id: raw.id,
            name: raw.name,
            type: raw.type,
            unit: raw.unit,
            serialNumber: raw.serialNumber,
            location: raw.location,
            installationDate: raw.installationDate
        });
    }

    static toPrisma(domain: Meter): Partial<PrismaMeter> {
        return {
            id: domain.id,
            name: domain.name,
            type: domain.type,
            unit: domain.unit,
            serialNumber: domain.serialNumber,
            location: domain.location,
            installationDate: domain.installationDate
        };
    }
}

export class MeterReadingMapper {
    static toDomain(raw: PrismaMeterReading): MeterReading {
        return new MeterReading({
            id: raw.id,
            meterId: raw.meterId,
            date: raw.date,
            value: raw.value,
            isAnomaly: raw.isAnomaly,
            aiAnalysis: raw.aiAnalysis,
            createdAt: raw.createdAt
        });
    }

    static toPrisma(domain: MeterReading): Partial<PrismaMeterReading> {
        return {
            id: domain.id,
            meterId: domain.meterId,
            date: domain.date,
            value: domain.value,
            isAnomaly: domain.isAnomaly,
            aiAnalysis: domain.aiAnalysis,
            createdAt: domain.createdAt
        };
    }
}
