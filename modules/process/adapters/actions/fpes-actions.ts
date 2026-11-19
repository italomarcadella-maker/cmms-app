'use server';

import { requireRole } from '@/lib/auth-guard';
import { ENGINEERING } from '@/lib/roles';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ServiceLocator } from '@/modules/shared/infrastructure/registry/service-locator';
import { PrismaLineSimulationRepository } from '../db/prisma-line-simulation-repository';
import { PrismaSimulationVersionRepository } from '../db/prisma-simulation-version-repository';
import { LineSimulation } from '../../domain/entities/line-simulation';
import { makeSaveSimulationSnapshot } from '../../domain/use-cases/save-simulation-snapshot';
import { GlobalAIEngine } from '@/lib/ai/GlobalAIEngine';

try {
    ServiceLocator.resolve('ILineSimulationRepository');
} catch {
    ServiceLocator.register('ILineSimulationRepository', new PrismaLineSimulationRepository());
}
try {
    ServiceLocator.resolve('ISimulationVersionRepository');
} catch {
    ServiceLocator.register('ISimulationVersionRepository', new PrismaSimulationVersionRepository());
}

const getSimulationRepo = () => ServiceLocator.resolve<PrismaLineSimulationRepository>('ILineSimulationRepository');
const getVersionRepo = () => ServiceLocator.resolve<PrismaSimulationVersionRepository>('ISimulationVersionRepository');

export async function getSimulations() {
    try {
        const repo = getSimulationRepo();
        const sims = await repo.findAll();
        return sims.map(s => {
            const json = s.toJSON();
            return {
                ...json,
                id: json.id!
            };
        });
    } catch (error) {
        console.error("Failed to fetch simulations:", error);
        return [];
    }
}

export async function getSimulationById(id: string) {
    try {
        // Querying includes raw snapshot relation which can be fetched directly using prisma
        return await prisma.lineSimulation.findUnique({
            where: { id },
            include: { snapshots: true }
        });
    } catch (error) {
        console.error("Failed to fetch simulation by id:", error);
        return null;
    }
}

export async function createSimulation(data: { name: string, layout: string, assetId?: string, leanScore?: number, lineEff?: number, dataJson: any }) {
    const __guard = await requireRole(ENGINEERING);
    if (!__guard.authorized) throw new Error(__guard.message ?? 'Non autorizzato');
    const repo = getSimulationRepo();
    const simEntity = new LineSimulation({
        name: data.name,
        layout: data.layout,
        assetId: data.assetId,
        leanScore: data.leanScore || 0,
        lineEff: data.lineEff || 0,
        dataJson: data.dataJson
    });
    const saved = await repo.save(simEntity);
    revalidatePath('/process/fpes');
    const json = saved.toJSON();
    return {
        ...json,
        id: json.id!
    };
}

export async function saveSimulationSnapshot(simulationId: string, versionData: { label: string, leanScore: number, lineEff: number, dataJson: any }) {
    const __guard = await requireRole(ENGINEERING);
    if (!__guard.authorized) throw new Error(__guard.message ?? 'Non autorizzato');
    const saveSnapshot = makeSaveSimulationSnapshot(getSimulationRepo(), getVersionRepo());
    const snap = await saveSnapshot({ simulationId, ...versionData });

    await GlobalAIEngine.analyzeSimulationBottleneck(simulationId);

    revalidatePath('/process/fpes');
    return snap;
}
