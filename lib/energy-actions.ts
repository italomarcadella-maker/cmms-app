"use server";

import { getEnergyMetrics as newGetEnergyMetrics } from "@/modules/energy/adapters/actions/energy-actions";

export async function getEnergyMetrics(plantId?: string, startDateStr?: string, endDateStr?: string) {
    return newGetEnergyMetrics(plantId, startDateStr, endDateStr);
}
