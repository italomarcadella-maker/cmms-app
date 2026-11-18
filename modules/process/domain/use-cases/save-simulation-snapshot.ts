import { LineSimulation } from '../entities/line-simulation';
import { ILineSimulationRepository } from '../ports/line-simulation-repository';
import { ISimulationVersionRepository, SimulationVersionRecord } from '../ports/simulation-version-repository';

export interface SaveSimulationSnapshotDTO {
    simulationId: string;
    label: string;
    leanScore: number;
    lineEff: number;
    dataJson: any;
}

/**
 * Snapshots the current simulation state into a new version (auto-numbered
 * from the existing count) and carries the new score/efficiency/data forward
 * onto the parent simulation, so both stay in sync.
 */
export const makeSaveSimulationSnapshot = (
    simulationRepo: ILineSimulationRepository,
    versionRepo: ISimulationVersionRepository
) => {
    return async (dto: SaveSimulationSnapshotDTO): Promise<SimulationVersionRecord> => {
        const currentCount = await versionRepo.countBySimulationId(dto.simulationId);

        const snapshot = await versionRepo.create({
            simulationId: dto.simulationId,
            version: currentCount + 1,
            label: dto.label,
            leanScore: dto.leanScore,
            lineEff: dto.lineEff,
            dataJson: dto.dataJson,
        });

        const simulation = await simulationRepo.findById(dto.simulationId);
        if (simulation) {
            const updated = new LineSimulation({
                ...simulation.toJSON(),
                leanScore: dto.leanScore,
                lineEff: dto.lineEff,
                dataJson: dto.dataJson,
            });
            await simulationRepo.save(updated);
        }

        return snapshot;
    };
};
