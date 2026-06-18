import { MeterReading } from '../entities/meter-reading';

export interface IMeterReadingRepository {
    findById(id: string): Promise<MeterReading | null>;
    findByMeterId(meterId: string): Promise<MeterReading[]>;
    findAll(): Promise<MeterReading[]>;
    save(reading: MeterReading): Promise<MeterReading>;
    delete(id: string): Promise<boolean>;
}
