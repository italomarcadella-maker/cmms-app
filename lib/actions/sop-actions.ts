"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GlobalAIEngine } from "../ai/GlobalAIEngine";

export async function getRecipes() {
  return prisma.processRecipe.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { machines: { include: { parameters: true } } }
  });
}

export async function createRecipe(name: string, assetId?: string) {
  const recipe = await prisma.processRecipe.create({
    data: {
      name,
      assetId: assetId || null
    }
  });
  revalidatePath('/process/sop-mes');
  return recipe;
}

export async function saveRecipeData(recipeId: string, machines: any[]) {
  // Simple replacement strategy for this integration
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
  const reading = await prisma.qualityReading.create({
    data: { recipeId, value }
  });
  
  // Invia il segnale all'AI
  await GlobalAIEngine.analyzeQualityDeviation(recipeId, value);

  revalidatePath('/process/sop-mes');
  return reading;
}
