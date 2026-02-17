'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { WorkOrderStatus } from '@/lib/types';

import { logAction } from './audit';
import { assetSchema, workOrderSchema } from './validations';
// --- Authorization Helper ---

async function requireRole(role: string): Promise<{ authorized: boolean; message?: string; session?: any }> {
    const session = await auth();
    if (!session?.user) {
        return { authorized: false, message: 'Non autenticato' };
    }
    // Strict Role Check or "At Least" logic could go here. 
    // For now strict equality as per original code.
    if (session.user.role !== role) {
        return { authorized: false, message: `Non autorizzato: Richiesto ruolo ${role}` };
    }
    return { authorized: true, session };
}

// --- Authentication ---

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', Object.fromEntries(formData));
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}

export async function updateUserPassword(userId: string, newPassword: string) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });
        revalidatePath('/users');
        return { success: true, message: 'Password aggiornata con successo' };
    } catch (error) {
        console.error('Failed to update password:', error);
        return { success: false, message: 'Errore durante l\'aggiornamento della password' };
    }
}

export async function updateUserRole(userId: string, newRole: string) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { role: newRole }
        });
        revalidatePath('/users');
        return { success: true, message: 'Ruolo aggiornato con successo' };
    } catch (error) {
        console.error('Failed to update role:', error);
        return { success: false, message: 'Errore durante l\'aggiornamento del ruolo' };
    }
}

export async function createUser(rawUserData: any) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };

    try {
        const { name, email, password, role } = rawUserData;
        if (!email || !password || !role) {
            return { success: false, message: 'Dati mancanti.' };
        }
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return { success: false, message: 'Utente già esistente con questa email.' };
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                image: '',
                mustChangePassword: true
            }
        });

        // Phase 5: Consistency - Auto-create Technician profile for Maintainers
        if (role === 'MAINTAINER') {
            // Check if profile already exists (unlikely on new user but safe)
            const existingTech = await prisma.technician.findFirst({ where: { userId: user.id } });
            if (!existingTech) {
                await prisma.technician.create({
                    data: {
                        name: name || email.split('@')[0],
                        // email key not in Technician model, removed
                        userId: user.id,
                        specialty: "General",
                        hourlyRate: 0
                    }
                });
            }
        }

        revalidatePath('/users');
        revalidatePath('/technicians');
        return { success: true, message: 'Utente creato con successo' };
    } catch (error) {
        console.error('Failed to create user:', error);
        return { success: false, message: `Errore durante la creazione dell'utente: ${(error as any).message}` };
    }
}

export async function updateFirstLoginPassword(newPassword: string) {
    const session = await auth();
    if (!session?.user?.email) {
        return { success: false, message: 'Non autenticato.' };
    }
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { email: session.user.email },
            data: {
                password: hashedPassword,
                mustChangePassword: false
            }
        });
        return { success: true, message: 'Password aggiornata con successo' };
    } catch (error) {
        console.error('Failed to update first login password:', error);
        return { success: false, message: 'Errore durante l\'aggiornamento della password' };
    }
}

export async function getUsers() {
    const { authorized } = await requireRole('ADMIN');
    if (!authorized) throw new Error("Unauthorized");
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, image: true, isActive: true, lastLogin: true, department: true }
        });
        // Map dates to strings
        return users.map((u: any) => ({
            ...u,
            isActive: u.isActive !== false, // Handle null/undefined as true
            lastLogin: u.lastLogin ? u.lastLogin.toISOString() : null
        }));
    } catch (error) {
        console.error('Failed to fetch users:', error);
        throw new Error('Failed to fetch users');
    }
}

export async function updateUserStatus(userId: string, isActive: boolean) {
    const { authorized, message, session } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };
    try {
        if (session.user.id === userId && !isActive) {
            return { success: false, message: 'Non puoi disattivare il tuo stesso account.' };
        }
        await prisma.user.update({
            where: { id: userId },
            data: { isActive }
        });
        revalidatePath('/users');
        return { success: true, message: isActive ? 'Utente riattivato' : 'Utente disattivato' };
    } catch (error) {
        return { success: false, message: 'Errore aggiornamento stato' };
    }
}

export async function updateUser(userId: string, data: { name?: string; email?: string; department?: string; image?: string }) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };
    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                email: data.email,
                department: data.department,
                image: data.image
            }
        });
        revalidatePath('/users');
        return { success: true, message: 'Utente aggiornato con successo' };
    } catch (error) {
        return { success: false, message: 'Errore aggiornamento dati' };
    }
}

export async function deleteUser(userId: string) {
    const { authorized, message, session } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };
    try {
        if (session.user.id === userId) {
            return { success: false, message: 'Non puoi cancellare il tuo stesso account.' };
        }
        await prisma.user.delete({ where: { id: userId } });
        revalidatePath('/users');
        return { success: true, message: 'Utente eliminato con successo' };
    } catch (error) {
        console.error('Failed to delete user:', error);
        return { success: false, message: 'Errore durante l\'eliminazione dell\'utente' };
    }
}

export async function resetDatabase() {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };
    try {
        await prisma.meterReading.deleteMany();
        await prisma.meter.deleteMany();
        await prisma.notification.deleteMany();
        await prisma.laborLog.deleteMany();
        await prisma.workOrderPart.deleteMany();
        await prisma.checklistItem.deleteMany();
        await prisma.workOrder.deleteMany();
        await prisma.preventiveSchedule.deleteMany();
        await prisma.assetImage.deleteMany();
        await prisma.assetDocument.deleteMany();
        await prisma.asset.deleteMany();
        await prisma.technician.deleteMany();
        await prisma.maintenanceActivity.deleteMany();
        await prisma.user.deleteMany({
            where: { role: { not: 'ADMIN' } }
        });
        revalidatePath('/');
        return { success: true, message: 'Database ripulito con successo.' };
    } catch (error) {
        console.error('Failed to reset database:', error);
        return { success: false, message: 'Errore durante il reset del database.' };
    }
}

// --- Dashboard ---

export const getDashboardStats = unstable_cache(
    async () => {
        const totalAssets = await prisma.asset.count();
        const openWorkOrders = await prisma.workOrder.count({ where: { status: 'OPEN' } });
        const completedWorkOrders = await prisma.workOrder.count({ where: { status: 'COMPLETED' } });
        const lowHealthAssets = await prisma.asset.count({ where: { healthScore: { lt: 70 } } });

        return { totalAssets, openWorkOrders, completedWorkOrders, lowHealthAssets };
    },
    ['dashboard-stats'],
    { tags: ['dashboard-stats'], revalidate: 300 }
);

// --- Assets ---

export const getAssets = unstable_cache(
    async () => {
        const assets = await prisma.asset.findMany({ orderBy: { name: 'asc' } });
        return assets.map((asset: any) => ({
            ...asset,
            purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : '',
            lastMaintenance: asset.lastMaintenance ? asset.lastMaintenance.toISOString().split('T')[0] : null,
        }));
    },
    ['all-assets'],
    { tags: ['assets'], revalidate: 3600 }
);



export async function importAssets(assets: any[]) {
    let count = 0;
    let errors: string[] = [];
    const { authorized } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message: "Unauthorized", count: 0, errors: ["Unauthorized"] };

    for (const asset of assets) {
        try {
            if (!asset.name || !asset.model) continue;
            const assetData = {
                name: asset.name,
                model: asset.model,
                serialNumber: asset.serialNumber || `SN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                location: asset.location || 'Unknown',
                status: asset.status || 'OPERATIONAL',
                healthScore: parseInt(asset.healthScore) || 100,
                type: asset.type || 'MACHINE',
                purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : new Date(),
                department: asset.department || asset.category || 'General',
                plant: asset.plant || 'Default Plant',
                line: asset.line || null,
                vendor: asset.vendor || null,
            };
            if (asset.id) {
                await prisma.asset.upsert({
                    where: { id: asset.id },
                    update: assetData,
                    create: { id: asset.id, ...assetData }
                });
            } else {
                await prisma.asset.create({ data: assetData });
            }
            count++;
        } catch (e) {
            errors.push(`Failed to import ${asset.name}`);
        }
    }
    revalidatePath('/assets');
    return { success: true, count, errors };
}

export async function addAsset(rawData: any) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };

    try {
        const validation = assetSchema.safeParse(rawData);

        if (!validation.success) {
            let errorMsg = "";
            if (validation.error.issues && Array.isArray(validation.error.issues)) {
                errorMsg = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(", ");
            } else {
                errorMsg = "Errore di validazione sconosciuto";
            }
            return { success: false, message: "Dati non validi: " + errorMsg };
        }
        const data = validation.data;

        const assetData = {
            name: data.name,
            model: data.model,
            serialNumber: data.serialNumber, // Already validated as string
            location: data.location,
            status: data.status,
            healthScore: data.healthScore,
            type: data.type,
            purchaseDate: data.purchaseDate,
            department: data.department,
            plant: data.plant,
            line: data.line,
            cespite: data.cespite, // Updated
            vendor: data.vendor,
        };
        const newAsset = await prisma.asset.create({ data: assetData });
        await logAction('CREATE_ASSET', newAsset.id, `Created asset ${newAsset.name}`);
        revalidateTag('dashboard-stats');
        revalidateTag('assets'); // Invalidate asset list cache
        revalidatePath('/assets');
        return { success: true, message: 'Asset creato con successo', data: newAsset };
    } catch (error) {
        return { success: false, message: 'Errore creazione asset: ' + (error as any).message };
    }
}

export async function updateAsset(id: string, rawData: any) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };

    try {
        const validation = assetSchema.partial().safeParse(rawData);
        if (!validation.success) {
            return { success: false, message: "Dati non validi: " + validation.error.errors.map(e => e.message).join(", ") };
        }
        const data = validation.data;

        const updatedAsset = await prisma.asset.update({
            where: { id },
            data: data
        });
        await logAction('UPDATE_ASSET', id, 'Updated asset details');
        revalidateTag('dashboard-stats');
        revalidateTag('assets');
        revalidatePath('/assets');
        revalidatePath(`/assets/${id}`);
        return { success: true, message: 'Asset aggiornato', data: updatedAsset };
    } catch (error) {
        return { success: false, message: 'Errore aggiornamento asset' };
    }
}

export async function deleteAsset(id: string) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };

    try {
        // Check dependencies
        const woCount = await prisma.workOrder.count({ where: { assetId: id } });
        if (woCount > 0) {
            return { success: false, message: `Impossibile eliminare: L'asset ha ${woCount} ordini di lavoro associati. Archivia l'asset invece.` };
        }

        const schedCount = await prisma.preventiveSchedule.count({ where: { assetId: id } });
        if (schedCount > 0) {
            return { success: false, message: `Impossibile eliminare: L'asset ha ${schedCount} manutenzioni programmate.` };
        }

        await prisma.asset.delete({ where: { id } });
        await logAction('DELETE_ASSET', id, 'Deleted asset');
        revalidateTag('dashboard-stats');
        revalidateTag('assets');
        revalidatePath('/assets');
        return { success: true, message: 'Asset eliminato con successo' };
    } catch (error) {
        return { success: false, message: 'Errore durante l\'eliminazione' };
    }
}

