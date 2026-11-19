'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-guard';
import { PlantScopeError, resolveWritePlantId } from '@/lib/plant-scope';
import { usersToNotify } from '@/lib/plant-users';
import {
    activityState, contractState, daysToEnd, isInForce, nextDueAfterExecution,
    type ActivityState, type ContractState,
} from '../../domain/contractors';

/**
 * Ditte esterne e attivita' secondo contratto.
 * L'anagrafica della ditta e' di gruppo; contratti, attivita' ed esecuzioni appartengono a uno stabilimento
 * e seguono il filtro per plant come ogni altro dato.
 */

const VIEW = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'MAINTAINER', 'PROCESS_ENGINEER'];
const MANAGE = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR'];
const DAY = 86_400_000;

type Result = { success: boolean; message: string; id?: string };
const ok = (message: string, id?: string): Result => ({ success: true, message, id });
const fail = (message: string): Result => ({ success: false, message });

const clean = (v: string | null | undefined, max: number) => (v?.trim().slice(0, max) || null);
const isHttpUrl = (v: string) => /^https?:\/\/\S+$/i.test(v);
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// --- Tipi per l'interfaccia ---

export interface ContractorSummary {
    id: string;
    name: string;
    vatNumber: string | null;
    contactName: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    notes: string | null;
    isActive: boolean;
    contracts: number;
    inForceContracts: number;
    expiringContracts: number;
    overdueActivities: number;
    dueSoonActivities: number;
    executions12m: number;
    issues12m: number;
    cost12m: number;
}

export interface ContractRow {
    id: string;
    contractorId: string;
    contractorName: string;
    plantId: string;
    plantName: string;
    title: string;
    scope: string | null;
    startDate: string;
    endDate: string | null;
    renewalNoticeDays: number;
    annualValue: number | null;
    notes: string | null;
    state: ContractState;
    daysToEnd: number | null;
    activities: number;
    overdueActivities: number;
}

export interface ActivityRow {
    id: string;
    contractId: string;
    contractTitle: string;
    contractorId: string;
    contractorName: string;
    plantId: string;
    title: string;
    description: string | null;
    frequencyDays: number;
    assetId: string | null;
    assetName: string | null;
    nextDueDate: string;
    lastDoneAt: string | null;
    state: ActivityState;
    contractState: ContractState;
    assigneeName: string | null;
    isActive: boolean;
}

export interface ExecutionRow {
    id: string;
    activityId: string;
    activityTitle: string;
    doneAt: string;
    outcome: string;
    notes: string | null;
    reportUrl: string | null;
    cost: number | null;
}

export interface ContractorKpis {
    inForceContracts: number;
    expiringContracts: number;
    overdueActivities: number;
    dueNext30Days: number;
    cost12m: number;
}

export interface ContractorsOverview {
    kpis: ContractorKpis;
    contractors: ContractorSummary[];
    canManage: boolean;
}

// --- Caricamento comune ---

async function loadContracts() {
    return prisma.contractorContract.findMany({
        orderBy: [{ endDate: 'asc' }],
        include: {
            contractor: { select: { id: true, name: true } },
            plant: { select: { name: true } },
            activities: {
                include: {
                    asset: { select: { name: true } },
                    executions: { orderBy: { doneAt: 'desc' } },
                },
            },
        },
    });
}
type LoadedContract = Awaited<ReturnType<typeof loadContracts>>[number];

async function userNames(ids: (string | null)[]) {
    const unique = [...new Set(ids.filter((x): x is string => !!x))];
    if (unique.length === 0) return new Map<string, string>();
    const users = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
    return new Map(users.map(u => [u.id, u.name ?? 'Utente']));
}

function toContractRow(c: LoadedContract, now: Date): ContractRow {
    const state = contractState(c, now);
    return {
        id: c.id,
        contractorId: c.contractorId,
        contractorName: c.contractor.name,
        plantId: c.plantId,
        plantName: c.plant.name,
        title: c.title,
        scope: c.scope,
        startDate: c.startDate.toISOString(),
        endDate: c.endDate ? c.endDate.toISOString() : null,
        renewalNoticeDays: c.renewalNoticeDays,
        annualValue: c.annualValue,
        notes: c.notes,
        state,
        daysToEnd: daysToEnd(c.endDate, now),
        activities: c.activities.filter(a => a.isActive).length,
        overdueActivities: isInForce(state) ? c.activities.filter(a => activityState(a, now) === 'OVERDUE').length : 0,
    };
}

