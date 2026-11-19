'use server';

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/actions';
import { crossPlant, getPlantScope } from '@/lib/plant-scope';
import {
    aggregateActions, selectCases,
    type FailureCase, type RecommendedAction, type ScoredCase,
} from '../../domain/failure-analysis';

/**
 * Analisi IA dei guasti sull'esperienza di TUTTI gli stabilimenti.
 *
 * E' una delle due funzioni trasversali del progetto (l'altra e' la disponibilita' dei ricambi): legge lo storico
 * degli ordini chiusi di ogni plant con crossPlant (registrato nell'audit log) e restituisce solo sintomo, causa,
 * soluzione, tempi e plant di provenienza. Non escono nomi di persone, descrizioni complete, ne' link agli ordini
 * degli altri stabilimenti.
 */

const READERS = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'MAINTAINER', 'PROCESS_ENGINEER'];

export interface FailureCaseView {
    plantName: string;
    isOwn: boolean;
    score: number;
    sameModel: boolean;
    assetModel: string | null;
    assetVendor: string | null;
    title: string;
    date: string;
    cause: string | null;
    solution: string | null;
    prevention: string | null;
    downtimeMin: number | null;
    /** Solo per i casi del proprio plant. */
    workOrderId?: string;
}

export interface FailureInsights {
    success: boolean;
    message?: string;
    actions: RecommendedAction[];
    cases: FailureCaseView[];
    /** Quanti stabilimenti e quanti casi chiusi sono stati consultati. */
    plantsConsulted: number;
    casesConsulted: number;
    asset?: { name: string; model: string; vendor: string | null } | null;
}

const EMPTY: Omit<FailureInsights, 'success'> = { actions: [], cases: [], plantsConsulted: 0, casesConsulted: 0 };

/** Casi chiusi di tutti i plant, in forma neutra (usata anche dall'EWO e dall'assistente dell'ordine di lavoro). */
export async function loadFailureCases(feature: string, details: Record<string, unknown>): Promise<FailureCase[]> {
    const scope = await getPlantScope();
    const ownIds = scope.mode === 'all' || scope.mode === 'bypass' ? scope.allowedPlantIds : scope.plantIds;

    const orders = await crossPlant(feature, () => prisma.workOrder.findMany({
        where: { status: { in: ['CLOSED', 'COMPLETED'] }, type: 'FAULT' },
        orderBy: { createdAt: 'desc' },
        take: 600,
        select: {
            id: true, title: true, description: true, category: true, createdAt: true, plantId: true,
            plant: { select: { name: true } },
            asset: { select: { model: true, vendor: true } },
            ewo: { select: { causeAnalysis: true, solutionApplied: true, preventiveActions: true, totalDowntimeMin: true } },
        },
    }), details);

    const cases: FailureCase[] = orders.map(o => {
        const isOwn = !!o.plantId && ownIds.includes(o.plantId);
        return {
            plantId: o.plantId,
            plantName: o.plant?.name ?? 'Stabilimento non indicato',
            assetModel: o.asset?.model ?? null,
            assetVendor: o.asset?.vendor ?? null,
            category: o.category,
            title: o.title,
            description: o.description,
            date: o.createdAt.toISOString(),
            cause: o.ewo?.causeAnalysis ?? null,
            solution: o.ewo?.solutionApplied ?? null,
            prevention: o.ewo?.preventiveActions ?? null,
            downtimeMin: o.ewo?.totalDowntimeMin ?? null,
            isOwn,
            workOrderId: isOwn ? o.id : undefined,
        };
    });

    // Conoscenza di gruppo gia' raccolta (non legata a un plant)
    const knowledge = await prisma.maintenanceKnowledge.findMany({ take: 200, orderBy: { successCount: 'desc' } });
    for (const k of knowledge) {
        cases.push({
            plantId: null,
            plantName: 'Base di conoscenza di gruppo',
            category: k.assetCategory,
            title: k.problemTags,
            date: k.lastUpdated.toISOString(),
            solution: k.solution,
            isOwn: false,
        });
    }
    return cases;
}

function toView(c: ScoredCase): FailureCaseView {
    return {
        plantName: c.plantName,
        isOwn: c.isOwn,
        score: c.score,
        sameModel: c.sameModel,
        assetModel: c.assetModel ?? null,
        assetVendor: c.assetVendor ?? null,
        title: c.title,
        date: c.date,
        cause: c.cause ?? null,
        solution: c.solution ?? null,
        prevention: c.prevention ?? null,
        downtimeMin: c.downtimeMin ?? null,
        workOrderId: c.isOwn ? c.workOrderId : undefined,
    };
}

/** Azioni piu' coerenti per un guasto, in base a come sono stati risolti casi simili in tutti gli stabilimenti. */
export async function getFailureInsights(input: { description: string; assetId?: string }): Promise<FailureInsights> {
    const { authorized, message } = await requireRole(READERS);
    if (!authorized) return { success: false, message, ...EMPTY };
    const text = input.description?.trim() ?? '';
    if (text.length < 5) return { success: false, message: 'Descrivi il guasto con qualche parola in piu\'.', ...EMPTY };

    try {
        // L'asset si legge nello scope normale: si puo' indicare solo una macchina del proprio stabilimento
        const asset = input.assetId
            ? await prisma.asset.findUnique({ where: { id: input.assetId }, select: { name: true, model: true, vendor: true } })
            : null;

        const cases = await loadFailureCases('FAILURE_ANALYSIS', { assetId: input.assetId ?? null });
        const picked = selectCases({ text, model: asset?.model, vendor: asset?.vendor }, cases, { limit: 8 });

        return {
            success: true,
            actions: aggregateActions(picked, { limit: 5 }),
            cases: picked.slice(0, 6).map(toView),
            plantsConsulted: new Set(cases.map(c => c.plantId).filter(Boolean)).size,
            casesConsulted: cases.length,
            asset,
        };
    } catch (e) {
        console.error('getFailureInsights', e);
        return { success: false, message: 'Analisi non riuscita.', ...EMPTY };
    }
}
