import { ISimulationVersionRepository, CreateSimulationVersionInput, SimulationVersionRecord } from '../../domain/ports/simulation-version-repository';
import { prisma } from '@/lib/prisma';

export class PrismaSimulationVersionRepository implements ISimulationVersionRepository {
    async countBySimulationId(simulationId: string): Promise<number> {
        return prisma.lineSimulationVersion.count({ where: { simulationId } });
    }

    async create(input: CreateSimulationVersionInput & { version: number }): Promise<SimulationVersionRecord> {
        return prisma.lineSimulationVersion.create({
            data: {
                simulationId: input.simulationId,
                version: input.version,
                label: input.label,
                leanScore: input.leanScore,
                lineEff: input.lineEff,
                dataJson: input.dataJson,
            },
        });
    }
}
