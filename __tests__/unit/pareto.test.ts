// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
    DEFAULT_PARETO_WEIGHTS,
    buildPareto,
    eventPoints,
    normalizeParetoMetric,
    normalizeParetoMonths,
    normalizeParetoWeights,
    type ParetoEvent,
} from '@/modules/maintenance/domain/pareto';

const ev = (assetId: string, over: Partial<ParetoEvent> = {}): ParetoEvent => ({
    assetId,
    assetName: `Macchina ${assetId}`,
    department: 'Estrusione',
    line: 'L1',
    type: 'FAULT',
    priority: 'MEDIUM',
    category: 'MECHANICAL',
    hours: 0,
    cost: 0,
    ...over,
});
/** n guasti normali sulla macchina */
const faults = (assetId: string, n: number, over: Partial<ParetoEvent> = {}) => Array.from({ length: n }, () => ev(assetId, over));

describe('pesi', () => {
    it('usa i predefiniti se la configurazione manca o non e\' valida', () => {
        expect(normalizeParetoWeights(null)).toEqual(DEFAULT_PARETO_WEIGHTS);
        expect(normalizeParetoWeights(undefined)).toEqual({ faultWeight: 1, stoppedFaultWeight: 2, requestWeight: 0.5 });
        expect(normalizeParetoWeights('x')).toEqual(DEFAULT_PARETO_WEIGHTS);
        expect(normalizeParetoWeights([1, 2, 3])).toEqual(DEFAULT_PARETO_WEIGHTS);
        expect(normalizeParetoWeights({ faultWeight: 'a', stoppedFaultWeight: -1, requestWeight: NaN })).toEqual(DEFAULT_PARETO_WEIGHTS);
    });

    it('legge i pesi validi, anche dentro "weights", e scarta solo quelli non validi', () => {
        expect(normalizeParetoWeights({ faultWeight: 3, stoppedFaultWeight: 5, requestWeight: 1 })).toEqual({ faultWeight: 3, stoppedFaultWeight: 5, requestWeight: 1 });
        expect(normalizeParetoWeights({ weights: { faultWeight: 2 } })).toEqual({ faultWeight: 2, stoppedFaultWeight: 2, requestWeight: 0.5 });
        expect(normalizeParetoWeights({ faultWeight: 4, requestWeight: 'x' })).toEqual({ faultWeight: 4, stoppedFaultWeight: 2, requestWeight: 0.5 });
    });

    it('tre pesi a zero tornano ai predefiniti', () => {
        expect(normalizeParetoWeights({ faultWeight: 0, stoppedFaultWeight: 0, requestWeight: 0 })).toEqual(DEFAULT_PARETO_WEIGHTS);
    });

    it('periodo e metrica non validi tornano ai predefiniti', () => {
        expect(normalizeParetoMonths(6)).toBe(6);
        expect(normalizeParetoMonths('3')).toBe(3);
        expect(normalizeParetoMonths(24)).toBe(12);
        expect(normalizeParetoMonths(undefined)).toBe(12);
        expect(normalizeParetoMetric('COST')).toBe('COST');
        expect(normalizeParetoMetric('DOWNTIME')).toBe('EVENTS');
    });

    it('punti-evento: guasto 1, guasto fermo 2, richiesta 0,5', () => {
        expect(eventPoints({ type: 'FAULT', priority: 'HIGH' }, DEFAULT_PARETO_WEIGHTS)).toBe(1);
        expect(eventPoints({ type: 'FAULT', priority: 'STOPPED' }, DEFAULT_PARETO_WEIGHTS)).toBe(2);
        expect(eventPoints({ type: 'REQUEST', priority: 'STOPPED' }, DEFAULT_PARETO_WEIGHTS)).toBe(0.5);
    });
});

