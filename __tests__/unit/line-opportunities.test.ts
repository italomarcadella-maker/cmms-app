// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
    isLineWithoutProductionCalendar, buildLineOpportunities, describeOpportunityState, summarizeTotals, daysFromToday,
    assetsOnLinesWithoutCalendar, type BuildInput, type LineAsset, type OrderInput, type ScheduleInput,
} from '@/modules/maintenance/domain/line-opportunities';

// Mezzogiorno locale: i confronti sono a giorni di calendario
const now = new Date(2026, 10, 19, 12, 0, 0);
const day = (offset: number) => new Date(2026, 10, 19 + offset, 9, 0, 0);

const asset = (id: string, line: string | null, over: Partial<LineAsset> = {}): LineAsset => ({ id, name: `Macchina ${id}`, line, plantId: 'P1', status: 'OPERATIONAL', ...over });
const order = (id: string, assetId: string, over: Partial<OrderInput> = {}): OrderInput => ({
    id, title: `Ordine ${id}`, type: 'FAULT', priority: 'MEDIUM', status: 'OPEN', dueDate: null, assignedTo: null, assetId, originScheduleId: null, ...over,
});
const plan = (id: string, assetId: string, due: Date, over: Partial<ScheduleInput> = {}): ScheduleInput => ({
    id, taskTitle: `Piano ${id}`, frequency: 'MONTHLY', frequencyDays: 30, nextDueDate: due, lastRunDate: null, assetId, assigneeName: null, ...over,
});

function build(over: Partial<BuildInput>) {
    return buildLineOpportunities({
        now, horizonDays: 30, configuredLines: [], assets: [], orders: [], schedules: [], contractorActivities: [], meters: [],
        plantNames: { P1: 'Cittadella', P2: 'Verona' }, ...over,
    });
}

describe('isLineWithoutProductionCalendar', () => {
    const configured = [{ plantId: 'P1', line: 'Linea 1' }];

    it('una linea con calendario non e\' senza calendario', () => {
        expect(isLineWithoutProductionCalendar('P1', 'Linea 1', configured)).toBe(false);
    });

    it('una linea senza riga di calendario lo e\'', () => {
        expect(isLineWithoutProductionCalendar('P1', 'Linea 2', configured)).toBe(true);
        expect(isLineWithoutProductionCalendar('P1', 'Linea 2', [])).toBe(true);
    });

    it('il nome si confronta senza maiuscole e spazi ai bordi', () => {
        expect(isLineWithoutProductionCalendar('P1', '  LINEA 1 ', configured)).toBe(false);
        expect(isLineWithoutProductionCalendar('P1', 'linea 1', [{ plantId: 'P1', line: ' Linea 1  ' }])).toBe(false);
    });

    it('lo stesso nome in un altro stabilimento non conta come calendario', () => {
        expect(isLineWithoutProductionCalendar('P2', 'Linea 1', configured)).toBe(true);
    });

    it('senza nome non e\' una linea', () => {
        expect(isLineWithoutProductionCalendar('P1', null, configured)).toBe(false);
        expect(isLineWithoutProductionCalendar('P1', '   ', configured)).toBe(false);
    });
});

describe('asset considerati', () => {
    it('esclude asset di sistema, rottamati, accantonati e linee con calendario', () => {
        const assets = [
            asset('a1', 'L1'),
            asset('SYS-OTHER', 'L1'),
            asset('a2', 'L1', { status: 'DECOMMISSIONED' }),
            asset('a3', 'L1', { status: 'STORAGE' }),
            asset('a4', 'Coperta'),
            asset('a5', 'L1', { status: 'OFFLINE' }),
        ];
        const ids = assetsOnLinesWithoutCalendar(assets, [{ plantId: 'P1', line: 'coperta' }]).map(a => a.id);
        expect(ids).toEqual(['a1', 'a5']);
    });
});

