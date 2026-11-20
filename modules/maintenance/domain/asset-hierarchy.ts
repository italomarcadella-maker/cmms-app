/**
 * Gerarchia degli asset (macchina -> gruppo -> componente): funzioni pure, senza database.
 *
 * Il legame e' un solo padre per asset (`parentId`). I dati possono essere imperfetti (padre cancellato, padre di un altro
 * stabilimento, cicli scritti a mano nel database): ogni funzione qui sotto li tollera con la stessa regola,
 * `normalizeParents`:
 *  - un padre che non esiste nell'elenco, o che e' l'asset stesso, vale come "nessun padre" (l'asset e' una radice);
 *  - in un ciclo, il primo asset dell'elenco diventa radice e rompe il ciclo (gli altri restano figli a catena).
 * Cosi' ogni asset e' raggiungibile da una radice e nessun percorso e' infinito.
 */

/** Livelli massimi della catena: la radice e' il livello 1 (es. macchina, gruppo, sottogruppo, componente...). */
export const MAX_ASSET_DEPTH = 6;

/** Prefisso degli asset di sistema (non sono macchine reali: non entrano nella gerarchia). */
export const SYSTEM_ASSET_PREFIX = 'SYS-';

export interface HierarchyItem {
    id: string;
    parentId?: string | null;
    plantId?: string | null;
}

export interface AssetTreeNode<T extends HierarchyItem> {
    item: T;
    children: AssetTreeNode<T>[];
    /** Livello: 1 per le radici. */
    depth: number;
}

export function isSystemAsset(id: string): boolean {
    return id.startsWith(SYSTEM_ASSET_PREFIX);
}

function samePlant(a: string | null | undefined, b: string | null | undefined): boolean {
    return (a ?? null) === (b ?? null);
}

/** Id padre effettivo di ogni asset (null = radice), con le regole descritte in cima al file. */
export function normalizeParents(items: readonly HierarchyItem[]): Map<string, string | null> {
    const index = new Map<string, number>();
    items.forEach((it, i) => {
        if (!index.has(it.id)) index.set(it.id, i);
    });

    const parents = new Map<string, string | null>();
    for (const it of items) {
        if (parents.has(it.id)) continue; // id duplicato: vale il primo
        const p = it.parentId ?? null;
        parents.set(it.id, p !== null && p !== it.id && index.has(p) ? p : null);
    }

    // Rottura dei cicli: si segue la catena di ogni asset; se si torna su un asset della stessa camminata e' un ciclo
    const done = new Set<string>();
    for (const start of parents.keys()) {
        if (done.has(start)) continue;
        const walk: string[] = [];
        const inWalk = new Set<string>();
        let current: string | null = start;
        while (current !== null && !done.has(current)) {
            if (inWalk.has(current)) {
                const cycle = walk.slice(walk.indexOf(current));
                const first = cycle.reduce((best, id) => (index.get(id)! < index.get(best)! ? id : best), cycle[0]);
                parents.set(first, null);
                break;
            }
            inWalk.add(current);
            walk.push(current);
            current = parents.get(current) ?? null;
        }
        for (const id of walk) done.add(id);
    }
    return parents;
}

/** Cicli presenti nei dati cosi' come sono (ognuno e' l'elenco degli id coinvolti). Utile per segnalare dati da correggere. */
export function findCycles(items: readonly HierarchyItem[]): string[][] {
    const ids = new Set(items.map(i => i.id));
    const direct = new Map<string, string | null>();
    for (const it of items) {
        if (!direct.has(it.id)) direct.set(it.id, it.parentId && it.parentId !== it.id && ids.has(it.parentId) ? it.parentId : null);
    }
    // Gli auto-riferimenti sono cicli di un solo asset
    const cycles: string[][] = [];
    const seenInCycle = new Set<string>();
    for (const it of items) {
        if (it.parentId && it.parentId === it.id && !seenInCycle.has(it.id)) {
            cycles.push([it.id]);
            seenInCycle.add(it.id);
        }
    }
    const done = new Set<string>();
    for (const start of direct.keys()) {
        if (done.has(start)) continue;
        const walk: string[] = [];
        const inWalk = new Set<string>();
        let current: string | null = start;
        while (current !== null && !done.has(current)) {
            if (inWalk.has(current)) {
                const cycle = walk.slice(walk.indexOf(current));
                if (!cycle.some(id => seenInCycle.has(id))) {
                    cycles.push(cycle);
                    cycle.forEach(id => seenInCycle.add(id));
                }
                break;
            }
            inWalk.add(current);
            walk.push(current);
            current = direct.get(current) ?? null;
        }
        for (const id of walk) done.add(id);
    }
    return cycles;
}