function toActivityRows(contracts: LoadedContract[], names: Map<string, string>, now: Date): ActivityRow[] {
    return contracts.flatMap(c => c.activities.map(a => ({
        id: a.id,
        contractId: c.id,
        contractTitle: c.title,
        contractorId: c.contractorId,
        contractorName: c.contractor.name,
        plantId: c.plantId,
        title: a.title,
        description: a.description,
        frequencyDays: a.frequencyDays,
        assetId: a.assetId,
        assetName: a.asset?.name ?? null,
        nextDueDate: a.nextDueDate.toISOString(),
        lastDoneAt: a.lastDoneAt ? a.lastDoneAt.toISOString() : null,
        state: activityState(a, now),
        contractState: contractState(c, now),
        assigneeName: a.assigneeId ? names.get(a.assigneeId) ?? 'Utente' : null,
        isActive: a.isActive,
    })));
}

// --- Letture ---

export async function getContractorsOverview(): Promise<ContractorsOverview> {
    const { authorized, session } = await requireRole(VIEW);
    const empty: ContractorsOverview = { kpis: { inForceContracts: 0, expiringContracts: 0, overdueActivities: 0, dueNext30Days: 0, cost12m: 0 }, contractors: [], canManage: false };
    if (!authorized) return empty;

    const now = new Date();
    const since = new Date(now.getTime() - 365 * DAY);
    const [contractors, contracts] = await Promise.all([
        prisma.contractor.findMany({ orderBy: { name: 'asc' } }),
        loadContracts(),
    ]);

    const kpis = { ...empty.kpis };
    const summaries: ContractorSummary[] = contractors.map(c => {
        const own = contracts.filter(x => x.contractorId === c.id);
        const states = own.map(x => contractState(x, now));
        const inForce = own.filter((_, i) => isInForce(states[i]));
        const acts = inForce.flatMap(x => x.activities);
        const execs = own.flatMap(x => x.activities.flatMap(a => a.executions)).filter(e => e.doneAt >= since);
        return {
            id: c.id, name: c.name, vatNumber: c.vatNumber, contactName: c.contactName, contactPhone: c.contactPhone,
            contactEmail: c.contactEmail, notes: c.notes, isActive: c.isActive,
            contracts: own.length,
            inForceContracts: inForce.length,
            expiringContracts: states.filter(s => s === 'EXPIRING').length,
            overdueActivities: acts.filter(a => activityState(a, now) === 'OVERDUE').length,
            dueSoonActivities: acts.filter(a => activityState(a, now) === 'DUE_SOON').length,
            executions12m: execs.length,
            issues12m: execs.filter(e => e.outcome === 'ISSUES').length,
            cost12m: Math.round(execs.reduce((s, e) => s + (e.cost ?? 0), 0)),
        };
    });

    for (const c of contracts) {
        const state = contractState(c, now);
        if (!isInForce(state)) continue;
        kpis.inForceContracts += 1;
        if (state === 'EXPIRING') kpis.expiringContracts += 1;
        for (const a of c.activities) {
            const st = activityState(a, now);
            if (st === 'OVERDUE') kpis.overdueActivities += 1;
            if (a.isActive && a.nextDueDate.getTime() <= now.getTime() + 30 * DAY && st !== 'OVERDUE') kpis.dueNext30Days += 1;
        }
    }
    kpis.cost12m = summaries.reduce((s, c) => s + c.cost12m, 0);

    return { kpis, contractors: summaries, canManage: MANAGE.includes(session.user.role) };
}

export interface ContractorDetail {
    contractor: ContractorSummary | null;
    contracts: ContractRow[];
    activities: ActivityRow[];
    executions: ExecutionRow[];
    canManage: boolean;
    assets: { id: string; name: string; plantId: string | null }[];
}

export async function getContractorDetail(contractorId: string): Promise<ContractorDetail> {
    const { authorized, session } = await requireRole(VIEW);
    const empty: ContractorDetail = { contractor: null, contracts: [], activities: [], executions: [], canManage: false, assets: [] };
    if (!authorized) return empty;

    const overview = await getContractorsOverview();
    const contractor = overview.contractors.find(c => c.id === contractorId) ?? null;
    if (!contractor) return empty;

    const now = new Date();
    const contracts = (await loadContracts()).filter(c => c.contractorId === contractorId);
    const names = await userNames(contracts.flatMap(c => c.activities.map(a => a.assigneeId)));
    const executions: ExecutionRow[] = contracts
        .flatMap(c => c.activities.flatMap(a => a.executions.map(e => ({
            id: e.id, activityId: a.id, activityTitle: a.title, doneAt: e.doneAt.toISOString(), outcome: e.outcome,
            notes: e.notes, reportUrl: e.reportUrl, cost: e.cost,
        }))))
        .sort((a, b) => b.doneAt.localeCompare(a.doneAt))
        .slice(0, 30);
    const assets = await prisma.asset.findMany({ where: { id: { not: { startsWith: 'SYS-' } } }, select: { id: true, name: true, plantId: true }, orderBy: { name: 'asc' } });

    return {
        contractor,
        contracts: contracts.map(c => toContractRow(c, now)),
        activities: toActivityRows(contracts, names, now).sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)),
        executions,
        canManage: MANAGE.includes(session.user.role),
        assets,
    };
}

