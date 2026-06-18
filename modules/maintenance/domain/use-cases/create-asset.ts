import { Asset, AssetProps } from '../entities/asset';
import { IAssetRepository } from '../ports/asset-repository';

export interface CreateAssetDTO extends AssetProps {}

export const makeCreateAsset = (assetRepo: IAssetRepository) => {
    return async (dto: CreateAssetDTO): Promise<Asset> => {
        const existing = await assetRepo.findBySerialNumber(dto.serialNumber);
        if (existing) {
            throw new Error(`Asset with serial number ${dto.serialNumber} already exists`);
        }
        const asset = new Asset(dto);
        return await assetRepo.save(asset);
    };
};
