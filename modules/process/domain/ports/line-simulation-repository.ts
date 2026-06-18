import { LineSimulation } from '../entities/line-simulation';

export interface ILineSimulationRepository {
    findById(id: string): Promise<LineSimulation | null>;
    findAll(): Promise<LineSimulation[]>;
    save(simulation: LineSimulation): Promise<LineSimulation>;
    delete(id: string): Promise<boolean>;
}
