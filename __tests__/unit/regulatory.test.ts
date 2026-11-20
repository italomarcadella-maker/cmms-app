import { describe, it, expect } from 'vitest';
import {
    buildRegulatoryCsv,
    csvCell,
    daysUntil,
    filterByStatus,
    formatDateIt,
    sortByUrgency,
    statusFromDueDate,
    statusFromUsage,
    summarizeRegulatory,
    type RegulatoryRow,
} from '@/modules/maintenance/domain/regulatory';

const now = new Date(2026, 5, 15, 10, 0, 0); // 15/06/2026
const at = (offsetDays: number) => new Date(2026, 5, 15 + offsetDays, 9, 0, 0);

describe('stato di una verifica a tempo', () => {
    it('scaduta prima di oggi, in scadenza entro 30 giorni (oggi compreso), altrimenti in regola', () => {
        expect(statusFromDueDate(at(-1), now)).toBe('OVERDUE');
        expect(statusFromDueDate(at(0), now)).toBe('EXPIRING');
        expect(statusFromDueDate(at(30), now)).toBe('EXPIRING');
        expect(statusFromDueDate(at(31), now)).toBe('OK');
        expect(statusFromDueDate(at(400), now)).toBe('OK');
    });

    it('accetta date ISO e rifiuta quelle non valide', () => {
        expect(statusFromDueDate(at(-3).toISOString(), now)).toBe('OVERDUE');
        expect(statusFromDueDate('non una data', now)).toBe('UNKNOWN');
    });

    it('giorni alla scadenza', () => {
        expect(daysUntil(at(10), now)).toBe(10);
        expect(daysUntil(at(-4), now)).toBe(-4);
        expect(daysUntil(at(0), now)).toBe(0);
        expect(daysUntil(null, now)).toBeNull();
    });
});

describe('stato di una verifica a consumo', () => {
    const base = { validInterval: true, hasReadings: true, overdue: false, usedPct: 40, estimatedDueDate: null };
    it('senza dati non si dichiara in regola', () => {
        expect(statusFromUsage({ ...base, hasReadings: false }, now)).toBe('UNKNOWN');
        expect(statusFromUsage({ ...base, validInterval: false }, now)).toBe('UNKNOWN');
    });
    it('scaduta per consumo', () => {
        expect(statusFromUsage({ ...base, overdue: true, usedPct: 120 }, now)).toBe('OVERDUE');
    });
    it('in scadenza se la stima cade entro 30 giorni o la quota usata e\' >= 90%', () => {
        expect(statusFromUsage({ ...base, estimatedDueDate: at(12) }, now)).toBe('EXPIRING');
        expect(statusFromUsage({ ...base, usedPct: 92 }, now)).toBe('EXPIRING');
    });
    it('in regola con stima lontana o quota bassa', () => {
        expect(statusFromUsage({ ...base, estimatedDueDate: at(200) }, now)).toBe('OK');
        expect(statusFromUsage(base, now)).toBe('OK');
    });
});

const row = (over: Partial<RegulatoryRow>): RegulatoryRow => ({
    scheduleId: 's',
    title: 'Verifica',
    assetId: 'a',
    assetName: 'Asset',
    plantId: null,
    plantName: null,
    legalReference: null,
    authority: null,
    triggerType: 'TIME',
    lastRunDate: null,
    nextDueDate: null,
    status: 'OK',
    usage: null,
    ...over,
});

