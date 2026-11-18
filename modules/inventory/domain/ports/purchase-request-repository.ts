import { PurchaseRequest } from '../entities/purchase-request';

// Read model for listing requests alongside their SparePart info. Kept separate
// from the PurchaseRequest write-model entity, which only needs partId to be valid.
export interface PurchaseRequestListItem {
    id: string;
    partId: string;
    quantity: number;
    status: string;
    reason: string | null;
    expectedCost: number | null;
    requestedAt: Date;
    orderedAt: Date | null;
    receivedAt: Date | null;
    part: {
        id: string;
        name: string;
        category: string | null;
        unitCost: number;
    };
}

export interface IPurchaseRequestRepository {
    findById(id: string): Promise<PurchaseRequest | null>;
    findAll(): Promise<PurchaseRequest[]>;
    /** Requests joined with their SparePart, for listing UIs. */
    findAllWithPart(): Promise<PurchaseRequestListItem[]>;
    save(request: PurchaseRequest): Promise<PurchaseRequest>;
    delete(id: string): Promise<boolean>;
}