export async function rescheduleWorkOrder(id: string, newDate: Date) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };

    try {
        await prisma.workOrder.update({
            where: { id },
            data: { dueDate: newDate }
        });
        // Also update preventive schedule nextDueDate if applicable? 
        // For now, just moving the specific instance.

        revalidatePath('/planning/calendar');
        revalidateTag('calendar-events-v2');
        return { success: true, message: 'Data aggiornata' };
    } catch (error) {
        console.error("Reschedule Error:", error);
        return { success: false, message: 'Errore riprogrammazione' };
    }
}

// --- Work Order Assignment (Scheduler) ---
export async function assignWorkOrder(workOrderId: string, technicianId: string, date?: Date) {
    try {
        const session = await auth();

        // Check if technicianId is a Technician ID or a User ID (for Supervisors)
        let tech = await prisma.technician.findUnique({ where: { id: technicianId } });

        // If not found, check if it's a User ID and create profile if needed
        if (!tech) {
            const user = await prisma.user.findUnique({ where: { id: technicianId } });
            if (user && (user.role === 'SUPERVISOR' || user.role === 'MAINTAINER')) {
                // Auto-register as Technician
                tech = await prisma.technician.create({
                    data: {
                        name: user.name || 'Technician',
                        userId: user.id,
                        specialty: user.role === 'SUPERVISOR' ? 'Supervisor' : 'General',
                        hourlyRate: 0
                    }
                });
            }
        }

        if (!tech) return { success: false, message: "Tecnico non trovato" };

        const updateData: any = {
            assignedTechnicianId: tech.id,
            assignedTo: tech.name,
            status: "ASSIGNED" // Start treating as ASSIGNED
        };

        if (date) {
            const normalizedDate = new Date(date);
            normalizedDate.setHours(9, 0, 0, 0);
            updateData.dueDate = normalizedDate;
        }

        const workOrder = await prisma.workOrder.update({
            where: { id: workOrderId },
            data: updateData
        });

        // Use the real Tech ID for the relation
        const realTechId = tech.id;

        // Maintain Many-to-Many relation
        // Check if already assigned
        const existingRel = await prisma.workOrderTechnician.findUnique({
            where: {
                workOrderId_technicianId: {
                    workOrderId,
                    technicianId: realTechId
                }
            }
        });

        if (!existingRel) {
            await prisma.workOrderTechnician.create({
                data: {
                    workOrderId,
                    technicianId: realTechId
                }
            });
        }

        if (tech.userId) {
            await prisma.notification.create({
                data: {
                    userId: tech.userId,
                    title: "Nuovo Incarico",
                    message: `Ti è stato assegnato un nuovo ordine di lavoro: ${workOrder.title}`,
                    link: `/work-orders/${workOrder.id}`
                }
            });
        }

        if (session?.user) {
            await logAction("ASSIGN_WO", workOrderId, `Assigned to ${tech.name}` + (date ? ` on ${date}` : ""));
        }

        revalidateTag('dashboard-stats');
        revalidatePath("/planning/calendar");
        revalidateTag('calendar-events-v2');
        revalidatePath("/work-orders");
        return { success: true, message: "Assegnazione completata" };

    } catch (error) {
        console.error("Assign Error:", error);
        return { success: false, message: "Errore assegnazione" };
    }
}

export async function updateWorkOrderAssignments(workOrderId: string, technicianIds: string[]) {
    try {
        const session = await auth();
        // 1. Clear existing? Or just add/remove delta?
        // Simple approach: Delete all for this WO and recreate.
        // But we want to preserve history? Assignments table is simple linking.
        // Let's use transaction or just clear and add.

        await prisma.workOrderTechnician.deleteMany({
            where: { workOrderId }
        });

        // Resolve all IDs to valid Technician IDs
        const resolvedIds: string[] = [];
        for (const inputId of technicianIds) {
            let tech = await prisma.technician.findUnique({ where: { id: inputId } });
            if (!tech) {
                // Try User ID
                const user = await prisma.user.findUnique({ where: { id: inputId } });
                if (user && (user.role === 'SUPERVISOR' || user.role === 'MAINTAINER')) {
                    tech = await prisma.technician.create({
                        data: {
                            name: user.name || 'Technician',
                            userId: user.id,
                            specialty: user.role === 'SUPERVISOR' ? 'Supervisor' : 'General',
                            hourlyRate: 0
                        }
                    });
                }
            }
            if (tech) resolvedIds.push(tech.id);
        }

        if (resolvedIds.length > 0) {
            await prisma.workOrderTechnician.createMany({
                data: resolvedIds.map(id => ({
                    workOrderId,
                    technicianId: id
                }))
            });

            // Update legacy fields with the FIRST technician for backward compat
            const firstTech = await prisma.technician.findUnique({ where: { id: resolvedIds[0] } });
            await prisma.workOrder.update({
                where: { id: workOrderId },
                data: {
                    assignedTechnicianId: resolvedIds[0],
                    assignedTo: firstTech?.name || 'Assigned',
                    status: 'ASSIGNED'
                }
            });

            // Notify all new technicians
            for (const techId of resolvedIds) {
                const tech = await prisma.technician.findUnique({ where: { id: techId } });
                if (tech && tech.userId) {
                    await prisma.notification.create({
                        data: {
                            userId: tech.userId,
                            title: "Nuovo Incarico (Multi)",
                            message: "Sei stato aggiunto a un ordine di lavoro.",
                            link: `/work-orders/${workOrderId}`
                        }
                    });
                }
            }

        } else {
            // Unassigned
            await prisma.workOrder.update({
                where: { id: workOrderId },
                data: {
                    assignedTechnicianId: null,
                    assignedTo: 'Unassigned',
                    status: 'OPEN'
                }
            });
        }

        revalidatePath("/work-orders");
        revalidatePath(`/work-orders/${workOrderId}`);
        return { success: true, message: "Assegnazioni aggiornate" };
    } catch (error) {
        console.error("Multi Assign Error:", error);
        return { success: false, message: "Errore aggiornamento assegnazioni" };
    }
}

export async function getUnassignedWorkOrders() {
    try {
        const workOrders = await prisma.workOrder.findMany({
            where: {
                assignedTechnicianId: null,
                status: {
                    in: ["OPEN", "PENDING"]
                }
            },
            include: {
                asset: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return workOrders;
    } catch (error) {
        console.error("Error fetching unassigned WOs:", error);
        return [];
    }
}

export async function getPlannerUnassignedItems() {
    try {
        // 1. Unassigned Work Orders
        const workOrders = await prisma.workOrder.findMany({
            where: {
                assignedTechnicianId: null,
                status: { in: ["OPEN", "PENDING", "PENDING_APPROVAL"] }
            },
            include: { asset: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        });

        const woItems = workOrders.map(wo => ({
            id: wo.id,
            type: 'WO',
            title: wo.title,
            assetName: wo.asset.name,
            priority: wo.priority,
            status: wo.status,
            category: wo.category
        }));

        // 2. Upcoming Schedules (Next 14 Days)
        const nextTwoWeeks = new Date();
        nextTwoWeeks.setDate(nextTwoWeeks.getDate() + 14);

        const schedules = await prisma.preventiveSchedule.findMany({
            where: {
                nextDueDate: { lte: nextTwoWeeks }
            },
            include: { asset: { select: { name: true } } },
            orderBy: { nextDueDate: 'asc' }
        });

        const pmItems = schedules.map(sch => ({
            id: sch.id,
            type: 'PM',
            title: sch.taskTitle,
            assetName: sch.asset.name,
            priority: 'MEDIUM', // Default for PM
            status: 'SCHEDULED', // Virtual status
            category: 'PREVENTIVE',
            dueDate: sch.nextDueDate.toISOString()
        }));

        return [...woItems, ...pmItems];
    } catch (error) {
        console.error("Error fetching planner items:", error);
        return [];
    }
}

export async function createWorkOrderFromSchedule(scheduleId: string, date: Date, technicianId?: string) {
    try {
        const schedule = await prisma.preventiveSchedule.findUnique({
            where: { id: scheduleId },
            include: { asset: { select: { name: true } } }
        });

        if (!schedule) return { success: false, message: "Schedulazione non trovata" };

        let checklistCreate: any[] = [];
        try {
            const activities = schedule.activities ? JSON.parse(schedule.activities) : [];
            if (Array.isArray(activities)) {
                checklistCreate = activities.map((a: any) => ({
                    label: typeof a === 'string' ? a : a.label || "Attività",
                    completed: false
                }));
            }
        } catch (e) {
            console.error("Error parsing schedule activities", e);
        }

        const newWo = await prisma.workOrder.create({
            data: {
                title: schedule.taskTitle,
                description: schedule.description,
                assetId: schedule.assetId,
                priority: 'MEDIUM',
                category: 'PREVENTIVE',
                status: 'OPEN',
                assignedTo: 'Unassigned',
                dueDate: date,
                checklist: {
                    create: checklistCreate
                }
            }
        });

        // Update schedule next due date (simple increment)
        const nextDate = new Date(schedule.nextDueDate);
        nextDate.setDate(nextDate.getDate() + schedule.frequencyDays);
        await prisma.preventiveSchedule.update({
            where: { id: scheduleId },
            data: { nextDueDate: nextDate }
        });

        if (technicianId) {
            await assignWorkOrder(newWo.id, technicianId, date);
        }

        revalidateTag('dashboard-stats');
        revalidatePath('/planning/calendar');
        revalidateTag('calendar-events-v2');
        return { success: true, message: "Ordine creato da schedulazione" };
    } catch (error) {
        console.error("Error creating WO from Schedule:", error);
        return { success: false, message: "Errore creazione ordine" };
    }
}

// --- Preventive Schedules ---

export async function getPreventiveSchedules() {
    const session = await auth();
    if (!session?.user) return [];
    try {
        const schedules = await prisma.preventiveSchedule.findMany({
            include: { asset: { select: { name: true, line: true } } },
            orderBy: { nextDueDate: 'asc' }
        });
        return schedules.map(s => ({
            ...s,
            assetName: s.asset.name,
            assetLine: s.asset.line,
            activities: s.activities ? JSON.parse(s.activities) : [],
            lastRunDate: s.lastRunDate ? s.lastRunDate.toISOString() : null,
            nextDueDate: s.nextDueDate.toISOString()
        }));
    } catch (error) {
        return [];
    }
}

export async function getAssetSchedules(assetId: string) {
    try {
        const schedules = await prisma.preventiveSchedule.findMany({
            where: { assetId },
            include: { asset: { select: { name: true, line: true } } },
            orderBy: { nextDueDate: 'asc' }
        });
        return schedules.map(s => ({
            ...s,
            assetName: s.asset.name,
            assetLine: s.asset.line,
            activities: s.activities ? JSON.parse(s.activities) : [],
            lastRunDate: s.lastRunDate ? s.lastRunDate.toISOString() : null,
            nextDueDate: s.nextDueDate.toISOString()
        }));
    } catch (error) {
        return [];
    }
}

export async function createPreventiveSchedule(data: {
    title: string;
    description: string;
    assetId: string;
    frequency: string;
    frequencyDays: number;
    activities: any[];
    firstDate: Date;
}) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return { success: false, message: 'Non autorizzato' };
    }

    try {
        await prisma.preventiveSchedule.create({
            data: {
                taskTitle: data.title,
                description: data.description,
                assetId: data.assetId,
                frequency: data.frequency,
                frequencyDays: data.frequencyDays,
                activities: JSON.stringify(data.activities),
                nextDueDate: new Date(data.firstDate)
            }
        });
        revalidatePath('/maintenance/schedule');
        return { success: true, message: 'Schedulazione creata con successo' };
    } catch (error) {
        console.error("Create Sched Error:", error);
        return { success: false, message: 'Errore creazione schedulazione' };
    }
}

export async function deletePreventiveSchedule(id: string) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') return { success: false, message: 'Non autorizzato' };
    try {
        await prisma.preventiveSchedule.delete({ where: { id } });
        revalidatePath('/maintenance/schedule');
        return { success: true, message: 'Schedulazione eliminata con successo' };
    } catch (error) {
        return { success: false, message: 'Errore eliminazione' };
    }
}

export async function updatePreventiveSchedule(id: string, nextDueDate: Date) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') return { success: false, message: 'Non autorizzato' };

    try {
        await prisma.preventiveSchedule.update({
            where: { id },
            data: { nextDueDate }
        });
        revalidatePath('/maintenance/schedule');
        revalidatePath('/maintenance');
        return { success: true, message: 'Data aggiornata' };
    } catch (error) {
        return { success: false, message: 'Errore aggiornamento data' };
    }
}

