import { WorkOrder } from '../entities/work-order';

export interface IWorkOrderRepository {
    findById(id: string): Promise<WorkOrder | null>;
    findAll(): Promise<WorkOrder[]>;
    countByAssetId(assetId: string): Promise<number>;
    save(workOrder: WorkOrder): Promise<WorkOrder>;
    delete(id: string): Promise<boolean>;
}