/** Tutte le attivita' dei contratti in vigore, dalla piu' urgente. */
export async function listContractActivities(): Promise<ActivityRow[]> {
    const { authorized } = await requireRole(VIEW);
    if (!authorized) return [];
    const now = new Date();
    const contracts = (await loadContracts()).filter(c => isInForce(contractState(c, now)));
    const names = await userNames(contracts.flatMap(c => c.activities.map(a => a.assigneeId)));
    return toActivityRows(contracts, names, now).filter(a => a.isActive).sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
}

export async function listAllContracts(): Promise<ContractRow[]> {
    const { authorized } = await requireRole(VIEW);
    if (!authorized) return [];
    const now = new Date();
    return (await loadContracts()).map(c => toContractRow(c, now));
}

// --- Ditte ---

export interface ContractorInput {
    name: string;
    vatNumber?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    notes?: string;
    isActive?: boolean;
}

function validateContractor(input: ContractorInput): string | null {
    if (!input.name?.trim()) return 'Il nome della ditta e\' obbligatorio.';
    if (input.contactEmail?.trim() && !isEmail(input.contactEmail.trim())) return 'Email del referente non valida.';
    return null;
}

export async function createContractor(input: ContractorInput): Promise<Result> {
    const { authorized, message } = await requireRole(MANAGE);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    const error = validateContractor(input);
    if (error) return fail(error);
    try {
        const created = await prisma.contractor.create({
            data: {
                name: input.name.trim().slice(0, 120),
                vatNumber: clean(input.vatNumber, 20),
                contactName: clean(input.contactName, 80),
                contactPhone: clean(input.contactPhone, 40),
                contactEmail: clean(input.contactEmail, 120),
                notes: clean(input.notes, 500),
            },
        });
        revalidatePath('/contractors');
        return ok('Ditta aggiunta.', created.id);
    } catch {
        return fail('Esiste gia\' una ditta con questo nome.');
    }
}

export async function updateContractor(id: string, input: ContractorInput): Promise<Result> {
    const { authorized, message } = await requireRole(MANAGE);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    const error = validateContractor(input);
    if (error) return fail(error);
    try {
        await prisma.contractor.update({
            where: { id },
            data: {
                name: input.name.trim().slice(0, 120),
                vatNumber: clean(input.vatNumber, 20),
                contactName: clean(input.contactName, 80),
                contactPhone: clean(input.contactPhone, 40),
                contactEmail: clean(input.contactEmail, 120),
                notes: clean(input.notes, 500),
                ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            },
        });
        revalidatePath('/contractors');
        revalidatePath(`/contractors/${id}`);
        return ok('Ditta aggiornata.');
    } catch {
        return fail('Aggiornamento non riuscito (nome gia\' usato?).');
    }
}

// --- Contratti ---

export interface ContractInput {
    contractorId: string;
    plantId?: string;
    title: string;
    scope?: string;
    startDate: string;
    endDate?: string;
    renewalNoticeDays?: number;
    annualValue?: number | null;
    notes?: string;
}

function parseContractDates(input: ContractInput): { start: Date; end: Date | null } | string {
    const start = new Date(`${input.startDate}T12:00:00`);
    if (Number.isNaN(start.getTime())) return 'Data di inizio non valida.';
    let end: Date | null = null;
    if (input.endDate) {
        end = new Date(`${input.endDate}T12:00:00`);
        if (Number.isNaN(end.getTime())) return 'Data di fine non valida.';
        if (end < start) return 'La data di fine precede quella di inizio.';
    }
    return { start, end };
}