describe('buildPareto: casi limite', () => {
    it('nessun dato: stato insufficiente, nessuna riga', () => {
        const r = buildPareto([], 'EVENTS');
        expect(r.insufficient).toBe(true);
        expect(r.rows).toEqual([]);
        expect(r.totalEvents).toBe(0);
        expect(r.vitalCount).toBe(0);
    });

    it('meno di 3 eventi: dati insufficienti anche se ci sono valori', () => {
        const r = buildPareto([ev('A'), ev('B')], 'EVENTS');
        expect(r.insufficient).toBe(true);
        expect(r.rows).toEqual([]);
        expect(r.totalEvents).toBe(2);
    });

    it('esattamente 3 eventi bastano', () => {
        const r = buildPareto([ev('A'), ev('A'), ev('B')], 'EVENTS');
        expect(r.insufficient).toBe(false);
        expect(r.rows.map(x => x.assetId)).toEqual(['A', 'B']);
    });

    it('una sola macchina: una riga, 100%, vitale', () => {
        const r = buildPareto(faults('A', 4), 'EVENTS');
        expect(r.rows).toHaveLength(1);
        expect(r.rows[0]).toMatchObject({ assetId: 'A', value: 4, sharePct: 100, cumulativePct: 100, vital: true });
        expect(r.vitalCount).toBe(1);
        expect(r.vitalSharePct).toBe(100);
    });

    it('tutte a parita\': stesso valore, ordine per nome, vitali fino al 80%', () => {
        // 5 macchine da 2 punti: 20% ciascuna; cumulata 20,40,60,80,100 -> vitali le prime 4
        const events = ['E', 'D', 'C', 'B', 'A'].flatMap(id => faults(id, 2));
        const r = buildPareto(events, 'EVENTS');
        expect(r.rows.map(x => x.assetId)).toEqual(['A', 'B', 'C', 'D', 'E']);
        expect(r.rows.map(x => x.cumulativePct)).toEqual([20, 40, 60, 80, 100]);
        expect(r.rows.map(x => x.vital)).toEqual([true, true, true, true, false]);
        expect(r.vitalCount).toBe(4);
    });

    it('soglia 80% esatta: la riga che la raggiunge e\' l\'ultima vitale', () => {
        // 40 + 40 + 10 + 10 = 100: dopo due righe esattamente 80%
        const events = [...faults('A', 4), ...faults('B', 4), ...faults('C', 1), ...faults('D', 1)];
        // valori in punti: 4,4,1,1 -> totale 10, 40%+40% = 80%
        const r = buildPareto(events, 'EVENTS');
        expect(r.rows.map(x => x.assetId)).toEqual(['A', 'B', 'C', 'D']);
        expect(r.rows[1].cumulativePct).toBe(80);
        expect(r.rows.map(x => x.vital)).toEqual([true, true, false, false]);
        expect(r.vitalCount).toBe(2);
        expect(r.vitalSharePct).toBe(80);
    });

    it('soglia superata solo dalla riga successiva: quella riga e\' vitale', () => {
        // 5,3,1,1 = 10: 50, 80 (esatto)... uso 4,3,2,1: 40,70,90 -> vitali le prime tre
        const events = [...faults('A', 4), ...faults('B', 3), ...faults('C', 2), ...faults('D', 1)];
        const r = buildPareto(events, 'EVENTS');
        expect(r.rows.map(x => x.vital)).toEqual([true, true, true, false]);
        expect(r.vitalCount).toBe(3);
    });

    it('la prima macchina supera da sola l\'80%: e\' l\'unica vitale (minimo una)', () => {
        const events = [...faults('A', 9), ...faults('B', 1)];
        const r = buildPareto(events, 'EVENTS');
        expect(r.rows.map(x => x.vital)).toEqual([true, false]);
        expect(r.vitalCount).toBe(1);
    });

    it('somma di decimali che sfiora l\'80%: nessun errore di arrotondamento', () => {
        // costi 0,1 + 0,2 + 0,3 + ... non devono far saltare la soglia
        const events = [
            ev('A', { cost: 0.7 }), ev('B', { cost: 0.1 }), ev('B', { cost: 0.1 }), ev('C', { cost: 0.1 }),
        ];
        // totale 1,0: A 0,7 -> 70%; B 0,2 -> cumulata 90%
        const r = buildPareto(events, 'COST');
        expect(r.totalValue).toBe(1);
        expect(r.rows.map(x => x.vital)).toEqual([true, true, false]);
    });

    it('macchine con valore zero escluse; se tutte a zero niente righe ma non "insufficiente"', () => {
        const events = [ev('A', { hours: 5 }), ev('B'), ev('C')];
        const r = buildPareto(events, 'HOURS');
        expect(r.rows.map(x => x.assetId)).toEqual(['A']);
        expect(r.machinesWithEvents).toBe(3);
        expect(r.machines).toBe(1);

        const none = buildPareto([ev('A'), ev('B'), ev('C')], 'HOURS');
        expect(none.insufficient).toBe(false);
        expect(none.rows).toEqual([]);
        expect(none.totalEvents).toBe(3);
        expect(none.totalValue).toBe(0);
    });
});

