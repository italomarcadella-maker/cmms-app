import { Asset } from '../entities/asset';

export interface IAssetRepository {
    findById(id: string): Promise<Asset | null>;
    findBySerialNumber(serialNumber: string): Promise<Asset | null>;
    findAll(): Promise<Asset[]>;
    save(asset: Asset): Promise<Asset>;
    delete(id: string): Promise<boolean>;
}
