// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
    SKILL_LEVEL_LABEL, skillLevelLabel, isValidSkillLevel, coverage, isQualificationValid, validQualificationCount,
} from '@/modules/maintenance/domain/skill-matrix';

const now = new Date(2026, 5, 15, 17, 30); // 15/06/2026
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);

describe('livelli di competenza', () => {
    it('etichette in italiano', () => {
        expect(SKILL_LEVEL_LABEL[0]).toBe('Nessuna');
        expect(SKILL_LEVEL_LABEL[1]).toBe('Base');
        expect(SKILL_LEVEL_LABEL[2]).toBe('Autonomo');
        expect(SKILL_LEVEL_LABEL[3]).toBe('Esperto');
        expect(SKILL_LEVEL_LABEL[4]).toBe('Può formare altri');
        expect(skillLevelLabel(3)).toBe('Esperto');
        expect(skillLevelLabel(9)).toBe('Nessuna');
    });

    it('valida solo interi da 0 a 4', () => {
        for (const ok of [0, 1, 2, 3, 4]) expect(isValidSkillLevel(ok), String(ok)).toBe(true);
        for (const bad of [-1, 5, 1.5, NaN, Infinity, '2', null, undefined]) expect(isValidSkillLevel(bad), String(bad)).toBe(false);
    });
});

describe('copertura', () => {
    it('conta le persone dal livello Autonomo in su (predefinito)', () => {
        expect(coverage([0, 1, 2, 3, 4])).toBe(3);
        expect(coverage([])).toBe(0);
        expect(coverage([0, 1, 1])).toBe(0);
    });

    it('accetta un livello minimo diverso', () => {
        expect(coverage([0, 1, 2, 3, 4], 3)).toBe(2);
        expect(coverage([0, 1, 2, 3, 4], 1)).toBe(4);
        expect(coverage([0, 1, 2, 3, 4], 4)).toBe(1);
    });
});

describe('abilitazioni valide', () => {
    it('senza scadenza o con scadenza futura sono valide; scade oggi vale ancora', () => {
        expect(isQualificationValid(null, now)).toBe(true);
        expect(isQualificationValid(day(2026, 6, 15), now)).toBe(true);
        expect(isQualificationValid(day(2027, 1, 1), now)).toBe(true);
    });

    it('scadute dal giorno dopo', () => {
        expect(isQualificationValid(day(2026, 6, 14), now)).toBe(false);
    });

    it('conta solo le valide', () => {
        expect(validQualificationCount([null, day(2026, 6, 14), day(2026, 12, 1), day(2020, 1, 1)], now)).toBe(2);
        expect(validQualificationCount([], now)).toBe(0);
    });
});
