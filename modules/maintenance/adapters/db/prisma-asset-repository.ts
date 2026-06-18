import { IAssetRepository } from '../../domain/ports/asset-repository';
import { Asset } from '../../domain/entities/asset';
import { AssetMapper } from './asset-mapper';
import { prisma } from '@/lib/prisma';

export class PrismaAssetRepository implements IAssetRepository {
    async findById(id: string): Promise<Asset | null> {
        const raw = await prisma.asset.findUnique({
            where: { id }
        });
        return raw ? AssetMapper.toDomain(raw) : null;
    }

    async findBySerialNumber(serialNumber: string): Promise<Asset | null> {
        const raw = await prisma.asset.findUnique({
            where: { serialNumber }
        });
        return raw ? AssetMapper.toDomain(raw) : null;
    }

    async findAll(): Promise<Asset[]> {
        const raws = await prisma.asset.findMany();
        return raws.map(AssetMapper.toDomain);
    }

    async save(asset: Asset): Promise<Asset> {
        const prismaData = AssetMapper.toPrisma(asset);
        
        let saved;
        if (asset.id) {
            saved = await prisma.asset.update({
                where: { id: asset.id },
                data: prismaData as any
            });
        } else {
            saved = await prisma.asset.create({
                data: prismaData as any
            });
        }
        
        return AssetMapper.toDomain(saved);
    }

    async delete(id: string): Promise<boolean> {
        try {
            await prisma.asset.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            console.error(`Error deleting asset ${id}:`, error);
            return false;
        }
    }
}
