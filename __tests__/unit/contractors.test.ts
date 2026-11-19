// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { contractState, daysToEnd, activityState, nextDueAfterExecution, isInForce, frequencyText } from '@/modules/maintenance/domain/contractors';

const now = new Date('2026-06-15T10:00:00Z');
const d = (s: string) => new Date(`${s}T10:00:00Z`);
const base = { status: 'ACTIVE', startDate: d('2026-01-01'), renewalNoticeDays: 60 };

describe('stato dei contratti', () => {
    it('in vigore se non vicino alla scadenza', () => {
        expect(contractState({ ...base, endDate: d('2027-01-01') }, now)).toBe('ACTIVE');
        expect(contractState({ ...base, endDate: null }, now)).toBe('ACTIVE');
    });

    it('in scadenza entro il preavviso di rinnovo', () => {
        expect(contractState({ ...base, endDate: d('2026-07-30') }, now)).toBe('EXPIRING'); // 45 giorni
        expect(contractState({ ...base, endDate: d('2026-08-30') }, now)).toBe('ACTIVE'); // 76 giorni
    });

    it('scaduto, non ancora iniziato, disdetto', () => {
        expect(contractState({ ...base, endDate: d('2026-06-01') }, now)).toBe('EXPIRED');
        expect(contractState({ ...base, startDate: d('2026-09-01'), endDate: null }, now)).toBe('UPCOMING');
        expect(contractState({ ...base, status: 'TERMINATED', endDate: d('2027-01-01') }, now)).toBe('TERMINATED');
    });

    it('un contratto in scadenza e\' ancora in vigore, uno scaduto no', () => {
        expect(isInForce('EXPIRING')).toBe(true);
        expect(isInForce('EXPIRED')).toBe(false);
        expect(isInForce('UPCOMING')).toBe(false);
    });

    it('giorni alla scadenza', () => {
        expect(daysToEnd(d('2026-06-25'), now)).toBe(10);
        expect(daysToEnd(null, now)).toBeNull();
    });
});

describe('attivita periodiche', () => {
    it('stato in base alla scadenza', () => {
        expect(activityState({ isActive: true, nextDueDate: d('2026-06-01') }, now)).toBe('OVERDUE');
        expect(activityState({ isActive: true, nextDueDate: d('2026-06-18') }, now)).toBe('DUE_SOON');
        expect(activityState({ isActive: true, nextDueDate: d('2026-08-01') }, now)).toBe('OK');
        expect(activityState({ isActive: false, nextDueDate: d('2026-06-01') }, now)).toBe('INACTIVE');
    });

    it('la scadenza di oggi non e\' ancora in ritardo', () => {
        expect(activityState({ isActive: true, nextDueDate: d('2026-06-15') }, now)).toBe('DUE_SOON');
    });

    it('dopo un\'esecuzione in ritardo si riparte da quel giorno; in anticipo si mantiene il ritmo', () => {
        const late = nextDueAfterExecution(now, d('2026-05-01'), 90);
        expect(late.toISOString().slice(0, 10)).toBe('2026-09-13');
        const early = nextDueAfterExecution(now, d('2026-06-20'), 90);
        expect(early.toISOString().slice(0, 10)).toBe('2026-09-18');
    });

    it('etichette delle frequenze', () => {
        expect(frequencyText(90)).toBe('Ogni 3 mesi');
        expect(frequencyText(45)).toBe('Ogni 45 giorni');
    });
});
