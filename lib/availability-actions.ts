"use server";

import {
    getTechnicianAvailability as newGetTechnicianAvailability,
    setTechnicianStatus as newSetTechnicianStatus,
    getAllTechnicians as newGetAllTechnicians,
    checkTechnicianAvailabilityForDate as newCheckTechnicianAvailabilityForDate
} from "@/modules/maintenance/adapters/actions/technician-actions";

export async function getTechnicianAvailability(startDate: Date, endDate: Date) {
    return newGetTechnicianAvailability(startDate, endDate);
}

export async function setTechnicianStatus(userId: string, date: Date, status: string, shift?: string, notes?: string) {
    return newSetTechnicianStatus(userId, date, status, shift, notes);
}

export async function getAllTechnicians() {
    return newGetAllTechnicians();
}

export async function checkTechnicianAvailabilityForDate(userId: string, date: Date) {
    return newCheckTechnicianAvailabilityForDate(userId, date);
}
