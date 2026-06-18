import { SparePart } from '../entities/spare-part';

export interface ISparePartRepository {
    findById(id: string): Promise<SparePart | null>;
    findAll(): Promise<SparePart[]>;
    save(part: SparePart): Promise<SparePart>;
    delete(id: string): Promise<boolean>;
}