describe('ordinamento, filtri e totali', () => {
    const rows = [
        row({ scheduleId: 'ok-near', status: 'OK', nextDueDate: at(60).toISOString() }),
        row({ scheduleId: 'exp-far', status: 'EXPIRING', nextDueDate: at(20).toISOString() }),
        row({ scheduleId: 'over-less', status: 'OVERDUE', nextDueDate: at(-2).toISOString() }),
        row({ scheduleId: 'unknown', status: 'UNKNOWN', triggerType: 'METER' }),
        row({ scheduleId: 'over-more', status: 'OVERDUE', nextDueDate: at(-40).toISOString() }),
        row({ scheduleId: 'exp-near', status: 'EXPIRING', nextDueDate: at(3).toISOString() }),
        row({ scheduleId: 'ok-far', status: 'OK', nextDueDate: at(300).toISOString() }),
    ];

    it('prima le scadute (piu\' in ritardo per prime), poi in scadenza, dati insufficienti, in regola', () => {
        expect(sortByUrgency(rows).map(r => r.scheduleId)).toEqual([
            'over-more', 'over-less', 'exp-near', 'exp-far', 'unknown', 'ok-near', 'ok-far',
        ]);
    });

    it('non modifica l\'array originale', () => {
        const copy = [...rows];
        sortByUrgency(rows);
        expect(rows).toEqual(copy);
    });

    it('a parita\' di data ordina per nome dell\'asset', () => {
        const same = [
            row({ scheduleId: 'b', assetName: 'Pressa', status: 'OVERDUE', nextDueDate: at(-1).toISOString() }),
            row({ scheduleId: 'a', assetName: 'Caldaia', status: 'OVERDUE', nextDueDate: at(-1).toISOString() }),
        ];
        expect(sortByUrgency(same).map(r => r.scheduleId)).toEqual(['a', 'b']);
    });

    it('filtra per stato e calcola i totali', () => {
        expect(filterByStatus(rows, 'ALL')).toHaveLength(7);
        expect(filterByStatus(rows, 'OVERDUE').map(r => r.scheduleId)).toEqual(['over-less', 'over-more']);
        expect(summarizeRegulatory(rows)).toEqual({ total: 7, overdue: 2, expiring: 2, ok: 2, unknown: 1 });
        expect(summarizeRegulatory([])).toEqual({ total: 0, overdue: 0, expiring: 0, ok: 0, unknown: 0 });
    });
});

describe('esportazione CSV', () => {
    it('le celle che iniziano con = + - @ sono neutralizzate', () => {
        for (const c of ['=SOMMA(A1)', '+39 333', '-5', '@cmd', '\t=1']) {
            expect(csvCell(c).startsWith(`'`), c).toBe(true);
        }
        expect(csvCell('D.Lgs. 81/2008')).toBe('D.Lgs. 81/2008');
        expect(csvCell(null)).toBe('');
    });

    it('virgolette, punto e virgola e a capo vengono racchiusi tra virgolette', () => {
        expect(csvCell('a;b')).toBe('"a;b"');
        expect(csvCell('dice "ciao"')).toBe('"dice ""ciao"""');
        expect(csvCell('riga1\nriga2')).toBe('"riga1\nriga2"');
        expect(csvCell('=A;B')).toBe(`"'=A;B"`);
    });

    it('date gg/mm/aaaa', () => {
        expect(formatDateIt(new Date(2026, 0, 5))).toBe('05/01/2026');
        expect(formatDateIt(null)).toBe('');
        expect(formatDateIt('boh')).toBe('');
    });

    it('CSV completo: BOM, punto e virgola, intestazione, date italiane', () => {
        const csv = buildRegulatoryCsv([
            row({
                title: '=HYPERLINK("x")',
                assetName: 'Caldaia 1',
                plantName: 'Sede; Nord',
                legalReference: 'DM 329/2004',
                authority: 'INAIL',
                lastRunDate: new Date(2025, 5, 15).toISOString(),
                nextDueDate: new Date(2026, 5, 15).toISOString(),
                status: 'EXPIRING',
            }),
            row({
                assetName: 'Compressore',
                triggerType: 'METER',
                nextDueDate: new Date(2026, 8, 1).toISOString(),
                status: 'OK',
                usage: { unit: 'h', interval: 500, consumed: 320.5, usedPct: 64.1, remaining: 179.5 },
            }),
        ]);
        expect(csv.charCodeAt(0)).toBe(0xfeff);
        const lines = csv.slice(1).split('\r\n');
        expect(lines[0].split(';')).toHaveLength(10);
        expect(lines[0]).toContain('Riferimento normativo');
        expect(lines[1]).toContain(`'=HYPERLINK`);
        expect(lines[1]).toContain('"Sede; Nord"');
        expect(lines[1]).toContain('15/06/2025;15/06/2026;In scadenza');
        expect(lines[2]).toContain('01/09/2026 (stimata)');
        expect(lines[2]).toContain('320,5 / 500 h');
    });
});
