"use server";

import {
    getUnresolvedAnomalies as newGetUnresolvedAnomalies,
    getProjects as newGetProjects,
    getProjectById as newGetProjectById,
    updateProject as newUpdateProject,
    addProjectTaskNote as newAddProjectTaskNote,
    createProject as newCreateProject,
    archiveProject as newArchiveProject,
    deleteProject as newDeleteProject,
    createProjectTask as newCreateProjectTask,
    updateTaskDates as newUpdateTaskDates,
    linkTaskToMaintenance as newLinkTaskToMaintenance,
    getSopDocuments as newGetSopDocuments,
    createSopDocument as newCreateSopDocument,
    getSOPsByAsset as newGetSOPsByAsset,
    updateSopDocument as newUpdateSopDocument,
    searchCMMS as newSearchCMMS,
    askLeanCopilot as newAskLeanCopilot,
    updateAssetStatus as newUpdateAssetStatus,
    createQuickWorkOrder as newCreateQuickWorkOrder,
    getLivePresenceData as newGetLivePresenceData
} from "@/modules/process/adapters/actions/process-actions";

export async function getUnresolvedAnomalies() {
    return newGetUnresolvedAnomalies();
}

export async function getProjects(showArchived: boolean = false) {
    return newGetProjects(showArchived);
}

export async function getProjectById(id: string) {
    return newGetProjectById(id);
}

export async function updateProject(id: string, data: { roi?: number; title?: string; description?: string; status?: string; progress?: number }) {
    return newUpdateProject(id, data);
}

export async function addProjectTaskNote(taskId: string, content: string, projectId: string) {
    return newAddProjectTaskNote(taskId, content, projectId);
}

export async function createProject(data: { title: string, description?: string, startDate: Date, endDate: Date, roi?: number }) {
    return newCreateProject(data);
}

export async function archiveProject(id: string) {
    return newArchiveProject(id);
}

export async function deleteProject(id: string) {
    return newDeleteProject(id);
}

export async function createProjectTask(data: { projectId: string, title: string, startDate: Date, endDate: Date, status?: string, dependencies?: string }) {
    return newCreateProjectTask(data);
}

export async function updateTaskDates(taskId: string, startDate: Date, endDate: Date, projectId: string) {
    return newUpdateTaskDates(taskId, startDate, endDate, projectId);
}

export async function linkTaskToMaintenance(taskId: string, assetId: string, description: string, projectId: string) {
    return newLinkTaskToMaintenance(taskId, assetId, description, projectId);
}

export async function getSopDocuments() {
    return newGetSopDocuments();
}

export async function createSopDocument(data: { title: string, assetId: string, imageUrl: string, aiExtractedParameters: string, line?: string, product?: string }) {
    return newCreateSopDocument(data);
}

export async function getSOPsByAsset(assetId: string) {
    return newGetSOPsByAsset(assetId);
}

export async function updateSopDocument(id: string, data: { title?: string, aiExtractedParameters?: string }) {
    return newUpdateSopDocument(id, data);
}

export async function searchCMMS(query: string) {
    return newSearchCMMS(query);
}

export async function askLeanCopilot(fpesData: any, message: string) {
    return newAskLeanCopilot(fpesData, message);
}

export async function updateAssetStatus(assetId: string, status: "OPERATIONAL" | "MAINTENANCE" | "OFFLINE") {
    return newUpdateAssetStatus(assetId, status);
}

export async function createQuickWorkOrder(data: {
    assetId: string;
    title: string;
    description: string;
    priority: "STOPPED" | "MALFUNCTIONING" | "HIGH" | "MEDIUM" | "LOW";
    category: "MECHANICAL" | "ELECTRICAL" | "HYDRAULIC" | "PNEUMATIC" | "SOFTWARE" | "CIVIL" | "OTHER" | "SAFETY" | "IMPROVEMENT";
}) {
    return newCreateQuickWorkOrder(data);
}

export async function getLivePresenceData() {
    return newGetLivePresenceData();
}
