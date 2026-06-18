import { SopDocument } from '../entities/sop-document';

export interface ISopDocumentRepository {
    findById(id: string): Promise<SopDocument | null>;
    findAll(): Promise<SopDocument[]>;
    findByAssetId(assetId: string): Promise<SopDocument[]>;
    save(sop: SopDocument): Promise<SopDocument>;
    delete(id: string): Promise<boolean>;
}
