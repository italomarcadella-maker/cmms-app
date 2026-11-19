'use server';

import { SUPERVISION } from '@/lib/roles';
import { signIn } from '@/auth';
import { addDays, format, subDays, startOfDay } from 'date-fns';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import { scopedCache } from '@/lib/scoped-cache';
import { requireRole, requireLogin } from '@/lib/auth-guard';
import { isRole } from '@/lib/roles';
import { validatePassword } from '@/lib/password-policy';
import { PlantScopeError, resolveWritePlantId, runUnscoped, invalidatePlantListCache, getPlantScope, userScopeWhere } from '@/lib/plant-scope';
import { WorkOrderStatus } from '@/lib/types';

import { logAction } from './audit';
import { assetSchema, workOrderSchema } from './validations';
import { WorkOrderPriority, WorkOrderCategory } from "@prisma/client";
import { addAsset as newAddAsset, updateAsset as newUpdateAsset, deleteAsset as newDeleteAsset } from '@/modules/maintenance/adapters/actions/asset-actions';
import {
    rescheduleWorkOrder as newRescheduleWorkOrder,
    assignWorkOrder as newAssignWorkOrder,
    updateWorkOrderAssignments as newUpdateWorkOrderAssignments,
    getUnassignedWorkOrders as newGetUnassignedWorkOrders,
    getPlannerUnassignedItems as newGetPlannerUnassignedItems,
    getActiveWorkOrdersForAsset as newGetActiveWorkOrdersForAsset,
    createWorkOrder as newCreateWorkOrder,
    approveRequest as newApproveRequest,
    reviewWorkOrder as newReviewWorkOrder,
    updateWorkOrderStatus as newUpdateWorkOrderStatus,
    deleteWorkOrder as newDeleteWorkOrder,
    updateWorkOrderDetails as newUpdateWorkOrderDetails,
    createPreventiveFromEWO as newCreatePreventiveFromEWO,
    startWorkSession as newStartWorkSession,
    pauseWorkSession as newPauseWorkSession,
    stopWorkSession as newStopWorkSession,
    completeWorkOrder as newCompleteWorkOrder,
    importWorkOrders as newImportWorkOrders,
    assignWorkOrderToSelf as newAssignWorkOrderToSelf,
    addWorkOrderPart as newAddWorkOrderPart,
    removeWorkOrderPart as newRemoveWorkOrderPart,
    toggleChecklistItem as newToggleChecklistItem,
    confirmEWO as newConfirmEWO,
    submitEWO as newSubmitEWO,
    getEWO as newGetEWO
} from '@/modules/maintenance/adapters/actions/work-order-actions';
import { createWorkOrderFromSchedule as newCreateWorkOrderFromSchedule, getPreventiveSchedules as newGetPreventiveSchedules, getAssetSchedules as newGetAssetSchedules, createPreventiveSchedule as newCreatePreventiveSchedule, deletePreventiveSchedule as newDeletePreventiveSchedule, updatePreventiveSchedule as newUpdatePreventiveSchedule } from '@/modules/maintenance/adapters/actions/schedule-actions';
import { addTechnician as newAddTechnician, deleteTechnician as newDeleteTechnician } from '@/modules/maintenance/adapters/actions/technician-actions';
import {
    getSpareParts as newGetSpareParts,
    addSparePart as newAddSparePart,
    updateSparePartQuantity as newUpdateSparePartQuantity,
    deleteSparePart as newDeleteSparePart
} from '@/modules/inventory/adapters/actions/inventory-actions';
import {
    getMeters as newGetMeters,
    createMeter as newCreateMeter,
    deleteMeter as newDeleteMeter,
    getMeterReadings as newGetMeterReadings,
    getEnergyStats as newGetEnergyStats,
    addMeterReading as newAddMeterReading,
    getAllMeterReadings as newGetAllMeterReadings
} from '@/modules/energy/adapters/actions/energy-actions';



// --- Cache Revalidation Helpers ---
export async function revalidateWorkOrders() {
    (revalidateTag as any)('work-orders');
}

export async function revalidateAssets() {
    (revalidateTag as any)('assets');
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
    const weak = validatePassword(newPassword);
    if (weak) return { success: false, message: weak };

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
    if (!isRole(newRole)) return { success: false, message: 'Ruolo non valido.' };

    try {
        // Non si puo' togliere il ruolo all'ultimo amministratore attivo
        if (newRole !== 'ADMIN') {
            const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
            if (target?.role === 'ADMIN' && (await prisma.user.count({ where: { role: 'ADMIN', isActive: true } })) <= 1) {
                return { success: false, message: 'Deve restare almeno un amministratore attivo.' };
            }
        }
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

/** Imposta gli stabilimenti visibili a un utente; lo stabilimento "di casa" resta quello gia' assegnato se ancora valido, altrimenti il primo. */
async function setUserPlants(userId: string, plantIds: string[]) {
    const unique = [...new Set(plantIds)];
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { plantId: true } });
    const home = current?.plantId && unique.includes(current.plantId) ? current.plantId : unique[0] ?? null;
    await prisma.$transaction([
        prisma.userPlant.deleteMany({ where: { userId } }),
        prisma.userPlant.createMany({ data: unique.map(plantId => ({ userId, plantId })) }),
        prisma.user.update({ where: { id: userId }, data: { plantId: home } }),
    ]);
}

