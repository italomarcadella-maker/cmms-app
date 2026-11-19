// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { byUrgencyThenDue } from '@/modules/maintenance/domain/priority';
import {
    maintainerWorkOrderWhere,
    withMaintainerFilter,
    isWorkOrderVisibleToMaintainer,
    isAssignedToMaintainer,
    isPlanItemVisibleToMaintainer,
    isMaintainerRole,
    workOrderIdFromLink,
    CLAIMABLE_STATUSES,
    type WorkOrderOwnership,
} from '@/modules/maintenance/domain/maintainer-visibility';

const me = { userId: 'u-me', technicianId: 't-me' };

describe('filtro degli ordini per il manutentore', () => {
    it('riconosce solo il ruolo MAINTAINER', () => {
        expect(isMaintainerRole('MAINTAINER')).toBe(true);
        for (const r of ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'PROCESS_ENGINEER', 'USER', '', null, undefined]) {
            expect(isMaintainerRole(r), String(r)).toBe(false);
        }
    });

    it('il filtro ha tre rami: assegnati a me (id e righe), richiesti da me, liberi in carico', () => {
        const where = maintainerWorkOrderWhere(me) as { OR: Record<string, unknown>[] };
        expect(where.OR).toHaveLength(4);
        expect(where.OR).toContainEqual({ assignedTechnicianId: 't-me' });
        expect(where.OR).toContainEqual({ technicians: { some: { technicianId: 't-me' } } });
        expect(where.OR).toContainEqual({ requesterId: 'u-me' });
        const free = where.OR.find(b => 'technicians' in b && (b.technicians as Record<string, unknown>).none) as Record<string, unknown>;
        expect(free).toBeDefined();
        expect(free.assignedTechnicianId).toBeNull();
        expect(free.status).toEqual({ in: [...CLAIMABLE_STATUSES] });
    });

    it('senza profilo tecnico restano solo i richiesti da lui e quelli liberi (nessun ramo con id nullo)', () => {
        const where = maintainerWorkOrderWhere({ userId: 'u-me', technicianId: null }) as { OR: Record<string, unknown>[] };
        expect(where.OR).toHaveLength(2);
        expect(JSON.stringify(where)).not.toContain('"assignedTechnicianId":"null"');
        // Un ramo `assignedTechnicianId: undefined` o `{ some: { technicianId: null } }` aprirebbe a tutti gli ordini
        for (const b of where.OR) expect(b).not.toHaveProperty('technicians.some');
    });

    it('compone il filtro con la query esistente invece di sostituirla', () => {
        const filter = maintainerWorkOrderWhere(me);
        const merged = withMaintainerFilter({ status: 'OPEN' }, filter) as { AND: unknown[] };
        expect(merged.AND).toEqual([{ status: 'OPEN' }, filter]);
        expect(withMaintainerFilter(undefined, filter)).toEqual({ AND: [filter] });
        expect(withMaintainerFilter({}, filter)).toEqual({ AND: [filter] });
    });

    it('per chi non e\' manutentore la query resta identica', () => {
        expect(withMaintainerFilter({ status: 'OPEN' }, null)).toEqual({ status: 'OPEN' });
        expect(withMaintainerFilter(undefined, null)).toEqual({});
    });
});

describe('visibilita\' in memoria (stessa regola del filtro)', () => {
    const wo = (o: Partial<WorkOrderOwnership>): WorkOrderOwnership => ({ status: 'ASSIGNED', ...o });

    it('vede gli ordini assegnati a lui, come tecnico principale o tra i tecnici', () => {
        expect(isWorkOrderVisibleToMaintainer(wo({ assignedTechnicianId: 't-me' }), me)).toBe(true);
        expect(isWorkOrderVisibleToMaintainer(wo({ assignedTechnicianId: 't-other', technicianIds: ['t-other', 't-me'] }), me)).toBe(true);
    });

    it('vede quelli che ha richiesto, in qualunque stato e anche se assegnati ad altri', () => {
        expect(isWorkOrderVisibleToMaintainer(wo({ requesterId: 'u-me', assignedTechnicianId: 't-other', status: 'IN_PROGRESS' }), me)).toBe(true);
        expect(isWorkOrderVisibleToMaintainer(wo({ requesterId: 'u-me', status: 'COMPLETED' }), me)).toBe(true);
    });

    it('NON vede gli ordini assegnati ad altri', () => {
        expect(isWorkOrderVisibleToMaintainer(wo({ assignedTechnicianId: 't-other' }), me)).toBe(false);
        expect(isWorkOrderVisibleToMaintainer(wo({ assignedTechnicianId: 't-other', technicianIds: ['t-other', 't-third'], status: 'IN_PROGRESS' }), me)).toBe(false);
        expect(isWorkOrderVisibleToMaintainer(wo({ requesterId: 'u-other', assignedTechnicianId: 't-other' }), me)).toBe(false);
    });

    it('vede quelli liberi solo se OPEN o APPROVED', () => {
        expect(isWorkOrderVisibleToMaintainer(wo({ status: 'OPEN' }), me)).toBe(true);
        expect(isWorkOrderVisibleToMaintainer(wo({ status: 'APPROVED' }), me)).toBe(true);
        for (const s of ['PENDING_APPROVAL', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'PENDING_REVIEW', 'COMPLETED', 'CLOSED', 'CANCELED']) {
            expect(isWorkOrderVisibleToMaintainer(wo({ status: s }), me), s).toBe(false);
        }
    });

    it('un ordine aperto con un tecnico nelle righe di assegnazione non e\' libero', () => {
        expect(isWorkOrderVisibleToMaintainer(wo({ status: 'OPEN', technicianIds: ['t-other'] }), me)).toBe(false);
    });

    it('un ordine aperto con un nome assegnato a mano non e\' libero, il segnaposto "Unassigned" si', () => {
        expect(isWorkOrderVisibleToMaintainer(wo({ status: 'OPEN', assignedTo: 'Mario Rossi' }), me)).toBe(false);
        expect(isWorkOrderVisibleToMaintainer(wo({ status: 'OPEN', assignedTo: 'Unassigned' }), me)).toBe(true);
    });

    it('senza profilo tecnico non si confonde con "nessun tecnico"', () => {
        const noTech = { userId: 'u-me', technicianId: null };
        // assignedTechnicianId null e technicianId null: non deve risultare "assegnato a me"
        expect(isWorkOrderVisibleToMaintainer(wo({ status: 'IN_PROGRESS', assignedTechnicianId: null }), noTech)).toBe(false);
        expect(isAssignedToMaintainer({ assignedTechnicianId: null }, noTech)).toBe(false);
    });

    it('l\'id dell\'utente non e\' l\'id del tecnico', () => {
        // Errore storico: confrontare l'assegnatario con l'id utente
        expect(isWorkOrderVisibleToMaintainer(wo({ assignedTechnicianId: 'u-me' }), me)).toBe(false);
    });

    it('"assegnato a me" esclude i soli richiesti e i liberi', () => {
        expect(isAssignedToMaintainer({ assignedTechnicianId: 't-me' }, me)).toBe(true);
        expect(isAssignedToMaintainer({ assignedTechnicianId: 't-x', technicianIds: ['t-me'] }, me)).toBe(true);
        expect(isAssignedToMaintainer({ assignedTechnicianId: null, technicianIds: [] }, me)).toBe(false);
    });
});