export async function createContract(input: ContractInput): Promise<Result> {
    const { authorized, message } = await requireRole(MANAGE);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    if (!input.title?.trim()) return fail('Il titolo del contratto e\' obbligatorio.');
    const dates = parseContractDates(input);
    if (typeof dates === 'string') return fail(dates);
    if (input.annualValue != null && (!Number.isFinite(input.annualValue) || input.annualValue < 0)) return fail('Valore non valido.');
    try {
        const plantId = await resolveWritePlantId(input.plantId);
        const created = await prisma.contractorContract.create({
            data: {
                contractorId: input.contractorId,
                plantId,
                title: input.title.trim().slice(0, 160),
                scope: clean(input.scope, 500),
                startDate: dates.start,
                endDate: dates.end,
                renewalNoticeDays: Math.min(365, Math.max(0, Math.floor(input.renewalNoticeDays ?? 60))),
                annualValue: input.annualValue ?? null,
                notes: clean(input.notes, 500),
            },
        });
        revalidatePath('/contractors');
        revalidatePath(`/contractors/${input.contractorId}`);
        return ok('Contratto creato.', created.id);
    } catch (e) {
        if (e instanceof PlantScopeError) return fail(e.message);
        console.error('createContract', e);
        return fail('Creazione del contratto non riuscita.');
    }
}

export async function updateContract(id: string, input: Omit<ContractInput, 'contractorId' | 'plantId'> & { terminated?: boolean }): Promise<Result> {
    const { authorized, message } = await requireRole(MANAGE);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    if (!input.title?.trim()) return fail('Il titolo del contratto e\' obbligatorio.');
    const dates = parseContractDates({ ...input, contractorId: '' });
    if (typeof dates === 'string') return fail(dates);
    const existing = await prisma.contractorContract.findUnique({ where: { id }, select: { contractorId: true } }); // filtrato per plant
    if (!existing) return fail('Contratto non trovato.');
    await prisma.contractorContract.update({
        where: { id },
        data: {
            title: input.title.trim().slice(0, 160),
            scope: clean(input.scope, 500),
            startDate: dates.start,
            endDate: dates.end,
            renewalNoticeDays: Math.min(365, Math.max(0, Math.floor(input.renewalNoticeDays ?? 60))),
            annualValue: input.annualValue ?? null,
            notes: clean(input.notes, 500),
            ...(input.terminated !== undefined ? { status: input.terminated ? 'TERMINATED' : 'ACTIVE' } : {}),
        },
    });
    revalidatePath('/contractors');
    revalidatePath(`/contractors/${existing.contractorId}`);
    return ok('Contratto aggiornato.');
}

export async function deleteContract(id: string): Promise<Result> {
    const { authorized, message } = await requireRole(['ADMIN', 'PLANT_MANAGER']);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    const existing = await prisma.contractorContract.findUnique({ where: { id }, select: { contractorId: true } });
    if (!existing) return fail('Contratto non trovato.');
    await prisma.contractorContract.delete({ where: { id } });
    revalidatePath('/contractors');
    revalidatePath(`/contractors/${existing.contractorId}`);
    return ok('Contratto eliminato con le sue attivita\'.');
}

// --- Attivita' ---

export interface ActivityInput {
    contractId: string;
    title: string;
    description?: string;
    frequencyDays: number;
    assetId?: string | null;
    firstDue: string;
    assigneeId?: string | null;
}

export async function createActivity(input: ActivityInput): Promise<Result> {
    const { authorized, message } = await requireRole(MANAGE);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    if (!input.title?.trim()) return fail('Il titolo dell\'attivita\' e\' obbligatorio.');
    const freq = Math.floor(input.frequencyDays);
    if (!Number.isFinite(freq) || freq < 1 || freq > 1830) return fail('Frequenza non valida.');
    const due = new Date(`${input.firstDue}T12:00:00`);
    if (Number.isNaN(due.getTime())) return fail('Data non valida.');

    const contract = await prisma.contractorContract.findUnique({ where: { id: input.contractId }, select: { plantId: true, contractorId: true } });
    if (!contract) return fail('Contratto non trovato.');
    if (input.assetId) {
        const asset = await prisma.asset.findUnique({ where: { id: input.assetId }, select: { plantId: true } });
        if (!asset) return fail('Macchina non trovata.');
        if (asset.plantId && asset.plantId !== contract.plantId) return fail('La macchina appartiene a un altro stabilimento rispetto al contratto.');
    }
    try {
        const created = await prisma.contractorActivity.create({
            data: {
                contractId: input.contractId,
                title: input.title.trim().slice(0, 160),
                description: clean(input.description, 500),
                frequencyDays: freq,
                assetId: input.assetId || null,
                nextDueDate: due,
                assigneeId: input.assigneeId || null,
            },
        });
        revalidatePath('/contractors');
        revalidatePath(`/contractors/${contract.contractorId}`);
        revalidatePath('/');
        return ok('Attivita\' aggiunta.', created.id);
    } catch (e) {
        if (e instanceof PlantScopeError) return fail(e.message);
        console.error('createActivity', e);
        return fail('Creazione non riuscita.');
    }
}

