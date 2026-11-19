// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { shiftOf, hourInZone, dayKeyInZone, wholeDaysBetween, longestStreakDays } from '@/modules/maintenance/domain/shifts';

describe('turni', () => {
    it('assegna il turno in base all\'ora del fuso del plant, non a quella del server', () => {
        // 05:30 UTC = 06:30 a Roma (inverno): turno del mattino
        expect(shiftOf(new Date('2026-01-15T05:30:00Z'), 'Europe/Rome')).toBe('MORNING');
        // 13:30 UTC = 14:30 a Roma: pomeriggio
        expect(shiftOf(new Date('2026-01-15T13:30:00Z'), 'Europe/Rome')).toBe('AFTERNOON');
        // 21:30 UTC = 22:30 a Roma: notte
        expect(shiftOf(new Date('2026-01-15T21:30:00Z'), 'Europe/Rome')).toBe('NIGHT');
    });

    it('i confini: 06:00 e\' mattina, 14:00 pomeriggio, 22:00 notte, 05:59 ancora notte', () => {
        expect(shiftOf(new Date('2026-01-15T05:00:00Z'), 'Europe/Rome')).toBe('MORNING');
        expect(shiftOf(new Date('2026-01-15T04:59:00Z'), 'Europe/Rome')).toBe('NIGHT');
        expect(shiftOf(new Date('2026-01-15T13:00:00Z'), 'Europe/Rome')).toBe('AFTERNOON');
        expect(shiftOf(new Date('2026-01-15T21:00:00Z'), 'Europe/Rome')).toBe('NIGHT');
    });

    it('mezzanotte vale 0 e non 24', () => {
        expect(hourInZone(new Date('2026-01-14T23:00:00Z'), 'Europe/Rome')).toBe(0);
    });

    it('il giorno di calendario dipende dal fuso', () => {
        const d = new Date('2026-01-14T23:30:00Z');
        expect(dayKeyInZone(d, 'UTC')).toBe('2026-01-14');
        expect(dayKeyInZone(d, 'Europe/Rome')).toBe('2026-01-15');
    });
});

describe('serie senza infortuni', () => {
    const now = new Date('2026-06-30T12:00:00Z');

    it('conta i giorni interi', () => {
        expect(wholeDaysBetween(new Date('2026-06-20T13:00:00Z'), now)).toBe(9);
        expect(wholeDaysBetween(new Date('2026-07-05T00:00:00Z'), now)).toBe(0);
    });

    it('il record non e\' noto con un solo infortunio', () => {
        expect(longestStreakDays([new Date('2026-06-01T00:00:00Z')], now)).toBeNull();
        expect(longestStreakDays([], now)).toBeNull();
    });

    it('il record e\' il periodo piu\' lungo tra due infortuni o la serie in corso', () => {
        const dates = [new Date('2026-01-01T00:00:00Z'), new Date('2026-03-01T00:00:00Z'), new Date('2026-03-11T00:00:00Z')];
        expect(longestStreakDays(dates, now)).toBe(111); // dall'11/03 a oggi supera i 59 giorni tra gennaio e marzo
        const old = [new Date('2025-01-01T00:00:00Z'), new Date('2026-01-01T00:00:00Z'), new Date('2026-06-29T00:00:00Z')];
        expect(longestStreakDays(old, now)).toBe(365);
    });
});