// --- Technicians ---

export async function getTechnicians() {
    try {
        // 1. Get explicitly registered technicians
        const techs = await prisma.technician.findMany();

        // 2. Get Supervisors who are technically able to work but don't have a Technician profile yet
        // We exclude those who already have a profile by checking userId NOT IN techs.userId
        const registeredUserIds = techs.map(t => t.userId).filter(Boolean) as string[];

        const supervisors = await prisma.user.findMany({
            where: {
                role: 'SUPERVISOR',
                id: { notIn: registeredUserIds },
                isActive: true
            },
            select: { id: true, name: true, email: true }
        });

        // Map supervisors to resemble Technician shape
        const supervisorTechs = supervisors.map(s => ({
            id: s.id, // Use User ID as ID for now (handled in assignWorkOrder)
            name: s.name || 'Supervisor',
            specialty: 'Supervisor',
            hourlyRate: 0,
            userId: s.id
        }));

        return [...techs, ...supervisorTechs] as any[];

    } catch (error) {
        return [];
    }
}

export async function getAvailableUsersForTechnician() {
    const { authorized } = await requireRole('ADMIN');
    if (!authorized) return [];
    try {
        const users = await prisma.user.findMany({
            where: {
                technicianProfile: null,
                // Optional: restrict to specific roles if needed, e.g. NOT 'ADMIN' or only 'MAINTAINER'?
                // User requirement implies any user can be upgraded to technician.
                // But typically we might want to filter out blocked users?
                isActive: true
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        });
        return users;
    } catch (error) {
        console.error("Failed to get available users:", error);
        return [];
    }
}



export async function addTechnician(data: { name: string; specialty: string; hourlyRate: number; email: string }) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') return { success: false, message: 'Non autorizzato' };

    try {
        // Find User
        const user = await prisma.user.findUnique({ where: { email: data.email } });
        if (!user) {
            return { success: false, message: 'Utente non trovato. Devi prima creare un account Utente con questa email.' };
        }

        // Check if user is already a technician
        const existingTech = await prisma.technician.findUnique({ where: { userId: user.id } });
        if (existingTech) {
            return { success: false, message: 'Questo utente è già un tecnico.' };
        }

        const newTech = await prisma.technician.create({
            data: {
                name: data.name,
                specialty: data.specialty,
                hourlyRate: data.hourlyRate,
                userId: user.id
            }
        });

        // Optionally update Role to MAINTAINER if strictly needed, but let's leave it flexible or do it.
        // if (user.role === 'USER') { await prisma.user.update({ where: {id: user.id}, data: { role: 'MAINTAINER' }})} 

        revalidatePath('/settings');
        return { success: true, message: 'Tecnico aggiunto e collegato all\'utente.', data: newTech };
    } catch (error) {
        console.error("Add Technician Error:", error);
        return { success: false, message: 'Errore aggiunta tecnico: ' + (error as any).message };
    }
}

export async function deleteTechnician(id: string) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') return { success: false, message: 'Non autorizzato' };
    try {
        await prisma.technician.delete({ where: { id } });
        return { success: true, message: 'Tecnico eliminato' };
    } catch (error) {
        return { success: false, message: 'Errore eliminazione' };
    }
}

// --- Maintenance Activities ---

export async function getActivities() {
    try { return await prisma.maintenanceActivity.findMany(); } catch (error) { return []; }
}

export async function addActivity(data: { label: string; category?: string }) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') return { success: false, message: 'Non autorizzato' };
    try {
        const newAct = await prisma.maintenanceActivity.create({ data });
        return { success: true, message: 'Attività aggiunta', data: newAct };
    } catch (error) {
        return { success: false, message: 'Errore aggiunta attività' };
    }
}

export async function deleteActivity(id: string) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') return { success: false, message: 'Non autorizzato' };
    try {
        await prisma.maintenanceActivity.delete({ where: { id } });
        return { success: true, message: 'Attività eliminata' };
    } catch (error) {
        return { success: false, message: 'Errore eliminazione' };
    }
}

// --- Inventory (Spare Parts) ---

export async function getSpareParts() {
    try {
        const parts = await prisma.sparePart.findMany({ orderBy: { name: 'asc' } });
        return parts.map((part: any) => ({
            ...part,
            lastUpdated: part.lastUpdated ? part.lastUpdated.toISOString() : new Date().toISOString()
        }));
    } catch (error) {
        return [];
    }
}

export async function addSparePart(data: { name: string; quantity: number; category?: string; description?: string; location?: string; unitCost?: number; minQuantity?: number; warehouse?: string }) {
    try {
        const newPart = await prisma.sparePart.create({ data: { ...data, minQuantity: data.minQuantity || 0 } });
        return {
            success: true,
            message: 'Ricambio aggiunto',
            data: {
                ...newPart,
                lastUpdated: newPart.lastUpdated.toISOString()
            }
        };
    } catch (error) {
        console.error("Add Spare Part Error:", error);
        return { success: false, message: `Errore aggiunta ricambio: ${(error as any).message}` };
    }
}

export async function updateSparePartQuantity(id: string, quantity: number) {
    try {
        const updated = await prisma.sparePart.update({ where: { id }, data: { quantity, lastUpdated: new Date() } });
        return {
            success: true,
            message: 'Quantità aggiornata',
            data: {
                ...updated,
                lastUpdated: updated.lastUpdated.toISOString()
            }
        };
    } catch (error) {
        return { success: false, message: 'Errore aggiornamento' };
    }
}

export async function deleteSparePart(id: string) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') return { success: false, message: 'Non autorizzato' };
    try {
        await prisma.sparePart.delete({ where: { id } });
        return { success: true, message: 'Ricambio eliminato' };
    } catch (error) {
        return { success: false, message: 'Errore eliminazione' };
    }
}

// --- Components ---

export async function getComponents() {
    try { return await prisma.component.findMany({ include: { measurements: true }, orderBy: { purchaseDate: 'desc' } }); } catch (error) { return []; }
}

export async function addComponent(data: any) {
    try {
        const newComp = await prisma.component.create({ data });
        return { success: true, message: 'Componente aggiunto', data: newComp };
    } catch (error) {
        return { success: false, message: 'Errore aggiunta componente' };
    }
}

export async function updateComponent(id: string, updates: any) {
    try {
        const updated = await prisma.component.update({ where: { id }, data: updates });
        return { success: true, message: 'Componente aggiornato', data: updated };
    } catch (error) {
        return { success: false, message: 'Errore aggiornamento' };
    }
}

export async function addMeasurement(componentId: string, measurement: { date: string | Date; value1: number; value2?: number; operator: string }) {
    try {
        const newMeas = await prisma.componentMeasurement.create({
            data: {
                componentId,
                date: new Date(measurement.date),
                value1: measurement.value1,
                value2: measurement.value2,
                operator: measurement.operator
            }
        });
        return { success: true, message: 'Misurazione aggiunta', data: newMeas };
    } catch (error) {
        return { success: false, message: 'Errore aggiunta misurazione' };
    }
}

// --- Chat ---

export async function getChatMessages() {
    try {
        return await prisma.chatMessage.findMany({ orderBy: { timestamp: 'asc' }, take: 100 });
    } catch (error) {
        return [];
    }
}

export async function sendChatMessage(data: { sender: string; role: string; content: string; isSystem?: boolean; thoughtProcess?: string[]; imageUrl?: string }) {
    try {
        const msg = await prisma.chatMessage.create({
            data: {
                sender: data.sender,
                role: data.role,
                content: data.content,
                isSystem: data.isSystem || false,
                isRead: false,
                thoughtProcess: data.thoughtProcess || [],
                imageUrl: data.imageUrl
            }
        });
        return { success: true, data: msg };
    } catch (error) {
        return { success: false, message: 'Errore invio messaggio' };
    }
}

// --- Work Orders ---

export async function getWorkOrders() {
    try {
        const wos = await prisma.workOrder.findMany({
            orderBy: { createdAt: 'desc' },
            take: 1000,
            include: {
                asset: true,
                timers: true,
                laborLogs: true,
                partsUsed: true,
                checklist: { orderBy: { id: 'asc' } },
                technicians: { include: { technician: true } }
            }
        });

        return wos.map((wo: any) => ({
            ...wo,
            dueDate: wo.dueDate ? wo.dueDate.toISOString() : null,
            createdAt: wo.createdAt ? wo.createdAt.toISOString() : new Date().toISOString(),
            partsUsed: wo.partsUsed?.map((p: any) => ({
                ...p,
                dateAdded: p.dateAdded ? p.dateAdded.toISOString() : new Date().toISOString()
            })) || [],
            laborLogs: wo.laborLogs?.map((l: any) => ({
                ...l,
                date: l.date ? l.date.toISOString() : new Date().toISOString()
            })) || [],
            checklist: wo.checklist || [],
            timers: wo.timers?.map((t: any) => ({
                ...t,
                startTime: t.startTime.toISOString(),
                endTime: t.endTime ? t.endTime.toISOString() : null
            })) || [],
            technicians: wo.technicians ? wo.technicians.map((t: any) => ({ id: t.technician.id, name: t.technician.name })) : []
        }));

    } catch (error) {
        console.error('Failed to get WOs:', error);
        return [];
    }
}

