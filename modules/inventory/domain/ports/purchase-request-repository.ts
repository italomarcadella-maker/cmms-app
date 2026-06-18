import { PurchaseRequest } from '../entities/purchase-request';

export interface IPurchaseRequestRepository {
    findById(id: string): Promise<PurchaseRequest | null>;
    findAll(): Promise<PurchaseRequest[]>;
    save(request: PurchaseRequest): Promise<PurchaseRequest>;
    delete(id: string): Promise<boolean>;
}
