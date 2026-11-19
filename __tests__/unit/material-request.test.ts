// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
    MAX_ITEMS, MAX_QUANTITY, canTransition, isOpenMaterialStatus, normalizeMaterialItems, parseNeededBy, staleStatusMessage, statesBefore,
} from '@/modules/inventory/domain/material-request';

describe('richieste di materiale: stati', () => {
    it('ammette solo i passaggi previsti', () => {
        expect(canTransition('REQUESTED', 'READY')).toBe(true);
        expect(canTransition('REQUESTED', 'DELIVERED')).toBe(true);
        expect(canTransition('READY', 'DELIVERED')).toBe(true);
        expect(canTransition('REQUESTED', 'REJECTED')).toBe(true);
        expect(canTransition('READY', 'REJECTED')).toBe(true);
        expect(canTransition('REQUESTED', 'CANCELED')).toBe(true);
    });

    it('niente marcia indietro e gli stati finali restano tali', () => {
        expect(canTransition('READY', 'REQUESTED' as never)).toBe(false);
        expect(canTransition('READY', 'READY')).toBe(false);
        expect(canTransition('READY', 'CANCELED')).toBe(false);
        for (const done of ['DELIVERED', 'REJECTED', 'CANCELED']) {
            for (const to of ['READY', 'DELIVERED', 'REJECTED', 'CANCELED'] as const) expect(canTransition(done, to), `${done} -> ${to}`).toBe(false);
        }
        expect(canTransition('INVENTATO', 'READY')).toBe(false);
    });

    it('statesBefore elenca gli stati di partenza validi', () => {
        expect(statesBefore('READY')).toEqual(['REQUESTED']);
        expect(statesBefore('DELIVERED')).toEqual(['REQUESTED', 'READY']);
        expect(statesBefore('REJECTED')).toEqual(['REQUESTED', 'READY']);
        expect(statesBefore('CANCELED')).toEqual(['REQUESTED']);
    });

    it('le richieste aperte sono quelle da lavorare', () => {
        expect(isOpenMaterialStatus('REQUESTED')).toBe(true);
        expect(isOpenMaterialStatus('READY')).toBe(true);
        expect(isOpenMaterialStatus('DELIVERED')).toBe(false);
    });

    it('il messaggio di stato superato nomina lo stato attuale', () => {
        expect(staleStatusMessage('DELIVERED')).toContain('Consegnata');
        expect(staleStatusMessage('boh')).toMatch(/non è più modificabile/);
    });
});

describe('richieste di materiale: righe', () => {
    it('accetta righe da magazzino e righe libere, ripulendo gli spazi', () => {
        const res = normalizeMaterialItems([
            { partId: ' abc ', quantity: 3 },
            { description: '  Guanti taglia L ', quantity: 10 },
        ]);
        expect(res).toEqual({ items: [{ partId: 'abc', description: '', quantity: 3 }, { partId: null, description: 'Guanti taglia L', quantity: 10 }] });
    });

    it('serve almeno una riga e al massimo il limite', () => {
        expect(normalizeMaterialItems([])).toHaveProperty('error');
        expect(normalizeMaterialItems(undefined)).toHaveProperty('error');
        const many = Array.from({ length: MAX_ITEMS + 1 }, () => ({ description: 'x', quantity: 1 }));
        expect(normalizeMaterialItems(many)).toHaveProperty('error');
        expect(normalizeMaterialItems(many.slice(0, MAX_ITEMS))).toHaveProperty('items');
    });

    it('la quantità è intera da 1 al massimo', () => {
        for (const q of [0, -1, 1.5, MAX_QUANTITY + 1, Number.NaN, Infinity, '2' as unknown as number]) {
            expect(normalizeMaterialItems([{ description: 'x', quantity: q }]), String(q)).toHaveProperty('error');
        }
        expect(normalizeMaterialItems([{ description: 'x', quantity: MAX_QUANTITY }])).toHaveProperty('items');
    });

    it('senza articolo la descrizione è obbligatoria', () => {
        expect(normalizeMaterialItems([{ description: '   ', quantity: 1 }])).toHaveProperty('error');
        expect(normalizeMaterialItems([{ partId: '', quantity: 1 }])).toHaveProperty('error');
    });

    it('limita la lunghezza della descrizione', () => {
        const res = normalizeMaterialItems([{ description: 'a'.repeat(500), quantity: 1 }]);
        expect('items' in res && res.items[0].description.length).toBe(200);
    });
});

describe('richieste di materiale: data di necessità', () => {
    it('vuota = nessuna data', () => {
        expect(parseNeededBy(undefined)).toBeNull();
        expect(parseNeededBy('  ')).toBeNull();
    });

    it('legge una data valida a mezzogiorno', () => {
        const d = parseNeededBy('2026-12-24');
        expect(d).toBeInstanceOf(Date);
        expect((d as Date).getFullYear()).toBe(2026);
        expect((d as Date).getMonth()).toBe(11);
        expect((d as Date).getDate()).toBe(24);
        expect((d as Date).getHours()).toBe(12);
    });

    it('rifiuta formati sbagliati e date inesistenti', () => {
        for (const v of ['24/12/2026', '2026-13-01', '2026-02-31', 'domani', '2026-1-1']) expect(parseNeededBy(v), v).toBe('invalid');
    });
});
