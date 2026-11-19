import { AsyncLocalStorage } from 'node:async_hooks';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { basePrisma } from '@/lib/prisma-base';

/**
 * Scope per stabilimento (plant).
 *
 * Chi puo' vedere cosa NON dipende dal browser: lo scope viene calcolato sul server dalla sessione
 * (ruolo + stabilimenti assegnati). Il cookie `cmms_plant_id` esprime solo la scelta del selettore e
 * viene sempre ricontrollato contro gli stabilimenti consentiti, quindi falsificarlo non da' accesso a nulla.
 *
 * - ADMIN: vede tutti gli stabilimenti (o quello scelto).
 * - Tutti gli altri ruoli (compreso PLANT_MANAGER): solo gli stabilimenti assegnati (uno o piu').
 */

export const PLANT_COOKIE = 'cmms_plant_id';
export const ALL_PLANTS = 'ALL';

export type ScopeMode =
    | 'bypass' // nessun contesto di richiesta (script, seed, job di sistema): nessun filtro
    | 'all' // admin su "Tutti gli stabilimenti", o accesso trasversale esplicito: nessun filtro
    | 'plants' // filtro sugli id in `plantIds`
    | 'none'; // utente non autenticato o senza stabilimenti: nessun dato

export interface PlantScope {
    mode: ScopeMode;
    /** Stabilimenti effettivamente visibili (mode 'plants'). */
    plantIds: string[];
    /** Stabilimenti tra cui l'utente puo' scegliere nel selettore. */
    allowedPlantIds: string[];
    isAdmin: boolean;
    userId?: string;
    role?: string;
    homePlantId?: string | null;
    /** 'ALL' oppure l'id dello stabilimento scelto. */
    selected: string;
    /** True se l'accesso trasversale e' stato richiesto esplicitamente con crossPlant(). */
    crossPlant?: boolean;
}

export const BYPASS_SCOPE: PlantScope = { mode: 'bypass', plantIds: [], allowedPlantIds: [], isAdmin: false, selected: ALL_PLANTS };
export const DENY_SCOPE: PlantScope = { mode: 'none', plantIds: [], allowedPlantIds: [], isAdmin: false, selected: ALL_PLANTS };

export class PlantScopeError extends Error {
    constructor(message = 'Operazione non consentita per questo stabilimento') {
        super(message);
        this.name = 'PlantScopeError';
    }
}

export interface ScopeInput {
    userId?: string | null;
    role?: string | null;
    memberPlantIds?: string[];
    homePlantId?: string | null;
    /** Elenco di tutti gli stabilimenti (serve solo per l'admin). */
    allPlantIds?: string[];
    /** Valore del cookie del selettore. */
    selected?: string | null;
}

/** Funzione pura: dato chi e' l'utente e cosa ha scelto, calcola lo scope. Testata in __tests__/unit. */
export function computeScope(input: ScopeInput): PlantScope {
    if (!input.userId) return DENY_SCOPE;

    const isAdmin = input.role === 'ADMIN';
    const home = input.homePlantId ?? null;
    const members = input.memberPlantIds ?? [];
    const allowed = isAdmin
        ? [...new Set(input.allPlantIds ?? [])]
        : [...new Set([...members, ...(home ? [home] : [])])];

    const base = {
        allowedPlantIds: allowed,
        isAdmin,
        userId: input.userId,
        role: input.role ?? undefined,
        homePlantId: home,
    };

    if (!isAdmin && allowed.length === 0) {
        return { ...base, mode: 'none', plantIds: [], selected: ALL_PLANTS };
    }

    const sel = input.selected && input.selected !== ALL_PLANTS && allowed.includes(input.selected) ? input.selected : null;

    if (sel) return { ...base, mode: 'plants', plantIds: [sel], selected: sel };
    if (isAdmin) return { ...base, mode: 'all', plantIds: allowed, selected: ALL_PLANTS };
    return { ...base, mode: 'plants', plantIds: allowed, selected: ALL_PLANTS };
}

// --- Contesto asincrono: permette a funzioni in cache e job di sistema di dichiarare lo scope ---

const storage = new AsyncLocalStorage<PlantScope>();

// Le query Prisma sono "lazy": partono solo quando vengono attese. Per questo `fn` va attesa DENTRO storage.run:
// restituire direttamente la promessa farebbe eseguire la query fuori dal contesto (e senza scope).
export function withPlantScope<T>(scope: PlantScope, fn: () => PromiseLike<T> | T): Promise<T> {
    return storage.run(scope, async () => await fn());
}

/** Per job di sistema affidabili (cron, seed): nessun filtro. Non usare in codice raggiungibile da un utente. */
export function runUnscoped<T>(fn: () => PromiseLike<T> | T): Promise<T> {
    return storage.run(BYPASS_SCOPE, async () => await fn());
}

