// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readingState, isCumulative, meterTypeLabel, defaultUnit } from '@/modules/energy/domain/meter-types';

describe('tipi di contatore', () => {
    it('energia, acqua e gas sono cumulativi; pressioni e temperature no', () => {
        expect(isCumulative('ELEC')).toBe(true);
        expect(isCumulative('WATER')).toBe(true);
        expect(isCumulative('PRESSURE')).toBe(false);
        expect(isCumulative('TEMP')).toBe(false);
    });

    it('etichette e unita\' predefinite', () => {
        expect(meterTypeLabel('PRESSURE')).toBe('Pressione');
        expect(defaultUnit('TEMP')).toBe('°C');
        expect(meterTypeLabel('SCONOSCIUTO')).toBe('SCONOSCIUTO');
    });
});

describe('stato della lettura pianificata', () => {
    const now = new Date(2026, 5, 15, 10, 0, 0); // 15/06/2026 10:00 (ora locale)

    it('senza pianificazione', () => {
        expect(readingState(null, now)).toBe('UNPLANNED');
    });

    it('in ritardo se la scadenza e\' di un giorno precedente', () => {
        expect(readingState(new Date(2026, 5, 14, 12, 0, 0), now)).toBe('LATE');
    });

    it('di oggi, anche se l\'ora e\' gia\' passata o deve ancora arrivare', () => {
        expect(readingState(new Date(2026, 5, 15, 8, 0, 0), now)).toBe('TODAY');
        expect(readingState(new Date(2026, 5, 15, 20, 0, 0), now)).toBe('TODAY');
    });

    it('in programma dal giorno dopo', () => {
        expect(readingState(new Date(2026, 5, 16, 12, 0, 0), now)).toBe('OK');
    });
});
