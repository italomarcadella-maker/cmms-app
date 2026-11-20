// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
    evaluateLine,
    inventoryAdjustment,
    isValidCountedQty,
    lineVariance,
    lineVarianceValue,
    parseCountedInput,
    summarizeCount,
} from '@/modules/inventory/domain/stock-count';
import {
    buildCsv,
    csvField,
    formatSignedQty,
    isStockMovementType,
    movementTypeLabel,
    parseMovementReference,
} from '@/modules/inventory/domain/stock-movement';

describe('scostamento per riga', () => {
    it('contato meno atteso, null se non contata', () => {
        expect(lineVariance(10, 7)).toBe(-3);
        expect(lineVariance(10, 12)).toBe(2);
        expect(lineVariance(10, 10)).toBe(0);
        expect(lineVariance(10, null)).toBeNull();
        expect(lineVariance(10, undefined)).toBeNull();
    });

    it('zero contato e\' una riga contata (diversa da non contata)', () => {
        const r = evaluateLine({ expectedQty: 4, countedQty: 0, unitCost: 2 });
        expect(r.counted).toBe(true);
        expect(r.variance).toBe(-4);
        expect(r.varianceValue).toBe(-8);
    });

    it('il valore richiede un costo unitario maggiore di zero', () => {
        expect(lineVarianceValue(-3, 2.5)).toBe(-7.5);
        expect(lineVarianceValue(-3, 0)).toBeNull();
        expect(lineVarianceValue(-3, null)).toBeNull();
        expect(lineVarianceValue(-3, undefined)).toBeNull();
        expect(lineVarianceValue(-3, -1)).toBeNull();
        expect(lineVarianceValue(-3, Number.NaN)).toBeNull();
        expect(lineVarianceValue(null, 5)).toBeNull();
    });

    it('arrotonda al centesimo', () => {
        expect(lineVarianceValue(3, 0.335)).toBe(1.01);
        expect(lineVarianceValue(1, 1.005)).toBe(1.01);
        expect(lineVarianceValue(7, 0.1)).toBe(0.7);
    });
});

describe('totali di un inventario', () => {
    const lines = [
        { expectedQty: 10, countedQty: 8, unitCost: 2 },      // -2 pz, -4,00
        { expectedQty: 5, countedQty: 9, unitCost: 1.5 },     // +4 pz, +6,00
        { expectedQty: 3, countedQty: 3, unitCost: 10 },      // in linea
        { expectedQty: 7, countedQty: null, unitCost: 4 },    // non contata
        { expectedQty: 6, countedQty: 4, unitCost: 0 },       // -2 pz, valore non calcolabile
    ];

    it('conta righe contate, non contate e avanzamento', () => {
        const s = summarizeCount(lines);
        expect(s.totalLines).toBe(5);
        expect(s.countedLines).toBe(4);
        expect(s.notCountedLines).toBe(1);
        expect(s.progressPct).toBe(80);
    });

    it('conta le righe con scostamento, in eccesso e in difetto', () => {
        const s = summarizeCount(lines);
        expect(s.linesWithVariance).toBe(3);
        expect(s.surplusLines).toBe(1);
        expect(s.shortageLines).toBe(2);
        expect(s.netVarianceQty).toBe(0); // -2 +4 -2
        expect(s.absVarianceQty).toBe(8);
    });

    it('somma il valore solo dove il costo e\' noto e segnala le righe senza costo', () => {
        const s = summarizeCount(lines);
        expect(s.netVarianceValue).toBe(2);
        expect(s.absVarianceValue).toBe(10);
        expect(s.varianceValueMissingLines).toBe(1);
    });

    it('le righe non contate non entrano negli scostamenti', () => {
        const s = summarizeCount([{ expectedQty: 100, countedQty: null, unitCost: 5 }]);
        expect(s.linesWithVariance).toBe(0);
        expect(s.netVarianceQty).toBe(0);
        expect(s.netVarianceValue).toBeNull();
        expect(s.progressPct).toBe(0);
    });

    it('nessun valore calcolabile: null, non zero', () => {
        const s = summarizeCount([{ expectedQty: 5, countedQty: 4, unitCost: null }]);
        expect(s.netVarianceValue).toBeNull();
        expect(s.absVarianceValue).toBeNull();
        expect(s.varianceValueMissingLines).toBe(1);
    });

    it('elenco vuoto', () => {
        const s = summarizeCount([]);
        expect(s.totalLines).toBe(0);
        expect(s.progressPct).toBe(0);
    });

    it('arrotonda i totali senza errori di virgola mobile', () => {
        const s = summarizeCount([
            { expectedQty: 0, countedQty: 1, unitCost: 0.1 },
            { expectedQty: 0, countedQty: 1, unitCost: 0.2 },
        ]);
        expect(s.netVarianceValue).toBe(0.3);
    });
});

