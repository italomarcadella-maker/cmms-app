'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-guard';
import { ENGINEERING, SUPERVISION, hasRole } from '@/lib/roles';
import {
    DEFAULT_HORIZON_DAYS, HORIZON_CHOICES, OPEN_ORDER_STATUSES,
    assetsOnLinesWithoutCalendar, buildLineOpportunities, describeOpportunityState,
    type LineOpportunity, type LineOpportunitiesTotals, type OpportunityItem,
} from '../../domain/line-opportunities';

/**
 * Suggerimenti per le linee senza calendario di produzione: cosa e' pendente e quali manutenzioni programmate si
 * possono eseguire ora. Solo lettura, a parte "genera le schede" che crea gli ordini dai piani scelti dall'utente.
 */

const MAX_ROWS = 2000; // tetto di sicurezza per ciascuna lettura
const MAX_GENERATE = 30;

export type LineOpportunityItemDTO = Omit<OpportunityItem, 'dueDate' | 'lastRunDate'> & {
    dueDate: string | null;
    lastRunDate: string | null;
    /** Testo dello stato: "In ritardo di 3 giorni", "In scadenza tra 2 giorni", "Anticipabile (tra 12 giorni)". */
    stateLabel: string;
};

export interface LineOpportunityDTO extends Omit<LineOpportunity, 'pending' | 'executable'> {
    pending: LineOpportunityItemDTO[];
    executable: LineOpportunityItemDTO[];
}

export interface LineOpportunitiesResult {
    /** Falso se l'utente non ha il ruolo per vedere i suggerimenti (nessun dato restituito). */
    allowed: boolean;
    horizonDays: number;
    canGenerate: boolean;
    lines: LineOpportunityDTO[];
    totals: LineOpportunitiesTotals;
    message?: string;
}

const EMPTY_TOTALS: LineOpportunitiesTotals = { lines: 0, pending: 0, executable: 0, overdue: 0 };

function toDto(item: OpportunityItem): LineOpportunityItemDTO {
    return {
        ...item,
        dueDate: item.dueDate ? item.dueDate.toISOString() : null,
        lastRunDate: item.lastRunDate ? item.lastRunDate.toISOString() : null,
        stateLabel: describeOpportunityState(item.state, item.days),
    };
}

/**
 * Le linee senza calendario di produzione che hanno almeno una voce, con le attivita' pendenti e le manutenzioni
 * programmate eseguibili entro l'orizzonte. Supervisione e ingegneri di processo; per gli altri restituisce vuoto.
 * Letture raggruppate: una per tipo di dato, non una per linea o per macchina.
 */
export async function getLineOpportunities(options?: { horizonDays?: 7 | 14 | 30 | 60 }): Promise<LineOpportunitiesResult> {
    const requested = options?.horizonDays;
    const horizonDays = (HORIZON_CHOICES as readonly number[]).includes(requested as number) ? (requested as number) : DEFAULT_HORIZON_DAYS;
    const empty: LineOpportunitiesResult = { allowed: false, horizonDays, canGenerate: false, lines: [], totals: EMPTY_TOTALS };

    const guard = await requireRole(ENGINEERING);
    if (!guard.authorized) return empty;
    const allowed: LineOpportunitiesResult = { ...empty, allowed: true, canGenerate: hasRole(guard.session?.user?.role, SUPERVISION) };

    try {
        const now = new Date();
        // Fine dell'ultimo giorno dell'orizzonte (esclusa): una scadenza di quel giorno e' ancora dentro
        const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() + horizonDays + 1);

        const [configuredLines, assetRows] = await Promise.all([
            prisma.productionLine.findMany({ select: { plantId: true, line: true } }),
            prisma.asset.findMany({
                // Gli impianti (aria compressa, cabine, caldaie: asset di tipo FACILITY) non sono linee di produzione: restano fuori dai suggerimenti
                where: { line: { not: null }, type: { not: 'FACILITY' }, NOT: { id: { startsWith: 'SYS-' } }, status: { notIn: ['DECOMMISSIONED', 'STORAGE'] } },
                select: { id: true, name: true, line: true, plantId: true, status: true },
            }),
        ]);

        const assets = assetsOnLinesWithoutCalendar(assetRows, configuredLines);
        if (assets.length === 0) return allowed;
        const assetIds = assets.map(a => a.id);

        const [orders, schedules, activities, meters, plants] = await Promise.all([
            prisma.workOrder.findMany({
                where: { assetId: { in: assetIds }, status: { in: [...OPEN_ORDER_STATUSES] } },
                select: { id: true, title: true, type: true, priority: true, status: true, dueDate: true, assignedTo: true, assetId: true, originScheduleId: true },
                orderBy: { dueDate: 'asc' },
                take: MAX_ROWS,
            }),
            prisma.preventiveSchedule.findMany({
                where: { assetId: { in: assetIds }, nextDueDate: { lt: cutoff } },
                select: { id: true, taskTitle: true, frequency: true, frequencyDays: true, nextDueDate: true, lastRunDate: true, assetId: true, assignedToId: true },
                orderBy: { nextDueDate: 'asc' },
                take: MAX_ROWS,
            }),
            prisma.contractorActivity.findMany({
                where: { assetId: { in: assetIds }, isActive: true, contract: { status: 'ACTIVE' }, nextDueDate: { lt: cutoff } },
                select: {
                    id: true, title: true, isActive: true, nextDueDate: true, assetId: true, assigneeId: true,
                    contract: { select: { status: true, startDate: true, endDate: true, renewalNoticeDays: true, contractorId: true, contractor: { select: { name: true } } } },
                },
                orderBy: { nextDueDate: 'asc' },
                take: MAX_ROWS,
            }),
            prisma.meter.findMany({
                where: { assetId: { in: assetIds }, nextReadingDue: { not: null, lt: cutoff } },
                select: { id: true, name: true, nextReadingDue: true, assetId: true, readingAssigneeId: true },
                orderBy: { nextReadingDue: 'asc' },
                take: MAX_ROWS,
            }),
            prisma.plant.findMany({ select: { id: true, name: true } }),
        ]);

        // Nomi degli assegnatari: una sola lettura per tutti
        const userIds = [...new Set([
            ...schedules.map(s => s.assignedToId),
            ...activities.map(a => a.assigneeId),
            ...meters.map(m => m.readingAssigneeId),
        ].filter((x): x is string => !!x))];
        const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
        const userName = new Map(users.map(u => [u.id, u.name ?? 'Utente']));
        const nameOf = (id: string | null) => (id ? userName.get(id) ?? 'Utente' : null);

        const built = buildLineOpportunities({
            now, horizonDays, configuredLines, assets,
            plantNames: Object.fromEntries(plants.map(p => [p.id, p.name])),
            orders,
            schedules: schedules.map(s => ({ ...s, assigneeName: nameOf(s.assignedToId) })),
            contractorActivities: activities.map(a => ({
                id: a.id, title: a.title, isActive: a.isActive, nextDueDate: a.nextDueDate, assetId: a.assetId, assigneeName: nameOf(a.assigneeId),
                contract: { ...a.contract, contractorName: a.contract.contractor.name },
            })),
            meters: meters.map(m => ({ id: m.id, name: m.name, nextReadingDue: m.nextReadingDue, assetId: m.assetId, assigneeName: nameOf(m.readingAssigneeId) })),
        });

        return {
            ...allowed,
            totals: built.totals,
            lines: built.lines.map(l => ({ ...l, pending: l.pending.map(toDto), executable: l.executable.map(toDto) })),
        };
    } catch (error) {
        console.error('[line-opportunity-actions] getLineOpportunities', error);
        return { ...allowed, message: 'Errore nel calcolo dei suggerimenti per linea' };
    }
}

