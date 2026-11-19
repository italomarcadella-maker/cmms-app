// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { nextReadingDue, frequencyLabel } from '@/modules/energy/domain/reading-plan';

const day = 86_400_000;

describe('pianificazione letture', () => {
    const now = new Date('2026-06-10T09:00:00Z');

    it('lettura in ritardo: si riparte da oggi', () => {
        const due = new Date('2026-06-01T09:00:00Z');
        expect(nextReadingDue(due, 7, now).getTime()).toBe(now.getTime() + 7 * day);
    });

    it('lettura in anticipo: si mantiene il ritmo', () => {
        const due = new Date('2026-06-12T09:00:00Z');
        expect(nextReadingDue(due, 7, now).getTime()).toBe(due.getTime() + 7 * day);
    });

    it('la frequenza minima e\' un giorno', () => {
        expect(nextReadingDue(now, 0, now).getTime()).toBe(now.getTime() + day);
    });

    it('etichette leggibili', () => {
        expect(frequencyLabel(null)).toBe('Non pianificata');
        expect(frequencyLabel(7)).toBe('Ogni settimana');
        expect(frequencyLabel(3)).toBe('Ogni 3 giorni');
    });
});
