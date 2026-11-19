'use server';

import { subMonths } from 'date-fns';

import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-guard';
import { getEffectiveSettings } from '@/lib/actions';
import {
    FALLBACK_LABOR_RATE,
    laborCost,
    partsCost,
} from '../../domain/asset-reliability';
import {
    buildPareto,
    normalizeParetoMetric,
    normalizeParetoMonths,
    normalizeParetoWeights,
    type ParetoEvent,
    type ParetoMetric,
    type ParetoMonths,
    type ParetoResult,
    type ParetoWeights,
} from '../../domain/pareto';

/**
 * Pareto delle macchine piu' problematiche (guasti e richieste non annullati nel periodo).
 * Riservato a chi supervisiona: i manutentori vedono solo i propri ordini e quindi non un quadro d'insieme.
 * Qui, per i ruoli ammessi, NON si applica il filtro del manutentore: si legge tutto lo stabilimento (il filtro per
 * stabilimento lo applica gia' il client Prisma).
 */

const READERS = ['ADMIN', 'PLANT_MANAGER', 'PROCESS_ENGINEER', 'SUPERVISOR'];

export interface AssetParetoInput {
    months?: ParetoMonths;
    metric?: ParetoMetric;
    department?: string;
    line?: string;
}

export interface AssetParetoResponse {
    success: boolean;
    /** true quando il ruolo non e' tra quelli ammessi (l'interfaccia nasconde la sezione). */
    unauthorized?: boolean;
    message?: string;
    metric: ParetoMetric;
    months: ParetoMonths;
    result: ParetoResult | null;
    /** Reparti e linee presenti tra le macchine (per i filtri). */
    departments: string[];
    lines: string[];
    /** Periodo analizzato (ISO). */
    from: string;
    to: string;
    weights: ParetoWeights;
    /** Filtri effettivamente applicati. */
    department: string | null;
    line: string | null;
}

const clean = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

const byIt = (a: string, b: string) => a.localeCompare(b, 'it', { numeric: true });

export async function getAssetPareto(input: AssetParetoInput = {}): Promise<AssetParetoResponse> {
    const months = normalizeParetoMonths(input?.months);
    const metric = normalizeParetoMetric(input?.metric);
    const department = clean(input?.department);
    const line = clean(input?.line);
    const now = new Date();
    const from = subMonths(now, months);

    const empty: AssetParetoResponse = {
        success: false, metric, months, result: null, departments: [], lines: [],
        from: from.toISOString(), to: now.toISOString(),
        weights: normalizeParetoWeights(null), department, line,
    };

    const access = await requireRole(READERS);
    if (!access.authorized) return { ...empty, unauthorized: true, message: access.message };

    try {
        // Una sola lettura degli eventi del periodo (con ore e ricambi) e una dei valori per i filtri: niente query per macchina.
        const [rows, assetFilters] = await Promise.all([
            prisma.workOrder.findMany({
                where: {
                    type: { in: ['FAULT', 'REQUEST'] },
                    status: { not: 'CANCELED' },
                    // Richieste create in automatico dall'AI: non sono eventi della macchina
                    category: { not: 'AI_SUGGESTION' },
                    createdAt: { gte: from, lte: now },
                    asset: { NOT: { id: { startsWith: 'SYS-' } } },
                },
                select: {
                    assetId: true,
                    type: true,
                    priority: true,
                    category: true,
                    plantId: true,
                    asset: { select: { name: true, department: true, line: true, plantId: true } },
                    laborLogs: { select: { hours: true, technicianId: true } },
                    partsUsed: { select: { quantity: true, unitCost: true } },
                },
            }),
            prisma.asset.findMany({
                where: { NOT: { id: { startsWith: 'SYS-' } } },
                select: { department: true, line: true },
                distinct: ['department', 'line'],
            }),
        ]);

        // Tariffe: del tecnico se > 0, altrimenti la predefinita dello stabilimento dell'ordine (come nella dashboard)
        const techIds = Array.from(new Set(rows.flatMap(r => r.laborLogs.map(l => l.technicianId)).filter((id): id is string => !!id)));
        const plantIds = Array.from(new Set(rows.map(r => r.plantId ?? r.asset?.plantId ?? null)));
        const [technicians, plantSettings, baseSettings] = await Promise.all([
            techIds.length ? prisma.technician.findMany({ where: { id: { in: techIds } }, select: { id: true, hourlyRate: true } }) : Promise.resolve([]),
            Promise.all(plantIds.filter((p): p is string => !!p).map(async p => [p, await getEffectiveSettings(p)] as const)),
            getEffectiveSettings(null),
        ]);
        const rates = new Map<string, number>(technicians.map(t => [t.id, t.hourlyRate]));
        const defaultRateByPlant = new Map<string, number>(
            plantSettings.map(([p, s]) => [p, s?.defaultLaborHourlyRate ?? FALLBACK_LABOR_RATE]),
        );
        const baseRate = baseSettings?.defaultLaborHourlyRate ?? FALLBACK_LABOR_RATE;

        // healthConfig e' un solo record di gruppo: da li' vengono i pesi (assente o non valido = 1 / 2 / 0,5)
        const weights = normalizeParetoWeights((baseSettings as { healthConfig?: unknown } | null)?.healthConfig);

        const events: ParetoEvent[] = [];
        for (const r of rows) {
            const asset = r.asset;
            if (!asset) continue;
            if (department && asset.department !== department) continue;
            if (line && asset.line !== line) continue;
            const pid = r.plantId ?? asset.plantId ?? null;
            const rate = (pid ? defaultRateByPlant.get(pid) : undefined) ?? baseRate;
            events.push({
                assetId: r.assetId,
                assetName: asset.name,
                department: asset.department,
                line: asset.line,
                type: r.type === 'REQUEST' ? 'REQUEST' : 'FAULT',
                priority: String(r.priority),
                category: String(r.category),
                hours: r.laborLogs.reduce((s, l) => s + (Number(l.hours) || 0), 0),
                cost: partsCost(r.partsUsed) + laborCost(r.laborLogs, rates, rate),
            });
        }

        const departments = Array.from(new Set(assetFilters.map(a => clean(a.department)).filter((d): d is string => !!d))).sort(byIt);
        const lines = Array.from(new Set(assetFilters.map(a => clean(a.line)).filter((l): l is string => !!l))).sort(byIt);

        return {
            success: true, metric, months, department, line,
            result: buildPareto(events, metric, weights),
            departments, lines, weights,
            from: from.toISOString(), to: now.toISOString(),
        };
    } catch (error) {
        console.error('[pareto-actions]', error);
        return { ...empty, message: 'Impossibile calcolare il Pareto delle macchine.' };
    }
}
