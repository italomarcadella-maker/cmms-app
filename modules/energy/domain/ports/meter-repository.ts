import { Meter } from '../entities/meter';

export interface IMeterRepository {
    findById(id: string): Promise<Meter | null>;
    findAll(): Promise<Meter[]>;
    save(meter: Meter): Promise<Meter>;
    delete(id: string): Promise<boolean>;
}
