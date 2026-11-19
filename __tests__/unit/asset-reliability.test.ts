// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
    computeReliability,
    effectiveRate,
    laborCost,
    findStoppingFault,
    planStatus,
    planDaysOverdue,
    frequencyLabel,
    normalizeHistoryKind,
    normalizeHistoryPage,
    type ClosedFault,
} from '@/modules/maintenance/domain/asset-reliability';

const NOW = new Date('2026-11-19T10:00:00Z');
const fault = (createdAt: string, hours: number[] = [], parts: [number, number][] = [], tech = 't1'): ClosedFault => ({
    createdAt,
    laborLogs: hours.map(h => ({ hours: h, technicianId: tech })),
    partsUsed: parts.map(([quantity, unitCost]) => ({ quantity, unitCost })),
});

describe('indicatori di affidabilita\'', () => {
    it('senza guasti tutto e\' nullo o zero: niente valori inventati', () => {
        const r = computeReliability([], new Map(), 30, NOW);
        expect(r).toMatchObject({ faultsLast12Months: 0, faultsTotal: 0, mtbfDays: null, mttrHours: null, daysSinceLastFault: null, lastFaultAt: null, totalCost: 0 });
    });

    it('un solo guasto: MTBF non calcolabile', () => {
        const r = computeReliability([fault('2026-11-09T10:00:00Z', [2])], new Map(), 30, NOW);
        expect(r.mtbfDays).toBeNull();
        expect(r.faultsTotal).toBe(1);
        expect(r.mttrHours).toBe(2);
        expect(r.daysSinceLastFault).toBe(10);
    });

    it('MTBF e\' la media degli intervalli tra guasti consecutivi, anche se l\'elenco e\' disordinato', () => {
        const r = computeReliability(
            [fault('2026-10-01T00:00:00Z'), fault('2026-08-01T00:00:00Z'), fault('2026-09-01T00:00:00Z')],
            new Map(), 30, NOW
        );
        // 31 giorni (ago-set) e 30 giorni (set-ott): media 30,5
        expect(r.mtbfDays).toBeCloseTo(30.5, 5);
    });

    it('conta i guasti degli ultimi 12 mesi e il totale', () => {
        const r = computeReliability(
            [fault('2024-01-10T00:00:00Z'), fault('2025-10-01T00:00:00Z'), fault('2025-11-25T00:00:00Z'), fault('2026-05-05T00:00:00Z')],
            new Map(), 30, NOW
        );
        expect(r.faultsTotal).toBe(4);
        expect(r.faultsLast12Months).toBe(2); // 25/11/2025 e 05/05/2026; 01/10/2025 e' oltre i 12 mesi
        expect(r.lastFaultAt).toBe('2026-05-05T00:00:00.000Z');
    });

    it('MTTR considera solo gli interventi con ore registrate', () => {
        const r = computeReliability([fault('2026-01-01T00:00:00Z', [1, 2]), fault('2026-02-01T00:00:00Z', [5]), fault('2026-03-01T00:00:00Z')], new Map(), 30, NOW);
        expect(r.faultsWithHours).toBe(2);
        expect(r.mttrHours).toBe(4); // (3 + 5) / 2, il guasto senza ore non conta
    });

    it('MTTR nullo se nessun intervento ha ore', () => {
        const r = computeReliability([fault('2026-01-01T00:00:00Z'), fault('2026-02-01T00:00:00Z', [0])], new Map(), 30, NOW);
        expect(r.mttrHours).toBeNull();
    });

    it('il costo somma ricambi e manodopera con la tariffa del tecnico, altrimenti quella predefinita', () => {
        const rates = new Map([['t1', 40], ['t2', 0]]);
        const r = computeReliability(
            [
                fault('2026-01-01T00:00:00Z', [2], [[3, 10]], 't1'), // 2 x 40 + 30 = 110
                fault('2026-02-01T00:00:00Z', [1], [], 't2'), // tariffa 0: predefinita 25 -> 25
                fault('2026-03-01T00:00:00Z', [2], [], 'sconosciuto'), // tecnico non noto: 2 x 25 = 50
            ],
            rates, 25, NOW
        );
        expect(r.totalCost).toBe(185);
    });

    it('l\'ultimo guasto di oggi vale 0 giorni', () => {
        const r = computeReliability([fault('2026-11-19T08:00:00Z')], new Map(), 30, NOW);
        expect(r.daysSinceLastFault).toBe(0);
    });
});

describe('tariffe', () => {
    it('la tariffa del tecnico vale solo se maggiore di zero', () => {
        expect(effectiveRate(35, 20)).toBe(35);
        expect(effectiveRate(0, 20)).toBe(20);
        expect(effectiveRate(null, 20)).toBe(20);
        expect(effectiveRate(undefined, 20)).toBe(20);
    });

    it('manodopera: ore per tariffa', () => {
        expect(laborCost([{ hours: 1.5, technicianId: 'a' }, { hours: 1, technicianId: null }], new Map([['a', 40]]), 20)).toBe(80);
    });
});

describe('guasto che ferma la macchina', () => {
    const f = (id: string, priority: string, createdAt: string) => ({ id, priority, createdAt });
    it('c\'e\' solo con una priorita\' STOPPED', () => {
        expect(findStoppingFault([f('a', 'HIGH', '2026-11-01'), f('b', 'MALFUNCTIONING', '2026-11-02')])).toBeNull();
        expect(findStoppingFault([])).toBeNull();
    });
    it('con piu\' fermi indica il piu\' vecchio', () => {
        expect(findStoppingFault([f('a', 'STOPPED', '2026-11-05'), f('b', 'STOPPED', '2026-11-02')])?.id).toBe('b');
    });
});

describe('stato dei piani', () => {
    it('in ritardo solo se la scadenza e\' precedente a oggi', () => {
        expect(planStatus(new Date(2026, 10, 18), new Date(2026, 10, 19, 10))).toBe('OVERDUE');
        expect(planStatus(new Date(2026, 10, 19, 8), new Date(2026, 10, 19, 10))).toBe('ON_TIME');
        expect(planStatus(new Date(2026, 10, 25), new Date(2026, 10, 19, 10))).toBe('ON_TIME');
    });
    it('giorni di ritardo', () => {
        expect(planDaysOverdue(new Date(2026, 10, 16), new Date(2026, 10, 19, 10))).toBe(3);
        expect(planDaysOverdue(new Date(2026, 10, 25), new Date(2026, 10, 19, 10))).toBe(0);
    });
    it('frequenze note in italiano, testo libero invariato', () => {
        expect(frequencyLabel('MONTHLY')).toBe('Mensile');
        expect(frequencyLabel('semiannual')).toBe('Semestrale');
        expect(frequencyLabel('Ogni 45 giorni')).toBe('Ogni 45 giorni');
        expect(frequencyLabel('')).toBe('Non indicata');
    });
});

describe('parametri dello storico', () => {
    it('tipo e pagina non validi tornano ai valori predefiniti', () => {
        expect(normalizeHistoryKind('FAULT')).toBe('FAULT');
        expect(normalizeHistoryKind('DROP TABLE')).toBe('ALL');
        expect(normalizeHistoryKind(undefined)).toBe('ALL');
        expect(normalizeHistoryPage(3)).toBe(3);
        expect(normalizeHistoryPage(0)).toBe(1);
        expect(normalizeHistoryPage(-4)).toBe(1);
        expect(normalizeHistoryPage('abc')).toBe(1);
        expect(normalizeHistoryPage(2.7)).toBe(2);
    });
});