export async function getActiveWorkOrdersForAsset(assetId: string) {
    try {
        const activeWOs = await prisma.workOrder.findMany({
            where: {
                assetId: assetId,
                status: {
                    notIn: ['COMPLETED', 'CLOSED', 'CANCELED']
                }
            },
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
                description: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map dates
        return activeWOs.map(wo => ({
            ...wo,
            createdAt: wo.createdAt.toISOString()
        }));
    } catch (error) {
        console.error("Failed to get active WOs:", error);
        return [];
    }
}

const VIRTUAL_ASSETS: Record<string, { name: string; type: string }> = {
    'SYS-SAFETY': { name: 'Segnalazione Sicurezza', type: 'SAFETY' },
    'SYS-KAIZEN': { name: 'Proposta Miglioramento', type: 'KAIZEN' },
    'SYS-WORKSHOP': { name: 'Richiesta Officina', type: 'WORKSHOP' },
    'SYS-PLANT': { name: 'Manutenzione Impianti', type: 'PLANT' },
    'SYS-OTHER': { name: 'Altro / Generico', type: 'OTHER' },
};

async function ensureVirtualAsset(id: string) {
    if (VIRTUAL_ASSETS[id]) {
        const info = VIRTUAL_ASSETS[id];
        await prisma.asset.upsert({
            where: { id },
            update: {},
            create: {
                id,
                name: info.name,
                model: 'System Virtual Asset',
                serialNumber: id,
                location: 'VIRTUAL',
                status: 'OPERATIONAL',
                purchaseDate: new Date(),
                department: 'GENERAL'
            }
        });
    }
}

export async function createWorkOrder(rawData: any) {
    const session = await auth();
    if (!session?.user) {
        return { success: false, message: "Non autorizzato. Effettua il login." };
    }

    try {
        console.log("createWorkOrder RAW DATA:", JSON.stringify(rawData, null, 2));

        // Zod Validation
        const validation = workOrderSchema.safeParse(rawData);
        if (!validation.success) {
            console.error("WO Validation Failed:", JSON.stringify(validation.error, null, 2));
            // Safety check for map error
            const errorMsg = validation.error.errors ? validation.error.errors.map((e: any) => e.message).join(", ") : "Unknown Validation Error";
            return { success: false, message: "Dati non validi: " + errorMsg };
        }
        const data = validation.data;

        // Ensure Virtual Asset Exists if applicable
        await ensureVirtualAsset(data.assetId);

        console.log("Creating WO with data:", { ...data, checklist: data.checklist ? `Array(${data.checklist.length})` : 'undefined' });

        const newWO = await prisma.workOrder.create({
            data: {
                title: data.title,
                description: data.description,
                assetId: data.assetId,
                priority: data.priority,
                category: data.category,
                status: data.status,
                type: data.type,
                dueDate: data.dueDate,

                requesterId: data.requesterId || session.user.id, // Fallback to current user
                validatedById: data.validatedById,
                assignedTechnicianId: data.assignedTechnicianId,

                checklist: data.checklist && data.checklist.length > 0 ? {
                    create: data.checklist.map((c: any) => ({
                        label: c.label,
                        completed: c.completed
                    }))
                } : undefined
            }
        });

        await logAction('CREATE_WO', newWO.id, `Created Work Order: ${newWO.title}`);

        // NOTIFICATION: Check if created with assignment
        if (newWO.assignedTechnicianId) {
            const tech = await prisma.technician.findUnique({ where: { id: newWO.assignedTechnicianId } });
            if (tech && tech.userId) {
                // Notifica il tecnico
                await prisma.notification.create({
                    data: {
                        userId: tech.userId,
                        title: "Nuovo Incarico",
                        message: `Ti è stato assegnato un nuovo ordine di lavoro: ${newWO.title}`,
                        link: `/work-orders/${newWO.id}`
                    }
                });
            }
        }

        // NOTIFICATION: Critical Safety Requests -> Notify Supervisors
        if ((newWO.category === 'SAFETY' || newWO.assetId === 'SYS-SAFETY') &&
            (newWO.priority === 'HIGH' || newWO.priority === 'STOPPED')) {

            const supervisors = await prisma.user.findMany({
                where: { role: 'SUPERVISOR' },
                select: { id: true }
            });

            console.log("Supervisors found:", supervisors);

            if (supervisors && supervisors.length > 0) {
                const notifications = supervisors.map(supervisor => ({
                    userId: supervisor.id,
                    title: "⚠️ SICUREZZA: Segnalazione Critica",
                    message: `Nuova richiesta di sicurezza ad ALTA priorità: ${newWO.title}`,
                    link: `/work-orders/${newWO.id}`
                }));

                await prisma.notification.createMany({
                    data: notifications
                });
            }
        }

        revalidateTag('dashboard-stats'); // Update Dashboard Stats
        revalidatePath('/maintenance');
        revalidatePath('/work-orders');
        revalidatePath('/requests'); // Revalidate requests too
        revalidatePath('/'); // Refresh Dashboard
        return { success: true, message: 'Ordine creato', data: newWO };

    } catch (error) {
        console.error("WO Create Error Detailed:", error);
        return { success: false, message: `Errore creazione ordine: ${(error as any).message}` };
    }
}

export async function approveRequest(id: string, technicianId: string, priority: string) {
    const session = await auth();
    if (!session?.user || (session.user as any).role === 'USER') {
        return { success: false, message: 'Non autorizzato' };
    }

    try {
        const tech = await prisma.technician.findUnique({ where: { id: technicianId } });

        await prisma.workOrder.update({
            where: { id },
            data: {
                status: 'ASSIGNED', // Changed from APPROVED to ASSIGNED to match Kanban
                type: 'FAULT', // Convert request to standard fault
                priority: priority,
                assignedTechnicianId: technicianId,
                assignedTo: tech?.name || 'Assigned'
            }
        });

        // Add to join table
        await prisma.workOrderTechnician.create({
            data: {
                workOrderId: id,
                technicianId: technicianId
            }
        });

        // Notify Technician Using User ID
        const assignedWO = await prisma.workOrder.findUnique({ where: { id } });

        if (tech && tech.userId && assignedWO) {
            await prisma.notification.create({
                data: {
                    userId: tech.userId,
                    title: "Nuovo Incarico: " + assignedWO.title,
                    message: `È stata approvata una nuova richiesta.\nDescrizione: ${assignedWO.description.substring(0, 100)}${assignedWO.description.length > 100 ? '...' : ''}`,
                    link: `/work-orders/${id}`
                }
            });
        }

        revalidatePath('/work-orders');
        revalidatePath('/requests');
        return { success: true, message: 'Richiesta approvata e assegnata' };
    } catch (error) {
        return { success: false, message: 'Errore approvazione' };
    }
}


export async function reviewWorkOrder(id: string, decision: 'APPROVE' | 'REJECT', feedback?: string) {
    const session = await auth();
    if (!session?.user || (session.user as any).role === 'USER') {
        return { success: false, message: 'Non autorizzato' };
    }

    try {
        if (decision === 'APPROVE') {
            // EWO Check
            const settings = await prisma.systemSettings.findUnique({ where: { id: 'settings' } });
            if (settings?.ewoThresholdHours && settings.ewoThresholdHours > 0) {
                const currentWO = await prisma.workOrder.findUnique({
                    where: { id },
                    include: { laborLogs: true }
                });

                if (currentWO) {
                    const totalHours = currentWO.laborLogs.reduce((acc, log) => acc + log.hours, 0);
                    if (totalHours > settings.ewoThresholdHours && !currentWO.ewoFilled) {
                        return {
                            success: false,
                            message: `Blocco EWO: L'intervento (durata ${totalHours}h) supera la soglia di ${settings.ewoThresholdHours}h. Compilare il modulo EWO prima di chiudere.`
                        };
                    }
                }
            }

            const wo = await prisma.workOrder.update({
                where: { id },
                data: {
                    status: 'CLOSED',
                    validatedById: session.user.id
                },
                include: {
                    originSchedule: true,
                    ewo: true
                }
            });

            await logAction('REVIEW_WO', id, 'Approved and Closed');

            // --- SELF-LEARNING TRIGGER ---
            try {
                const { learnFromWorkOrder } = await import('@/lib/ai-service');
                if (wo.ewoFilled && wo.ewo) {
                    await learnFromWorkOrder(
                        wo.ewo.description || wo.description,
                        wo.ewo.solutionApplied,
                        wo.category
                    );
                } else if (feedback) {
                    // Treat feedback as solution for standard WOs
                    await learnFromWorkOrder(wo.description, feedback, wo.category);
                }
            } catch (kError) {
                console.error("Learning Trigger Failed:", kError);
            }
            // -----------------------------

            // Auto-Regenerate Schedule if linked
            if (wo.originScheduleId && wo.originSchedule) {
                const sched = wo.originSchedule;
                let nextDate = new Date(); // Start from "Now" (completion time) or keep strict schedule?
                // Usually strict schedule means next due = prev due + freq, but if late, we might want from completion.
                // Let's settle on: Next Due = Today + Frequency Days (Reset clock)

                // Calc days based on frequency or fallback
                let daysToAdd = sched.frequencyDays;
                // We could look up RECURRENCE_OPTIONS map here, but frequencyDays is stored in DB for convenience.

                nextDate.setDate(nextDate.getDate() + daysToAdd);

                await prisma.preventiveSchedule.update({
                    where: { id: sched.id },
                    data: {
                        lastRunDate: new Date(),
                        nextDueDate: nextDate
                    }
                });
            }

            // Notifications Cleanup: Mark any notification about this WO as read for this user
            try {
                const pendingNotifs = await prisma.notification.findMany({
                    where: {
                        userId: session.user.id,
                        link: { contains: `/work-orders/${id}` },
                        read: false
                    }
                });

                if (pendingNotifs.length > 0) {
                    await prisma.notification.updateMany({
                        where: {
                            id: { in: pendingNotifs.map(n => n.id) }
                        },
                        data: { read: true }
                    });
                }
            } catch (e) {
                console.error("Failed to cleanup notification:", e);
            }

        } else {
            await prisma.workOrder.update({
                where: { id },
                data: {
                    status: 'IN_PROGRESS', // Send back to tech
                    // Add feedback to comments/chat? For now just status.
                }
            });
            await logAction('REVIEW_WO', id, 'Rejected and Sent Back');
        }

        revalidatePath('/work-orders');
        revalidatePath(`/work-orders/${id}`);
        revalidatePath('/maintenance/schedule'); // Update schedule list
        return { success: true, message: decision === 'APPROVE' ? 'Ordine validato e chiuso' : 'Ordine respinto al tecnico' };
    } catch (error) {
        console.error("Review Error:", error);
        return { success: false, message: 'Errore revisione' };
    }
}

export async function updateWorkOrderStatus(id: string, status: string) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };

    try {
        // Automatically promote REQUEST to FAULT if moving out of pending
        const wo = await prisma.workOrder.findUnique({ where: { id } });
        let typeUpdate = {};

        if (wo?.type === 'REQUEST' && status !== 'PENDING_APPROVAL' && status !== 'CANCELED') {
            typeUpdate = { type: 'FAULT' };
        }

        await prisma.workOrder.update({
            where: { id },
            data: {
                status,
                ...typeUpdate
            }
        });

        await logAction('UPDATE_WO_STATUS', id, `Status changed to ${status}`);

        revalidatePath('/maintenance');
        revalidatePath('/work-orders');
        revalidatePath('/requests');
        revalidatePath('/'); // Refresh Dashboard
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function deleteWorkOrder(id: string) {
    const session = await auth();
    if (!session?.user || (session.user as any).role === 'USER') return { success: false, message: "Non autorizzato" };
    try {
        await prisma.workOrder.delete({ where: { id } });
        await logAction('DELETE_WO', id, 'Deleted Work Order');
        revalidatePath('/work-orders');
        revalidatePath('/maintenance');
        revalidatePath('/'); // Refresh Dashboard
        return { success: true };
    } catch (error) {
        return { success: false, message: "Failed to delete work order" };
    }
}

export async function updateWorkOrderDetails(id: string, updates: any) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };

    try {
        const { dueDate, ...rest } = updates;
        const data: any = { ...rest };

        // Basic Zod check if full object was passed, but usually updates are partial.
        // For now, keep it flexible but safe via Auth.

        if (dueDate) {
            data.dueDate = new Date(dueDate);
        }

        const updated = await prisma.workOrder.update({
            where: { id },
            data
        });

        await logAction('UPDATE_WO_DETAILS', id, 'Updated details');

        revalidatePath('/work-orders');
        revalidatePath('/maintenance');
        revalidatePath(`/work-orders/${id}`);
        return { success: true, message: 'Ordine aggiornato', data: updated };
    } catch (error) {
        console.error("Update WO Error:", error);
        return { success: false, message: 'Errore aggiornamento' };
    }
}