export function hasCycle(items: readonly HierarchyItem[]): boolean {
    return findCycles(items).length > 0;
}

/** Albero (foresta) dall'elenco piatto. L'ordine dei fratelli e' quello dell'elenco. */
export function buildAssetTree<T extends HierarchyItem>(items: readonly T[]): AssetTreeNode<T>[] {
    const parents = normalizeParents(items);
    const nodes = new Map<string, AssetTreeNode<T>>();
    for (const it of items) {
        if (!nodes.has(it.id)) nodes.set(it.id, { item: it, children: [], depth: 1 });
    }
    const roots: AssetTreeNode<T>[] = [];
    for (const node of nodes.values()) {
        const p = parents.get(node.item.id) ?? null;
        if (p === null) roots.push(node);
        else nodes.get(p)!.children.push(node);
    }
    const setDepth = (node: AssetTreeNode<T>, depth: number) => {
        node.depth = depth;
        node.children.forEach(c => setDepth(c, depth + 1));
    };
    roots.forEach(r => setDepth(r, 1));
    return roots;
}

/** Figli diretti di ogni asset (id -> elenco di id), con la normalizzazione dei dati. */
function childrenIndex(items: readonly HierarchyItem[]): Map<string, string[]> {
    const parents = normalizeParents(items);
    const children = new Map<string, string[]>();
    for (const [id, p] of parents) {
        if (p === null) continue;
        const list = children.get(p);
        if (list) list.push(id);
        else children.set(p, [id]);
    }
    return children;
}

/** Percorso dalla radice all'asset, asset compreso. Vuoto se l'asset non e' nell'elenco. */
export function getAssetPath<T extends HierarchyItem>(items: readonly T[], id: string): T[] {
    const byId = new Map<string, T>();
    for (const it of items) if (!byId.has(it.id)) byId.set(it.id, it);
    if (!byId.has(id)) return [];
    const parents = normalizeParents(items);
    const path: T[] = [];
    let current: string | null = id;
    while (current !== null) {
        path.push(byId.get(current)!);
        current = parents.get(current) ?? null;
    }
    return path.reverse();
}

/** Livello dell'asset nella catena (1 = radice); 0 se non e' nell'elenco. */
export function getAssetDepth(items: readonly HierarchyItem[], id: string): number {
    return getAssetPath(items, id).length;
}

/** Id di tutti i discendenti (figli, nipoti...), esclusa la radice indicata, in ordine di livello. */
export function getDescendantIds(items: readonly HierarchyItem[], id: string): string[] {
    const children = childrenIndex(items);
    const out: string[] = [];
    const queue = [...(children.get(id) ?? [])];
    while (queue.length) {
        const next = queue.shift()!;
        out.push(next);
        queue.push(...(children.get(next) ?? []));
    }
    return out;
}

/** Altezza del sottoalbero: 1 per un asset senza figli, 2 con figli diretti, e cosi' via. */
export function getSubtreeHeight(items: readonly HierarchyItem[], id: string): number {
    const children = childrenIndex(items);
    let height = 0;
    let level = [id];
    while (level.length) {
        height++;
        level = level.flatMap(x => children.get(x) ?? []);
    }
    return height;
}

export type ParentRejection = 'SELF' | 'NOT_FOUND' | 'PARENT_NOT_FOUND' | 'OTHER_PLANT' | 'CYCLE' | 'TOO_DEEP' | 'SYSTEM_ASSET';

export type ParentCheck = { ok: true } | { ok: false; reason: ParentRejection; message: string };

const REJECTION_MESSAGES: Record<ParentRejection, string> = {
    SELF: 'Un asset non puo\' far parte di se stesso.',
    NOT_FOUND: 'Asset non trovato.',
    PARENT_NOT_FOUND: 'L\'asset scelto come padre non esiste.',
    OTHER_PLANT: 'Il padre deve essere dello stesso stabilimento.',
    CYCLE: 'Il padre scelto e\' un componente di questo stesso asset: si creerebbe un giro chiuso.',
    TOO_DEEP: `La gerarchia puo' avere al massimo ${MAX_ASSET_DEPTH} livelli.`,
    SYSTEM_ASSET: 'Gli asset di sistema non possono far parte di una gerarchia.',
};