export async function createUser(rawUserData: any) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };

    try {
        const { name, email, password, role } = rawUserData;
        const plantIds: string[] = Array.isArray(rawUserData.plantIds) ? rawUserData.plantIds : [];
        if (!isRole(role)) return { success: false, message: 'Ruolo non valido.' };
        const weakPassword = validatePassword(password);
        if (weakPassword) return { success: false, message: weakPassword };
        if (!email || !password || !role) {
            return { success: false, message: 'Dati mancanti.' };
        }
        if (role !== 'ADMIN' && plantIds.length === 0) {
            return { success: false, message: "Assegna almeno uno stabilimento all'utente." };
        }
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return { success: false, message: 'Utente già esistente con questa email.' };
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const uniquePlants = [...new Set(plantIds)];
        // Utente, stabilimenti assegnati e (per i manutentori) profilo tecnico si creano insieme: o tutto o niente
        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                image: '',
                mustChangePassword: true,
                plantId: uniquePlants[0] ?? null,
                plants: { create: uniquePlants.map(plantId => ({ plantId })) },
                ...(role === 'MAINTAINER' ? { technicianProfile: { create: { name: name || email.split('@')[0], specialty: 'General', hourlyRate: 0 } } } : {}),
            },
        });

        revalidatePath('/users');
        revalidatePath('/technicians');
        return { success: true, message: 'Utente creato con successo' };
    } catch (error) {
        console.error('Failed to create user:', error);
        if ((error as { code?: string })?.code === 'P2002') return { success: false, message: 'Utente gia\' esistente con questa email.' };
        return { success: false, message: "Errore durante la creazione dell'utente." };
    }
}

export async function updateFirstLoginPassword(newPassword: string) {
    const session = await auth();
    if (!session?.user?.email) {
        return { success: false, message: 'Non autenticato.' };
    }
    const weak = validatePassword(newPassword);
    if (weak) return { success: false, message: weak };
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
            select: { id: true, name: true, email: true, role: true, image: true, isActive: true, lastLogin: true, department: true, plantId: true, plants: { select: { plantId: true } } }
        });
        // Map dates to strings
        return users.map(({ plants, ...u }: any) => ({
            ...u,
            plantIds: plants.map((p: any) => p.plantId) as string[],
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
        console.error('[actions]', error);
        return { success: false, message: 'Errore aggiornamento stato' };
    }
}

export async function updateUser(userId: string, data: { name?: string; email?: string; department?: string; image?: string; role?: string; plantIds?: string[] }) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };
    if (data.role !== undefined && !isRole(data.role)) return { success: false, message: 'Ruolo non valido.' };
    try {
        const newRole = data.role ?? (await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role;
        if (data.plantIds !== undefined && newRole !== "ADMIN" && data.plantIds.length === 0) {
            return { success: false, message: "Assegna almeno uno stabilimento: senza, l'utente non vedrebbe alcun dato." };
        }
        await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name,
                email: data.email,
                department: data.department,
                image: data.image,
                role: data.role as any
            }
        });
        if (data.plantIds !== undefined) await setUserPlants(userId, data.plantIds);
        revalidatePath('/users');
        return { success: true, message: 'Utente aggiornato con successo' };
    } catch (error) {
        console.error('[actions]', error);
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
        const target = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, technicianProfile: { select: { id: true, _count: { select: { assignments: true, workOrders: true } } } }, _count: { select: { requestedWorkOrders: true, validatedWorkOrders: true } } },
        });
        if (!target) return { success: false, message: 'Utente non trovato.' };
        if (target.role === 'ADMIN' && (await prisma.user.count({ where: { role: 'ADMIN', isActive: true } })) <= 1) {
            return { success: false, message: 'Deve restare almeno un amministratore attivo.' };
        }
        // Un utente con storico (ordini richiesti o svolti) non si cancella: sparirebbero le sue tracce. Si disattiva.
        const history = (target.technicianProfile?._count.assignments ?? 0) + (target.technicianProfile?._count.workOrders ?? 0)
            + target._count.requestedWorkOrders + target._count.validatedWorkOrders;
        if (history > 0) {
            return { success: false, message: 'L\'utente ha uno storico di ordini di lavoro: disattivalo invece di eliminarlo, cosi\' lo storico resta leggibile.' };
        }
        await prisma.user.delete({ where: { id: userId } });
        revalidatePath('/users');
        return { success: true, message: 'Utente eliminato con successo' };
    } catch (error) {
        console.error('Failed to delete user:', error);
        return { success: false, message: 'Errore durante l\'eliminazione dell\'utente' };
    }
}

/**
 * Cancella i dati operativi. E' PERICOLOSA: resta disattivata a meno che non sia impostata ALLOW_DB_RESET=1 (ambiente di prova),
 * richiede di scrivere la frase di conferma, lascia traccia nel registro e avviene in un'unica transazione.
 */
