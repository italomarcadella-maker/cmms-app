'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ServiceLocator } from '@/modules/shared/infrastructure/registry/service-locator';
import { PrismaLineSimulationRepository } from '../db/prisma-line-simulation-repository';
import { LineSimulation } from '../../domain/entities/line-simulation';
import { GlobalAIEngine } from '@/lib/ai/GlobalAIEngine';

try {
    ServiceLocator.resolve('ILineSimulationRepository');
} catch {
    ServiceLocator.register('ILineSimulationRepository', new PrismaLineSimulationRepository());
}

const getSimulationRepo = () => ServiceLocator.resolve<PrismaLineSimulationRepository>('ILineSimulationRepository');

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
    const currentVersions = await prisma.lineSimulationVersion.count({ where: { simulationId } });
    
    const snap = await prisma.lineSimulationVersion.create({
        data: {
            simulationId,
            version: currentVersions + 1,
            label: versionData.label,
            leanScore: versionData.leanScore,
            lineEff: versionData.lineEff,
            dataJson: versionData.dataJson
        }
    });

    await prisma.lineSimulation.update({
        where: { id: simulationId },
        data: {
            leanScore: versionData.leanScore,
            lineEff: versionData.lineEff,
            updatedAt: new Date(),
            dataJson: versionData.dataJson
        }
    });

    await GlobalAIEngine.analyzeSimulationBottleneck(simulationId);

    revalidatePath('/process/fpes');
    return snap;
}
