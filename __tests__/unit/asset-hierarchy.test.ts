// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
    MAX_ASSET_DEPTH,
    buildAssetTree,
    candidateParents,
    checkParentAssignment,
    findCycles,
    getAssetDepth,
    getAssetPath,
    getDescendantIds,
    getSubtreeHeight,
    hasCycle,
    normalizeParents,
    partStockStatus,
    type HierarchyItem,
} from '@/modules/maintenance/domain/asset-hierarchy';

const a = (id: string, parentId: string | null = null, plantId: string | null = 'P1'): HierarchyItem => ({ id, parentId, plantId });

// M (macchina) -> G1 -> C1, C2 ; M -> G2 ; X (altra radice)
const FLAT: HierarchyItem[] = [a('M'), a('G1', 'M'), a('G2', 'M'), a('C1', 'G1'), a('C2', 'G1'), a('X')];

describe('albero degli asset', () => {
    it('costruisce l\'albero dall\'elenco piatto, con i livelli', () => {
        const roots = buildAssetTree(FLAT);
        expect(roots.map(r => r.item.id)).toEqual(['M', 'X']);
        const m = roots[0];
        expect(m.depth).toBe(1);
        expect(m.children.map(c => c.item.id)).toEqual(['G1', 'G2']);
        expect(m.children[0].depth).toBe(2);
        expect(m.children[0].children.map(c => [c.item.id, c.depth])).toEqual([['C1', 3], ['C2', 3]]);
    });

    it('l\'ordine dell\'elenco non conta: il figlio puo\' precedere il padre', () => {
        const roots = buildAssetTree([a('C1', 'G1'), a('G1', 'M'), a('M')]);
        expect(roots).toHaveLength(1);
        expect(roots[0].children[0].children[0].item.id).toBe('C1');
    });

    it('un elenco vuoto da un albero vuoto', () => {
        expect(buildAssetTree([])).toEqual([]);
    });

    it('un padre inesistente vale come radice (orfano)', () => {
        const roots = buildAssetTree([a('A', 'CANCELLATO'), a('B', 'A')]);
        expect(roots.map(r => r.item.id)).toEqual(['A']);
        expect(roots[0].children.map(c => c.item.id)).toEqual(['B']);
    });

    it('un asset padre di se stesso e\' una radice', () => {
        const roots = buildAssetTree([a('A', 'A')]);
        expect(roots).toHaveLength(1);
        expect(roots[0].children).toEqual([]);
    });

    it('i cicli nei dati non perdono asset ne\' creano percorsi infiniti', () => {
        const items = [a('A', 'C'), a('B', 'A'), a('C', 'B'), a('D', 'C')];
        const roots = buildAssetTree(items);
        const seen: string[] = [];
        const visit = (n: (typeof roots)[number]) => { seen.push(n.item.id); n.children.forEach(visit); };
        roots.forEach(visit);
        expect(seen.sort()).toEqual(['A', 'B', 'C', 'D']);
        expect(roots.map(r => r.item.id)).toEqual(['A']); // il primo dell'elenco rompe il ciclo
        expect(getAssetPath(items, 'D').map(i => i.id)).toEqual(['A', 'B', 'C', 'D']);
    });

    it('normalizeParents con id duplicati usa il primo', () => {
        const parents = normalizeParents([a('A'), a('B', 'A'), a('B', null)]);
        expect(parents.get('B')).toBe('A');
    });
});

describe('percorso, discendenti, profondita\'', () => {
    it('percorso dalla radice, asset compreso', () => {
        expect(getAssetPath(FLAT, 'C2').map(i => i.id)).toEqual(['M', 'G1', 'C2']);
        expect(getAssetPath(FLAT, 'M').map(i => i.id)).toEqual(['M']);
        expect(getAssetPath(FLAT, 'inesistente')).toEqual([]);
    });

    it('discendenti a tutti i livelli, senza l\'asset stesso', () => {
        expect(getDescendantIds(FLAT, 'M').sort()).toEqual(['C1', 'C2', 'G1', 'G2']);
        expect(getDescendantIds(FLAT, 'G1').sort()).toEqual(['C1', 'C2']);
        expect(getDescendantIds(FLAT, 'C1')).toEqual([]);
        expect(getDescendantIds(FLAT, 'inesistente')).toEqual([]);
    });

    it('discendenti con un ciclo nei dati: termina', () => {
        const items = [a('A', 'B'), a('B', 'A')];
        expect(getDescendantIds(items, 'A')).toEqual(['B']);
    });

    it('livello e altezza del sottoalbero', () => {
        expect(getAssetDepth(FLAT, 'M')).toBe(1);
        expect(getAssetDepth(FLAT, 'C1')).toBe(3);
        expect(getAssetDepth(FLAT, 'nessuno')).toBe(0);
        expect(getSubtreeHeight(FLAT, 'M')).toBe(3);
        expect(getSubtreeHeight(FLAT, 'G2')).toBe(1);
    });
});

