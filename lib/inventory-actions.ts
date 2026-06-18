'use server';

import {
    getPurchaseRequests as newGetPurchaseRequests,
    updatePurchaseRequestStatus as newUpdatePurchaseRequestStatus,
    fulfillPurchaseRequest as newFulfillPurchaseRequest
} from '@/modules/inventory/adapters/actions/inventory-actions';

export async function getPurchaseRequests() {
    return newGetPurchaseRequests();
}

export async function updatePurchaseRequestStatus(id: string, status: string) {
    return newUpdatePurchaseRequestStatus(id, status);
}

export async function fulfillPurchaseRequest(id: string) {
    return newFulfillPurchaseRequest(id);
}