// --- Time Tracking ---

export async function startWorkSession(workOrderId: string) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };

    try {
        // Close any running session for this user just in case
        await prisma.workOrderTimer.updateMany({
            where: { workOrderId, userId: session.user.id, endTime: null },
            data: { endTime: new Date() } // Should calc duration here too if we want precision, but usually we just close. 
            // Better to stop cleanly.
        });

        await prisma.workOrderTimer.create({
            data: {
                workOrderId,
                userId: session.user.id,
                startTime: new Date()
            }
        });

        await prisma.workOrder.update({
            where: { id: workOrderId },
            data: { status: 'IN_PROGRESS' }
        });

        revalidatePath(`/work-orders/${workOrderId}`);
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Errore avvio timer' };
    }
}

export async function pauseWorkSession(workOrderId: string, note?: string) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };

    try {
        const activeTimer = await prisma.workOrderTimer.findFirst({
            where: { workOrderId, userId: session.user.id, endTime: null }
        });

        if (activeTimer) {
            const end = new Date();
            const start = new Date(activeTimer.startTime);
            const durationArr = (end.getTime() - start.getTime()) / 1000 / 60 / 60; // Hours

            // Create Labor Log automatically
            const tech = await prisma.technician.findUnique({ where: { userId: session.user.id } });

            if (tech && durationArr > 0) {
                await prisma.laborLog.create({
                    data: {
                        workOrderId: workOrderId,
                        technicianId: tech.id,
                        technicianName: tech.name,
                        hours: parseFloat(durationArr.toFixed(2)),
                        date: end, // Use end date for the log
                        note: note
                    }
                });
            }

            await prisma.workOrderTimer.update({
                where: { id: activeTimer.id },
                data: {
                    endTime: end,
                    duration: Math.round((end.getTime() - start.getTime()) / 1000 / 60), // Minutes stored in timer
                    note
                }
            });
        }

        await prisma.workOrder.update({
            where: { id: workOrderId },
            data: { status: 'ON_HOLD' } // Pause implies Hold
        });

        revalidatePath(`/work-orders/${workOrderId}`);
        return { success: true };
    } catch (error) {
        console.error("Pause Error:", error);
        return { success: false, message: 'Errore pausa timer' };
    }
}

export async function stopWorkSession(workOrderId: string, note?: string) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };

    try {
        const activeTimer = await prisma.workOrderTimer.findFirst({
            where: { workOrderId, userId: session.user.id, endTime: null }
        });

        if (activeTimer) {
            const end = new Date();
            const start = new Date(activeTimer.startTime);
            const durationMinutes = (end.getTime() - start.getTime()) / 1000 / 60;
            const durationHours = durationMinutes / 60;

            // Create Labor Log
            const tech = await prisma.technician.findUnique({ where: { userId: session.user.id } });

            if (tech && durationMinutes > 1) { // Min 1 minute to log?
                await prisma.laborLog.create({
                    data: {
                        workOrderId: workOrderId,
                        technicianId: tech.id,
                        technicianName: tech.name,
                        hours: parseFloat(durationHours.toFixed(2)),
                        date: end,
                        note: note
                    }
                });
            }

            await prisma.workOrderTimer.update({
                where: { id: activeTimer.id },
                data: {
                    endTime: end,
                    duration: Math.round(durationMinutes),
                    note
                }
            });
        }

        // Ensure status reflects stoppage if needed? 
        // User asked for pure "Stop", maybe implies "Assigned" or "Open" again?
        // Or keep current status but just stop timer?
        // Let's set to ON_HOLD to be safe, as work stopped.
        await prisma.workOrder.update({
            where: { id: workOrderId },
            data: { status: 'ON_HOLD' }
        });

        revalidatePath(`/work-orders/${workOrderId}`);
        return { success: true };
    } catch (error) {
        console.error("Stop Error:", error);
        return { success: false, message: 'Errore stop timer' };
    }
}

export async function completeWorkOrder(workOrderId: string, note?: string) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };

    try {
        // 1. Verify Checklist
        const wo = await prisma.workOrder.findUnique({
            where: { id: workOrderId },
            include: { checklist: true }
        });

        if (!wo) return { success: false, message: 'Ordine non trovato' };

        const pendingItems = wo.checklist.filter(i => !i.completed);
        if (pendingItems.length > 0) {
            return { success: false, message: `Checklist incompleta: ${pendingItems.length} voci rimanenti.` };
        }

        // 2. Stop any active timer
        // Use user note if provided, else default
        const stopNote = note || "Ordine Completato";
        await stopWorkSession(workOrderId, stopNote);

        // 3. Update Status
        await prisma.workOrder.update({
            where: { id: workOrderId },
            data: { status: 'COMPLETED' }
        });

        // 4. Notify Requester
        if (wo.requesterId) {
            await prisma.notification.create({
                data: {
                    userId: wo.requesterId,
                    title: "Ordine Completato",
                    message: `Il lavoro #${wo.id} è stato completato. In attesa di validazione.`,
                    link: `/work-orders/${workOrderId}`
                }
            });
        }

        revalidatePath(`/work-orders/${workOrderId}`);
        revalidatePath(`/work-orders`);
        return { success: true, message: 'Ordine completato' };
    } catch (error) {
        return { success: false, message: 'Errore completamento' };
    }
}



export async function importWorkOrders(workOrders: any[]) {
    let count = 0;
    let errors: string[] = [];
    for (const wo of workOrders) {
        try {
            if (!wo.title || !wo.assetName) continue;
            const asset = await prisma.asset.findFirst({ where: { name: wo.assetName } });
            if (!asset) {
                errors.push(`Asset not found: ${wo.assetName} for WO: ${wo.title}`);
                continue;
            }
            const woData = {
                title: wo.title,
                description: wo.description || '',
                priority: wo.priority || 'MEDIUM',
                status: wo.status || 'OPEN',
                category: wo.category || 'Other',
                assetId: asset.id,
                dueDate: wo.dueDate ? new Date(wo.dueDate) : new Date(),
                assignedTo: wo.assignedTo || null
            };
            await prisma.workOrder.create({ data: woData });
            count++;
        } catch (e) {
            errors.push(`Failed to import WO: ${wo.title}`);
        }
    }
    revalidatePath('/work-orders');
    return { success: true, count, errors };
}

// --- Notifications ---

export async function getUserNotifications() {
    const session = await auth();
    if (!session?.user?.email) return [];
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return [];

    const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50 // Increased verify limit as we might filter some out
    });

    // Filter out notifications for Work Orders that are CLOSED or COMPLETED or CANCELED
    const filteredNotifications = [];

    // Collect WO IDs to check status in batch? Or check one by one?
    // Batch is better.
    const woIdsToCheck = new Set<string>();

    for (const n of notifications) {
        if (n.link && n.link.startsWith('/work-orders/')) {
            const parts = n.link.split('/');
            if (parts.length >= 3) {
                woIdsToCheck.add(parts[2]);
            }
        }
    }

    let closedWoIds = new Set<string>();

    if (woIdsToCheck.size > 0) {
        const closedWos = await prisma.workOrder.findMany({
            where: {
                id: { in: Array.from(woIdsToCheck) },
                status: { in: ['COMPLETED', 'CLOSED', 'CANCELED'] }
            },
            select: { id: true }
        });
        closedWoIds = new Set(closedWos.map(w => w.id));
    }

    for (const n of notifications) {
        if (n.link && n.link.startsWith('/work-orders/')) {
            const parts = n.link.split('/');
            const woId = parts[2];
            // If it's a WO notification, and the WO is closed, SKIP IT
            if (closedWoIds.has(woId)) {
                continue;
            }
        }
        filteredNotifications.push(n);
    }

    return filteredNotifications.slice(0, 20); // Return top 20 valid ones
}

export async function markNotificationAsRead(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    await prisma.notification.update({ where: { id }, data: { read: true } });
    return { success: true };
}

// --- Energy ---

// --- AI Suggestions ---

