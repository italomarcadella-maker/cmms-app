// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { scoreCase, selectCases, aggregateActions, type FailureCase } from '@/modules/maintenance/domain/failure-analysis';

const base = { isOwn: false, date: '2026-01-10T00:00:00.000Z' };
const cases: FailureCase[] = [
    { ...base, plantId: 'b', plantName: 'SPG', assetModel: 'K23', assetVendor: 'Kaeser', title: 'Perdita olio compressore', description: 'perdita di olio dalla guarnizione albero', solution: 'Sostituzione kit guarnizioni albero', cause: 'Guarnizione deteriorata', downtimeMin: 90 },
    { ...base, plantId: 'a', plantName: 'SND', assetModel: 'K23', assetVendor: 'Kaeser', title: 'Compressore con perdita olio', description: 'olio sul basamento', solution: 'Sostituire il kit di guarnizioni dell\'albero', downtimeMin: 120, prevention: 'Controllo mensile tenuta' },
    { ...base, plantId: 'b', plantName: 'SPG', assetModel: 'X9', assetVendor: 'Altro', title: 'Rumore anomalo pompa', description: 'cuscinetto sgranato', solution: 'Sostituzione cuscinetti' },
    { ...base, plantId: 'a', plantName: 'SND', assetModel: 'K23', assetVendor: 'Kaeser', title: 'Allarme temperatura', description: 'sensore guasto', solution: 'Sostituzione sensore PT100' },
];

describe('analisi guasti tra plant', () => {
    const query = { text: 'perdita olio dal compressore', model: 'K23', vendor: 'Kaeser' };

    it('assegna un punteggio piu\' alto a sintomo e macchina uguali', () => {
        const a = scoreCase(query, cases[0]);
        const c = scoreCase(query, cases[2]);
        expect(a.score).toBeGreaterThan(0.7);
        expect(a.sameModel).toBe(true);
        expect(c.score).toBeLessThan(0.35);
    });

    it('la stessa macchina con un guasto diverso non basta', () => {
        expect(scoreCase(query, cases[3]).score).toBeLessThan(0.35);
    });

    it('seleziona solo i casi pertinenti, dal migliore', () => {
        const picked = selectCases(query, cases);
        expect(picked.map(p => p.title)).toEqual(expect.arrayContaining(['Perdita olio compressore', 'Compressore con perdita olio']));
        expect(picked.some(p => p.title === 'Rumore anomalo pompa')).toBe(false);
        expect(picked[0].score).toBeGreaterThanOrEqual(picked[picked.length - 1].score);
    });

    it('unisce le soluzioni equivalenti di plant diversi e indica da dove arrivano', () => {
        const actions = aggregateActions(selectCases(query, cases));
        expect(actions).toHaveLength(1);
        expect(actions[0].occurrences).toBe(2);
        expect(actions[0].plants.sort()).toEqual(['SND', 'SPG']);
        expect(actions[0].avgDowntimeMin).toBe(105);
        expect(actions[0].prevention).toBe('Controllo mensile tenuta');
    });

    it('piu\' conferme indipendenti aumentano la fiducia', () => {
        const one = aggregateActions(selectCases(query, [cases[0]]));
        const two = aggregateActions(selectCases(query, [cases[0], cases[1]]));
        expect(two[0].confidence).toBeGreaterThan(one[0].confidence);
    });

    it('i casi senza soluzione non producono azioni', () => {
        const noSol = cases.map(c => ({ ...c, solution: null }));
        expect(aggregateActions(selectCases(query, noSol))).toEqual([]);
    });
});
