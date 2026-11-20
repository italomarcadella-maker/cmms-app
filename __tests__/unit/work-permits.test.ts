// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
    PERMIT_STATUSES, canTransition, isOpenStatus, isPendingStatus, isPermitExpired, effectivePermitStatus,
    computeValidity, activationWindow, checkTechniciansQualified, qualificationProblemText,
    allPrecautionsChecked, buildPrecautionsDone, parsePrecautionsDone, validatePermitType,
    MAX_PRECAUTIONS, MAX_PRECAUTION_LENGTH, MAX_TYPE_NAME,
} from '@/modules/maintenance/domain/work-permits';

const now = new Date(2026, 10, 20, 10, 0); // 20/11/2026 10:00
const hoursLater = (h: number) => new Date(now.getTime() + h * 3_600_000);
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);

describe('transizioni di stato', () => {
    it('le transizioni valide', () => {
        expect(canTransition('REQUESTED', 'APPROVED')).toBe(true);
        expect(canTransition('REQUESTED', 'REJECTED')).toBe(true);
        expect(canTransition('REQUESTED', 'CANCELED')).toBe(true);
        expect(canTransition('APPROVED', 'ACTIVE')).toBe(true);
        expect(canTransition('APPROVED', 'CANCELED')).toBe(true);
        expect(canTransition('ACTIVE', 'CLOSED')).toBe(true);
        expect(canTransition('ACTIVE', 'CANCELED')).toBe(true);
    });

    it('le altre sono vietate: non si salta l\'approvazione e gli stati finali restano finali', () => {
        expect(canTransition('REQUESTED', 'ACTIVE')).toBe(false);
        expect(canTransition('REQUESTED', 'CLOSED')).toBe(false);
        expect(canTransition('APPROVED', 'CLOSED')).toBe(false);
        expect(canTransition('APPROVED', 'REJECTED')).toBe(false);
        expect(canTransition('ACTIVE', 'APPROVED')).toBe(false);
        for (const final of ['CLOSED', 'REJECTED', 'CANCELED']) {
            for (const to of PERMIT_STATUSES) expect(canTransition(final, to), `${final} -> ${to}`).toBe(false);
        }
    });

    it('stati sconosciuti non sono mai validi', () => {
        expect(canTransition('FOO', 'ACTIVE')).toBe(false);
        expect(canTransition('REQUESTED', 'FOO')).toBe(false);
    });

    it('aperto e in attesa', () => {
        expect(isOpenStatus('ACTIVE')).toBe(true);
        expect(isOpenStatus('CLOSED')).toBe(false);
        expect(isPendingStatus('REQUESTED')).toBe(true);
        expect(isPendingStatus('APPROVED')).toBe(true);
        expect(isPendingStatus('ACTIVE')).toBe(false);
    });
});

describe('permesso scaduto', () => {
    it('scade solo se approvato o attivo e oltre la fine', () => {
        expect(isPermitExpired('ACTIVE', hoursLater(-1), now)).toBe(true);
        expect(isPermitExpired('APPROVED', hoursLater(-1), now)).toBe(true);
        expect(isPermitExpired('ACTIVE', hoursLater(1), now)).toBe(false);
        expect(isPermitExpired('ACTIVE', null, now)).toBe(false);
        expect(isPermitExpired('REQUESTED', hoursLater(-1), now)).toBe(false);
        expect(isPermitExpired('CLOSED', hoursLater(-1), now)).toBe(false);
    });

    it('stato effettivo', () => {
        expect(effectivePermitStatus('ACTIVE', hoursLater(-1), now)).toBe('EXPIRED');
        expect(effectivePermitStatus('ACTIVE', hoursLater(2), now)).toBe('ACTIVE');
        expect(effectivePermitStatus('CLOSED', hoursLater(-5), now)).toBe('CLOSED');
    });
});