export async function generateDailySuggestions() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Check if we already generated suggestions today (limit spam)
        const existing = await prisma.workOrder.count({
            where: {
                category: 'AI_SUGGESTION',
                createdAt: { gte: today }
            }
        });

        if (existing >= 5) {
            return { success: false, message: "Ho già fornito i consigli per oggi! Torna domani. o elimina quelli attuali." };
        }

        let suggestionsCreated = 0;
        const limit = 5 - existing;

        // 2. Check Low Stock Inventory
        if (suggestionsCreated < limit) {
            const lowStock = await prisma.sparePart.findMany({
                where: {
                    quantity: { lte: prisma.sparePart.fields.minQuantity }
                },
                take: limit - suggestionsCreated
            });

            for (const part of lowStock) {
                // Check if active request already exists for this
                const pending = await prisma.workOrder.findFirst({
                    where: {
                        title: { contains: part.name },
                        status: { in: ['OPEN', 'PENDING_APPROVAL'] }
                    }
                });

                if (!pending) {
                    // Pick a random asset just to satisfy relation (or create a 'General' asset dummy if needed, but for now we pick the first one or fail)
                    // Better: Use a specific Asset if possible, or undefined. 
                    // Wait, Schema requires Asset relation? Yes. assetId is non-nullable.
                    // We need a 'General' asset or just pick the first one. Let's find a 'General' asset or create one.
                    let generalAsset = await prisma.asset.findFirst({ where: { name: 'General Facility' } });
                    if (!generalAsset) {
                        generalAsset = await prisma.asset.findFirst({}); // Fallback to any
                    }

                    if (generalAsset) {
                        await prisma.workOrder.create({
                            data: {
                                title: `Riordino Urgente: ${part.name}`,
                                description: `Scorta bassa (${part.quantity}). Minimo richiesto: ${part.minQuantity}. Consigliato ordine immediato.`,
                                priority: 'medium',
                                category: 'AI_SUGGESTION',
                                type: 'REQUEST',
                                status: 'PENDING_APPROVAL',
                                assetId: generalAsset.id,
                                requesterId: null, // System
                            }
                        });
                        suggestionsCreated++;
                    }
                }
            }
        }

        // 3. Check Low Health Assets
        if (suggestionsCreated < limit) {
            const sickAssets = await prisma.asset.findMany({
                where: { healthScore: { lt: 70 } },
                take: limit - suggestionsCreated
            });

            for (const asset of sickAssets) {
                const pending = await prisma.workOrder.findFirst({
                    where: { assetId: asset.id, status: { in: ['OPEN', 'PENDING_APPROVAL'] } }
                });

                if (!pending) {
                    await prisma.workOrder.create({
                        data: {
                            title: `Controllo Salute: ${asset.name}`,
                            description: `L'indice di salute è sceso a ${asset.healthScore}%. Ispezione consigliata.`,
                            priority: 'low',
                            category: 'AI_SUGGESTION',
                            type: 'REQUEST',
                            status: 'PENDING_APPROVAL',
                            assetId: asset.id
                        }
                    });
                    suggestionsCreated++;
                }
            }
        }

        revalidatePath('/work-orders');
        revalidatePath('/requests');

        if (suggestionsCreated === 0) {
            return { success: true, message: "Tutto tranquillo! Nessun nuovo suggerimento necessario oggi." };
        }

        return { success: true, message: `Ho generato ${suggestionsCreated} nuovi suggerimenti basati sui dati attuali.` };

    } catch (error) {
        console.error("AI Gen Error:", error);
        return { success: false, message: "Errore nella generazione consigli." };
    }
}


export async function getMeters() {
    return await prisma.meter.findMany({ orderBy: { name: 'asc' } });
}

export async function createMeter(data: any) {
    await prisma.meter.create({
        data: {
            name: data.name,
            type: data.type,
            unit: data.unit,
            serialNumber: data.serialNumber,
            location: data.location,
            installationDate: data.installationDate ? new Date(data.installationDate) : undefined
        }
    });
    revalidatePath('/energy');
    revalidatePath('/energy/meters');
}

export async function deleteMeter(id: string) {
    await prisma.meter.delete({ where: { id } });
    revalidatePath('/energy');
    revalidatePath('/energy/meters');
}

export async function getMeterReadings(meterId: string) {
    const readings = await prisma.meterReading.findMany({
        where: { meterId },
        orderBy: { date: 'desc' },
        take: 50
    });
    return readings.map((r: any) => ({
        ...r,
        date: r.date.toISOString().split('T')[0]
    }));
}

export async function getEnergyStats() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of prev month

    const startOfTrend = new Date();
    startOfTrend.setDate(startOfTrend.getDate() - 30);

    // Fetch all meters
    const meters = await prisma.meter.findMany();

    // Fetch readings for all meters, enough history to calculate deltas
    const readings = await prisma.meterReading.findMany({
        where: {
            date: { gte: new Date(new Date().setDate(new Date().getDate() - 60)) }
        },
        include: {
            meter: true
        },
        orderBy: { date: 'asc' }
    });

    const totals = {
        currentMonth: { ELEC: 0, WATER: 0, GAS: 0 },
        lastMonth: { ELEC: 0, WATER: 0, GAS: 0 }
    };

    const dailyTrends = new Map<string, { date: string, elec: number, water: number, gas: number }>();
    // meterDailyTrends: Map<meterId, Map<dateString, consumption>>
    const meterDailyTrends = new Map<string, Map<string, number>>();

    // Initialize daily trends for last 30 days
    for (let d = 0; d <= 30; d++) {
        const date = new Date(startOfTrend);
        date.setDate(date.getDate() + d);
        const key = date.toISOString().split('T')[0];
        dailyTrends.set(key, { date: key, elec: 0, water: 0, gas: 0 });
    }

    // Initialize meter daily map
    meters.forEach(m => meterDailyTrends.set(m.id, new Map()));

    // Process each meter individually to calculate deltas
    for (const meter of meters) {
        const meterReadings = readings.filter(r => r.meterId === meter.id).sort((a, b) => a.date.getTime() - b.date.getTime());

        for (let i = 1; i < meterReadings.length; i++) {
            const current = meterReadings[i];
            const prev = meterReadings[i - 1];

            // Calculate consumption (Delta)
            let consumption = current.value - prev.value;
            if (consumption < 0) consumption = 0; // Handle resets

            // Distribute consumption across the days between previous reading and current reading
            const diffTime = Math.abs(current.date.getTime() - prev.date.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const validDays = diffDays > 0 ? diffDays : 1;
            const dailyConsumption = consumption / validDays;

            // Loop through each day covered by this reading
            for (let d = 0; d < validDays; d++) {
                const targetDate = new Date(prev.date);
                targetDate.setDate(targetDate.getDate() + d + 1); // Start from day after previous reading

                if (targetDate > current.date) break;

                const targetDateKey = targetDate.toISOString().split('T')[0];

                // 1. Add to Monthly Totals
                if (targetDate >= currentMonthStart && targetDate <= now) {
                    if (totals.currentMonth[meter.type as keyof typeof totals.currentMonth] !== undefined) {
                        totals.currentMonth[meter.type as keyof typeof totals.currentMonth] += dailyConsumption;
                    }
                } else if (targetDate >= lastMonthStart && targetDate <= lastMonthEnd) {
                    if (totals.lastMonth[meter.type as keyof typeof totals.lastMonth] !== undefined) {
                        totals.lastMonth[meter.type as keyof typeof totals.lastMonth] += dailyConsumption;
                    }
                }

                // 2. Add to Meter Specific Daily Trend (for detailed chart)
                // We track this for the trend window (startOfTrend to now)
                // But generally we might want it for the whole fetched period? 
                // Let's stick to trend window for charts to keep it clean.
                if (targetDate >= startOfTrend) {
                    const mTrend = meterDailyTrends.get(meter.id);
                    if (mTrend) {
                        const existing = mTrend.get(targetDateKey) || 0;
                        mTrend.set(targetDateKey, existing + dailyConsumption);
                    }
                }

                // 3. Add to Aggregate Trends
                const entry = dailyTrends.get(targetDateKey);
                if (entry) {
                    if (meter.type === 'ELEC') entry.elec += dailyConsumption;
                    if (meter.type === 'WATER') entry.water += dailyConsumption;
                    if (meter.type === 'GAS') entry.gas += dailyConsumption;
                }
            }
        }
    }

    const trends = Array.from(dailyTrends.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Convert meterDailyTrends to friendly format: Record<meterId, Array<{date, consumption}>>
    const meterHistory: Record<string, Array<{ date: string, consumption: number }>> = {};

    // We want the same date range for all meters in the chart to alignment
    const trendDates = trends.map(t => t.date);

    meters.forEach(m => {
        const mTrendMap = meterDailyTrends.get(m.id);
        meterHistory[m.id] = trendDates.map(date => ({
            date,
            consumption: mTrendMap?.get(date) || 0
        }));
    });

    return {
        currentMonth: totals.currentMonth,
        lastMonth: totals.lastMonth,
        trends,
        meterHistory,
        meters
    };
}

export async function addMeterReading(data: { meterId: string, value: number, date: string }) {
    const meter = await prisma.meter.findUnique({ where: { id: data.meterId } });
    if (!meter) throw new Error("Meter not found");

    const lastReadings = await prisma.meterReading.findMany({
        where: { meterId: data.meterId },
        orderBy: { date: 'desc' },
        take: 5
    });

    let isAnomaly = false;
    let aiAnalysis: string | null = null;

    if (lastReadings.length > 0) {
        const lastReading = lastReadings[0];
        const consumption = data.value - lastReading.value;

        if (consumption < 0) {
            isAnomaly = true;
            aiAnalysis = "Rilevato valore inferiore alla lettura precedente. Possibile errore di inserimento o sostituzione contatore.";
        } else if (lastReadings.length >= 3) {
            let totalCons = 0;
            let count = 0;
            for (let i = 0; i < lastReadings.length - 1; i++) {
                const diff = lastReadings[i].value - lastReadings[i + 1].value;
                if (diff > 0) {
                    totalCons += diff;
                    count++;
                }
            }

            if (count > 0) {
                const avgCons = totalCons / count;
                const threshold = avgCons * 0.5;

                if (consumption > avgCons + threshold) {
                    isAnomaly = true;
                    // Fixed string interpretation
                    aiAnalysis = `Consumo rilevato (${consumption.toFixed(2)}) superiore del ${(100 * (consumption - avgCons) / avgCons).toFixed(0)}% rispetto alla media recente (${avgCons.toFixed(2)}).`;
                }
            }
        }
    }

    await prisma.meterReading.create({
        data: {
            meterId: data.meterId,
            value: data.value,
            date: new Date(data.date),
            isAnomaly,
            aiAnalysis
        }
    });

    revalidatePath('/energy');
    return { success: true, isAnomaly, aiAnalysis };
}

export async function getAllMeterReadings() {
    const readings = await prisma.meterReading.findMany({
        include: { meter: true },
        orderBy: { date: 'desc' }
    });

    return readings.map((r: any) => ({
        ...r,
        meterName: r.meter.name,
        meterType: r.meter.type,
        meterSerial: r.meter.serialNumber || 'N/A',
        meterLocation: r.meter.location || 'N/A',
        unit: r.meter.unit,
        date: r.date.toISOString().split('T')[0]
    }));
}

export async function addWorkOrderPart(workOrderId: string, partId: string, quantity: number) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };

    try {
        const part = await prisma.sparePart.findUnique({ where: { id: partId } });
        if (!part) return { success: false, message: 'Ricambio non trovato' };

        if (part.quantity < quantity) {
            return { success: false, message: `Quantità insufficiente in magazzino (Disponibile: ${part.quantity})` };
        }

        // Decrement stock
        const updatedPart = await prisma.sparePart.update({
            where: { id: partId },
            data: { quantity: part.quantity - quantity, lastUpdated: new Date() }
        });

        // Add to WO
        await prisma.workOrderPart.create({
            data: {
                workOrderId,
                partId,
                partName: part.name,
                quantity,
                unitCost: part.unitCost || 0,
                dateAdded: new Date()
            }
        });

        // Low Stock Alert
        if (updatedPart.quantity <= updatedPart.minQuantity) {
            const supervisors = await prisma.user.findMany({ where: { role: 'SUPERVISOR' } });
            for (const sup of supervisors) {
                await prisma.notification.create({
                    data: {
                        userId: sup.id,
                        title: "⚠️ SCORTA BASSA: " + part.name,
                        message: `Il ricambio ${part.name} ha raggiunto la soglia minima (${updatedPart.quantity} pz). Valutare riordino.`,
                        link: "/inventory"
                    }
                });
            }
        }

        revalidatePath(`/work-orders/${workOrderId}`);

        // Audit
        await logAction('ADD_PART_WO', workOrderId, `Aggiunto ${quantity}x ${part.name}`);

        return { success: true, message: 'Ricambio aggiunto all\'ordine' };
    } catch (error) {
        console.error(error);
        return { success: false, message: 'Errore durante l\'aggiunta del ricambio' };
    }
}

