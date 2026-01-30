'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { WorkOrderStatus } from '@/lib/types';

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
        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                image: '',
                mustChangePassword: true
            }
        });
        revalidatePath('/users');
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

export async function getDashboardStats() {
    const totalAssets = await prisma.asset.count();
    const openWorkOrders = await prisma.workOrder.count({ where: { status: 'OPEN' } });
    const completedWorkOrders = await prisma.workOrder.count({ where: { status: 'COMPLETED' } });
    const lowHealthAssets = await prisma.asset.count({ where: { healthScore: { lt: 70 } } });

    return { totalAssets, openWorkOrders, completedWorkOrders, lowHealthAssets };
}

// --- Assets ---

export async function getAssets() {
    const assets = await prisma.asset.findMany({ orderBy: { name: 'asc' } });
    // Keep raw dates or map them? Dashboard layout logic implies raw mapping might be handled there?
    // original lib/actions mapped them. Let's keep strict mapping if original used it, 
    // BUT my `work-order-context` might expect raw.
    // assets-context expects Asset[] which usually has string for dates. 
    // Let's safe map.
    return assets.map((asset: any) => ({
        ...asset,
        purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : '',
        lastMaintenance: asset.lastMaintenance ? asset.lastMaintenance.toISOString().split('T')[0] : null,
    }));
}



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

export async function addAsset(data: any) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };

    try {
        const assetData = {
            name: data.name,
            model: data.model,
            serialNumber: data.serialNumber || `SN-${Date.now()}`,
            location: data.location,
            status: data.status || 'OPERATIONAL',
            healthScore: data.healthScore || 100,
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
            department: data.department,
            plant: data.plant,
            line: data.line,
            vendor: data.vendor,
        };
        const newAsset = await prisma.asset.create({ data: assetData });
        revalidatePath('/assets');
        return { success: true, message: 'Asset creato con successo', data: newAsset };
    } catch (error) {
        return { success: false, message: 'Errore creazione asset' };
    }
}

export async function updateAsset(id: string, data: any) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };

    try {
        // Map any string dates coming from client back to Date objects if necessary
        // Prisma expects Date objects for DateTime fields
        const updateData = { ...data };
        if (updateData.purchaseDate) updateData.purchaseDate = new Date(updateData.purchaseDate);
        if (updateData.lastMaintenance) updateData.lastMaintenance = new Date(updateData.lastMaintenance);

        const updatedAsset = await prisma.asset.update({
            where: { id },
            data: updateData
        });
        revalidatePath('/assets');
        revalidatePath(`/assets/${id}`);
        // ... existing updateAsset ...
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
        revalidatePath('/assets');
        return { success: true, message: 'Asset eliminato con successo' };
    } catch (error) {
        return { success: false, message: 'Errore durante l\'eliminazione' };
    }
}

// --- Preventive Schedules ---