export async function setActivityActive(id: string, isActive: boolean): Promise<Result> {
    const { authorized, message } = await requireRole(MANAGE);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    const a = await prisma.contractorActivity.findUnique({ where: { id }, select: { contract: { select: { contractorId: true } } } });
    if (!a) return fail('Attivita\' non trovata.');
    await prisma.contractorActivity.update({ where: { id }, data: { isActive } });
    revalidatePath('/contractors');
    revalidatePath(`/contractors/${a.contract.contractorId}`);
    revalidatePath('/');
    return ok(isActive ? 'Attivita\' riattivata.' : 'Attivita\' sospesa.');
}

export async function deleteActivity(id: string): Promise<Result> {
    const { authorized, message } = await requireRole(['ADMIN', 'PLANT_MANAGER']);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    const a = await prisma.contractorActivity.findUnique({ where: { id }, select: { contract: { select: { contractorId: true } } } });
    if (!a) return fail('Attivita\' non trovata.');
    await prisma.contractorActivity.delete({ where: { id } });
    revalidatePath('/contractors');
    revalidatePath(`/contractors/${a.contract.contractorId}`);
    revalidatePath('/');
    return ok('Attivita\' eliminata.');
}

// --- Esecuzioni ---

export interface ExecutionInput {
    activityId: string;
    doneAt: string;
    outcome: 'OK' | 'ISSUES';
    notes?: string;
    reportUrl?: string;
    cost?: number | null;
}

/** Registra un intervento della ditta e sposta l'attivita' alla scadenza successiva. */
export async function recordExecution(input: ExecutionInput): Promise<Result> {
    const { authorized, message, session } = await requireRole(VIEW);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    if (input.outcome !== 'OK' && input.outcome !== 'ISSUES') return fail('Esito non valido.');
    const done = new Date(`${input.doneAt}T12:00:00`);
    if (Number.isNaN(done.getTime())) return fail('Data non valida.');
    if (done.getTime() > Date.now() + DAY) return fail('La data dell\'intervento non puo\' essere nel futuro.');
    const url = input.reportUrl?.trim();
    if (url && !isHttpUrl(url)) return fail('Il collegamento al rapporto deve iniziare con http:// o https://');
    if (input.cost != null && (!Number.isFinite(input.cost) || input.cost < 0)) return fail('Costo non valido.');

    const activity = await prisma.contractorActivity.findUnique({
        where: { id: input.activityId },
        include: { contract: { select: { plantId: true, contractorId: true, title: true, contractor: { select: { name: true } } } } },
    });
    if (!activity) return fail('Attivita\' non trovata.');

    try {
        const next = nextDueAfterExecution(done, activity.nextDueDate, activity.frequencyDays);
        await prisma.$transaction([
            prisma.contractorExecution.create({
                data: {
                    activityId: activity.id, doneAt: done, outcome: input.outcome, notes: clean(input.notes, 500),
                    reportUrl: url || null, cost: input.cost ?? null, createdById: session.user.id,
                },
            }),
            prisma.contractorActivity.update({
                where: { id: activity.id },
                data: { lastDoneAt: done, nextDueDate: next },
            }),
        ]);

        if (input.outcome === 'ISSUES') {
            const targets = await usersToNotify(activity.contract.plantId, ['PLANT_MANAGER', 'SUPERVISOR']);
            if (targets.length > 0) {
                await prisma.notification.createMany({
                    data: targets.map(u => ({
                        userId: u.id,
                        title: 'Criticità segnalata da una ditta esterna',
                        message: `${activity.contract.contractor.name}: "${activity.title}" eseguita con criticità da seguire.`,
                        link: `/contractors/${activity.contract.contractorId}`,
                    })),
                });
            }
        }
        revalidatePath('/contractors');
        revalidatePath(`/contractors/${activity.contract.contractorId}`);
        revalidatePath('/');
        return ok(`Intervento registrato. Prossima scadenza: ${next.toLocaleDateString('it-IT')}.`);
    } catch (e) {
        console.error('recordExecution', e);
        return fail('Registrazione non riuscita.');
    }
}
