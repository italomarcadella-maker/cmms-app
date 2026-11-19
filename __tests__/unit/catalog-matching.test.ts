// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { normalizeKey, similarity, rankMatches, findSameItem, tokenize } from '@/modules/inventory/domain/catalog-matching';

describe('normalizzazione delle descrizioni', () => {
    it('ignora maiuscole, accenti, punteggiatura e ordine', () => {
        expect(normalizeKey('Cuscinetto SKF 6205-2RS')).toBe(normalizeKey('skf   cuscinetto, 6205 2rs'));
    });

    it('riduce i plurali italiani', () => {
        expect(normalizeKey('Guarnizioni cilindro')).toBe(normalizeKey('guarnizione cilindro'));
        expect(tokenize('Cuscinetti')).toEqual(tokenize('cuscinetto'));
    });

    it('non altera i codici con cifre', () => {
        expect(tokenize('6205')).toEqual(['6205']);
    });

    it('scarta le parole vuote', () => {
        expect(tokenize('Filtro per aria con cartuccia')).not.toContain('per');
    });
});

describe('somiglianza', () => {
    it('stesso articolo scritto in modo diverso: alta', () => {
        expect(similarity('Cuscinetto SKF 6205 2RS', 'cuscinetto 6205-2rs skf')).toBeGreaterThanOrEqual(0.85);
    });

    it('codici diversi: articoli diversi anche se il resto coincide', () => {
        expect(similarity('Cuscinetto SKF 6205', 'Cuscinetto SKF 6204')).toBeLessThan(0.5);
    });

    it('una sola parola generica in comune non basta', () => {
        expect(similarity('Filtro aria compressore Kaeser', 'Filtro olio idraulico Parker')).toBeLessThan(0.5);
    });

    it('stringhe vuote: zero', () => {
        expect(similarity('', 'qualcosa')).toBe(0);
    });
});

describe('ricerca nel catalogo', () => {
    const catalog = [
        { id: '1', name: 'Cuscinetto SKF 6205 2RS' },
        { id: '2', name: 'Cuscinetto SKF 6204 2RS' },
        { id: '3', name: 'Guarnizione cilindro pneumatico 40 mm' },
        { id: '4', name: 'Filtro aria compressore' },
    ];

    it('trova le corrispondenze con parole digitate parzialmente', () => {
        const r = rankMatches('cuscinetto 6205', catalog);
        expect(r[0].id).toBe('1');
        expect(r.some(x => x.id === '2')).toBe(false);
    });

    it('la corrispondenza esatta e\' la prima', () => {
        expect(rankMatches('filtro aria compressore', catalog)[0].id).toBe('4');
    });

    it('findSameItem riconosce lo stesso articolo ma non uno simile', () => {
        expect(findSameItem('SKF cuscinetto 6205-2RS', catalog)?.id).toBe('1');
        expect(findSameItem('Cuscinetto SKF 6306', catalog)).toBeNull();
    });
});
