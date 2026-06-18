'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ServiceLocator } from '@/modules/shared/infrastructure/registry/service-locator';
import { PrismaProcessRecipeRepository } from '../db/prisma-process-recipe-repository';
import { PrismaQualityReadingRepository } from '../db/prisma-quality-reading-repository';
import { ProcessRecipe } from '../../domain/entities/process-recipe';
import { QualityReading } from '../../domain/entities/quality-reading';
import { GlobalAIEngine } from '@/lib/ai/GlobalAIEngine';

try {
    ServiceLocator.resolve('IProcessRecipeRepository');
} catch {
    ServiceLocator.register('IProcessRecipeRepository', new PrismaProcessRecipeRepository());
}
try {
    ServiceLocator.resolve('IQualityReadingRepository');
} catch {
    ServiceLocator.register('IQualityReadingRepository', new PrismaQualityReadingRepository());
}

const getRecipeRepo = () => ServiceLocator.resolve<PrismaProcessRecipeRepository>('IProcessRecipeRepository');
const getQualityRepo = () => ServiceLocator.resolve<PrismaQualityReadingRepository>('IQualityReadingRepository');

export async function getRecipes() {
    try {
        return await prisma.processRecipe.findMany({
            orderBy: { updatedAt: 'desc' },
            include: { machines: { include: { parameters: true } } }
        });
    } catch (error) {
        console.error("Failed to fetch recipes:", error);
        return [];
    }
}

export async function createRecipe(name: string, assetId?: string) {
    const repo = getRecipeRepo();
    const recipeEntity = new ProcessRecipe({
        name,
        assetId: assetId || null
    });
    const saved = await repo.save(recipeEntity);
    revalidatePath('/process/sop-mes');
    return saved.toJSON();
}

export async function saveRecipeData(recipeId: string, machines: any[]) {
    await prisma.processMachine.deleteMany({ where: { recipeId } });

    for (const m of machines) {
        const createdMachine = await prisma.processMachine.create({
            data: {
                recipeId,
                name: m.title || "Macchina",
                image: m.image || null,
            }
        });

        if (m.params && m.params.length > 0) {
            const paramsToCreate = m.params.map((p: any) => ({
                machineId: createdMachine.id,
                name: p.name || "",
                unit: p.unit || "",
                setPoint: parseFloat(p.set || "0"),
                tolerance: parseFloat(p.toll || "0")
            }));
            await prisma.processParameter.createMany({ data: paramsToCreate });
        }
    }

    await prisma.processRecipe.update({
        where: { id: recipeId },
        data: { updatedAt: new Date() }
    });

    revalidatePath('/process/sop-mes');
}

export async function addQualityReading(recipeId: string, value: number) {
    const repo = getQualityRepo();
    const readingEntity = new QualityReading({
        recipeId,
        value
    });
    const saved = await repo.save(readingEntity);
    
    await GlobalAIEngine.analyzeQualityDeviation(recipeId, value);

    revalidatePath('/process/sop-mes');
    return saved.toJSON();
}