describe('buildPareto: metriche', () => {
    const events: ParetoEvent[] = [
        ev('A', { type: 'FAULT', priority: 'STOPPED', hours: 2.5, cost: 100, category: 'ELECTRICAL' }),
        ev('A', { type: 'FAULT', priority: 'LOW', hours: 1, cost: 50.25, category: 'MECHANICAL' }),
        ev('A', { type: 'REQUEST', hours: 0.5, cost: 0, category: 'MECHANICAL' }),
        ev('B', { type: 'FAULT', priority: 'HIGH', hours: 10, cost: 10, category: 'HYDRAULIC' }),
        ev('B', { type: 'REQUEST', hours: 0, cost: 0, category: 'HYDRAULIC' }),
    ];

    it('interventi pesati: punti separati tra guasti e richieste', () => {
        const r = buildPareto(events, 'EVENTS');
        // A: 2 + 1 + 0,5 = 3,5 ; B: 1 + 0,5 = 1,5
        expect(r.rows.map(x => [x.assetId, x.value])).toEqual([['A', 3.5], ['B', 1.5]]);
        expect(r.rows[0]).toMatchObject({ faultValue: 3, requestValue: 0.5, faults: 2, stoppedFaults: 1, requests: 1 });
        expect(r.totalValue).toBe(5);
        expect(r.totalFaults).toBe(3);
        expect(r.totalStoppedFaults).toBe(1);
        expect(r.totalRequests).toBe(2);
        expect(r.rows[0].sharePct).toBeCloseTo(70, 10);
        expect(r.rows[0].categories).toEqual([{ category: 'MECHANICAL', count: 2 }, { category: 'ELECTRICAL', count: 1 }]);
    });

    it('rispetta i pesi passati come parametro', () => {
        const r = buildPareto(events, 'EVENTS', { faultWeight: 1, stoppedFaultWeight: 10, requestWeight: 0 });
        // A: 10 + 1 + 0 = 11 ; B: 1
        expect(r.rows.map(x => x.value)).toEqual([11, 1]);
    });

    it('ore di lavoro: B davanti ad A', () => {
        const r = buildPareto(events, 'HOURS');
        expect(r.rows.map(x => [x.assetId, x.value])).toEqual([['B', 10], ['A', 4]]);
    });

    it('costo: somma in euro arrotondata ai centesimi', () => {
        const r = buildPareto(events, 'COST');
        expect(r.rows.map(x => [x.assetId, x.value])).toEqual([['A', 150.25], ['B', 10]]);
        expect(r.totalValue).toBe(160.25);
    });

    it('ore e costi negativi o non numerici non entrano', () => {
        const r = buildPareto([ev('A', { hours: -3, cost: NaN }), ev('A', { hours: 2, cost: 5 }), ev('B', { hours: 1 })], 'HOURS');
        expect(r.rows.map(x => [x.assetId, x.value])).toEqual([['A', 2], ['B', 1]]);
    });

    it('a parita\' di valore decide il punteggio, poi il nome', () => {
        // stessa ora (1): A ha un guasto (1 punto), B ha un guasto fermo (2 punti) -> B prima
        const r = buildPareto([
            ev('A', { hours: 1 }), ev('B', { hours: 1, priority: 'STOPPED' }), ev('C', { hours: 1 }),
        ], 'HOURS');
        expect(r.rows.map(x => x.assetId)).toEqual(['B', 'A', 'C']);
    });
});

