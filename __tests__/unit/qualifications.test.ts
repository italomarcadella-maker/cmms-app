// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { qualificationState, daysToExpiry, qualificationText, QUALIFICATION_STATE_LABEL } from '@/modules/maintenance/domain/qualifications';

// Date locali, come quelle salvate dall'applicazione (mezzogiorno del giorno di scadenza)
const now = new Date(2026, 5, 15, 17, 30); // 15/06/2026, nel tardo pomeriggio
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);

describe('stato delle abilitazioni', () => {
    it('senza scadenza', () => {
        expect(qualificationState(null, now)).toBe('NO_EXPIRY');
    });

    it('scade oggi: vale ancora ed e\' in scadenza (anche se l\'ora della scadenza e\' gia\' passata)', () => {
        expect(daysToExpiry(day(2026, 6, 15), now)).toBe(0);
        expect(qualificationState(day(2026, 6, 15), now)).toBe('EXPIRING');
    });

    it('scaduta dal giorno dopo', () => {
        expect(qualificationState(day(2026, 6, 14), now)).toBe('EXPIRED');
        expect(qualificationState(day(2025, 1, 1), now)).toBe('EXPIRED');
    });

    it('in scadenza fino a 30 giorni, valida da 31', () => {
        expect(qualificationState(day(2026, 7, 15), now)).toBe('EXPIRING'); // 30 giorni
        expect(qualificationState(day(2026, 7, 16), now)).toBe('VALID'); // 31 giorni
        expect(qualificationState(day(2027, 6, 15), now)).toBe('VALID');
    });

    it('conta i giorni di calendario anche attraverso il cambio dell\'ora', () => {
        const spring = new Date(2026, 2, 20, 23, 0);
        expect(daysToExpiry(day(2026, 4, 19), spring)).toBe(30);
        expect(qualificationState(day(2026, 4, 19), spring)).toBe('EXPIRING');
        expect(qualificationState(day(2026, 4, 20), spring)).toBe('VALID');
    });
});

describe('testi', () => {
    it('etichette e testo del badge in italiano', () => {
        expect(QUALIFICATION_STATE_LABEL.EXPIRED).toBe('Scaduta');
        expect(qualificationText('NO_EXPIRY', null)).toBe('senza scadenza');
        expect(qualificationText('EXPIRING', day(2026, 6, 20))).toBe('in scadenza il 20/06/2026');
        expect(qualificationText('EXPIRED', day(2026, 6, 1))).toBe('scaduta il 01/06/2026');
        expect(qualificationText('VALID', day(2027, 1, 5))).toBe('valida fino al 05/01/2027');
    });
});
