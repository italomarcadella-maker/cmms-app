import { ProcessAnomaly } from '../entities/process-anomaly';

export interface IProcessAnomalyRepository {
    findById(id: string): Promise<ProcessAnomaly | null>;
    findUnresolved(): Promise<ProcessAnomaly[]>;
    save(anomaly: ProcessAnomaly): Promise<ProcessAnomaly>;
    delete(id: string): Promise<boolean>;
}
