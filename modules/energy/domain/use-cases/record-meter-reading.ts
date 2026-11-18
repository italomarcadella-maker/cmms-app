import { MeterReading } from '../entities/meter-reading';
import { IMeterRepository } from '../ports/meter-repository';
import { IMeterReadingRepository } from '../ports/meter-reading-repository';

export interface RecordMeterReadingDTO {
    meterId: string;
    value: number;
    date: string;
}

export interface RecordMeterReadingResult {
    reading: MeterReading;
    isAnomaly: boolean;
    aiAnalysis: string | null;
}

const RECENT_READINGS_FOR_BASELINE = 5;
const ANOMALY_THRESHOLD_RATIO = 0.5; // flag if consumption exceeds the recent average by more than 50%

/**
 * Compares a new reading against the meter's recent history to flag anomalies:
 * a value lower than the previous reading (likely a data-entry error or meter
 * replacement), or a consumption spike well above the recent average.
 */
export const makeRecordMeterReading = (meterRepo: IMeterRepository, readingRepo: IMeterReadingRepository) => {
    return async (dto: RecordMeterReadingDTO): Promise<RecordMeterReadingResult> => {
        const meter = await meterRepo.findById(dto.meterId);
        if (!meter) throw new Error('Meter not found');

        const recentReadings = await readingRepo.findRecentByMeterId(dto.meterId, RECENT_READINGS_FOR_BASELINE);

        let isAnomaly = false;
        let aiAnalysis: string | null = null;

        if (recentReadings.length > 0) {
            const lastReading = recentReadings[0];
            const consumption = dto.value - lastReading.value;

            if (consumption < 0) {
                isAnomaly = true;
                aiAnalysis = 'Rilevato valore inferiore alla lettura precedente. Possibile errore di inserimento o sostituzione contatore.';
            } else if (recentReadings.length >= 3) {
                let totalConsumption = 0;
                let count = 0;
                for (let i = 0; i < recentReadings.length - 1; i++) {
                    const diff = recentReadings[i].value - recentReadings[i + 1].value;
                    if (diff > 0) {
                        totalConsumption += diff;
                        count++;
                    }
                }

                if (count > 0) {
                    const avgConsumption = totalConsumption / count;
                    const threshold = avgConsumption * ANOMALY_THRESHOLD_RATIO;

                    if (consumption > avgConsumption + threshold) {
                        isAnomaly = true;
                        const pctOver = (100 * (consumption - avgConsumption) / avgConsumption).toFixed(0);
                        aiAnalysis = `Consumo rilevato (${consumption.toFixed(2)}) superiore del ${pctOver}% rispetto alla media recente (${avgConsumption.toFixed(2)}).`;
                    }
                }
            }
        }

        const reading = new MeterReading({
            meterId: dto.meterId,
            value: dto.value,
            date: new Date(dto.date),
            isAnomaly,
            aiAnalysis
        });

        const saved = await readingRepo.save(reading);
        return { reading: saved, isAnomaly, aiAnalysis };
    };
};