describe('rilevamento dei cicli', () => {
    it('nessun ciclo in dati regolari', () => {
        expect(findCycles(FLAT)).toEqual([]);
        expect(hasCycle(FLAT)).toBe(false);
    });

    it('trova un ciclo tra piu\' asset, una volta sola', () => {
        const cycles = findCycles([a('A', 'C'), a('B', 'A'), a('C', 'B'), a('D', 'C')]);
        expect(cycles).toHaveLength(1);
        expect(cycles[0].sort()).toEqual(['A', 'B', 'C']);
    });

    it('un auto-riferimento e\' un ciclo', () => {
        expect(findCycles([a('A', 'A')])).toEqual([['A']]);
    });

    it('un padre inesistente non e\' un ciclo', () => {
        expect(hasCycle([a('A', 'X')])).toBe(false);
    });

    it('trova piu\' cicli separati', () => {
        expect(findCycles([a('A', 'B'), a('B', 'A'), a('C', 'D'), a('D', 'C')])).toHaveLength(2);
    });
});

describe('scelta del padre', () => {
    it('togliere il padre e\' sempre valido', () => {
        expect(checkParentAssignment(FLAT, 'C1', null)).toEqual({ ok: true });
    });

    it('padre valido', () => {
        expect(checkParentAssignment(FLAT, 'X', 'G2')).toEqual({ ok: true });
    });

    it('rifiuta se stesso', () => {
        expect(checkParentAssignment(FLAT, 'M', 'M')).toMatchObject({ ok: false, reason: 'SELF' });
    });

    it('rifiuta un discendente (ciclo), anche lontano', () => {
        expect(checkParentAssignment(FLAT, 'M', 'C1')).toMatchObject({ ok: false, reason: 'CYCLE' });
        expect(checkParentAssignment(FLAT, 'G1', 'C2')).toMatchObject({ ok: false, reason: 'CYCLE' });
    });

    it('rifiuta un padre di un altro stabilimento', () => {
        const items = [...FLAT, a('Y', null, 'P2')];
        expect(checkParentAssignment(items, 'X', 'Y')).toMatchObject({ ok: false, reason: 'OTHER_PLANT' });
    });

    it('rifiuta padre inesistente e asset inesistente', () => {
        expect(checkParentAssignment(FLAT, 'X', 'nessuno')).toMatchObject({ ok: false, reason: 'PARENT_NOT_FOUND' });
        expect(checkParentAssignment(FLAT, 'nessuno', 'M')).toMatchObject({ ok: false, reason: 'NOT_FOUND' });
    });

    it('rifiuta asset di sistema, come padre e come figlio', () => {
        const items = [...FLAT, a('SYS-GENERIC')];
        expect(checkParentAssignment(items, 'X', 'SYS-GENERIC')).toMatchObject({ ok: false, reason: 'SYSTEM_ASSET' });
        expect(checkParentAssignment(items, 'SYS-GENERIC', 'X')).toMatchObject({ ok: false, reason: 'SYSTEM_ASSET' });
    });

    it('la profondita\' massima e\' 6 livelli', () => {
        // catena di 6 livelli: L1 -> ... -> L6
        const chain = Array.from({ length: MAX_ASSET_DEPTH }, (_, i) => a(`L${i + 1}`, i === 0 ? null : `L${i}`));
        expect(MAX_ASSET_DEPTH).toBe(6);
        // un nuovo asset sotto L6 sarebbe il livello 7
        const items = [...chain, a('N')];
        expect(checkParentAssignment(items, 'N', 'L6')).toMatchObject({ ok: false, reason: 'TOO_DEEP' });
        // sotto L5 e' il livello 6: consentito
        expect(checkParentAssignment(items, 'N', 'L5')).toEqual({ ok: true });
    });

    it('spostando un asset con figli conta anche la sua sottostruttura', () => {
        // G1 ha altezza 2 (G1 -> C1): sotto un padre di livello 5 arriverebbe al livello 7
        const chain = Array.from({ length: 5 }, (_, i) => a(`L${i + 1}`, i === 0 ? null : `L${i}`));
        const items = [...chain, a('G', null), a('C', 'G')];
        expect(checkParentAssignment(items, 'G', 'L5')).toMatchObject({ ok: false, reason: 'TOO_DEEP' });
        expect(checkParentAssignment(items, 'G', 'L4')).toEqual({ ok: true });
    });

    it('un asset nuovo: si controllano stabilimento e profondita\'', () => {
        expect(checkParentAssignment(FLAT, null, 'G1', 'P1')).toEqual({ ok: true });
        expect(checkParentAssignment(FLAT, null, 'G1', 'P2')).toMatchObject({ ok: false, reason: 'OTHER_PLANT' });
    });
});

