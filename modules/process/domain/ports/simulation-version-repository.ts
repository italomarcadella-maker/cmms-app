// A simulation version is an immutable historical snapshot, not a mutable domain
// concept with invariants of its own — modeled as a plain record rather than a
// rich entity, distinct from the LineSimulation aggregate it snapshots.
export interface SimulationVersionRecord {
    id: string;
    simulationId: string;
    version: number;
    label: string;
    leanScore: number;
    lineEff: number;
    dataJson: any;
    createdAt: Date;
}

export interface CreateSimulationVersionInput {
    simulationId: string;
    label: string;
    leanScore: number;
    lineEff: number;
    dataJson: any;
}

export interface ISimulationVersionRepository {
    countBySimulationId(simulationId: string): Promise<number>;
    create(input: CreateSimulationVersionInput & { version: number }): Promise<SimulationVersionRecord>;
}