export async function resetDatabase(confirmation?: string) {
    const { authorized, message, session } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };
    if (process.env.ALLOW_DB_RESET !== '1') {
        return { success: false, message: 'Il reset e\' disattivato in questo ambiente. Per i dati reali usa un backup e il ripristino.' };
    }
    if (confirmation !== 'ELIMINA TUTTO') return { success: false, message: 'Scrivi esattamente ELIMINA TUTTO per confermare.' };
    try {
        await runUnscoped(async () => {
            await prisma.auditLog.create({ data: { userId: session.user.id, action: 'RESET_DATABASE', details: 'Reset dei dati operativi richiesto da un amministratore' } });
            await prisma.$transaction([
                prisma.meterReading.deleteMany(),
                prisma.meter.deleteMany(),
                prisma.notification.deleteMany(),
                prisma.laborLog.deleteMany(),
                prisma.workOrderPart.deleteMany(),
                prisma.checklistItem.deleteMany(),
                prisma.workOrder.deleteMany(),
                prisma.preventiveSchedule.deleteMany(),
                prisma.assetImage.deleteMany(),
                prisma.assetDocument.deleteMany(),
                prisma.asset.deleteMany(),
                prisma.technician.deleteMany(),
                prisma.maintenanceActivity.deleteMany(),
                prisma.user.deleteMany({ where: { role: { not: 'ADMIN' } } }),
            ]);
        });
        revalidatePath('/');
        return { success: true, message: 'Database ripulito con successo.' };
    } catch (error) {
        console.error('Failed to reset database:', error);
        return { success: false, message: 'Errore durante il reset del database.' };
    }
}

// --- Dashboard ---

export const getDashboardStats = scopedCache(
    async () => {
        try {
            const totalAssets = await prisma.asset.count();
            const openWorkOrders = await prisma.workOrder.count({ where: { status: 'OPEN' } });
            const completedWorkOrders = await prisma.workOrder.count({ where: { status: 'COMPLETED' } });
            const lowHealthAssets = await prisma.asset.count({ where: { healthScore: { lt: 70 } } });

            return { totalAssets, openWorkOrders, completedWorkOrders, lowHealthAssets };
        } catch (error) {
            console.error('Failed to get dashboard stats:', error);
            return { totalAssets: 0, openWorkOrders: 0, completedWorkOrders: 0, lowHealthAssets: 0 };
        }
    },
    ['dashboard-stats'],
    { tags: ['dashboard-stats'], revalidate: 300 }
);

// --- Assets ---

export const getAssets = scopedCache(
    async () => {
        try {
            const assets = await prisma.asset.findMany({ 
                include: { plant: true },
                orderBy: { name: 'asc' } 
            });
            return assets.map((asset: any) => ({
                ...asset,
                purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : '',
                lastMaintenance: asset.lastMaintenance ? asset.lastMaintenance.toISOString().split('T')[0] : null,
                plantId: asset.plantId,
                plant: asset.plant?.name || asset.plantId || 'Non Assegnato' // Map plant object to name for UI
            }));
        } catch (error) {
            console.error('Failed to get assets:', error);
            return [];
        }
    },
    ['all-assets'],
    { tags: ['assets'], revalidate: 3600 }
);

export async function getPlants() {
    try {
        const session = await auth();
        if (!session?.user) return [];
        // L'admin gestisce tutti gli stabilimenti anche se nel selettore ne ha scelto uno; gli altri vedono i propri.
        const load = () => prisma.plant.findMany({ orderBy: { name: 'asc' } });
        return session.user.role === 'ADMIN' ? await runUnscoped(load) : await load();
    } catch (error) {
        console.error('Failed to fetch plants:', error);
        return [];
    }
}

export async function addPlant(data: { name: string; location?: string; country?: string; timezone?: string }) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };
    try {
        if (!data.name?.trim()) return { success: false, message: 'Il nome dello stabilimento e\' obbligatorio' };
        const newPlant = await runUnscoped(() => prisma.plant.create({
            data: { name: data.name.trim(), location: data.location, country: data.country, ...(data.timezone ? { timezone: data.timezone } : {}) },
        }));
        invalidatePlantListCache();
        revalidatePath('/', 'layout');
        return { success: true, data: newPlant };
    } catch (error) {
        console.error('[actions]', error);
        return { success: false, message: "Errore aggiunta stabilimento (nome gia' esistente?)" };
    }
}

export interface PlantSettingsInput {
    name?: string;
    location?: string | null;
    country?: string | null;
    timezone?: string;
    electricityPricePerKwh?: number | null;
    waterPricePerM3?: number | null;
    co2FactorPerKwh?: number | null;
    downtimeCostPerMinute?: number | null;
    defaultLaborHourlyRate?: number | null;
}

