"use server";

import {
  getSimulations as newGetSimulations,
  getSimulationById as newGetSimulationById,
  createSimulation as newCreateSimulation,
  saveSimulationSnapshot as newSaveSimulationSnapshot
} from "@/modules/process/adapters/actions/fpes-actions";

export async function getSimulations() {
  return newGetSimulations();
}

export async function getSimulationById(id: string) {
  return newGetSimulationById(id);
}

export async function createSimulation(data: { name: string, layout: string, assetId?: string, leanScore?: number, lineEff?: number, dataJson: any }) {
  return newCreateSimulation(data);
}

export async function saveSimulationSnapshot(simulationId: string, versionData: { label: string, leanScore: number, lineEff: number, dataJson: any }) {
  return newSaveSimulationSnapshot(simulationId, versionData);
}