function reject(reason: ParentRejection): ParentCheck {
    return { ok: false, reason, message: REJECTION_MESSAGES[reason] };
}

/**
 * Verifica se `assetId` puo' avere `parentId` come padre (null = nessun padre, sempre valido per un asset esistente).
 * `items` e' l'elenco piatto che contiene almeno l'asset, il candidato padre e i discendenti dell'asset.
 * Per un asset non ancora creato passare `assetId = null`: si controllano stabilimento, tipo e profondita'.
 */
export function checkParentAssignment(
    items: readonly HierarchyItem[],
    assetId: string | null,
    parentId: string | null,
    plantId?: string | null
): ParentCheck {
    const asset = assetId === null ? null : items.find(i => i.id === assetId) ?? null;
    if (assetId !== null && !asset) return reject('NOT_FOUND');
    if (assetId !== null && isSystemAsset(assetId)) return reject('SYSTEM_ASSET');
    if (parentId === null) return { ok: true };
    if (assetId !== null && parentId === assetId) return reject('SELF');

    const parent = items.find(i => i.id === parentId);
    if (!parent) return reject('PARENT_NOT_FOUND');
    if (isSystemAsset(parent.id)) return reject('SYSTEM_ASSET');

    const ownPlant = asset ? asset.plantId : plantId;
    if (!samePlant(ownPlant, parent.plantId)) return reject('OTHER_PLANT');

    if (assetId !== null && getDescendantIds(items, assetId).includes(parentId)) return reject('CYCLE');

    // Livelli totali = livello del padre + altezza del sottoalbero spostato (l'asset e i suoi discendenti)
    const subtree = assetId === null ? 1 : getSubtreeHeight(items, assetId);
    if (getAssetDepth(items, parentId) + subtree > MAX_ASSET_DEPTH) return reject('TOO_DEEP');
    return { ok: true };
}

/**
 * Asset che si possono scegliere come padre di `assetId` (null per un asset nuovo, con `plantId` dello stabilimento scelto):
 * stesso stabilimento, non l'asset stesso ne' i suoi discendenti, non asset di sistema, e senza superare la profondita' massima.
 */
export function candidateParents<T extends HierarchyItem>(items: readonly T[], assetId: string | null, plantId?: string | null): T[] {
    const own = assetId === null ? null : items.find(i => i.id === assetId) ?? null;
    if (assetId !== null && (!own || isSystemAsset(assetId))) return [];
    const ownPlant = own ? own.plantId : plantId;

    const parents = normalizeParents(items);
    const excluded = new Set<string>(assetId === null ? [] : [assetId, ...getDescendantIds(items, assetId)]);
    const subtreeHeight = assetId === null ? 1 : getSubtreeHeight(items, assetId);

    // Livello di ogni asset, calcolato una volta sola (le catene sono finite grazie alla normalizzazione)
    const depths = new Map<string, number>();
    const depthOf = (id: string): number => {
        const known = depths.get(id);
        if (known !== undefined) return known;
        const p = parents.get(id) ?? null;
        const d = p === null ? 1 : depthOf(p) + 1;
        depths.set(id, d);
        return d;
    };

    return items.filter(c =>
        !excluded.has(c.id) &&
        !isSystemAsset(c.id) &&
        samePlant(ownPlant, c.plantId) &&
        depthOf(c.id) + subtreeHeight <= MAX_ASSET_DEPTH
    );
}

export interface PartStockStatus {
    /** Giacenza al minimo o sotto (stessa regola della pagina Magazzino: giacenza <= minimo). */
    belowMin: boolean;
    /** Pezzi che mancano per tornare alla scorta minima (0 se non mancano). */
    missing: number;
}

/** Stato di scorta di un ricambio montato su una macchina. Valori non numerici o negativi valgono zero. */
export function partStockStatus(stock: number, minStock: number): PartStockStatus {
    const s = Number.isFinite(stock) && stock > 0 ? stock : 0;
    const m = Number.isFinite(minStock) && minStock > 0 ? minStock : 0;
    return { belowMin: s <= m, missing: Math.max(0, m - s) };
}
