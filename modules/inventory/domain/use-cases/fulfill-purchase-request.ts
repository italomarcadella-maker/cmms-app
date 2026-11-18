import { IPurchaseRequestRepository } from '../ports/purchase-request-repository';
import { ISparePartRepository } from '../ports/spare-part-repository';

export interface FulfillPurchaseRequestResult {
    success: boolean;
    message: string;
}

/**
 * Marks a purchase request as received and credits the ordered quantity back
 * into stock. Refuses to double-process a request already marked RECEIVED,
 * since that would double-count the stock adjustment.
 */
export const makeFulfillPurchaseRequest = (requestRepo: IPurchaseRequestRepository, partRepo: ISparePartRepository) => {
    return async (requestId: string): Promise<FulfillPurchaseRequestResult> => {
        const request = await requestRepo.findById(requestId);
        if (!request) return { success: false, message: 'Richiesta non trovata' };

        if (request.status === 'RECEIVED') {
            return { success: false, message: 'Già ricevuta' };
        }

        const part = await partRepo.findById(request.partId);
        if (part) {
            part.adjustQuantity(request.quantity);
            await partRepo.save(part);
        }

        request.updateStatus('RECEIVED');
        await requestRepo.save(request);

        return { success: true, message: 'Merce ricevuta e giacenza aggiornata' };
    };
};