export interface GenerateFromPlansResult {
    success: boolean;
    created: number;
    errors: { scheduleId: string; message: string }[];
    message: string;
}

/**
 * Crea un ordine di lavoro da ciascun piano scelto (data di oggi). Ogni piano e' indipendente: un errore non ferma gli altri.
 * Come per la generazione dal calendario, la scadenza del piano si sposta in avanti.
 */
export async function generateWorkOrdersFromPlans(scheduleIds: string[]): Promise<GenerateFromPlansResult> {
    const fail = (message: string): GenerateFromPlansResult => ({ success: false, created: 0, errors: [], message });

    const guard = await requireRole(SUPERVISION);
    if (!guard.authorized) return fail(guard.message ?? 'Non autorizzato');

    if (!Array.isArray(scheduleIds) || scheduleIds.some(id => typeof id !== 'string' || id.length === 0)) return fail('Selezione non valida');
    const ids = [...new Set(scheduleIds)];
    if (ids.length === 0) return fail('Seleziona almeno una manutenzione');
    if (ids.length > MAX_GENERATE) return fail(`Si possono generare al massimo ${MAX_GENERATE} schede alla volta`);

    // Chi ha gia' un ordine aperto non ne riceve un secondo (es. doppio clic o pagina non aggiornata)
    let alreadyOpen = new Set<string>();
    try {
        const open = await prisma.workOrder.findMany({
            where: { originScheduleId: { in: ids }, status: { in: [...OPEN_ORDER_STATUSES] } },
            select: { originScheduleId: true },
        });
        alreadyOpen = new Set(open.map(o => o.originScheduleId).filter((x): x is string => !!x));
    } catch (error) {
        console.error('[line-opportunity-actions] generate: controllo ordini aperti', error);
    }

    // Import al momento dell'uso: schedule-actions arriva fino ai suggerimenti AI (cortex), che importa questo file
    const { createWorkOrderFromSchedule } = await import('./schedule-actions');
    const today = new Date();
    let created = 0;
    const errors: { scheduleId: string; message: string }[] = [];
    for (const id of ids) {
        if (alreadyOpen.has(id)) {
            errors.push({ scheduleId: id, message: 'Ha già un ordine aperto' });
            continue;
        }
        try {
            const res = await createWorkOrderFromSchedule(id, today);
            if (res.success) created++;
            else errors.push({ scheduleId: id, message: res.message ?? 'Errore nella creazione della scheda' });
        } catch (error) {
            console.error('[line-opportunity-actions] generate', error);
            errors.push({ scheduleId: id, message: 'Errore nella creazione della scheda' });
        }
    }

    revalidatePath('/planning/line-suggestions');
    const message = errors.length === 0
        ? `${created} ${created === 1 ? 'scheda creata' : 'schede create'}`
        : `${created} su ${ids.length} schede create, ${errors.length} con errore`;
    return { success: created > 0, created, errors, message };
}