describe('costruzione delle voci per linea', () => {
    it('la linea con calendario e\' esclusa, anche se ha attivita\'', () => {
        const r = build({ configuredLines: [{ plantId: 'P1', line: 'L1' }], assets: [asset('a1', 'L1')], orders: [order('o1', 'a1')] });
        expect(r.lines).toEqual([]);
        expect(r.totals).toEqual({ lines: 0, pending: 0, executable: 0, overdue: 0 });
    });

    it('nomi con maiuscole e spazi diversi finiscono nella stessa linea', () => {
        const r = build({
            assets: [asset('a1', 'Linea 3'), asset('a2', ' LINEA 3 ')],
            orders: [order('o1', 'a1'), order('o2', 'a2')],
        });
        expect(r.lines).toHaveLength(1);
        expect(r.lines[0].line).toBe('Linea 3');
        expect(r.lines[0].counts.pending).toBe(2);
        expect(r.lines[0].plantName).toBe('Cittadella');
    });

    it('lo stesso nome in due stabilimenti da due linee distinte', () => {
        const r = build({
            configuredLines: [{ plantId: 'P2', line: 'Linea 1' }], // il calendario c'e' solo a Verona
            assets: [asset('a1', 'Linea 1'), asset('b1', 'Linea 1', { plantId: 'P2' })],
            orders: [order('o1', 'a1'), order('o2', 'b1')],
        });
        expect(r.lines).toHaveLength(1);
        expect(r.lines[0].plantId).toBe('P1');
        expect(r.lines[0].pending.map(i => i.refId)).toEqual(['o1']);

        const both = build({ assets: [asset('a1', 'Linea 1'), asset('b1', 'Linea 1', { plantId: 'P2' })], orders: [order('o1', 'a1'), order('o2', 'b1')] });
        expect(both.lines.map(l => l.plantName)).toEqual(['Cittadella', 'Verona']);
    });

    it('un piano con un ordine aperto gia\' generato non e\' eseguibile (ma l\'ordine e\' pendente)', () => {
        const r = build({
            assets: [asset('a1', 'L1')],
            schedules: [plan('s1', 'a1', day(-5)), plan('s2', 'a1', day(-2))],
            orders: [order('o1', 'a1', { type: 'ROUTINE', originScheduleId: 's1', dueDate: day(-5) })],
        });
        expect(r.lines[0].executable.map(i => i.refId)).toEqual(['s2']);
        expect(r.lines[0].pending.map(i => i.refId)).toEqual(['o1']);
    });

    it('un ordine chiuso non occupa il piano ne\' e\' pendente', () => {
        const r = build({
            assets: [asset('a1', 'L1')],
            schedules: [plan('s1', 'a1', day(-1))],
            orders: [order('o1', 'a1', { status: 'COMPLETED', originScheduleId: 's1' }), order('o2', 'a1', { status: 'CLOSED' })],
        });
        expect(r.lines[0].executable.map(i => i.refId)).toEqual(['s1']);
        expect(r.lines[0].pending).toEqual([]);
    });

    it('gli asset non in uso non producono voci', () => {
        const r = build({
            assets: [asset('a1', 'L1', { status: 'DECOMMISSIONED' }), asset('a2', 'L2', { status: 'STORAGE' })],
            orders: [order('o1', 'a1'), order('o2', 'a2')],
            schedules: [plan('s1', 'a1', day(-1)), plan('s2', 'a2', day(1))],
        });
        expect(r.lines).toEqual([]);
    });

    it('una linea senza voci non e\' mostrata', () => {
        const r = build({ assets: [asset('a1', 'L1')], schedules: [plan('s1', 'a1', day(90))] });
        expect(r.lines).toEqual([]);
        expect(r.totals.lines).toBe(0);
    });

    it('orizzonte 0: solo il passato e oggi', () => {
        const r = build({
            horizonDays: 0,
            assets: [asset('a1', 'L1')],
            schedules: [plan('s-late', 'a1', day(-3)), plan('s-today', 'a1', day(0)), plan('s-tomorrow', 'a1', day(1))],
        });
        expect(r.lines[0].executable.map(i => i.refId)).toEqual(['s-late', 's-today']);
    });

    it('stati: in ritardo, in scadenza, anticipabile', () => {
        const r = build({
            horizonDays: 30,
            assets: [asset('a1', 'L1')],
            schedules: [plan('late', 'a1', day(-4)), plan('soon', 'a1', day(3)), plan('later', 'a1', day(20)), plan('out', 'a1', day(31))],
        });
        const byId = Object.fromEntries(r.lines[0].executable.map(i => [i.refId, i]));
        expect(byId.late.state).toBe('OVERDUE');
        expect(byId.late.days).toBe(-4);
        expect(byId.soon.state).toBe('DUE_SOON');
        expect(byId.later.state).toBe('ANTICIPATABLE');
        expect(byId.out).toBeUndefined();
        expect(describeOpportunityState('OVERDUE', -4)).toBe('In ritardo di 4 giorni');
        expect(describeOpportunityState('DUE_SOON', 3)).toBe('In scadenza tra 3 giorni');
        expect(describeOpportunityState('ANTICIPATABLE', 20)).toBe('Anticipabile (tra 20 giorni)');
    });

    it('ordine di urgenza: ritardo, poi priorita\', poi scadenza piu\' vicina', () => {
        const r = build({
            assets: [asset('a1', 'L1')],
            orders: [
                order('basso-presto', 'a1', { priority: 'LOW', dueDate: day(2) }),
                order('fermo-futuro', 'a1', { priority: 'STOPPED', dueDate: day(10) }),
                order('medio-ritardo', 'a1', { priority: 'MEDIUM', dueDate: day(-1) }),
                order('alto-ritardo-vecchio', 'a1', { priority: 'HIGH', dueDate: day(-9) }),
                order('malfunz', 'a1', { priority: 'MALFUNCTIONING', dueDate: day(5) }),
                order('alto', 'a1', { priority: 'HIGH', dueDate: day(1) }),
                order('medio-senza-data', 'a1', { priority: 'MEDIUM' }),
            ],
        });
        expect(r.lines[0].pending.map(i => i.refId)).toEqual([
            'alto-ritardo-vecchio', 'medio-ritardo', // in ritardo: prima la priorita'
            'fermo-futuro', 'malfunz', 'alto', // poi per priorita'
            'basso-presto', 'medio-senza-data', // resto: scadenza piu' vicina, senza data in fondo
        ]);
    });

    it('ditte esterne e contatori: solo se attivi, in vigore ed entro l\'orizzonte', () => {
        const contract = { status: 'ACTIVE', startDate: day(-400), endDate: null, renewalNoticeDays: 60, contractorId: 'C1', contractorName: 'Ditta Rossi' };
        const r = build({
            assets: [asset('a1', 'L1')],
            contractorActivities: [
                { id: 'c-ok', title: 'Verifica compressore', isActive: true, nextDueDate: day(-2), assetId: 'a1', assigneeName: 'Anna', contract },
                { id: 'c-off', title: 'Disattivata', isActive: false, nextDueDate: day(-2), assetId: 'a1', assigneeName: null, contract },
                { id: 'c-far', title: 'Lontana', isActive: true, nextDueDate: day(100), assetId: 'a1', assigneeName: null, contract },
                { id: 'c-term', title: 'Contratto chiuso', isActive: true, nextDueDate: day(1), assetId: 'a1', assigneeName: null, contract: { ...contract, status: 'TERMINATED' } },
                { id: 'c-noasset', title: 'Senza macchina', isActive: true, nextDueDate: day(1), assetId: null, assigneeName: null, contract },
            ],
            meters: [
                { id: 'm-late', name: 'Contatore acqua', nextReadingDue: day(-1), assetId: 'a1', assigneeName: null },
                { id: 'm-far', name: 'Lontano', nextReadingDue: day(200), assetId: 'a1', assigneeName: null },
                { id: 'm-none', name: 'Non pianificato', nextReadingDue: null, assetId: 'a1', assigneeName: null },
            ],
        });
        const items = r.lines[0].pending;
        expect(items.map(i => i.refId).sort()).toEqual(['c-ok', 'm-late']);
        const c = items.find(i => i.refId === 'c-ok')!;
        expect(c.kind).toBe('CONTRACTOR');
        expect(c.contractorId).toBe('C1');
        expect(c.assigneeName).toBe('Anna');
    });

    it('conteggi per linea e totali', () => {
        const r = build({
            assets: [asset('a1', 'L1'), asset('b1', 'L2')],
            orders: [order('o1', 'a1', { dueDate: day(-1) }), order('o2', 'b1')],
            schedules: [plan('s1', 'a1', day(-2)), plan('s2', 'b1', day(4))],
        });
        const l1 = r.lines.find(l => l.line === 'L1')!;
        expect(l1.counts).toEqual({ pending: 1, executable: 1, overdue: 2 });
        expect(r.totals).toEqual({ lines: 2, pending: 2, executable: 2, overdue: 2 });
    });

    it('l\'assegnatario "Unassigned" non e\' un nome', () => {
        const r = build({ assets: [asset('a1', 'L1')], orders: [order('o1', 'a1', { assignedTo: 'Unassigned' }), order('o2', 'a1', { assignedTo: 'Mario' })] });
        expect(r.lines[0].pending.map(i => i.assigneeName).sort()).toEqual(['Mario', null]);
    });
});

describe('testi', () => {
    it('riepilogo con singolare e plurale', () => {
        expect(summarizeTotals({ lines: 2, pending: 5, executable: 3 })).toBe('2 linee: 5 attività pendenti e 3 manutenzioni programmate eseguibili');
        expect(summarizeTotals({ lines: 1, pending: 1, executable: 1 })).toBe('1 linea: 1 attività pendente e 1 manutenzione programmata eseguibile');
        expect(summarizeTotals({ lines: 1, pending: 0, executable: 2 })).toBe('1 linea: 2 manutenzioni programmate eseguibili');
    });

    it('giorni di calendario da oggi', () => {
        expect(daysFromToday(day(0), now)).toBe(0);
        expect(daysFromToday(new Date(2026, 10, 18, 23, 59), now)).toBe(-1);
        expect(daysFromToday(new Date(2026, 10, 20, 0, 1), now)).toBe(1);
    });
});
