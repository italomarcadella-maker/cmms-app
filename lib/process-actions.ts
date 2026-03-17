"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- AUTHORIZATION HELPER ---
async function requireRole(role: string): Promise<{ authorized: boolean; message?: string; session?: any }> {
    const session = await auth();
    if (!session?.user) {
        return { authorized: false, message: 'Non autenticato' };
    }
    // We can expand this to allow both ADMIN and SUPERVISOR to run process tasks
    const roles = ['ADMIN', 'SUPERVISOR', 'PROCESS_ENGINEER'];
    if (!roles.includes(session.user.role)) {
        return { authorized: false, message: `Non autorizzato: Richiesto ruolo adeguato` };
    }
    return { authorized: true, session };
}

// --- PROJECTS ---

export async function getUnresolvedAnomalies() {
    try {
        return await prisma.processAnomaly.findMany({
            where: { isResolved: false },
            include: { asset: true },
            orderBy: { detectedAt: 'desc' }
        });
    } catch (e) {
        console.error("Failed to fetch anomalies", e);
        return [];
    }
}

export async function getProjects() {
    try {
        const projects = await prisma.project.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                tasks: true
            }
        });
        return projects;
    } catch (e) {
        console.error("Failed to fetch projects", e);
        return [];
    }
}

export async function getProjectById(id: string) {
    try {
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                tasks: {
                    orderBy: { startDate: 'asc' },
                    include: { notes: { orderBy: { createdAt: 'desc' } } }
                }
            }
        });
        return project;
    } catch (e) {
        console.error("Failed to fetch project", e);
        return null;
    }
}

export async function addProjectTaskNote(taskId: string, content: string, projectId: string) {
    const { authorized, session } = await requireRole('PROCESS_ENGINEER');
    if (!authorized) return { success: false, message: "Non autorizzato" };

    try {
        await prisma.projectTaskNote.create({
            data: {
                taskId,
                content,
                authorName: session.user.name || "Sistema"
            }
        });
        revalidatePath(`/process/projects/${projectId}`);
        return { success: true };
    } catch (e) {
        console.error("Failed to add note", e);
        return { success: false, message: "Errore salvataggio nota" };
    }
}

export async function createProject(data: { title: string, description?: string, startDate: Date, endDate: Date, roi?: number }) {
    const { authorized } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message: "Non autorizzato" };

    try {
        const project = await prisma.project.create({
            data: {
                ...data
            }
        });
        revalidatePath('/process');
        return { success: true, project };
    } catch (e) {
        return { success: false, message: "Errore creazione progetto" };
    }
}

export async function deleteProject(id: string) {
    const { authorized } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message: "Non autorizzato" };

    try {
        await prisma.project.delete({ where: { id } });
        revalidatePath('/process');
        return { success: true };
    } catch (e) {
        return { success: false, message: "Errore eliminazione progetto" };
    }
}

// --- PROJECT TASKS (GANTT) ---

export async function createProjectTask(data: { projectId: string, title: string, startDate: Date, endDate: Date, status?: string, dependencies?: string }) {
    const { authorized } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message: "Non autorizzato" };

    try {
        const task = await prisma.projectTask.create({
            data
        });
        revalidatePath(`/process/projects/${data.projectId}`);
        return { success: true, task };
    } catch (e) {
        return { success: false, message: "Errore creazione task" };
    }
}

export async function updateTaskDates(taskId: string, startDate: Date, endDate: Date, projectId: string) {
    const { authorized } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message: "Non autorizzato" };

    try {
        await prisma.projectTask.update({
            where: { id: taskId },
            data: { startDate, endDate }
        });
        revalidatePath(`/process/projects/${projectId}`);
        return { success: true };
    } catch (e) {
        return { success: false, message: "Errore aggiornamento date" };
    }
}

export async function linkTaskToMaintenance(taskId: string, assetId: string, description: string, projectId: string) {
    const { authorized, session } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message: "Non autorizzato" };

    try {
        const task = await prisma.projectTask.findUnique({ where: { id: taskId } });
        if (!task) return { success: false, message: "Task non trovato" };

        // Create a Work Order for the task
        const wo = await prisma.workOrder.create({
            data: {
                title: `[PROGETTO] ${task.title}`,
                description: description,
                priority: "MEDIUM",
                category: "IMPROVEMENT",
                assetId: assetId,
                status: "OPEN",
                assignedTo: "Unassigned",
                requesterId: session.user.id,
                dueDate: task.startDate
            }
        });

        // Link back to task
        await prisma.projectTask.update({
            where: { id: taskId },
            data: { linkedWorkOrderId: wo.id }
        });

        revalidatePath(`/process/projects/${projectId}`);
        revalidatePath(`/work-orders`);
        return { success: true, workOrderId: wo.id };
    } catch (e) {
        console.error(e);
        return { success: false, message: "Errore collegamento manutenzione" };
    }
}

// --- SOP & AI VISION ---

export async function getSopDocuments() {
    try {
        return await prisma.sopDocument.findMany({
            include: { asset: true },
            orderBy: { createdAt: 'desc' }
        });
    } catch (e) {
        return [];
    }
}

export async function createSopDocument(data: { title: string, assetId: string, imageUrl: string, aiExtractedParameters: string, line?: string, product?: string }) {
    const { authorized, session } = await requireRole('PROCESS_ENGINEER'); // Broadened to include Process Engineers
    if (!authorized) return { success: false, message: "Non autorizzato" };

    try {
        await prisma.sopDocument.create({
            data: {
                ...data,
                author: session.user.name || "Sistema",
                isApproved: true
            }
        });
        revalidatePath('/process/sop');
        revalidatePath(`/assets/${data.assetId}`);
        return { success: true };
    } catch (e) {
        return { success: false, message: "Errore creazione SOP" };
    }
}

export async function getSOPsByAsset(assetId: string) {
    try {
        return await prisma.sopDocument.findMany({
            where: { assetId, isApproved: true },
            orderBy: { createdAt: 'desc' }
        });
    } catch (e) {
        return [];
    }
}

export async function updateSopDocument(id: string, data: { title?: string, aiExtractedParameters?: string }) {
    const { authorized } = await requireRole('PROCESS_ENGINEER');
    if (!authorized) return { success: false, message: "Non autorizzato" };

    try {
        const sop = await prisma.sopDocument.update({
            where: { id },
            data
        });
        revalidatePath(`/assets/${sop.assetId}`);
        return { success: true };
    } catch (e) {
        return { success: false, message: "Errore aggiornamento SOP" };
    }
}
