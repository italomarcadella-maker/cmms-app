// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { byUrgency, priorityRank, PRIORITY_ORDER } from '@/modules/maintenance/domain/priority';
import { parseActivities } from '@/modules/maintenance/domain/checklist';
import { makeFulfillPurchaseRequest } from '@/modules/inventory/domain/use-cases/fulfill-purchase-request';

describe('urgenza delle priorita\'', () => {
    it('i fermi macchina vengono prima di tutto, le priorita\' basse per ultime', () => {
        expect(priorityRank('STOPPED')).toBeLessThan(priorityRank('MALFUNCTIONING'));
        expect(priorityRank('MALFUNCTIONING')).toBeLessThan(priorityRank('HIGH'));
        expect(priorityRank('HIGH')).toBeLessThan(priorityRank('MEDIUM'));
        expect(priorityRank('MEDIUM')).toBeLessThan(priorityRank('LOW'));
        expect(priorityRank('SCONOSCIUTA')).toBe(PRIORITY_ORDER.length);
    });

    it('ordina per urgenza e, a parita\', per anzianita\'', () => {
        const d = (s: string) => new Date(`2026-01-${s}T10:00:00Z`);
        const orders = [
            { id: 'a', priority: 'LOW', createdAt: d('01') },
            { id: 'b', priority: 'STOPPED', createdAt: d('09') },
            { id: 'c', priority: 'MEDIUM', createdAt: d('05') },
            { id: 'd', priority: 'STOPPED', createdAt: d('03') },
        ];
        expect([...orders].sort(byUrgency).map(o => o.id)).toEqual(['d', 'b', 'c', 'a']);
    });
});

describe('attivita\' dei piani preventivi', () => {
    it('legge elenchi di testi o di oggetti con etichetta', () => {
        expect(parseActivities('["Controllo olio","Pulizia filtro"]')).toEqual(['Controllo olio', 'Pulizia filtro']);
        expect(parseActivities('[{"label":"Serraggio"},{"label":" "},{"x":1}]')).toEqual(['Serraggio']);
    });

    it('un valore non valido non fa mai fallire: restituisce un elenco vuoto', () => {
        expect(parseActivities('non e\' json')).toEqual([]);
        expect(parseActivities('{"a":1}')).toEqual([]);
        expect(parseActivities(null)).toEqual([]);
        expect(parseActivities(undefined)).toEqual([]);
    });
});

describe('ricevimento merce', () => {
    const repo = (outcome: 'RECEIVED' | 'NOT_FOUND' | 'ALREADY_RECEIVED') => ({
        receive: async () => outcome,
    } as never);

    it('riesce una volta sola: il secondo tentativo viene rifiutato', async () => {
        let first = true;
        const requestRepo = { receive: async () => { const o = first ? 'RECEIVED' : 'ALREADY_RECEIVED'; first = false; return o; } } as never;
        const fulfill = makeFulfillPurchaseRequest(requestRepo);
        expect((await fulfill('r1')).success).toBe(true);
        const second = await fulfill('r1');
        expect(second.success).toBe(false);
        expect(second.message).toMatch(/ricevuta/);
    });

    it('segnala una richiesta inesistente', async () => {
        const r = await makeFulfillPurchaseRequest(repo('NOT_FOUND'))('x');
        expect(r.success).toBe(false);
        expect(r.message).toMatch(/non trovata/);
    });
});