describe('voci del piano con un solo assegnatario', () => {
    it('sue o ancora libere, mai di altri', () => {
        expect(isPlanItemVisibleToMaintainer(null, me)).toBe(true);
        expect(isPlanItemVisibleToMaintainer(undefined, me)).toBe(true);
        expect(isPlanItemVisibleToMaintainer('u-me', me)).toBe(true);
        expect(isPlanItemVisibleToMaintainer('t-me', me)).toBe(true);
        expect(isPlanItemVisibleToMaintainer('u-other', me)).toBe(false);
        expect(isPlanItemVisibleToMaintainer('t-other', me)).toBe(false);
    });

    it('senza profilo tecnico conta solo l\'id utente', () => {
        expect(isPlanItemVisibleToMaintainer('t-me', { userId: 'u-me', technicianId: null })).toBe(false);
        expect(isPlanItemVisibleToMaintainer('u-me', { userId: 'u-me', technicianId: null })).toBe(true);
    });
});

describe('id dell\'ordine in un link di notifica', () => {
    it('estrae l\'id dai link dell\'ordine', () => {
        expect(workOrderIdFromLink('/work-orders/abc123')).toBe('abc123');
        expect(workOrderIdFromLink('/work-orders/abc123/')).toBe('abc123');
        expect(workOrderIdFromLink('/work-orders/abc123?x=1')).toBe('abc123');
        expect(workOrderIdFromLink('/mobile/orders/abc123')).toBe('abc123');
        expect(workOrderIdFromLink('/work-orders/a%20b')).toBe('a b');
    });

    it('ignora gli altri link', () => {
        expect(workOrderIdFromLink(null)).toBeNull();
        expect(workOrderIdFromLink('')).toBeNull();
        expect(workOrderIdFromLink('/inventory/purchase-requests')).toBeNull();
        expect(workOrderIdFromLink('/work-orders')).toBeNull();
        expect(workOrderIdFromLink('/work-orders/abc/ewo')).toBeNull();
    });
});

describe('ordinamento delle attivita\' (urgenza, poi scadenza)', () => {
    const d = (day: number) => new Date(2026, 10, day, 12);
    const o = (id: string, priority: string, due: Date | null, created = d(1)) => ({ id, priority, dueDate: due, createdAt: created });

    it('prima la priorita\' piu\' urgente, poi la scadenza piu\' vicina, senza scadenza in fondo', () => {
        const list = [
            o('bassa-presto', 'LOW', d(2)),
            o('alta-tardi', 'HIGH', d(20)),
            o('fermo-senza', 'STOPPED', null),
            o('alta-presto', 'HIGH', d(5)),
            o('alta-senza', 'HIGH', null),
        ];
        expect([...list].sort(byUrgencyThenDue).map(x => x.id)).toEqual(['fermo-senza', 'alta-presto', 'alta-tardi', 'alta-senza', 'bassa-presto']);
    });

    it('a parita\' di tutto, l\'ordine piu\' vecchio per primo', () => {
        const list = [o('nuovo', 'MEDIUM', d(9), d(8)), o('vecchio', 'MEDIUM', d(9), d(3))];
        expect([...list].sort(byUrgencyThenDue).map(x => x.id)).toEqual(['vecchio', 'nuovo']);
    });
});