/** Chiave stabile dello scope, per la cache. */
export function scopeKey(scope: PlantScope): string {
    if (scope.mode === 'plants') return `p:${[...scope.plantIds].sort().join(',')}`;
    return scope.mode;
}

export function scopeFromKey(key: string): PlantScope {
    if (key === 'all') return { ...BYPASS_SCOPE, mode: 'all' };
    if (key === 'bypass') return BYPASS_SCOPE;
    if (key.startsWith('p:')) {
        const ids = key.slice(2).split(',').filter(Boolean);
        return { ...DENY_SCOPE, mode: 'plants', plantIds: ids, allowedPlantIds: ids };
    }
    return DENY_SCOPE;
}

let plantListCache: { at: number; ids: string[] } | null = null;
async function listAllPlantIds(): Promise<string[]> {
    if (plantListCache && Date.now() - plantListCache.at < 30_000) return plantListCache.ids;
    const rows = await basePrisma.plant.findMany({ select: { id: true } });
    plantListCache = { at: Date.now(), ids: rows.map(r => r.id) };
    return plantListCache.ids;
}
export function invalidatePlantListCache() {
    plantListCache = null;
}

async function resolveFromRequest(): Promise<PlantScope> {
    let selected: string | undefined;
    try {
        selected = (await cookies()).get(PLANT_COOKIE)?.value;
    } catch (e) {
        // Fuori da una richiesta (script, test): nessun utente da proteggere.
        // Ogni altro errore (cache, prerender) viene rilanciato: meglio fallire che esporre dati.
        if (/outside a request scope/i.test(String((e as Error)?.message))) return BYPASS_SCOPE;
        throw e;
    }

    const { auth } = await import('@/auth');
    const session = await auth();
    const user = session?.user as { id?: string; role?: string; plantIds?: string[]; homePlantId?: string | null } | undefined;
    if (!user?.id) return DENY_SCOPE;

    return computeScope({
        userId: user.id,
        role: user.role,
        memberPlantIds: user.plantIds ?? [],
        homePlantId: user.homePlantId ?? null,
        allPlantIds: user.role === 'ADMIN' ? await listAllPlantIds() : [],
        selected,
    });
}

const requestScope = cache(resolveFromRequest);

/** Scope corrente: quello dichiarato nel contesto asincrono, altrimenti quello della richiesta in corso. */
export async function getPlantScope(): Promise<PlantScope> {
    return storage.getStore() ?? (await requestScope());
}

/**
 * Accesso trasversale esplicito, consentito solo alle due funzioni previste dal progetto:
 * analisi IA dei guasti e disponibilita' dei ricambi. Ogni uso viene registrato nell'audit log.
 * Chi chiama e' responsabile di restituire solo i campi che un altro plant puo' vedere.
 */
export async function crossPlant<T>(feature: string, fn: () => PromiseLike<T> | T, details?: Record<string, unknown>): Promise<T> {
    const current = await getPlantScope();
    if (current.mode === 'none') throw new PlantScopeError('Non autenticato');
    if (current.userId) {
        try {
            await basePrisma.auditLog.create({
                data: {
                    userId: current.userId,
                    action: 'CROSS_PLANT_READ',
                    resourceId: feature,
                    details: JSON.stringify({ feature, fromPlants: current.plantIds, ...details }),
                },
            });
        } catch (err) {
            console.error('[crossPlant] audit log non scritto:', err);
        }
    }
    return storage.run({ ...current, mode: 'all', crossPlant: true }, async () => await fn());
}

/** Filtro per i modelli User: utenti che appartengono (come plant di casa o assegnazione) agli stabilimenti visibili. */
export function userScopeWhere(scope: PlantScope): Record<string, unknown> {
    if (scope.mode === 'bypass' || scope.mode === 'all') return {};
    const ids = scope.mode === 'none' ? [] : scope.plantIds;
    return { OR: [{ plantId: { in: ids } }, { plants: { some: { plantId: { in: ids } } } }] };
}

/**
 * Plant su cui scrivere un record. Se `explicit` e' indicato deve essere consentito; altrimenti, se l'utente
 * vede un solo stabilimento, e' quello; in caso contrario serve una scelta esplicita.
 */
export async function resolveWritePlantId(explicit?: string | null): Promise<string> {
    const scope = await getPlantScope();
    if (explicit) {
        if (scope.mode === 'all' || scope.mode === 'bypass' || scope.plantIds.includes(explicit)) return explicit;
        throw new PlantScopeError('Stabilimento non consentito');
    }
    if (scope.mode === 'plants' && scope.plantIds.length === 1) return scope.plantIds[0];
    if ((scope.mode === 'all' || scope.mode === 'bypass') && scope.allowedPlantIds.length === 1) return scope.allowedPlantIds[0];
    throw new PlantScopeError('Seleziona uno stabilimento prima di continuare');
}