describe('candidati come padre', () => {
    it('esclude se stesso, i discendenti e gli asset di sistema; resta chi e\' valido', () => {
        const items = [...FLAT, a('SYS-GENERIC')];
        expect(candidateParents(items, 'G1').map(i => i.id).sort()).toEqual(['G2', 'M', 'X']);
    });

    it('solo lo stesso stabilimento', () => {
        const items = [...FLAT, a('Y', null, 'P2')];
        const ids = candidateParents(items, 'X').map(i => i.id);
        expect(ids).not.toContain('Y');
        expect(ids).toContain('M');
    });

    it('per un asset nuovo si usa lo stabilimento indicato', () => {
        const items = [...FLAT, a('Y', null, 'P2')];
        expect(candidateParents(items, null, 'P2').map(i => i.id)).toEqual(['Y']);
        expect(candidateParents(items, null, 'P1').map(i => i.id)).not.toContain('Y');
    });

    it('esclude i candidati che farebbero superare la profondita\'', () => {
        const chain = Array.from({ length: MAX_ASSET_DEPTH }, (_, i) => a(`L${i + 1}`, i === 0 ? null : `L${i}`));
        const ids = candidateParents([...chain, a('N')], 'N').map(i => i.id);
        expect(ids).toContain('L5');
        expect(ids).not.toContain('L6');
    });

    it('un asset inesistente o di sistema non ha candidati', () => {
        expect(candidateParents(FLAT, 'nessuno')).toEqual([]);
        expect(candidateParents([...FLAT, a('SYS-X')], 'SYS-X')).toEqual([]);
    });

    it('con un ciclo nei dati non va in loop e non propone i discendenti', () => {
        const items = [a('A', 'B'), a('B', 'A'), a('C')];
        const ids = candidateParents(items, 'A').map(i => i.id);
        expect(ids).toEqual(['C']);
    });
});

describe('stato di scorta dei ricambi montati', () => {
    it('sopra il minimo: nessun avviso', () => {
        expect(partStockStatus(10, 4)).toEqual({ belowMin: false, missing: 0 });
    });

    it('al minimo: avviso ma nessun pezzo mancante', () => {
        expect(partStockStatus(4, 4)).toEqual({ belowMin: true, missing: 0 });
    });

    it('sotto il minimo: quanti pezzi mancano', () => {
        expect(partStockStatus(1, 5)).toEqual({ belowMin: true, missing: 4 });
        expect(partStockStatus(0, 5)).toEqual({ belowMin: true, missing: 5 });
    });

    it('senza minimo, un ricambio esaurito e\' comunque segnalato', () => {
        expect(partStockStatus(0, 0)).toEqual({ belowMin: true, missing: 0 });
        expect(partStockStatus(3, 0)).toEqual({ belowMin: false, missing: 0 });
    });

    it('valori non validi valgono zero', () => {
        expect(partStockStatus(NaN, 2)).toEqual({ belowMin: true, missing: 2 });
        expect(partStockStatus(-3, 2)).toEqual({ belowMin: true, missing: 2 });
    });
});
