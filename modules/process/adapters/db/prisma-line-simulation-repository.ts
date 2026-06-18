import { ILineSimulationRepository } from '../../domain/ports/line-simulation-repository';
import { LineSimulation } from '../../domain/entities/line-simulation';
import { LineSimulationMapper } from './process-mapper';
import { prisma } from '@/lib/prisma';

export class PrismaLineSimulationRepository implements ILineSimulationRepository {
    async findById(id: string): Promise<LineSimulation | null> {
        const raw = await prisma.lineSimulation.findUnique({
            where: { id }
        });
        return raw ? LineSimulationMapper.toDomain(raw) : null;
    }

    async findAll(): Promise<LineSimulation[]> {
        const raws = await prisma.lineSimulation.findMany({
            orderBy: { updatedAt: 'desc' }
        });
        return raws.map(LineSimulationMapper.toDomain);
    }

    async save(simulation: LineSimulation): Promise<LineSimulation> {
        const prismaData = LineSimulationMapper.toPrisma(simulation);
        let saved;
        if (simulation.id) {
            saved = await prisma.lineSimulation.update({
                where: { id: simulation.id },
                data: prismaData as any
            });
        } else {
            saved = await prisma.lineSimulation.create({
                data: prismaData as any
            });
        }
        return LineSimulationMapper.toDomain(saved);
    }

    async delete(id: string): Promise<boolean> {
        try {
            await prisma.lineSimulation.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            console.error(`Error deleting line simulation ${id}:`, error);
            return false;
        }
    }
}