export async function removeWorkOrderPart(id: string) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };

    try {
        const woPart = await prisma.workOrderPart.findUnique({ where: { id } });
        if (!woPart) return { success: false, message: 'Parte non trovata' };

        // Restore stock
        const originalPart = await prisma.sparePart.findFirst({ where: { id: woPart.partId } });

        if (originalPart) {
            await prisma.sparePart.update({
                where: { id: originalPart.id },
                data: { quantity: originalPart.quantity + woPart.quantity, lastUpdated: new Date() }
            });
        }

        await prisma.workOrderPart.delete({ where: { id } });

        revalidatePath(`/work-orders/${woPart.workOrderId}`);
        return { success: true, message: 'Ricambio rimosso e giacenza ripristinata' };
    } catch (error) {
        return { success: false, message: 'Errore rimozione ricambio' };
    }
}

export async function toggleChecklistItem(itemId: string, completed: boolean) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };

    try {
        await prisma.checklistItem.update({
            where: { id: itemId },
            data: {
                completed,
                checkedBy: session.user.name,
                checkedAt: new Date()
            }
        });

        // Find WO to revalidate
        const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
        if (item) revalidatePath(`/work-orders/${item.workOrderId}`);

        return { success: true, message: 'Checklist aggiornata' };
    } catch (e) {
        return { success: false, message: 'Errore aggiornamento checklist' };
    }
}

// --- System Settings ---

export async function getSystemSettings() {
    try {
        let settings = await prisma.systemSettings.findUnique({ where: { id: "settings" } });
        if (!settings) {
            settings = await prisma.systemSettings.create({
                data: {
                    id: "settings",
                    ewoThresholdHours: 0
                }
            });
        }
        return settings;
    } catch (error) {
        return null;
    }
}

export async function updateSystemSettings(ewoThresholdHours: number) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };

    try {
        await prisma.systemSettings.upsert({
            where: { id: "settings" },
            update: { ewoThresholdHours },
            create: {
                id: "settings",
                ewoThresholdHours
            }
        });
        revalidatePath('/settings');
        return { success: true, message: 'Impostazioni aggiornate' };
    } catch (error) {
        return { success: false, message: 'Errore salvataggio impostazioni' };
    }
}

// --- EWO Actions ---

export async function confirmEWO(workOrderId: string) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };
    try {
        await prisma.workOrder.update({
            where: { id: workOrderId },
            data: { ewoFilled: true }
        });
        revalidatePath(`/work-orders/${workOrderId}`);
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Errore conferma EWO' };
    }
}

export async function submitEWO(data: any) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };

    try {
        const { workOrderId, partsConsumed, ...fields } = data;

        // 1. Save EWO
        await prisma.eWO.upsert({
            where: { workOrderId },
            update: { ...fields, authorName: session.user.name || 'User' },
            create: { ...fields, workOrderId, authorName: session.user.name || 'User' }
        });

        // 1b. Handle Spare Parts if provided
        if (partsConsumed && Array.isArray(partsConsumed)) {
            for (const p of partsConsumed) {
                if (p.partId && p.quantity > 0) {
                    // Reuse logic for adding parts (no re-auth needed strictly since we checked above, 
                    // but helps to just copy logic or call function if exported. 
                    // Since addWorkOrderPart checks auth again, it's fine to call it or copy logic.
                    // Copying logic for atomicity warnings if I strictly need transaction, 
                    // but here generic try/catch catches it.
                    // Note: We won't block EWO on part failure but we should log it.
                    try {
                        const part = await prisma.sparePart.findUnique({ where: { id: p.partId } });
                        if (part && part.quantity >= p.quantity) {
                            await prisma.sparePart.update({
                                where: { id: p.partId },
                                data: { quantity: part.quantity - p.quantity, lastUpdated: new Date() }
                            });
                            await prisma.workOrderPart.create({
                                data: {
                                    workOrderId,
                                    partId: p.partId,
                                    partName: part.name,
                                    quantity: p.quantity,
                                    unitCost: part.unitCost || 0,
                                    dateAdded: new Date()
                                }
                            });
                        }
                    } catch (err) {
                        console.error("Part consumption error in EWO:", err);
                    }
                }
            }
        }

        // 2. Update WO flag
        await prisma.workOrder.update({
            where: { id: workOrderId },
            data: { ewoFilled: true }
        });

        // Notification for Critical Impact
        if (fields.productionImpact === 'STOPPAGE') {
            const supervisors = await prisma.user.findMany({ where: { role: 'SUPERVISOR' } });
            for (const sup of supervisors) {
                await prisma.notification.create({
                    data: {
                        userId: sup.id,
                        title: "ALLARME FERMO PRODUZIONE",
                        message: `EWO segnala FERMO IMPIANTO per ordine #${workOrderId}.`,
                        link: `/work-orders/${workOrderId}`
                    }
                });
            }
        }

        // Stock Alert Logic
        if (partsConsumed && Array.isArray(partsConsumed)) {
            for (const p of partsConsumed) {
                const part = await prisma.sparePart.findUnique({ where: { id: p.partId } });
                // Fix: minQuantity is likely 'minQuantity' based on typical schema, but check if user used 'minimumStock'.
                // Based on error "Property 'minimumStock' does not exist... minQuantity: number...", the correct field is minQuantity.
                if (part && part.quantity <= part.minQuantity) {
                    // Notify Supervisors about low stock
                    const supervisors = await prisma.user.findMany({ where: { role: 'SUPERVISOR' } });
                    for (const sup of supervisors) {
                        await prisma.notification.create({
                            data: {
                                userId: sup.id,
                                title: "⚠️ SCORTA BASSA: " + part.name,
                                message: `Il ricambio ${part.name} è sceso sotto la soglia minima (${part.quantity} pz disponibili). Riordinare!`,
                                link: `/inventory`
                            }
                        });
                    }
                }
            }
        }

        // 3. Create Follow Up if needed
        if (fields.needsFollowUp && fields.followUpDetail) {
            const originalWO = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
            if (originalWO) {
                await prisma.workOrder.create({
                    data: {
                        title: `Follow-Up EWO: ${originalWO.title.substring(0, 30)}...`,
                        description: `[ORIGINE EWO #${workOrderId}]\n\nRichiesta: ${fields.followUpDetail}\n\nAnalisi Causa: ${fields.causeAnalysis}`,
                        priority: 'MEDIUM',
                        status: 'PENDING_APPROVAL',
                        type: 'REQUEST',
                        category: 'OTHER',
                        assetId: originalWO.assetId,
                        requesterId: session.user.id
                    }
                });
            }
        }

        revalidatePath(`/work-orders/${workOrderId}`);
        revalidatePath('/requests');
        return { success: true, message: 'EWO registrato e archiviato.' };
    } catch (e) {
        console.error("EWO Submit Error:", e);
        return { success: false, message: 'Errore salvataggio EWO' };
    }
}

export async function getAdvancedKPIs() {
    const session = await auth();
    if (!session?.user) return null;

    try {
        const ewos = await prisma.eWO.findMany({
            include: { workOrder: { include: { asset: true } } }
        });

        // Cast to any to avoid TS errors if types are not regenerated yet
        const typedEwos = ewos as any[];

        // 1. Calculate MTTR (Mean Time To Repair)
        // Average of totalDowntimeMin
        const downtimeEWOs = typedEwos.filter(e => e.totalDowntimeMin && e.totalDowntimeMin > 0);
        const totalDowntime = downtimeEWOs.reduce((acc, e) => acc + (e.totalDowntimeMin || 0), 0);
        const mttr = downtimeEWOs.length > 0 ? Math.round(totalDowntime / downtimeEWOs.length) : 0;

        // 2. Top 5 Worst Assets (by Downtime)
        const assetDowntime = new Map<string, { name: string, minutes: number, count: number }>();

        typedEwos.forEach(ewo => {
            if (!ewo.workOrder?.asset) return;
            const assetName = ewo.workOrder.asset.name;
            const current = assetDowntime.get(assetName) || { name: assetName, minutes: 0, count: 0 };

            current.minutes += ewo.totalDowntimeMin || 0;
            current.count += 1;
            assetDowntime.set(assetName, current);
        });

        const topAssets = Array.from(assetDowntime.values())
            .sort((a, b) => b.minutes - a.minutes)
            .slice(0, 5);

        // 3. Estimated Cost (Simulated 100€/min downtime + Part costs could be added later)
        const estimatedCost = totalDowntime * 100;

        return {
            mttr,
            totalDowntime,
            topAssets,
            estimatedCost,
            totalEWOs: ewos.length
        };
    } catch (e) {
        console.error("KPI Error:", e);
        return null;
    }
}

