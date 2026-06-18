import { WorkOrder } from '../entities/work-order';

export interface IWorkOrderRepository {
    findById(id: string): Promise<WorkOrder | null>;
    findAll(): Promise<WorkOrder[]>;
    save(workOrder: WorkOrder): Promise<WorkOrder>;
    delete(id: string): Promise<boolean>;
}
