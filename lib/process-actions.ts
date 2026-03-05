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
    if (session.user.role !== role && session.user.role !== 'SUPERVISOR') {
        return { authorized: false, message: `Non autorizzato: Richiesto ruolo adeguato` };
    }
    return { authorized: true, session };
}

// --- PROJECTS ---

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
                    orderBy: { startDate: 'asc' }
                }
            }
        });
        return project;
    } catch (e) {
        console.error("Failed to fetch project", e);
        return null;
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

export async function createProjectTask(data: { projectId: string, title: string, startDate: Date, endDate: Date, status?: string }) {
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

export async function createSopDocument(data: { title: string, assetId: string, imageUrl: string, aiExtractedParameters: string }) {
    const { authorized, session } = await requireRole('ADMIN');
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
        return { success: true };
    } catch (e) {
        return { success: false, message: "Errore creazione SOP" };
    }
}