/** Impostazioni di un plant. Anagrafica solo admin; tariffe e costi anche dal responsabile del plant (solo il proprio). */
export async function updatePlant(id: string, data: PlantSettingsInput) {
    const { authorized, message, session } = await requireRole(['ADMIN', 'PLANT_MANAGER']);
    if (!authorized) return { success: false, message };
    try {
        const isAdmin = session.user.role === 'ADMIN';
        const num = (v: number | null | undefined) => (v === undefined ? undefined : v === null || Number.isNaN(v) ? null : Math.max(0, v));
        const costs = {
            electricityPricePerKwh: num(data.electricityPricePerKwh),
            waterPricePerM3: num(data.waterPricePerM3),
            co2FactorPerKwh: num(data.co2FactorPerKwh),
            downtimeCostPerMinute: num(data.downtimeCostPerMinute),
            defaultLaborHourlyRate: num(data.defaultLaborHourlyRate),
            timezone: data.timezone,
        };
        const registry = isAdmin ? { name: data.name?.trim() || undefined, location: data.location, country: data.country } : {};
        const run = () => prisma.plant.update({ where: { id }, data: { ...registry, ...costs } });
        // L'admin puo' modificare qualunque plant; il responsabile solo quelli assegnati (filtro in lib/prisma.ts)
        const updated = isAdmin ? await runUnscoped(run) : await run();
        invalidatePlantListCache();
        revalidatePath('/', 'layout');
        return { success: true, data: updated };
    } catch (error) {
        console.error('[actions]', error);
        return { success: false, message: "Errore aggiornamento stabilimento" };
    }
}

export async function deletePlant(id: string) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };
    try {
        // Eliminare uno stabilimento cancellerebbe a cascata energia, sicurezza, contratti e libreria e lascerebbe orfani
        // asset, ordini e ricambi: si puo' fare solo se e' vuoto.
        const linked = await runUnscoped(async () => {
            const where = { plantId: id };
            const counts = await Promise.all([
                prisma.asset.count({ where }), prisma.workOrder.count({ where }), prisma.sparePart.count({ where }), prisma.meter.count({ where }),
                prisma.component.count({ where }), prisma.project.count({ where }), prisma.dailyMeeting.count({ where }), prisma.energyLog.count({ where }),
                prisma.safetyEvent.count({ where }), prisma.contractorContract.count({ where }), prisma.productionLine.count({ where }),
                prisma.user.count({ where: { OR: [{ plantId: id }, { plants: { some: { plantId: id } } }] } }),
            ]);
            const labels = ['asset', 'ordini di lavoro', 'ricambi', 'contatori', 'componenti', 'progetti', 'riunioni', 'letture di energia', 'eventi di sicurezza', 'contratti', 'linee', 'utenti'];
            return labels.map((l, i) => (counts[i] > 0 ? `${counts[i]} ${l}` : '')).filter(Boolean);
        });
        if (linked.length > 0) {
            return { success: false, message: `Lo stabilimento non e' vuoto (${linked.join(', ')}). Sposta o elimina prima questi dati.` };
        }
        await runUnscoped(() => prisma.plant.delete({ where: { id } }));
        invalidatePlantListCache();
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        console.error('deletePlant', error);
        return { success: false, message: "Errore eliminazione stabilimento." };
    }
}


