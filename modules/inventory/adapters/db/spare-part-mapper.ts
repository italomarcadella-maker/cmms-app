import { SparePart as PrismaSparePart } from '@prisma/client';
import { SparePart } from '../../domain/entities/spare-part';

export class SparePartMapper {
    static toDomain(raw: PrismaSparePart): SparePart {
        return new SparePart({
            id: raw.id,
            name: raw.name,
            category: raw.category,
            description: raw.description,
            warehouse: raw.warehouse,
            vendor: raw.vendor,
            quantity: raw.quantity,
            minQuantity: raw.minQuantity,
            location: raw.location,
            plantId: raw.plantId,
            unitCost: raw.unitCost,
            lastUpdated: raw.lastUpdated
        });
    }

    static toPrisma(domain: SparePart): Partial<PrismaSparePart> {
        return {
            id: domain.id,
            name: domain.name,
            category: domain.category,
            description: domain.description,
            warehouse: domain.warehouse,
            vendor: domain.vendor,
            quantity: domain.quantity,
            minQuantity: domain.minQuantity,
            location: domain.location,
            plantId: domain.plantId,
            unitCost: domain.unitCost,
            lastUpdated: domain.lastUpdated
        };
    }
}
