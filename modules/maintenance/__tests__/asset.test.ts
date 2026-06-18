import { describe, it, expect } from 'vitest';
import { Asset } from '../domain/entities/asset';
import { makeCreateAsset } from '../domain/use-cases/create-asset';
import { IAssetRepository } from '../domain/ports/asset-repository';

// InMemory Mock Repository for testing
class InMemoryAssetRepository implements IAssetRepository {
    private assets: Map<string, Asset> = new Map();

    async findById(id: string): Promise<Asset | null> {
        return this.assets.get(id) || null;
    }

    async findBySerialNumber(serialNumber: string): Promise<Asset | null> {
        for (const asset of this.assets.values()) {
            if (asset.serialNumber === serialNumber) {
                return asset;
            }
        }
        return null;
    }

    async findAll(): Promise<Asset[]> {
        return Array.from(this.assets.values());
    }

    async save(asset: Asset): Promise<Asset> {
        const id = asset.id || `MOCK-ID-${Math.random()}`;
        const savedAsset = new Asset({ ...asset.toJSON(), id });
        this.assets.set(id, savedAsset);
        return savedAsset;
    }

    async delete(id: string): Promise<boolean> {
        return this.assets.delete(id);
    }
}

describe('Asset Domain Entity', () => {
    it('should create a valid Asset entity', () => {
        const asset = new Asset({
            name: 'Machine A',
            model: 'X-100',
            serialNumber: 'SN-12345',
            location: 'Reparto 1',
            purchaseDate: new Date()
        });

        expect(asset.name).toBe('Machine A');
        expect(asset.serialNumber).toBe('SN-12345');
        expect(asset.healthScore).toBe(100);
        expect(asset.status).toBe('OPERATIONAL');
    });

    it('should throw error when creating an asset with empty name', () => {
        expect(() => {
            new Asset({
                name: '',
                model: 'X-100',
                serialNumber: 'SN-12345',
                location: 'Reparto 1',
                purchaseDate: new Date()
            });
        }).toThrow('Asset name cannot be empty');
    });

    it('should throw error when updating health score out of boundaries', () => {
        const asset = new Asset({
            name: 'Machine A',
            model: 'X-100',
            serialNumber: 'SN-12345',
            location: 'Reparto 1',
            purchaseDate: new Date()
        });

        expect(() => asset.updateHealthScore(-10)).toThrow('Health score must be between 0 and 100');
        expect(() => asset.updateHealthScore(150)).toThrow('Health score must be between 0 and 100');
        
        asset.updateHealthScore(85);
        expect(asset.healthScore).toBe(85);
    });
});

describe('CreateAsset Use Case', () => {
    it('should successfully create an asset when serial number is unique', async () => {
        const repo = new InMemoryAssetRepository();
        const createAsset = makeCreateAsset(repo);

        const dto = {
            name: 'Machine B',
            model: 'Y-200',
            serialNumber: 'SN-UNIQUE',
            location: 'Reparto 2',
            purchaseDate: new Date()
        };

        const result = await createAsset(dto);
        expect(result.id).toBeDefined();
        expect(result.serialNumber).toBe('SN-UNIQUE');

        const all = await repo.findAll();
        expect(all.length).toBe(1);
    });

    it('should throw an error when serial number is already taken', async () => {
        const repo = new InMemoryAssetRepository();
        const createAsset = makeCreateAsset(repo);

        const dto1 = {
            name: 'Machine C',
            model: 'Z-300',
            serialNumber: 'SN-DUPLICATE',
            location: 'Reparto 3',
            purchaseDate: new Date()
        };

        await createAsset(dto1);

        const dto2 = {
            name: 'Machine D',
            model: 'Z-300',
            serialNumber: 'SN-DUPLICATE',
            location: 'Reparto 4',
            purchaseDate: new Date()
        };

        await expect(createAsset(dto2)).rejects.toThrow('Asset with serial number SN-DUPLICATE already exists');
    });
});