export async function importAssets(assets: any[]) {
    let count = 0;
    const errors: string[] = [];
    const { authorized, message } = await requireRole(['ADMIN', 'PLANT_MANAGER', 'PROCESS_ENGINEER']);
    if (!authorized) return { success: false, message: message || "Non autorizzato", count: 0, errors: ["Non autorizzato"] };
    if (!Array.isArray(assets) || assets.length === 0) return { success: false, message: 'Nessuna riga da importare.', count: 0, errors: [] };
    if (assets.length > 1000) return { success: false, message: 'Si possono importare al massimo 1000 righe per volta.', count: 0, errors: [] };

    const STATUSES = ['OPERATIONAL', 'MAINTENANCE', 'OFFLINE', 'PLANNED_DOWNTIME'];
    const TYPES = ['MACHINE', 'FACILITY', 'SAFETY', 'KAIZEN', 'OTHER'];
    // Il plant si indica per nome: si ricava l'id tra quelli che l'utente puo' vedere
    const plants = await prisma.plant.findMany({ select: { id: true, name: true } });
    const plantByName = new Map(plants.map(p => [p.name.trim().toLowerCase(), p.id]));

    for (const [index, asset] of assets.entries()) {
        const label = `Riga ${index + 1}${asset?.name ? ` (${asset.name})` : ''}`;
        try {
            if (!asset?.name || !asset?.model) { errors.push(`${label}: nome e modello sono obbligatori`); continue; }
            let plantId: string | undefined;
            if (asset.plant && String(asset.plant).trim() !== '') {
                plantId = plantByName.get(String(asset.plant).trim().toLowerCase());
                if (!plantId) { errors.push(`${label}: stabilimento "${asset.plant}" non trovato o non consentito`); continue; }
            }
            const status = STATUSES.includes(asset.status) ? asset.status : 'OPERATIONAL';
            const type = TYPES.includes(asset.type) ? asset.type : 'MACHINE';
            const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date();
            if (Number.isNaN(purchaseDate.getTime())) { errors.push(`${label}: data di acquisto non valida`); continue; }
            const assetData = {
                name: String(asset.name).trim(),
                model: String(asset.model).trim(),
                serialNumber: asset.serialNumber ? String(asset.serialNumber) : `SN-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
                location: asset.location || 'Non indicata',
                status,
                healthScore: Math.min(100, Math.max(0, parseInt(asset.healthScore) || 100)),
                type,
                purchaseDate,
                department: asset.department || asset.category || null,
                line: asset.line || null,
                vendor: asset.vendor || null,
                ...(plantId ? { plantId } : {}),
            };
            if (asset.id) {
                await prisma.asset.upsert({ where: { id: asset.id }, update: assetData as any, create: { id: asset.id, ...assetData } as any });
            } else {
                await prisma.asset.create({ data: assetData as any });
            }
            count++;
        } catch (e) {
            const reason = e instanceof PlantScopeError ? e.message : (e as { code?: string })?.code === 'P2002' ? 'matricola gia\' presente' : 'errore nei dati';
            console.error('importAssets', label, e);
            errors.push(`${label}: ${reason}`);
        }
    }
    revalidatePath('/assets');
    revalidateAssets();
    return { success: count > 0, message: count > 0 ? undefined : 'Nessuna riga importata.', count, errors };
}

export async function addAsset(rawData: any) {
    return newAddAsset(rawData);
}

export async function updateAsset(id: string, rawData: any) {
    return newUpdateAsset(id, rawData);
}

export async function deleteAsset(id: string) {
    return newDeleteAsset(id);
}

export async function rescheduleWorkOrder(id: string, newDate: Date) {
    return newRescheduleWorkOrder(id, newDate);
}

// --- Work Order Assignment (Scheduler) ---
export async function assignWorkOrder(workOrderId: string, technicianId: string, date?: Date) {
    return newAssignWorkOrder(workOrderId, technicianId, date);
}

export async function updateWorkOrderAssignments(workOrderId: string, technicianIds: string[]) {
    return newUpdateWorkOrderAssignments(workOrderId, technicianIds);
}

export async function getUnassignedWorkOrders() {
    return newGetUnassignedWorkOrders();
}

export async function getPlannerUnassignedItems() {
    return newGetPlannerUnassignedItems();
}


export async function createWorkOrderFromSchedule(scheduleId: string, date: Date, technicianId?: string) {
    return newCreateWorkOrderFromSchedule(scheduleId, date, technicianId);
}

// --- Preventive Schedules ---

export async function getPreventiveSchedules() {
    return newGetPreventiveSchedules();
}

export async function getAssetSchedules(assetId: string) {
    return newGetAssetSchedules(assetId);
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
    return newCreatePreventiveSchedule(data);
}

export async function deletePreventiveSchedule(id: string) {
    return newDeletePreventiveSchedule(id);
}

export async function updatePreventiveSchedule(id: string, nextDueDate: Date) {
    return newUpdatePreventiveSchedule(id, nextDueDate);
}

// --- Technicians ---

export async function getTechnicians() {
    try {
        // 1. Get explicitly registered technicians
        const techs = await prisma.technician.findMany();

        // 2. Get Supervisors who are technically able to work but don't have a Technician profile yet
        // We exclude those who already have a profile by checking userId NOT IN techs.userId
        const registeredUserIds = techs.map(t => t.userId).filter(Boolean) as string[];

        const scopeWhere = userScopeWhere(await getPlantScope());
        const supervisors = await prisma.user.findMany({
            where: {
                role: { in: ['SUPERVISOR', 'PLANT_MANAGER'] },
                id: { notIn: registeredUserIds },
                isActive: true,
                ...scopeWhere
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
        console.error('[actions]', error);
        return [];
    }
}

export async function getAvailableUsersForTechnician() {
    const { authorized } = await requireRole('ADMIN');
    if (!authorized) return [];
    try {
        const availableScope = userScopeWhere(await getPlantScope());
        const users = await prisma.user.findMany({
            where: {
                technicianProfile: null,
                ...availableScope,
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
    return newAddTechnician(data);
}

export async function deleteTechnician(id: string) {
    return newDeleteTechnician(id);
}


// --- Maintenance Activities ---

export async function getActivities() {
    try { return await prisma.maintenanceActivity.findMany(); } catch (error) { console.error('[actions]', error); return []; }
}

export async function addActivity(data: { label: string; category?: string }) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') return { success: false, message: 'Non autorizzato' };
    try {
        const newAct = await prisma.maintenanceActivity.create({ data });
        return { success: true, message: 'Attività aggiunta', data: newAct };
    } catch (error) {
        console.error('[actions]', error);
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
        console.error('[actions]', error);
        return { success: false, message: 'Errore eliminazione' };
    }
}

// --- Inventory (Spare Parts) ---

export async function getSpareParts() {
    return newGetSpareParts();
}

export async function addSparePart(data: { name: string; quantity: number; category?: string; description?: string; location?: string; unitCost?: number; minQuantity?: number; warehouse?: string }) {
    return newAddSparePart(data);
}

export async function updateSparePartQuantity(id: string, quantity: number) {
    return newUpdateSparePartQuantity(id, quantity);
}

export async function deleteSparePart(id: string) {
    return newDeleteSparePart(id);
}


// --- Components ---

export async function getComponents() {
    // Authorized for multiple roles
    const { authorized } = await requireRole(['ADMIN', 'MAINTAINER', 'SUPERVISOR', 'PROCESS_ENGINEER']);
    if (!authorized) return [];
    try { return await prisma.component.findMany({ include: { measurements: true }, orderBy: { purchaseDate: 'desc' } }); } catch (error) { console.error('[actions]', error); return []; }
}

export async function addComponent(data: any) {
    const { authorized } = await requireRole(['ADMIN', 'PROCESS_ENGINEER']);
    if (!authorized) return { success: false, message: 'Non autorizzato' };
    try {
        const newComp = await prisma.component.create({ data });
        return { success: true, message: 'Componente aggiunto', data: newComp };
    } catch (error) {
        console.error('[actions]', error);
        return { success: false, message: 'Errore aggiunta componente' };
    }
}

export async function updateComponent(id: string, updates: any) {
    const { authorized } = await requireRole(['ADMIN', 'PROCESS_ENGINEER']);
    if (!authorized) return { success: false, message: 'Non autorizzato' };
    try {
        const updated = await prisma.component.update({ where: { id }, data: updates });
        return { success: true, message: 'Componente aggiornato', data: updated };
    } catch (error) {
        console.error('[actions]', error);
        return { success: false, message: 'Errore aggiornamento' };
    }
}

export async function uploadComponentDrawing(formData: FormData) {
    const { authorized, message } = await requireRole(['ADMIN', 'PROCESS_ENGINEER']);
    if (!authorized) return { success: false, message };

    const file = formData.get('file') as File | null;
    if (!file) return { success: false, message: 'Nessun file ricevuto' };
    const ALLOWED: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/pdf': 'pdf' };
    const extension = ALLOWED[file.type];
    if (!extension) return { success: false, message: 'Formato non consentito: solo PNG, JPEG, WebP o PDF.' };
    if (file.size > 5 * 1024 * 1024) return { success: false, message: 'Il file supera i 5 MB.' };

    try {
        const { ServiceLocator } = await import('@/modules/shared/infrastructure/registry/service-locator');
        await import('@/modules/shared/infrastructure/storage/supabase-storage'); // ensures IFileStorageService is registered
        const storage = ServiceLocator.resolve<{ uploadFile: (buf: Buffer, name: string, mime: string, bucket?: string) => Promise<string> }>('IFileStorageService');

        const buffer = Buffer.from(await file.arrayBuffer());
        const base = file.name.replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9\-_]/g, '_').slice(0, 60) || 'file';
        const safeName = `components/${Date.now()}-${base}.${extension}`;
        const url = await storage.uploadFile(buffer, safeName, file.type, 'documents');

        return { success: true, message: 'Disegno caricato', url };
    } catch (error) {
        console.error('uploadComponentDrawing error:', error);
        return { success: false, message: 'Errore durante il caricamento del file' };
    }
}

export async function addMeasurement(componentId: string, measurement: { date: string | Date; value1: number; value2?: number; operator: string }) {
    const { authorized } = await requireRole(['ADMIN', 'PROCESS_ENGINEER', 'MAINTAINER']);
    if (!authorized) return { success: false, message: 'Non autorizzato' };
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
        console.error('[actions]', error);
        return { success: false, message: 'Errore aggiunta misurazione' };
    }
}

// --- Chat ---

export async function getChatMessages() {
    try {
        const session = await auth();
        if (!session?.user?.id) return [];
        // La conversazione e' personale: le risposte possono contenere dati dello stabilimento di chi chiede
        return await prisma.chatMessage.findMany({ where: { userId: session.user.id }, orderBy: { timestamp: 'asc' }, take: 100 });
    } catch (error) {
        console.error('[actions]', error);
        return [];
    }
}

export async function sendChatMessage(data: { sender: string; role: string; content: string; isSystem?: boolean; thoughtProcess?: string[]; imageUrl?: string }) {
    const guard = await requireLogin();
    if (!guard.authorized) return { success: false, message: guard.message ?? 'Non autenticato' };
    const user = guard.session.user;
    try {
        const content = typeof data.content === 'string' ? data.content.slice(0, 4000) : '';
        if (!content.trim()) return { success: false, message: 'Messaggio vuoto' };
        // Mittente e ruolo di un messaggio dell'utente sono quelli della sessione, non quelli dichiarati dal browser.
        // Le risposte dell'assistente (isSystem) restano dell'utente che le ha richieste e hanno un mittente fisso.
        const system = data.isSystem === true;
        const msg = await prisma.chatMessage.create({
            data: {
                userId: user.id,
                sender: system ? (String(data.sender || 'Assistente').slice(0, 60)) : (user.name || user.email || 'Utente'),
                role: system ? 'SYSTEM' : (user.role === 'SUPERVISOR' || user.role === 'PLANT_MANAGER' ? 'SUPERVISOR' : user.role === 'MAINTAINER' ? 'TECHNICIAN' : 'USER'),
                content,
                isSystem: system,
                isRead: false,
                thoughtProcess: Array.isArray(data.thoughtProcess) ? data.thoughtProcess.slice(0, 20).map(t => String(t).slice(0, 300)) : [],
                imageUrl: typeof data.imageUrl === 'string' && /^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(data.imageUrl) ? data.imageUrl : undefined,
            },
        });
        return { success: true, data: msg };
    } catch (error) {
        console.error('[actions]', error);
        return { success: false, message: 'Errore invio messaggio' };
    }
}

export const getWorkOrders = scopedCache(
    async () => {
        try {
            const wos = await prisma.workOrder.findMany({
                // Gli ordini aperti non devono sparire perche' vecchi: si prendono tutti, piu' lo storico degli ultimi 6 mesi
                where: { OR: [{ status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'ON_HOLD', 'PENDING_REVIEW'] } }, { createdAt: { gte: new Date(Date.now() - 183 * 86_400_000) } }] },
                orderBy: { createdAt: 'desc' },
                take: 2000,
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
    },
    ['all-work-orders'],
    { tags: ['work-orders'], revalidate: 3600 }
);

export async function getActiveWorkOrdersForAsset(assetId: string) {
    return newGetActiveWorkOrdersForAsset(assetId);
}

export async function createWorkOrder(rawData: any) {
    return newCreateWorkOrder(rawData);
}

export async function approveRequest(id: string, technicianId: string, priority: string) {
    return newApproveRequest(id, technicianId, priority);
}

export async function reviewWorkOrder(id: string, decision: 'APPROVE' | 'REJECT', feedback?: string) {
    return newReviewWorkOrder(id, decision, feedback);
}

export async function updateWorkOrderStatus(id: string, status: string) {
    return newUpdateWorkOrderStatus(id, status);
}

export async function deleteWorkOrder(id: string) {
    return newDeleteWorkOrder(id);
}

export async function updateWorkOrderDetails(id: string, updates: any) {
    return newUpdateWorkOrderDetails(id, updates);
}

export async function createPreventiveFromEWO(
    workOrderId: string,
    assetId: string,
    taskTitle: string,
    description: string,
    frequency: string,
    frequencyDays: number
) {
    return newCreatePreventiveFromEWO(workOrderId, assetId, taskTitle, description, frequency, frequencyDays);
}

export async function startWorkSession(workOrderId: string) {
    return newStartWorkSession(workOrderId);
}

export async function pauseWorkSession(workOrderId: string, note?: string) {
    return newPauseWorkSession(workOrderId, note);
}

export async function stopWorkSession(workOrderId: string, note?: string) {
    return newStopWorkSession(workOrderId, note);
}

export async function completeWorkOrder(workOrderId: string, note?: string) {
    return newCompleteWorkOrder(workOrderId, note);
}

export async function importWorkOrders(workOrders: any[]) {
    return newImportWorkOrders(workOrders);
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
    // Solo le proprie notifiche: l'id da solo non basta
    const res = await prisma.notification.updateMany({ where: { id, userId: session.user.id }, data: { read: true } });
    return { success: res.count === 1 };
}

// --- Energy ---

// --- AI Suggestions ---

export async function generateDailySuggestions() {
    const __guard = await requireRole(SUPERVISION);
    if (!__guard.authorized) return { success: false, message: __guard.message ?? 'Non autorizzato' };
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
                                priority: 'MEDIUM',
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
                            priority: 'LOW',
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
    return newGetMeters();
}

export async function createMeter(data: any) {
    return newCreateMeter(data);
}

export async function deleteMeter(id: string) {
    return newDeleteMeter(id);
}

export async function getMeterReadings(meterId: string) {
    return newGetMeterReadings(meterId);
}

export async function getEnergyStats(days: number = 30) {
    return newGetEnergyStats(days);
}

export async function addMeterReading(data: { meterId: string, value: number, date: string }) {
    return newAddMeterReading(data);
}

export async function getAllMeterReadings() {
    return newGetAllMeterReadings();
}

export async function addWorkOrderPart(workOrderId: string, partId: string, quantity: number) {
    return newAddWorkOrderPart(workOrderId, partId, quantity);
}

export async function removeWorkOrderPart(id: string) {
    return newRemoveWorkOrderPart(id);
}

export async function toggleChecklistItem(itemId: string, completed: boolean) {
    return newToggleChecklistItem(itemId, completed);
}

// --- System Settings ---

export async function getSystemSettings() {
    try {
        let settings = await prisma.systemSettings.findUnique({ where: { id: "settings" } });
        if (!settings) {
            settings = await prisma.systemSettings.create({
                data: { id: "settings" } // all fields fall back to their Prisma @default(...)
            });
        }
        return settings;
    } catch (error) {
        console.error('[actions]', error);
        return null;
    }
}

/**
 * Impostazioni valide per lo stabilimento in uso: i valori globali, sostituiti da quelli propri del plant dove definiti
 * (tariffe, costo del fermo, costo orario). Con piu' stabilimenti selezionati ("Tutti") valgono i globali.
 * La pagina delle impostazioni globali continua a usare getSystemSettings().
 */
export async function getEffectiveSettings(plantId?: string | null) {
    const base = await getSystemSettings();
    if (!base) return null;
    let pid = plantId;
    if (pid === undefined) {
        const scope = await getPlantScope();
        pid = scope.mode === 'plants' && scope.plantIds.length === 1 ? scope.plantIds[0] : null;
    }
    if (!pid) return base;
    const plant = await runUnscoped(() => prisma.plant.findUnique({
        where: { id: pid! },
        select: { electricityPricePerKwh: true, waterPricePerM3: true, co2FactorPerKwh: true, downtimeCostPerMinute: true, defaultLaborHourlyRate: true },
    }));
    if (!plant) return base;
    const overrides = Object.fromEntries(Object.entries(plant).filter(([, v]) => v !== null && v !== undefined));
    return { ...base, ...overrides };
}

type SystemSettingsInput = Partial<{
    ewoThresholdHours: number;
    downtimeCostPerMinute: number;
    defaultLaborHourlyRate: number;
    electricityPricePerKwh: number;
    waterPricePerM3: number;
    co2FactorPerKwh: number;
    erpEndpointUrl: string | null;
    iotGatewayUrl: string | null;
}>;

export async function updateSystemSettings(input: SystemSettingsInput) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };

    try {
        await prisma.systemSettings.upsert({
            where: { id: "settings" },
            update: input,
            create: { id: "settings", ...input }
        });
        revalidatePath('/settings');
        revalidatePath('/kpi');
        revalidatePath('/sustainability');
        return { success: true, message: 'Impostazioni aggiornate' };
    } catch (error) {
        console.error('[actions]', error);
        return { success: false, message: 'Errore salvataggio impostazioni' };
    }
}

// --- EWO Actions ---

export async function confirmEWO(workOrderId: string) {
    return newConfirmEWO(workOrderId);
}

export async function submitEWO(data: any) {
    return newSubmitEWO(data);
}


export async function getAdvancedKPIs() {
    const { authorized } = await requireRole(['ADMIN', 'PROCESS_ENGINEER']);
    if (!authorized) return null;

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

        // 3. Estimated Cost (downtime minutes * configurable €/min from SystemSettings)
        const settings = await getEffectiveSettings();
        const downtimeCostPerMinute = settings?.downtimeCostPerMinute ?? 100;
        const estimatedCost = totalDowntime * downtimeCostPerMinute;

        // 4. Resolution Efficiency = first-time-fix rate (EWOs closed without needing a follow-up)
        const resolutionEfficiency = typedEwos.length > 0
            ? Math.round(100 * typedEwos.filter(e => !e.needsFollowUp).length / typedEwos.length)
            : null; // null = not enough data, render as "N/D" instead of a fake number

        return {
            mttr,
            totalDowntime,
            topAssets,
            estimatedCost,
            downtimeCostPerMinute,
            resolutionEfficiency,
            totalEWOs: ewos.length
        };
    } catch (e) {
        console.error("KPI Error:", e);
        return null;
    }
}

const getAssetMaintenanceEventsCached = async (start: Date, end: Date) => {
    return scopedCache(
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
    return newGetEWO(workOrderId);
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
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERVISOR' && session.user.role !== 'PLANT_MANAGER')) {
        return { success: false, message: 'Non autorizzato' };
    }

    try {
        const plantId = await resolveWritePlantId();
        const existingLine = await prisma.productionLine.findFirst({ where: { plantId, line: data.line } });
        const lineValues = {
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
        };
        const line = existingLine
            ? await prisma.productionLine.update({ where: { id: existingLine.id }, data: lineValues })
            : await prisma.productionLine.create({ data: { ...lineValues, plantId, line: data.line } });
        revalidatePath('/planning/calendar');
        revalidatePath('/'); // Refresh Dashboard (production status)
        return { success: true, data: line };
    } catch (error) {
        console.error("Update Line Error:", error);
        return { success: false, message: 'Errore aggiornamento linea' };
    }
}

import { calculateLineReliability } from "./kpi-service"; export async function getLineStats(line: string) {
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
                    id: `virtual:${name}`,
                    plantId: null,
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
    const guard = await requireRole(SUPERVISION);
    if (!guard.authorized) return { success: false, message: guard.message ?? 'Non autorizzato' };

    try {
        await prisma.productionLine.deleteMany({ where: { line } }); // filtrato sul plant visibile

        revalidatePath('/planning/calendar');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Delete Line Error:", error);
        return { success: false, message: 'Errore eliminazione linea' };
    }
}

export async function assignWorkOrderToSelf(workOrderId: string) {
    return newAssignWorkOrderToSelf(workOrderId);
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

