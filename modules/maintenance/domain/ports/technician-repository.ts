import { Technician } from '../entities/technician';

export interface ITechnicianRepository {
    findById(id: string): Promise<Technician | null>;
    findByUserId(userId: string): Promise<Technician | null>;
    findAll(): Promise<Technician[]>;
    save(technician: Technician): Promise<Technician>;
    delete(id: string): Promise<boolean>;
}
