'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { WorkOrderStatus } from '@/lib/types';

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
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return { success: false, message: 'Non autorizzato: Richiesto ruolo di Amministratore.' };
    }
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
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return { success: false, message: 'Non autorizzato: Richiesto ruolo di Amministratore.' };
    }
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
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return { success: false, message: 'Non autorizzato: Richiesto ruolo di Amministratore.' };
    }
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
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        throw new Error("Unauthorized");
    }
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
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return { success: false, message: 'Non autorizzato: Richiesto ruolo di Amministratore.' };
    }
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
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return { success: false, message: 'Non autorizzato' };
    }
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
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return { success: false, message: 'Non autorizzato: Richiesto ruolo di Amministratore.' };
    }
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
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return { success: false, message: 'Non autorizzato.' };
    }
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

export async function deleteAsset(id: string) {
    const session = await auth();
    if (!session?.user || (session.user as any).role === 'USER') throw new Error("Unauthorized");
    try {
        await prisma.asset.delete({ where: { id } });
        revalidatePath('/assets');
        return { success: true };
    } catch (error) {
        return { success: false, message: "Failed to delete asset" };
    }
}

export async function importAssets(assets: any[]) {
    // Legacy import logic, keeping as is
    let count = 0;
    let errors: string[] = [];
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
                department: asset.category || 'General',
                plant: 'Default Plant',
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
            lastRunDate: s.lastRunDate ? s.lastRunDate.toISOString() : null,
            nextDueDate: s.nextDueDate.toISOString()
        }));
    } catch (error) {
        return [];
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

export async function addSparePart(data: { name: string; quantity: number; category?: string; description?: string; location?: string; unitCost?: number; minQuantity?: number }) {
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
        return { success: false, message: 'Errore aggiunta ricambio' };
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
            include: { asset: true }
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
            checklist: wo.checklist || []
        }));
    } catch (error) {
        console.error('Failed to get WOs:', error);
        return [];
    }
}

export async function createWorkOrder(data: any) {
    try {
        const { id, checklist, partsUsed, laborLogs, assetName, createdAt, ...rest } = data;

        // Handle optional dates
        const dueDate = rest.dueDate ? new Date(rest.dueDate) : null;

        const newWO = await prisma.workOrder.create({
            data: {
                ...rest,
                dueDate,
                requesterId: rest.requesterId || null,
                validatedById: rest.validatedById || null,
                type: rest.type || 'FAULT',
                status: rest.status || 'OPEN',
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
        console.error("WO Create Error", error);
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
                status: 'OPEN',
                type: 'FAULT', // Convert request to standard fault
                priority: priority,
                assignedTechnicianId: technicianId,
                assignedTo: tech?.name || 'Assigned'
            }
        });

        // Notify Technician (if notification system exists and tech is user)
        const techUser = await prisma.user.findFirst({ where: { name: tech?.name } });
        if (techUser) {
            await prisma.notification.create({
                data: {
                    userId: techUser.id,
                    title: "Nuovo Incarico",
                    message: `È stata approvata e assegnata una nuova richiesta.`,
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
            await prisma.workOrder.update({
                where: { id },
                data: {
                    status: 'CLOSED',
                    validatedById: session.user.id
                }
            });
            // TODO: Create History Log or Archive
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
        return { success: true, message: decision === 'APPROVE' ? 'Ordine validato e chiuso' : 'Ordine respinto al tecnico' };
    } catch (error) {
        return { success: false, message: 'Errore revisione' };
    }
}

export async function updateWorkOrderStatus(id: string, status: string) {
    try {
        await prisma.workOrder.update({ where: { id }, data: { status } });
        revalidatePath('/maintenance');
        revalidatePath('/work-orders');
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
