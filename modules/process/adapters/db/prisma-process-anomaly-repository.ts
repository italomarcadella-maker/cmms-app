import { IProcessAnomalyRepository } from '../../domain/ports/process-anomaly-repository';
import { ProcessAnomaly } from '../../domain/entities/process-anomaly';
import { ProcessAnomalyMapper } from './process-mapper';
import { prisma } from '@/lib/prisma';

export class PrismaProcessAnomalyRepository implements IProcessAnomalyRepository {
    async findById(id: string): Promise<ProcessAnomaly | null> {
        const raw = await prisma.processAnomaly.findUnique({
            where: { id }
        });
        return raw ? ProcessAnomalyMapper.toDomain(raw) : null;
    }

    async findUnresolved(): Promise<ProcessAnomaly[]> {
        const raws = await prisma.processAnomaly.findMany({
            where: { isResolved: false },
            orderBy: { detectedAt: 'desc' }
        });
        return raws.map(ProcessAnomalyMapper.toDomain);
    }

    async save(anomaly: ProcessAnomaly): Promise<ProcessAnomaly> {
        const prismaData = ProcessAnomalyMapper.toPrisma(anomaly);
        let saved;
        if (anomaly.id) {
            saved = await prisma.processAnomaly.update({
                where: { id: anomaly.id },
                data: prismaData as any
            });
        } else {
            saved = await prisma.processAnomaly.create({
                data: prismaData as any
            });
        }
        return ProcessAnomalyMapper.toDomain(saved);
    }

    async delete(id: string): Promise<boolean> {
        try {
            await prisma.processAnomaly.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            console.error(`Error deleting anomaly ${id}:`, error);
            return false;
        }
    }
}
