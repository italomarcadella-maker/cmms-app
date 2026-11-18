import { IAssetRepository } from '../ports/asset-repository';
import { IWorkOrderRepository } from '../ports/work-order-repository';
import { IScheduleRepository } from '../ports/schedule-repository';

export interface DeleteAssetResult {
    success: boolean;
    message: string;
}

/**
 * An asset can't be deleted while work orders or preventive schedules still
 * reference it — that would either cascade-delete maintenance history or leave
 * orphaned records, depending on the FK. Archiving is the supported alternative.
 */
export const makeDeleteAsset = (
    assetRepo: IAssetRepository,
    workOrderRepo: IWorkOrderRepository,
    scheduleRepo: IScheduleRepository
) => {
    return async (assetId: string): Promise<DeleteAssetResult> => {
        const woCount = await workOrderRepo.countByAssetId(assetId);
        if (woCount > 0) {
            return { success: false, message: `Impossibile eliminare: L'asset ha ${woCount} ordini di lavoro associati. Archivia l'asset invece.` };
        }

        const schedules = await scheduleRepo.findByAssetId(assetId);
        if (schedules.length > 0) {
            return { success: false, message: `Impossibile eliminare: L'asset ha ${schedules.length} manutenzioni programmate.` };
        }

        await assetRepo.delete(assetId);
        return { success: true, message: 'Asset eliminato con successo' };
    };
};
