import { basePrisma } from '@/lib/prisma-base';
import { getPlantScope, PlantScope, PlantScopeError } from '@/lib/plant-scope';

/**
 * Client Prisma dell'applicazione.
 *
 * 1. Filtro per stabilimento: ogni lettura/scrittura dei modelli legati a un plant viene limitata agli
 *    stabilimenti visibili all'utente (vedi lib/plant-scope.ts). E' un unico punto di controllo: il
 *    codice delle pagine e delle azioni non deve ricordarsi di filtrare.
 *    Le due funzioni trasversali (analisi guasti, disponibilita' ricambi) usano crossPlant().
 * 2. Audit log delle modifiche ai modelli sensibili.
 */

/** Modelli con colonna plantId (o id, per Plant): filtro diretto. */
const DIRECT: Record<string, string> = {
    Plant: 'id',
    Asset: 'plantId',
    WorkOrder: 'plantId',
    SparePart: 'plantId',
    EnergyLog: 'plantId',
    Meter: 'plantId',
    Component: 'plantId',
    Project: 'plantId',
    DailyMeeting: 'plantId',
    ProductionLine: 'plantId',
    SafetyEvent: 'plantId',
    ContractorContract: 'plantId',
};

/** Modelli che ereditano il plant da un padre (percorso di relazione fino a una colonna plantId). */
const VIA: Record<string, string[]> = {
    PreventiveSchedule: ['asset'],
    AssetDocument: ['asset'],
    AssetImage: ['asset'],
    SopDocument: ['asset'],
    ProcessAnomaly: ['asset'],
    ChecklistItem: ['workOrder'],
    WorkOrderPart: ['workOrder'],
    LaborLog: ['workOrder'],
    WorkOrderTimer: ['workOrder'],
    EWO: ['workOrder'],
    WorkOrderTechnician: ['workOrder'],
    MeterReading: ['meter'],
    ComponentMeasurement: ['component'],
    MeetingSection: ['meeting'],
    MeetingActionItem: ['section', 'meeting'],
    ProjectTask: ['project'],
    ProjectTaskNote: ['task', 'project'],
    PurchaseRequest: ['part'],
    SopFeedback: ['sop', 'asset'],
    ContractorActivity: ['contract'],
    ContractorExecution: ['activity', 'contract'],
};

/** Come VIA, ma il padre e' facoltativo: i record senza padre restano visibili a tutti (conoscenza condivisa). */
const VIA_OPTIONAL: Record<string, { rel: string; fk: string }> = {
    ProcessRecipe: { rel: 'asset', fk: 'assetId' },
    LineSimulation: { rel: 'asset', fk: 'assetId' },
};

const WRITE_OPS = new Set(['update', 'updateMany', 'delete', 'deleteMany', 'upsert']);

const READ_AND_FILTER_OPS = new Set([
    'findMany', 'findFirst', 'findFirstOrThrow', 'findUnique', 'findUniqueOrThrow',
    'count', 'aggregate', 'groupBy',
    'update', 'updateMany', 'delete', 'deleteMany', 'upsert',
]);

function nest(path: string[], leaf: Record<string, unknown>): Record<string, unknown> {
    return path.reduceRight<Record<string, unknown>>((acc, rel) => ({ [rel]: acc }), leaf);
}

/** Filtro Prisma "il record appartiene a uno degli stabilimenti `ids`" per il modello dato; null = modello non soggetto a scope. */
export function plantFilter(model: string, ids: string[], forWrite = false): Record<string, unknown> | null {
    // Gli asset "di sistema" (SYS-SAFETY, SYS-OTHER...) sono segnaposto condivisi: tutti li leggono, nessuno li modifica
    if (model === 'Asset' && !forWrite) return { OR: [{ plantId: { in: ids } }, { id: { startsWith: 'SYS-' } }] };
    if (DIRECT[model]) return { [DIRECT[model]]: { in: ids } };
    if (VIA[model]) return nest(VIA[model], { plantId: { in: ids } });
    if (VIA_OPTIONAL[model]) {
        const { rel, fk } = VIA_OPTIONAL[model];
        return { OR: [{ [fk]: null }, { [rel]: { plantId: { in: ids } } }] };
    }
    if (model === 'Technician') {
        const now = new Date();
        return {
            OR: [
                { user: { plantId: { in: ids } } },
                { user: { plants: { some: { plantId: { in: ids } } } } },
                { loans: { some: { status: 'APPROVED', toPlantId: { in: ids }, startDate: { lte: now }, endDate: { gte: now } } } },
            ],
        };
    }
    if (model === 'TechnicianAvailability') {
        return { user: { OR: [{ plantId: { in: ids } }, { plants: { some: { plantId: { in: ids } } } }] } };
    }
    if (model === 'PartTransferRequest' || model === 'TechnicianLoan') {
        return { OR: [{ fromPlantId: { in: ids } }, { toPlantId: { in: ids } }] };
    }
    return null;
}

