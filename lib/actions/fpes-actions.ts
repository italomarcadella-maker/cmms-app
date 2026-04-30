"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GlobalAIEngine } from "../ai/GlobalAIEngine";

export async function getSimulations() {
  return prisma.lineSimulation.findMany({
    orderBy: { updatedAt: 'desc' }
  });
}

export async function getSimulationById(id: string) {
  return prisma.lineSimulation.findUnique({
    where: { id },
    include: { snapshots: true }
  });
}

export async function createSimulation(data: { name: string, layout: string, assetId?: string, leanScore?: number, lineEff?: number, dataJson: any }) {
  const sim = await prisma.lineSimulation.create({
    data: {
      name: data.name,
      layout: data.layout,
      assetId: data.assetId || null,
      leanScore: data.leanScore || 0,
      lineEff: data.lineEff || 0,
      dataJson: data.dataJson
    }
  });
  revalidatePath('/process/fpes');
  return sim;
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

  // Aggiorniamo i valori correnti nella master
  await prisma.lineSimulation.update({
    where: { id: simulationId },
    data: { leanScore: versionData.leanScore, lineEff: versionData.lineEff, updatedAt: new Date(), dataJson: versionData.dataJson }
  });

  // Chiamiamo l'AI
  await GlobalAIEngine.analyzeSimulationBottleneck(simulationId);

  revalidatePath('/process/fpes');
  return snap;
}
