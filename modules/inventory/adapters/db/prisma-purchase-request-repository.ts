import { IPurchaseRequestRepository, PurchaseRequestListItem } from '../../domain/ports/purchase-request-repository';
import { PurchaseRequest } from '../../domain/entities/purchase-request';
import { PurchaseRequestMapper } from './purchase-request-mapper';
import { prisma } from '@/lib/prisma';

export class PrismaPurchaseRequestRepository implements IPurchaseRequestRepository {
    async findById(id: string): Promise<PurchaseRequest | null> {
        const raw = await prisma.purchaseRequest.findUnique({
            where: { id }
        });
        return raw ? PurchaseRequestMapper.toDomain(raw) : null;
    }

    async findAll(): Promise<PurchaseRequest[]> {
        const raws = await prisma.purchaseRequest.findMany({
            orderBy: { requestedAt: 'desc' }
        });
        return raws.map(PurchaseRequestMapper.toDomain);
    }

    async findAllWithPart(): Promise<PurchaseRequestListItem[]> {
        const raws = await prisma.purchaseRequest.findMany({
            include: { part: true },
            orderBy: { requestedAt: 'desc' }
        });
        return raws.map((r) => ({
            id: r.id,
            partId: r.partId,
            quantity: r.quantity,
            status: r.status,
            reason: r.reason,
            expectedCost: r.expectedCost,
            requestedAt: r.requestedAt,
            orderedAt: r.orderedAt,
            receivedAt: r.receivedAt,
            part: {
                id: r.part.id,
                name: r.part.name,
                category: r.part.category,
                unitCost: r.part.unitCost,
            },
        }));
    }

    async save(request: PurchaseRequest): Promise<PurchaseRequest> {
        const prismaData = PurchaseRequestMapper.toPrisma(request);
        let saved;
        if (request.id) {
            saved = await prisma.purchaseRequest.update({
                where: { id: request.id },
                data: prismaData as any
            });
        } else {
            saved = await prisma.purchaseRequest.create({
                data: prismaData as any
            });
        }
        return PurchaseRequestMapper.toDomain(saved);
    }

    async delete(id: string): Promise<boolean> {
        try {
            await prisma.purchaseRequest.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            console.error(`Error deleting purchase request ${id}:`, error);
            return false;
        }
    }
}