/** Modelli soggetti a scope (usato anche dal test che verifica la copertura). */
export const SCOPED_MODELS = [
    ...Object.keys(DIRECT), ...Object.keys(VIA), ...Object.keys(VIA_OPTIONAL), 'Technician', 'TechnicianAvailability', 'PartTransferRequest', 'TechnicianLoan',
];

function mergeWhere(where: any, filter: Record<string, unknown>) {
    const existing = where?.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : [];
    return { ...(where ?? {}), AND: [...existing, filter] };
}

function guardCreate(model: string, data: any, scope: PlantScope) {
    if (!data || DIRECT[model] !== 'plantId') return data;
    const given: string | null | undefined = data.plantId ?? data.plant?.connect?.id;
    if (given == null) {
        if (data.plant) return data; // relazione "disconnect/create": lasciata al chiamante
        const fallback = scope.plantIds.length === 1
            ? scope.plantIds[0]
            : scope.homePlantId && scope.plantIds.includes(scope.homePlantId) ? scope.homePlantId : undefined;
        if (!fallback) throw new PlantScopeError('Seleziona uno stabilimento prima di creare il record');
        return { ...data, plantId: fallback };
    }
    if (!scope.plantIds.includes(given)) throw new PlantScopeError('Stabilimento non consentito');
    return data;
}

/** Per ogni modello figlio: quale colonna lo lega al padre e di che tabella e' il padre. */
const PARENT: Record<string, { fk: string; table: 'asset' | 'workOrder' | 'meter' | 'component' | 'dailyMeeting' | 'project' | 'sparePart' | 'contractorContract' }> = {
    WorkOrder: { fk: 'assetId', table: 'asset' },
    PreventiveSchedule: { fk: 'assetId', table: 'asset' },
    SopDocument: { fk: 'assetId', table: 'asset' },
    ProcessAnomaly: { fk: 'assetId', table: 'asset' },
    AssetDocument: { fk: 'assetId', table: 'asset' },
    AssetImage: { fk: 'assetId', table: 'asset' },
    ChecklistItem: { fk: 'workOrderId', table: 'workOrder' },
    WorkOrderPart: { fk: 'workOrderId', table: 'workOrder' },
    LaborLog: { fk: 'workOrderId', table: 'workOrder' },
    WorkOrderTimer: { fk: 'workOrderId', table: 'workOrder' },
    EWO: { fk: 'workOrderId', table: 'workOrder' },
    WorkOrderTechnician: { fk: 'workOrderId', table: 'workOrder' },
    MeterReading: { fk: 'meterId', table: 'meter' },
    ComponentMeasurement: { fk: 'componentId', table: 'component' },
    MeetingSection: { fk: 'meetingId', table: 'dailyMeeting' },
    ProjectTask: { fk: 'projectId', table: 'project' },
    PurchaseRequest: { fk: 'partId', table: 'sparePart' },
    ContractorActivity: { fk: 'contractId', table: 'contractorContract' },
};

/** Plant del padre (null = padre condiviso, undefined = padre inesistente). Lettura con il client grezzo. */
async function parentPlantId(table: string, id: string): Promise<string | null | undefined> {
    const where = { where: { id }, select: { plantId: true } } as any;
    const db = basePrisma as any;
    const row = await db[table].findUnique(where);
    return row === null ? undefined : row.plantId ?? null;
}

/** Controlla che il record padre sia di un plant consentito; per gli ordini di lavoro ne ricava anche il plant. */
async function guardParent(model: string, data: any, scope: PlantScope) {
    const rule = PARENT[model];
    if (!rule || !data) return data;
    const fkValue = data[rule.fk] ?? data[rule.table]?.connect?.id;
    if (!fkValue) return data;
    const plantOfParent = await parentPlantId(rule.table, fkValue);
    if (plantOfParent === undefined) throw new PlantScopeError('Elemento collegato non trovato');
    if (plantOfParent !== null && !scope.plantIds.includes(plantOfParent)) {
        throw new PlantScopeError("L'elemento collegato appartiene a un altro stabilimento");
    }
    if (model === 'WorkOrder' && plantOfParent && data.plantId == null && !data.plant) {
        return { ...data, plantId: plantOfParent };
    }
    return data;
}

