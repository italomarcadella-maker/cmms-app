import { PreventiveSchedule } from '../entities/preventive-schedule';

export interface IScheduleRepository {
    findById(id: string): Promise<PreventiveSchedule | null>;
    findByAssetId(assetId: string): Promise<PreventiveSchedule[]>;
    findAll(): Promise<PreventiveSchedule[]>;
    save(schedule: PreventiveSchedule): Promise<PreventiveSchedule>;
    delete(id: string): Promise<boolean>;
}
