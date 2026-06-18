import { PurchaseRequest as PrismaPurchaseRequest } from '@prisma/client';
import { PurchaseRequest } from '../../domain/entities/purchase-request';

export class PurchaseRequestMapper {
    static toDomain(raw: PrismaPurchaseRequest): PurchaseRequest {
        return new PurchaseRequest({
            id: raw.id,
            partId: raw.partId,
            quantity: raw.quantity,
            status: raw.status,
            reason: raw.reason,
            expectedCost: raw.expectedCost,
            requestedAt: raw.requestedAt,
            orderedAt: raw.orderedAt,
            receivedAt: raw.receivedAt
        });
    }

    static toPrisma(domain: PurchaseRequest): Partial<PrismaPurchaseRequest> {
        return {
            id: domain.id,
            partId: domain.partId,
            quantity: domain.quantity,
            status: domain.status,
            reason: domain.reason,
            expectedCost: domain.expectedCost,
            requestedAt: domain.requestedAt,
            orderedAt: domain.orderedAt,
            receivedAt: domain.receivedAt
        };
    }
}
