import { Asset as PrismaAsset, AssetStatus as PrismaAssetStatus, AssetType as PrismaAssetType } from '@prisma/client';
import { Asset, AssetStatus, AssetType } from '../../domain/entities/asset';

export class AssetMapper {
    public static toDomain(prismaAsset: PrismaAsset): Asset {
        return new Asset({
            id: prismaAsset.id,
            name: prismaAsset.name,
            model: prismaAsset.model,
            serialNumber: prismaAsset.serialNumber,
            vendor: prismaAsset.vendor,
            plantId: prismaAsset.plantId,
            department: prismaAsset.department,
            location: prismaAsset.location,
            line: prismaAsset.line,
            cespite: prismaAsset.cespite,
            purchaseDate: prismaAsset.purchaseDate,
            status: prismaAsset.status as AssetStatus,
            healthScore: prismaAsset.healthScore,
            lastMaintenance: prismaAsset.lastMaintenance,
            type: prismaAsset.type as AssetType,
            warrantyExpiration: prismaAsset.warrantyExpiration
        });
    }

    public static toPrisma(domainAsset: Asset): Omit<PrismaAsset, 'createdAt' | 'updatedAt'> {
        const prismaData: any = {
            name: domainAsset.name,
            model: domainAsset.model,
            serialNumber: domainAsset.serialNumber,
            vendor: domainAsset.vendor || null,
            plantId: domainAsset.plantId || null,
            department: domainAsset.department || null,
            location: domainAsset.location,
            line: domainAsset.line || null,
            cespite: domainAsset.cespite || null,
            purchaseDate: domainAsset.purchaseDate,
            status: domainAsset.status as PrismaAssetStatus,
            healthScore: domainAsset.healthScore,
            lastMaintenance: domainAsset.lastMaintenance || null,
            type: domainAsset.type as PrismaAssetType,
            warrantyExpiration: domainAsset.warrantyExpiration || null
        };

        if (domainAsset.id) {
            prismaData.id = domainAsset.id;
        }

        return prismaData;
    }
}