const getAssetMaintenanceEventsCached = async (start: Date, end: Date) => {
    return unstable_cache(
        async (s: Date, e: Date) => {
            try {
                // 1. Fetch Work Orders in Range
                const workOrders = await prisma.workOrder.findMany({
                    where: {
                        status: { not: 'CANCELED' },
                        OR: [
                            { dueDate: { gte: s, lte: e } },
                            // Fallback for created in range check if needed, but primarily dueDate for calendar
                            {
                                dueDate: null,
                                createdAt: { gte: s, lte: e }
                            }
                        ]
                    },
                    include: {
                        asset: {
                            select: { name: true, line: true }
                        }
                    },
                    orderBy: { dueDate: 'asc' }
                });

                const woEvents = workOrders.map(wo => ({
                    id: wo.id,
                    ids: wo.id, // Legacy compatibility
                    assetId: wo.assetId,
                    assetName: wo.asset?.name || 'Unknown Asset',
                    // @ts-ignore
                    line: wo.asset?.line || 'Nessuna Linea',
                    title: wo.title,
                    start: (wo.dueDate || wo.createdAt).toISOString(),
                    end: new Date((wo.dueDate || wo.createdAt).getTime() + (120 * 60000)).toISOString(),
                    status: wo.status,
                    category: wo.category,
                    assignee: wo.assignedTo || 'Non assegnato',
                    assignedTechnicianId: wo.assignedTechnicianId,
                    assignedToId: wo.assignedTo, // Fallback for legacy
                    type: 'WO'
                }));

                // 2. Fetch Preventive Schedules in Range
                const schedules = await prisma.preventiveSchedule.findMany({
                    where: {
                        nextDueDate: { gte: s, lte: e }
                    },
                    include: {
                        asset: {
                            select: { name: true, line: true }
                        }
                    }
                });

                const scheduleEvents = schedules.map(sch => ({
                    id: sch.id,
                    ids: sch.id,
                    assetId: sch.assetId,
                    assetName: sch.asset?.name || 'Unknown Asset',
                    line: sch.asset?.line || 'Nessuna Linea',
                    title: `[Pianificata] ${sch.taskTitle}`,
                    start: sch.nextDueDate.toISOString(),
                    end: new Date(sch.nextDueDate.getTime() + (60 * 60000)).toISOString(), // 1 hour default
                    status: 'SCHEDULED',
                    category: 'PREVENTIVE',
                    assignee: 'Sistema',
                    type: 'PM'
                }));

                // Merge
                return [...woEvents, ...scheduleEvents];

            } catch (error) {
                console.error("Calendar Events Error:", error);
                return [];
            }
        },
        ['calendar-events-date-range', start.toISOString(), end.toISOString()], // Cache key dependent on dates
        { revalidate: 60, tags: ['work-orders', 'calendar', 'schedules'] }
    )(start, end);
};

export async function getAssetMaintenanceEvents(start?: Date, end?: Date) {
    const session = await auth();
    if (!session?.user) return [];

    // Default to surrounding window if not provided (e.g. +/- 30 days) to be safe or just this week
    const s = start || new Date(new Date().setDate(new Date().getDate() - 30));
    const e = end || new Date(new Date().setDate(new Date().getDate() + 30));

    return getAssetMaintenanceEventsCached(s, e);
}

export async function getEWO(workOrderId: string) {
    try {
        return await prisma.eWO.findUnique({ where: { workOrderId } });
    } catch (e) {
    }
}

// Aliases for context compatibility
export const updateQuantity = updateSparePartQuantity;
export const removePart = deleteSparePart;

// --- Production Lines (Shift Patterns) ---

export async function updateProductionLine(data: {
    line: string;
    prodStartDay: number;
    prodStartTime: string;
    prodEndDay: number;
    prodEndTime: string;
    maintStart: string;
    maintEnd: string;
    maintStartDay: number;
    maintEndDay: number;
    maintSatStart?: string;
    maintSatEnd?: string;
    maintSunStart?: string;
    maintSunEnd?: string;
}) {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERVISOR')) {
        return { success: false, message: 'Non autorizzato' };
    }

    try {
        const line = await prisma.productionLine.upsert({
            where: { line: data.line },
            update: {
                prodStartDay: data.prodStartDay,
                prodStartTime: data.prodStartTime,
                prodEndDay: data.prodEndDay,
                prodEndTime: data.prodEndTime,
                maintStart: data.maintStart,
                maintEnd: data.maintEnd,
                maintStartDay: data.maintStartDay,
                maintEndDay: data.maintEndDay,
                maintSatStart: data.maintSatStart,
                maintSatEnd: data.maintSatEnd,
                maintSunStart: data.maintSunStart,
                maintSunEnd: data.maintSunEnd,
                updatedAt: new Date()
            },
            create: {
                line: data.line,
                prodStartDay: data.prodStartDay,
                prodStartTime: data.prodStartTime,
                prodEndDay: data.prodEndDay,
                prodEndTime: data.prodEndTime,
                maintStart: data.maintStart,
                maintEnd: data.maintEnd,
                maintStartDay: data.maintStartDay,
                maintEndDay: data.maintEndDay,
                maintSatStart: data.maintSatStart,
                maintSatEnd: data.maintSatEnd,
                maintSunStart: data.maintSunStart,
                maintSunEnd: data.maintSunEnd
            }
        });
        revalidatePath('/planning/calendar');
        revalidatePath('/'); // Refresh Dashboard (production status)
        return { success: true, data: line };
    } catch (error) {
        console.error("Update Line Error:", error);
        return { success: false, message: 'Errore aggiornamento linea' };
    }
}

import { calculateLineReliability } from "./kpi-service";
import { subDays } from "date-fns";

export async function getLineStats(line: string) {
    const session = await auth();
    if (!session?.user) return null;

    const endDate = new Date();
    const startDate = subDays(endDate, 30); // Last 30 days default

    try {
        const stats = await calculateLineReliability(line, startDate, endDate);
        return { success: true, data: stats };
    } catch (error) {
        console.error("KPI Error:", error);
        return { success: false, message: "Errore calcolo KPI" };
    }
}

export async function getProductionLines() {
    try {
        // 1. Get Configured Lines
        const configuredLines = await prisma.productionLine.findMany();

        // 2. Get All Lines from Assets
        const assetLinesRaw = await prisma.asset.findMany({
            where: { line: { not: null } },
            select: { line: true },
            distinct: ['line']
        });
        const assetLineNames = assetLinesRaw.map(a => a.line).filter(Boolean) as string[];

        // 3. Merge
        const merged = [...configuredLines];
        for (const name of assetLineNames) {
            if (!merged.find(l => l.line === name)) {
                // Return default/placeholder for unconfigured lines found in assets
                merged.push({
                    line: name,
                    prodStartDay: 1,
                    prodStartTime: "06:00",
                    prodEndDay: 5,
                    prodEndTime: "22:00",
                    maintStart: "08:00",
                    maintEnd: "17:00",
                    maintStartDay: 1, // Mon
                    maintEndDay: 5,   // Fri
                    maintSatStart: null,
                    maintSatEnd: null,
                    maintSunStart: null,
                    maintSunEnd: null,
                    updatedAt: new Date()
                });
            }
        }


        return merged.sort((a, b) => a.line.localeCompare(b.line));
    } catch (error) {
        console.error("Get Lines Error:", error);
        return [];
    }
}

export async function deleteProductionLine(line: string) {
    const session = await auth();
    if (!session?.user || (session.user as any).role === 'USER') {
        return { success: false, message: 'Non autorizzato' };
    }

    try {
        await prisma.productionLine.delete({
            where: { line }
        });

        revalidatePath('/planning/calendar');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Delete Line Error:", error);
        return { success: false, message: 'Errore eliminazione linea' };
    }
}

export async function assignWorkOrderToSelf(workOrderId: string) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autenticato' };

    try {
        // 1. Check if user is a technician
        const tech = await prisma.technician.findUnique({
            where: { userId: session.user.id }
        });

        if (!tech) {
            return { success: false, message: 'Profilo tecnico non trovato.' };
        }

        // 2. Check Work Order status
        const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
        if (!wo) return { success: false, message: 'Ordine non trovato' };

        if (wo.assignedTechnicianId && wo.assignedTechnicianId !== tech.id) {
            return { success: false, message: 'Ordine già assegnato.' };
        }

        // 3. Update WO
        await prisma.workOrder.update({
            where: { id: workOrderId },
            data: {
                assignedTechnicianId: tech.id,
                assignedTo: tech.name,
                status: 'ASSIGNED'
            }
        });

        revalidatePath('/work-orders');
        revalidatePath('/');
        return { success: true, message: 'Ordine preso in carico' };
    } catch (error) {
        console.error("Self Assign Error:", error);
        return { success: false, message: 'Errore durante la presa in carico' };
    }
}



export async function createProductionSlot(data: any) {
    // Placeholder implementation for missing function
    console.log("createProductionSlot", data);
    return { success: true, message: "Slot creato (Simulazione)" };
}

export async function getKPISummary() {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 1. Calculate Asset Health Score (Avg)
        const assets = await prisma.asset.findMany({ select: { healthScore: true } });
        const avgHealth = assets.length > 0
            ? assets.reduce((acc, a) => acc + (a.healthScore || 0), 0) / assets.length
            : 0;

        // 2. Risk Assets Count (Health <= 40)
        const riskAssets = await prisma.asset.count({
            where: { healthScore: { lte: 40 } }
        });

        // 3. Real Maintenance Costs (Current Month)
        // Part Costs
        const parts = await prisma.workOrderPart.findMany({
            where: { dateAdded: { gte: startOfMonth } }
        });
        const totalPartsCost = parts.reduce((acc, p) => acc + (p.unitCost * p.quantity), 0);

        // Labor Costs
        const labor = await prisma.laborLog.findMany({
            where: { date: { gte: startOfMonth } }
        });

        // Efficiency: Fetch unique technician rates
        const technicianIds = Array.from(new Set(labor.map(l => l.technicianId)));
        let techRateMap = new Map<string, number>();

        if (technicianIds.length > 0) {
            const technicians = await prisma.technician.findMany({
                where: { id: { in: technicianIds } }
            });
            techRateMap = new Map(technicians.map(t => [t.id, t.hourlyRate]));
        }

        const totalLaborCost = labor.reduce((acc, l) => {
            const rate = techRateMap.get(l.technicianId) || 0;
            return acc + (l.hours * rate);
        }, 0);

        const totalCost = totalPartsCost + totalLaborCost;

        // 4. MTTR (Mean Time To Repair) - Last 90 Days
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        // Use WorkOrderTimer to calculate actual repair time recorded
        const workOrderTimers = await prisma.workOrderTimer.findMany({
            where: {
                endTime: { not: null },
                workOrder: {
                    type: 'FAULT'
                },
                startTime: { gte: ninetyDaysAgo }
            }
        });

        let totalRepairTimeMinutes = 0;
        let count = 0;

        for (const timer of workOrderTimers) {
            if (timer.duration) {
                totalRepairTimeMinutes += timer.duration;
                count++;
            }
        }

        const mttrHours = count > 0 ? (totalRepairTimeMinutes / count / 60) : 0;

        return {
            avgHealth,
            riskAssets,
            totalCost,
            mttrHours
        };

    } catch (e) {
        console.error("KPI Error:", e);
        return {
            avgHealth: 0,
            riskAssets: 0,
            totalCost: 0,
            mttrHours: 0
        };
    }
}

