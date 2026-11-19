import { IPurchaseRequestRepository } from '../ports/purchase-request-repository';
import { ISparePartRepository } from '../ports/spare-part-repository';

export interface FulfillPurchaseRequestResult {
    success: boolean;
    message: string;
}

/**
 * Segna una richiesta d'acquisto come ricevuta e accredita la quantita' ordinata al magazzino.
 * L'operazione e' atomica e riuscibile una sola volta: un secondo tentativo (doppio clic, due utenti) viene rifiutato,
 * altrimenti la giacenza verrebbe accreditata due volte.
 */
export const makeFulfillPurchaseRequest = (requestRepo: IPurchaseRequestRepository, _partRepo?: ISparePartRepository) => {
    return async (requestId: string): Promise<FulfillPurchaseRequestResult> => {
        const outcome = await requestRepo.receive(requestId);
        if (outcome === 'NOT_FOUND') return { success: false, message: 'Richiesta non trovata' };
        if (outcome === 'ALREADY_RECEIVED') return { success: false, message: 'Già ricevuta' };
        return { success: true, message: 'Merce ricevuta e giacenza aggiornata' };
    };
};