export async function getPreventiveSchedules() {
    const session = await auth();
    if (!session?.user) return [];
    try {
        const schedules = await prisma.preventiveSchedule.findMany({
            include: { asset: { select: { name: true } } },
            orderBy: { nextDueDate: 'asc' }
        });
        return schedules.map(s => ({
            ...s,
            assetName: s.asset.name,
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
            include: { asset: { select: { name: true } } },
            orderBy: { nextDueDate: 'asc' }
        });
        return schedules.map(s => ({
            ...s,
            assetName: s.asset.name,
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
                nextDueDate: new Date(data.firstDate),
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
    try { return await prisma.technician.findMany(); } catch (error) { return []; }
}

export async function addTechnician(data: { name: string; specialty: string; hourlyRate: number }) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') return { success: false, message: 'Non autorizzato' };
    try {
        const newTech = await prisma.technician.create({ data });
        revalidatePath('/settings');
        return { success: true, message: 'Tecnico aggiunto', data: newTech };
    } catch (error) {
        return { success: false, message: 'Errore aggiunta tecnico' };
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

export async function sendChatMessage(data: { sender: string; role: string; content: string; isSystem?: boolean }) {
    try {
        const msg = await prisma.chatMessage.create({
            data: {
                sender: data.sender,
                role: data.role,
                content: data.content,
                isSystem: data.isSystem || false,
                isRead: false
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
            include: { asset: true, timers: true }
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
            })) || []
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

export async function createWorkOrder(data: any) {
    try {
        const { id, checklist, partsUsed, laborLogs, assetName, createdAt, ...rest } = data;

        // Validate Asset
        if (!rest.assetId) {
            console.error("Missing assetId in createWorkOrder payload:", data);
            return { success: false, message: "Asset ID mancante." };
        }

        // Handle optional dates
        const dueDate = rest.dueDate ? new Date(rest.dueDate) : null;

        const newWO = await prisma.workOrder.create({
            data: {
                ...rest,
                dueDate,
                requesterId: rest.requesterId || null,
                validatedById: rest.validatedById || null,
                type: rest.type || 'FAULT',
                status: rest.status || 'PENDING_APPROVAL',
                checklist: checklist && checklist.length > 0 ? {
                    create: checklist.map((c: any) => ({
                        label: c.label,
                        completed: c.completed
                    }))
                } : undefined
            }
        });

        revalidatePath('/maintenance');
        revalidatePath('/work-orders');
        revalidatePath('/requests'); // Revalidate requests too
        return { success: true, message: 'Ordine creato', data: newWO };
    } catch (error) {
        console.error("WO Create Error Detailed:", error);
        if (error instanceof Error) {
            console.error("Stack:", error.stack);
        }
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

        // Notify Technician (if notification system exists and tech is user)
        const techUser = await prisma.user.findFirst({ where: { name: tech?.name } });

        // Fetch WO detail for notification context
        const assignedWO = await prisma.workOrder.findUnique({ where: { id } });

        if (techUser && assignedWO) {
            await prisma.notification.create({
                data: {
                    userId: techUser.id,
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

        } else {
            await prisma.workOrder.update({
                where: { id },
                data: {
                    status: 'IN_PROGRESS', // Send back to tech
                    // Add feedback to comments/chat? For now just status.
                }
            });
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

        revalidatePath('/maintenance');
        revalidatePath('/work-orders');
        revalidatePath('/requests');
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function deleteWorkOrder(id: string) {
    const session = await auth();
    if (!session?.user || (session.user as any).role === 'USER') throw new Error("Unauthorized");
    try {
        await prisma.workOrder.delete({ where: { id } });
        revalidatePath('/work-orders');
        revalidatePath('/maintenance');
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

        if (dueDate) {
            data.dueDate = new Date(dueDate);
        }

        const updated = await prisma.workOrder.update({
            where: { id },
            data
        });

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
            const durationArr = (end.getTime() - start.getTime()) / 1000 / 60; // minutes

            await prisma.workOrderTimer.update({
                where: { id: activeTimer.id },
                data: {
                    endTime: end,
                    duration: Math.round(durationArr),
                    note
                }
            });
        }

        await prisma.workOrder.update({
            where: { id: workOrderId },
            data: { status: 'ON_HOLD' }
        });

        revalidatePath(`/work-orders/${workOrderId}`);
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Errore pausa timer' };
    }
}

export async function stopWorkSession(workOrderId: string) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };

    try {
        const activeTimer = await prisma.workOrderTimer.findFirst({
            where: { workOrderId, userId: session.user.id, endTime: null }
        });

        if (activeTimer) {
            const end = new Date();
            const start = new Date(activeTimer.startTime);
            const durationArr = (end.getTime() - start.getTime()) / 1000 / 60;

            await prisma.workOrderTimer.update({
                where: { id: activeTimer.id },
                data: {
                    endTime: end,
                    duration: Math.round(durationArr)
                }
            });
        }
        revalidatePath(`/work-orders/${workOrderId}`);
        return { success: true };
    } catch (error) {
        return { success: false, message: 'Errore stop timer' };
    }
}

export async function completeWorkOrder(workOrderId: string) {
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
        await stopWorkSession(workOrderId);

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

export async function assignWorkOrder(workOrderId: string, technicianId: string) {
    const tech = await prisma.technician.findUnique({ where: { id: technicianId } });
    if (!tech) throw new Error("Technician not found");

    const workOrder = await prisma.workOrder.update({
        where: { id: workOrderId },
        data: {
            assignedTechnicianId: technicianId,
            assignedTo: tech.name
        }
    });

    const user = await prisma.user.findFirst({ where: { name: tech.name } });
    if (user) {
        await prisma.notification.create({
            data: {
                userId: user.id,
                title: "Nuovo Incarico",
                message: `Ti è stato assegnato un nuovo ordine di lavoro: ${workOrder.title}`,
                link: `/work-orders/${workOrder.id}`
            }
        });
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
    return await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
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
        await prisma.sparePart.update({
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

        revalidatePath(`/work-orders/${workOrderId}`);
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
        const { workOrderId, ...fields } = data;

        // 1. Save EWO
        await prisma.eWO.upsert({
            where: { workOrderId },
            update: { ...fields, authorName: session.user.name || 'User' },
            create: { ...fields, workOrderId, authorName: session.user.name || 'User' }
        });

        // 2. Update WO flag
        await prisma.workOrder.update({
            where: { id: workOrderId },
            data: { ewoFilled: true }
        });

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

export async function getEWO(workOrderId: string) {
    try {
        return await prisma.eWO.findUnique({ where: { workOrderId } });
    } catch (e) {
    }
}

// Aliases for context compatibility
export const updateQuantity = updateSparePartQuantity;
export const removePart = deleteSparePart;