describe('quantita\' contata', () => {
    it('accetta solo interi non negativi', () => {
        expect(isValidCountedQty(0)).toBe(true);
        expect(isValidCountedQty(12)).toBe(true);
        expect(isValidCountedQty(-1)).toBe(false);
        expect(isValidCountedQty(1.5)).toBe(false);
        expect(isValidCountedQty(Number.NaN)).toBe(false);
        expect(isValidCountedQty('3')).toBe(false);
        expect(isValidCountedQty(null)).toBe(false);
        expect(isValidCountedQty(1e9)).toBe(false);
    });

    it('il campo vuoto significa non contato; il resto deve essere un intero', () => {
        expect(parseCountedInput('')).toEqual({ value: null, valid: true });
        expect(parseCountedInput('  ')).toEqual({ value: null, valid: true });
        expect(parseCountedInput('0')).toEqual({ value: 0, valid: true });
        expect(parseCountedInput(' 25 ')).toEqual({ value: 25, valid: true });
        expect(parseCountedInput('2,5').valid).toBe(false);
        expect(parseCountedInput('-3').valid).toBe(false);
        expect(parseCountedInput('abc').valid).toBe(false);
    });
});

describe('movimento di inventario alla chiusura', () => {
    it('il delta e\' rispetto alla giacenza attuale, non a quella attesa', () => {
        // atteso 10, contato 8, ma nel frattempo la giacenza e' scesa a 9 (consumo): delta -1
        const adj = inventoryAdjustment(10, 8, 9);
        expect(adj?.delta).toBe(-1);
        expect(adj?.note).toContain('atteso 10');
        expect(adj?.note).toContain('contato 8');
        expect(adj?.note).toContain('-2 rispetto all\'atteso');
    });

    it('nessun movimento se la giacenza e\' gia\' uguale al contato', () => {
        expect(inventoryAdjustment(10, 8, 8)).toBeNull();
    });

    it('segnala l\'eccesso e la corrispondenza con l\'atteso', () => {
        expect(inventoryAdjustment(5, 9, 5)?.note).toContain('+4');
        expect(inventoryAdjustment(5, 5, 4)?.note).toContain('in linea con l\'atteso');
    });
});

describe('movimenti di magazzino', () => {
    it('riconosce i tipi e li traduce', () => {
        expect(isStockMovementType('INVENTORY')).toBe(true);
        expect(isStockMovementType('altro')).toBe(false);
        expect(movementTypeLabel('CONSUMPTION')).toBe('Scarico / consumo');
        expect(movementTypeLabel('SCONOSCIUTO')).toBe('SCONOSCIUTO');
    });

    it('scrive sempre il segno', () => {
        expect(formatSignedQty(5)).toBe('+5');
        expect(formatSignedQty(-3)).toBe('-3');
        expect(formatSignedQty(0)).toBe('0');
        expect(formatSignedQty(-15000)).toBe('-15.000');
    });

    it('i riferimenti rimandano alle pagine giuste', () => {
        const wo = parseMovementReference('WO:abc123xyz');
        expect(wo?.href).toBe('/work-orders/abc123xyz');
        expect(wo?.kind).toBe('WORK_ORDER');
        expect(parseMovementReference('MR:q1')?.href).toBe('/requests/material');
        expect(parseMovementReference('PR:q1')?.href).toBe('/inventory/purchase-requests');
        expect(parseMovementReference('PT:q1')?.href).toContain('/inventory/availability');
        expect(parseMovementReference('XX:1')).toEqual({ kind: 'OTHER', label: 'XX:1', href: null });
        expect(parseMovementReference('')).toBeNull();
        expect(parseMovementReference(null)).toBeNull();
    });

    it('un id con caratteri strani non esce dal percorso', () => {
        expect(parseMovementReference('WO:a/../b')?.href).toBe('/work-orders/a%2F..%2Fb');
    });
});

describe('esportazione CSV', () => {
    it('neutralizza le celle che iniziano come una formula', () => {
        expect(csvField('=SOMMA(A1)')).toBe("'=SOMMA(A1)");
        expect(csvField('+39 333')).toBe("'+39 333");
        expect(csvField('-cmd')).toBe("'-cmd");
        expect(csvField('@utente')).toBe("'@utente");
    });

    it('i numeri negativi restano numeri', () => {
        expect(csvField(-3)).toBe('-3');
    });

    it('virgolette per separatore, virgolette e a capo', () => {
        expect(csvField('a;b')).toBe('"a;b"');
        expect(csvField('di "cui"')).toBe('"di ""cui"""');
        expect(csvField('riga1\nriga2')).toBe('"riga1\nriga2"');
        expect(csvField(null)).toBe('');
    });

    it('il file ha BOM UTF-8, punto e virgola e CRLF', () => {
        const csv = buildCsv(['Data', 'Articolo'], [['20/11/2026', '=1+1']]);
        expect(csv.charCodeAt(0)).toBe(0xfeff);
        expect(csv).toBe("﻿Data;Articolo\r\n20/11/2026;'=1+1\r\n");
    });
});