describe('validita\' calcolata', () => {
    it('senza date: inizia adesso e dura le ore del tipo', () => {
        const r = computeValidity({ defaultValidityHours: 8 }, now);
        expect(r.ok && r.validFrom.getTime()).toBe(now.getTime());
        expect(r.ok && r.validTo?.getTime()).toBe(hoursLater(8).getTime());
    });

    it('la fine indicata vince sulle ore predefinite', () => {
        const r = computeValidity({ validTo: hoursLater(3), defaultValidityHours: 8 }, now);
        expect(r.ok && r.validTo?.getTime()).toBe(hoursLater(3).getTime());
    });

    it('l\'inizio indicato sposta anche la fine calcolata', () => {
        const from = hoursLater(24);
        const r = computeValidity({ validFrom: from, defaultValidityHours: 4 }, now);
        expect(r.ok && r.validTo?.getTime()).toBe(from.getTime() + 4 * 3_600_000);
    });

    it('senza date e senza ore predefinite: nessuna fine', () => {
        const r = computeValidity({}, now);
        expect(r.ok && r.validTo).toBeNull();
    });

    it('fine non successiva all\'inizio: errore', () => {
        expect(computeValidity({ validFrom: hoursLater(2), validTo: hoursLater(1) }, now).ok).toBe(false);
        expect(computeValidity({ validTo: now }, now).ok).toBe(false);
        expect(computeValidity({ validTo: new Date('x') }, now).ok).toBe(false);
    });

    it('finestra di attivazione', () => {
        expect(activationWindow(hoursLater(-1), hoursLater(1), now).ok).toBe(true);
        expect(activationWindow(null, null, now).ok).toBe(true);
        const early = activationWindow(hoursLater(1), hoursLater(5), now);
        expect(!early.ok && early.reason).toBe('NOT_YET');
        const late = activationWindow(hoursLater(-5), hoursLater(-1), now);
        expect(!late.ok && late.reason).toBe('EXPIRED');
    });
});

describe('abilitazione dei tecnici', () => {
    const Q = 'ple';
    const techs = [
        { id: 't1', name: 'Anna Rossi', qualifications: [{ typeId: Q, expiresAt: day(2027, 3, 1) }] },
        { id: 't2', name: 'Bruno Verdi', qualifications: [] },
        { id: 't3', name: 'Carla Neri', qualifications: [{ typeId: Q, expiresAt: day(2026, 11, 1) }] },
        { id: 't4', name: 'Dario Blu', qualifications: [{ typeId: 'altra', expiresAt: null }] },
        { id: 't5', name: 'Elena Gialli', qualifications: [{ typeId: Q, expiresAt: null }] },
        { id: 't6', name: 'Fabio Viola', qualifications: [{ typeId: Q, expiresAt: day(2026, 11, 20) }] }, // scade oggi: vale ancora
    ];

    it('tutti abilitati: ok', () => {
        const r = checkTechniciansQualified(Q, [techs[0], techs[4], techs[5]], now);
        expect(r.ok).toBe(true);
        expect(r.missing).toEqual([]);
        expect(qualificationProblemText(r, 'PLE')).toBe('');
    });

    it('distingue mancante da scaduta e riporta i nomi', () => {
        const r = checkTechniciansQualified(Q, techs, now);
        expect(r.ok).toBe(false);
        expect(r.missing).toEqual(['Bruno Verdi', 'Dario Blu']);
        expect(r.expired).toEqual(['Carla Neri']);
        expect(r.perTechnician.find(t => t.id === 't1')?.status).toBe('OK');
        const text = qualificationProblemText(r, 'PLE');
        expect(text).toContain('Bruno Verdi');
        expect(text).toContain('Carla Neri');
        expect(text).toContain('scaduta');
        expect(text).toContain('PLE');
    });

    it('un tipo senza abilitazione richiesta e\' sempre ok', () => {
        const r = checkTechniciansQualified(null, techs, now);
        expect(r.ok).toBe(true);
        expect(r.required).toBe(false);
    });

    it('nessun tecnico assegnato: segnalato, non bloccato', () => {
        const r = checkTechniciansQualified(Q, [], now);
        expect(r.ok).toBe(true);
        expect(r.noTechnicians).toBe(true);
    });
});

