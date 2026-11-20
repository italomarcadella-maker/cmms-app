import { describe, expect, it } from 'vitest';
import { MAX_SUGGESTIONS, rankWarehouseParts, scoreWarehouseCandidate } from '@/modules/inventory/domain/warehouse-search';

const parts = [
    { id: '1', name: 'Guanti in nitrile taglia L' },
    { id: '2', name: 'Guanti da lavoro cotone' },
    { id: '3', name: 'Cuscinetto 6205 2RS' },
    { id: '4', name: 'Cuscinetto 6204 2RS' },
    { id: '5', name: 'Filtro olio idraulico', description: 'Cartuccia di ricambio per centralina oleodinamica' },
    { id: '6', name: 'Cacciavite a taglio' },
];
const ids = (q: string) => rankWarehouseParts(q, parts).map(m => m.item.id);

describe('suggerimento dei materiali del magazzino', () => {
    it('trova l\'articolo anche se le parole sono diverse o in altro ordine', () => {
        expect(ids('guanti nitrile L')[0]).toBe('1');
        expect(ids('taglia L guanti nitrile')[0]).toBe('1');
    });

    it('ignora maiuscole, accenti e plurali', () => {
        expect(ids('GUANTO NITRILE')[0]).toBe('1');
        expect(ids('cuscinetti 6205')[0]).toBe('3');
    });

    it('suggerisce mentre si digita una parola a meta\'', () => {
        expect(ids('guan')).toContain('1');
        expect(ids('guan')).toContain('2');
        expect(ids('cusci 62')).toContain('3');
    });

    it('un codice diverso non e\' lo stesso articolo', () => {
        const [first] = rankWarehouseParts('cuscinetto 6205', parts);
        expect(first.item.id).toBe('3');
        const other = rankWarehouseParts('cuscinetto 6205', parts).find(m => m.item.id === '4');
        // il 6204 non deve essere "consigliato" per il 6205
        expect(other?.strong ?? false).toBe(false);
    });

    it('la corrispondenza esatta vale 1 ed e\' consigliata', () => {
        const [first] = rankWarehouseParts('Filtro olio idraulico', parts);
        expect(first.item.id).toBe('5');
        expect(first.score).toBe(1);
        expect(first.strong).toBe(true);
    });

    it('cerca anche nella descrizione, con meno peso del nome', () => {
        const byDescription = rankWarehouseParts('cartuccia centralina oleodinamica', parts)[0];
        expect(byDescription.item.id).toBe('5');
        expect(scoreWarehouseCandidate('cartuccia centralina oleodinamica', parts[4])).toBeLessThanOrEqual(0.7 + 1e-9);
    });

    it('niente suggerimenti per testi senza parole utili o senza corrispondenze', () => {
        expect(ids('')).toEqual([]);
        expect(ids('   ')).toEqual([]);
        expect(ids('di per con')).toEqual([]); // solo parole vuote
        expect(ids('xyzzy qwerty')).toEqual([]);
    });

    it('ordina dal piu\' adatto e a parita\' per nome, e limita il numero di risultati', () => {
        const many = Array.from({ length: 30 }, (_, i) => ({ id: String(i), name: `Guanti nitrile ${String.fromCharCode(65 + (i % 26))}${i}` }));
        const out = rankWarehouseParts('guanti nitrile', many);
        expect(out).toHaveLength(MAX_SUGGESTIONS);
        for (let i = 1; i < out.length; i++) expect(out[i - 1].score).toBeGreaterThanOrEqual(out[i].score);
    });
});
