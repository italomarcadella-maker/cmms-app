import { MeterReading } from '../entities/meter-reading';

// Read model for reporting/analytics queries that need the parent Meter's info
// alongside each reading. Kept separate from the MeterReading write-model entity,
// which has no knowledge of Meter (a reading only needs meterId to be valid).
export interface MeterReadingWithMeter {
    id: string;
    meterId: string;
    date: Date;
    value: number;
    isAnomaly: boolean;
    aiAnalysis: string | null;
    meter: {
        id: string;
        name: string;
        type: string;
        unit: string;
        serialNumber: string | null;
        location: string | null;
    };
}

export interface IMeterReadingRepository {
    findById(id: string): Promise<MeterReading | null>;
    findByMeterId(meterId: string): Promise<MeterReading[]>;
    findRecentByMeterId(meterId: string, limit: number): Promise<MeterReading[]>;
    findAll(): Promise<MeterReading[]>;
    /** Readings joined with their Meter, optionally bounded by date range. Used for reports/analytics. */
    findWithMeter(range?: { from?: Date; to?: Date }): Promise<MeterReadingWithMeter[]>;
    save(reading: MeterReading): Promise<MeterReading>;
    delete(id: string): Promise<boolean>;
}