describe('precauzioni', () => {
    const list = ['Prima', 'Seconda', 'Terza'];

    it('servono tutte spuntate, nella quantita\' esatta', () => {
        expect(allPrecautionsChecked(list, [true, true, true])).toBe(true);
        expect(allPrecautionsChecked(list, [true, false, true])).toBe(false);
        expect(allPrecautionsChecked(list, [true, true])).toBe(false);
        expect(allPrecautionsChecked(list, [true, true, true, true])).toBe(false);
        expect(allPrecautionsChecked(list, null)).toBe(false);
        expect(allPrecautionsChecked(list, ['true' as unknown as boolean, true, true])).toBe(false);
    });

    it('un tipo senza precauzioni non richiede spunte', () => {
        expect(allPrecautionsChecked([], [])).toBe(true);
        expect(allPrecautionsChecked([], undefined)).toBe(true);
    });

    it('registro delle precauzioni spuntate', () => {
        const done = buildPrecautionsDone(list, [true, true, true]);
        expect(done).toEqual([{ label: 'Prima', checked: true }, { label: 'Seconda', checked: true }, { label: 'Terza', checked: true }]);
        expect(parsePrecautionsDone(done)).toEqual(done);
        expect(parsePrecautionsDone(null)).toEqual([]);
        expect(parsePrecautionsDone([{ nope: 1 }, { label: 'x', checked: true }])).toEqual([{ label: 'x', checked: true }]);
    });
});

describe('validazione del tipo di permesso', () => {
    it('accetta un tipo minimo e normalizza', () => {
        const r = validatePermitType({ name: '  Lavori in quota ', precautions: [' a ', '', 'b'] });
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.value.name).toBe('Lavori in quota');
            expect(r.value.precautions).toEqual(['a', 'b']);
            expect(r.value.requiresApproval).toBe(true);
            expect(r.value.requiredQualificationId).toBeNull();
            expect(r.value.defaultValidityHours).toBeNull();
        }
    });

    it('rifiuta nome vuoto o troppo lungo', () => {
        expect(validatePermitType({ name: '   ' }).ok).toBe(false);
        expect(validatePermitType({ name: 'x'.repeat(MAX_TYPE_NAME + 1) }).ok).toBe(false);
        expect(validatePermitType({ name: 'x'.repeat(MAX_TYPE_NAME) }).ok).toBe(true);
    });

    it('limiti sulle precauzioni', () => {
        expect(validatePermitType({ name: 'a', precautions: Array.from({ length: MAX_PRECAUTIONS + 1 }, (_, i) => `p${i}`) }).ok).toBe(false);
        expect(validatePermitType({ name: 'a', precautions: Array.from({ length: MAX_PRECAUTIONS }, (_, i) => `p${i}`) }).ok).toBe(true);
        expect(validatePermitType({ name: 'a', precautions: ['x'.repeat(MAX_PRECAUTION_LENGTH + 1)] }).ok).toBe(false);
    });

    it('ore di validita\': intero positivo o nessuna', () => {
        expect(validatePermitType({ name: 'a', defaultValidityHours: 0 }).ok).toBe(false);
        expect(validatePermitType({ name: 'a', defaultValidityHours: 1.5 }).ok).toBe(false);
        expect(validatePermitType({ name: 'a', defaultValidityHours: -2 }).ok).toBe(false);
        const r = validatePermitType({ name: 'a', defaultValidityHours: 8, requiresApproval: false });
        expect(r.ok && r.value.defaultValidityHours).toBe(8);
        expect(r.ok && r.value.requiresApproval).toBe(false);
    });
});
