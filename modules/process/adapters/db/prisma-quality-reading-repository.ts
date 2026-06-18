import { IQualityReadingRepository } from '../../domain/ports/quality-reading-repository';
import { QualityReading } from '../../domain/entities/quality-reading';
import { QualityReadingMapper } from './process-mapper';
import { prisma } from '@/lib/prisma';

export class PrismaQualityReadingRepository implements IQualityReadingRepository {
    async findByRecipeId(recipeId: string): Promise<QualityReading[]> {
        const raws = await prisma.qualityReading.findMany({
            where: { recipeId },
            orderBy: { timestamp: 'desc' }
        });
        return raws.map(QualityReadingMapper.toDomain);
    }

    async save(reading: QualityReading): Promise<QualityReading> {
        const prismaData = QualityReadingMapper.toPrisma(reading);
        let saved;
        if (reading.id) {
            saved = await prisma.qualityReading.update({
                where: { id: reading.id },
                data: prismaData as any
            });
        } else {
            saved = await prisma.qualityReading.create({
                data: prismaData as any
            });
        }
        return QualityReadingMapper.toDomain(saved);
    }
}