function guardUpdate(model: string, data: any, scope: PlantScope) {
    if (!data || DIRECT[model] !== 'plantId') return;
    const target = data.plantId ?? data.plant?.connect?.id;
    const value = typeof target === 'object' && target !== null ? target.set : target;
    if (value != null && !scope.plantIds.includes(value)) throw new PlantScopeError('Stabilimento non consentito');
}

const scoped = basePrisma.$extends({
    name: 'plant-scope',
    query: {
        async $allOperations({ model, operation, args, query }: any) {
            if (!model) return query(args); // query raw: nessun modello
            if (plantFilter(model, []) === null) return query(args); // modello non legato a un plant

            const scope = await getPlantScope();
            if (scope.mode === 'bypass' || scope.crossPlant) return query(args);

            // Admin su "Tutti gli stabilimenti": legge tutto, ma un record nuovo deve avere un plant
            // (altrimenti resterebbe invisibile a tutti tranne che a lui). Se non e' indicato: il plant del padre,
            // lo stabilimento di casa, o l'unico esistente.
            if (scope.mode === 'all') {
                if (operation === 'create') {
                    args.data = guardCreate(model, await guardParent(model, args.data, scope), scope);
                } else if (operation === 'createMany' || operation === 'createManyAndReturn') {
                    args.data = Array.isArray(args.data)
                        ? await Promise.all(args.data.map(async (d: any) => guardCreate(model, await guardParent(model, d, scope), scope)))
                        : guardCreate(model, await guardParent(model, args.data, scope), scope);
                }
                return query(args);
            }

            const ids = scope.mode === 'none' ? [] : scope.plantIds;

            // Gli stabilimenti si creano e si eliminano solo da "tutti gli stabilimenti" (admin)
            if (model === 'Plant' && ['create', 'createMany', 'delete', 'deleteMany', 'upsert'].includes(operation)) {
                throw new PlantScopeError('Solo un amministratore puo\' creare o eliminare stabilimenti');
            }

            const readFilter = plantFilter(model, ids)!;
            const writeFilter = plantFilter(model, ids, true)!;

            if (operation === 'create') {
                args.data = guardCreate(model, await guardParent(model, args.data, scope), scope);
                return query(args);
            }
            if (operation === 'createMany' || operation === 'createManyAndReturn') {
                args.data = Array.isArray(args.data)
                    ? await Promise.all(args.data.map(async (d: any) => guardCreate(model, await guardParent(model, d, scope), scope)))
                    : guardCreate(model, await guardParent(model, args.data, scope), scope);
                return query(args);
            }
            if (operation === 'upsert') {
                args.create = guardCreate(model, await guardParent(model, args.create, scope), scope);
                guardUpdate(model, args.update, scope);
                args.where = mergeWhere(args.where, writeFilter);
                return query(args);
            }
            if (operation === 'update' || operation === 'updateMany') guardUpdate(model, args.data, scope);

            if (READ_AND_FILTER_OPS.has(operation)) {
                args.where = mergeWhere(args.where, WRITE_OPS.has(operation) ? writeFilter : readFilter);
            }
            return query(args);
        },
    },
});

const AUDITED = ['WorkOrder', 'SparePart', 'User', 'PreventiveSchedule', 'SopDocument', 'ProcessAnomaly'];

export const prisma = scoped.$extends({
    name: 'audit-log',
    query: {
        $allModels: {
            async create({ model, args, query }) {
                const result = await query(args);
                if (AUDITED.includes(model)) logMutation(model, `CREATE_${model.toUpperCase()}`, (result as any)?.id, args.data);
                return result;
            },
            async update({ model, args, query }) {
                const result = await query(args);
                if (AUDITED.includes(model)) logMutation(model, `UPDATE_${model.toUpperCase()}`, (result as any)?.id, args.data);
                return result;
            },
            async delete({ model, args, query }) {
                const result = await query(args);
                if (AUDITED.includes(model)) logMutation(model, `DELETE_${model.toUpperCase()}`, (result as any)?.id, args.where);
                return result;
            },
        },
    },
});

async function logMutation(model: string, action: string, resourceId: string | undefined, details: any) {
    try {
        const { auth } = await import('@/auth');
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) return;

        // Mai scrivere credenziali nel registro
        const safe = details && typeof details === 'object' && 'password' in details ? { ...details, password: '[omessa]' } : details;

        // Scrittura con il client grezzo, per evitare ricorsione
        await basePrisma.auditLog.create({
            data: {
                userId,
                action,
                resourceId,
                details: safe ? JSON.stringify(safe) : null,
            },
        });
    } catch (err) {
        console.error(`[AuditLog Error] Failed to write log for ${model}:`, err);
    }
}