describe('buildPareto: limite di 15 macchine e riga "Altre"', () => {
    // 20 macchine: la i-esima (da 0) ha (20 - i) guasti
    const many = Array.from({ length: 20 }, (_, i) => faults(`M${String(i + 1).padStart(2, "0")}`, 20 - i)).flat();

    it('15 righe + "Altre 5 macchine", entra nella cumulata', () => {
        const r = buildPareto(many, 'EVENTS');
        expect(r.rows).toHaveLength(16);
        const others = r.rows[15];
        expect(others).toMatchObject({ isOthers: true, assetId: null, name: 'Altre 5 macchine', machineCount: 5, vital: false });
        // ultime 5 macchine: 5+4+3+2+1 = 15 guasti
        expect(others.value).toBe(15);
        expect(others.cumulativePct).toBe(100);
        expect(r.rows[14].cumulativePct).toBeLessThan(100);
        expect(r.machines).toBe(20);
        const sum = r.rows.reduce((s, x) => s + x.value, 0);
        expect(sum).toBe(r.totalValue);
        expect(others.categories).toEqual([{ category: 'MECHANICAL', count: 15 }]);
    });

    it('con una sola macchina oltre il limite il nome e\' al singolare', () => {
        const events = Array.from({ length: 16 }, (_, i) => faults(`M${String(i + 1).padStart(2, '0')}`, 20 - i)).flat();
        const r = buildPareto(events, 'EVENTS');
        expect(r.rows).toHaveLength(16);
        expect(r.rows[15].name).toBe('Altra macchina');
    });

    it('esattamente 15 macchine: nessuna riga "Altre"', () => {
        const events = Array.from({ length: 15 }, (_, i) => faults(`M${String(i + 1).padStart(2, '0')}`, 2)).flat();
        const r = buildPareto(events, 'EVENTS');
        expect(r.rows).toHaveLength(15);
        expect(r.rows.some(x => x.isOthers)).toBe(false);
        expect(r.rows[14].cumulativePct).toBe(100);
    });

    it('le poche vitali possono superare il limite delle righe mostrate: vitalCount le conta tutte', () => {
        // 20 macchine pari: servono 16 macchine per l'80%
        const events = Array.from({ length: 20 }, (_, i) => faults(`M${String(i + 1).padStart(2, '0')}`, 2)).flat();
        const r = buildPareto(events, 'EVENTS');
        expect(r.vitalCount).toBe(16);
        expect(r.rows.filter(x => x.vital)).toHaveLength(15);
        expect(r.rows[15].vital).toBe(false);
    });

    it('rispetta un limite diverso passato come opzione', () => {
        const r = buildPareto(many, 'EVENTS', DEFAULT_PARETO_WEIGHTS, { maxMachines: 3 });
        expect(r.rows).toHaveLength(4);
        expect(r.rows[3].machineCount).toBe(17);
    });
});

describe('pesi dalla configurazione di salute', () => {
    it('legge i punti-evento salvati in eventPoints dalla configurazione di salute degli asset', async () => {
        const { normalizeParetoWeights } = await import('@/modules/maintenance/domain/pareto');
        expect(normalizeParetoWeights({ eventPoints: { fault: 2, stoppingFault: 5, request: 1 } })).toEqual({ faultWeight: 2, stoppedFaultWeight: 5, requestWeight: 1 });
    });
});
