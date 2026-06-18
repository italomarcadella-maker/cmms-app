'use server';

import { requireRole, revalidateWorkOrders } from '@/lib/actions';
import { revalidatePath } from 'next/cache';
import { ServiceLocator } from '@/modules/shared/infrastructure/registry/service-locator';
import { PrismaWorkOrderRepository } from '../db/prisma-work-order-repository';
import { PrismaTechnicianRepository } from '../db/prisma-technician-repository';
import { WorkOrder } from '../../domain/entities/work-order';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { logAction } from '@/lib/audit';
import { workOrderSchema } from '@/lib/validations';
import { WorkOrderPriority, WorkOrderCategory, WorkOrderStatus } from '@prisma/client';

// Register dependencies if not registered
try {
    ServiceLocator.resolve('IWorkOrderRepository');
} catch {
    ServiceLocator.register('IWorkOrderRepository', new PrismaWorkOrderRepository());
}
try {
    ServiceLocator.resolve('ITechnicianRepository');
} catch {
    ServiceLocator.register('ITechnicianRepository', new PrismaTechnicianRepository());
}

const getWORepo = () => ServiceLocator.resolve<PrismaWorkOrderRepository>('IWorkOrderRepository');
const getTechRepo = () => ServiceLocator.resolve<PrismaTechnicianRepository>('ITechnicianRepository');

// --- Helper for virtual assets ---
const VIRTUAL_ASSETS: Record<string, { name: string; type: string }> = {
    'SYS-SAFETY': { name: 'Segnalazione Sicurezza', type: 'SAFETY' },
    'SYS-KAIZEN': { name: 'Proposta Miglioramento', type: 'KAIZEN' },
    'SYS-WORKSHOP': { name: 'Richiesta Officina', type: 'OTHER' },
    'SYS-PLANT': { name: 'Manutenzione Impianti', type: 'FACILITY' },
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
                type: info.type as any,
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

// --- Helper for purchase requests ---
async function checkAndCreatePurchaseRequest(partId: string) {
    const part = await prisma.sparePart.findUnique({ where: { id: partId } });
    if (!part || part.quantity > part.minQuantity) return;

    const existingActiveRequest = await prisma.purchaseRequest.findFirst({
        where: {
            partId: part.id,
            status: { in: ["DRAFT", "SUBMITTED", "APPROVED", "ORDERED"] }
        }
    });

    if (existingActiveRequest) return;

    const suggestedQuantity = Math.max((part.minQuantity * 2) - part.quantity, 10);

    await prisma.purchaseRequest.create({
        data: {
            partId: part.id,
            quantity: suggestedQuantity,
            status: "DRAFT",
            reason: `Giacenza critica (${part.quantity} / ${part.minQuantity}) - Auto-riordino dal sistema`,
            expectedCost: suggestedQuantity * (part.unitCost || 0)
        }
    });

    const purchasingUsers = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPERVISOR'] } } });
    for (const u of purchasingUsers) {
        await prisma.notification.create({
            data: {
                userId: u.id,
                title: "Riordino Automatico Generato",
                message: `Creata bozza d'acquisto per ${part.name} (${suggestedQuantity}pz).`,
                link: "/inventory/purchase-requests"
            }
        });
    }
}

// --- Ported Actions ---

export async function rescheduleWorkOrder(id: string, newDate: Date) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };

    try {
        const woRepo = getWORepo();
        const wo = await woRepo.findById(id);
        if (!wo) return { success: false, message: 'Ordine non trovato' };

        const props = wo.toJSON();
        const updatedWO = new WorkOrder({ ...props, dueDate: newDate });
        await woRepo.save(updatedWO);

        revalidatePath('/planning/calendar');
        revalidateWorkOrders();
        return { success: true, message: 'Data aggiornata' };
    } catch (error) {
        console.error("Reschedule Error:", error);
        return { success: false, message: 'Errore riprogrammazione' };
    }
}

export async function assignWorkOrder(workOrderId: string, technicianId: string, date?: Date) {
    try {
        const session = await auth();
        const techRepo = getTechRepo();
        const woRepo = getWORepo();

        let tech = await techRepo.findById(technicianId);

        if (!tech) {
            const user = await prisma.user.findUnique({ where: { id: technicianId } });
            if (user && (user.role === 'SUPERVISOR' || user.role === 'MAINTAINER')) {
                const savedTech = await techRepo.save(new (await import('../../domain/entities/technician')).Technician({
                    name: user.name || 'Technician',
                    userId: user.id,
                    specialty: user.role === 'SUPERVISOR' ? 'Supervisor' : 'General',
                    hourlyRate: 0
                }));
                tech = savedTech;
            }
        }

        if (!tech) return { success: false, message: "Tecnico non trovato" };

        const wo = await woRepo.findById(workOrderId);
        if (!wo) return { success: false, message: "Ordine non trovato" };

        const updatedWO = new WorkOrder({
            ...wo.toJSON(),
            assignedTechnicianId: tech.id,
            status: 'ASSIGNED',
            dueDate: date || wo.dueDate
        });
        await woRepo.save(updatedWO);

        const existingRel = await prisma.workOrderTechnician.findUnique({
            where: {
                workOrderId_technicianId: {
                    workOrderId,
                    technicianId: tech.id!
                }
            }
        });

        if (!existingRel) {
            await prisma.workOrderTechnician.create({
                data: {
                    workOrderId,
                    technicianId: tech.id!
                }
            });
        }

        if (tech.userId) {
            await prisma.notification.create({
                data: {
                    userId: tech.userId,
                    title: "Nuovo Incarico",
                    message: `Ti è stato assegnato un nuovo ordine di lavoro: ${wo.title}`,
                    link: `/work-orders/${wo.id}`
                }
            });
        }

        if (session?.user) {
            await logAction("ASSIGN_WO", workOrderId, `Assigned to ${tech.name}` + (date ? ` on ${date}` : ""));
        }

        revalidatePath('/');
        revalidateWorkOrders();
        return { success: true, message: "Assegnazione completata" };

    } catch (error) {
        console.error("Assign Error:", error);
        return { success: false, message: "Errore assegnazione" };
    }
}

export async function updateWorkOrderAssignments(workOrderId: string, technicianIds: string[]) {
    try {
        const session = await auth();
        const techRepo = getTechRepo();
        const woRepo = getWORepo();

        await prisma.workOrderTechnician.deleteMany({
            where: { workOrderId }
        });

        const resolvedIds: string[] = [];
        for (const inputId of technicianIds) {
            let tech = await techRepo.findById(inputId);
            if (!tech) {
                const user = await prisma.user.findUnique({ where: { id: inputId } });
                if (user && (user.role === 'SUPERVISOR' || user.role === 'MAINTAINER')) {
                    tech = await techRepo.save(new (await import('../../domain/entities/technician')).Technician({
                        name: user.name || 'Technician',
                        userId: user.id,
                        specialty: user.role === 'SUPERVISOR' ? 'Supervisor' : 'General',
                        hourlyRate: 0
                    }));
                }
            }
            if (tech) resolvedIds.push(tech.id!);
        }

        const wo = await woRepo.findById(workOrderId);
        if (!wo) return { success: false, message: "Ordine non trovato" };

        if (resolvedIds.length > 0) {
            await prisma.workOrderTechnician.createMany({
                data: resolvedIds.map(id => ({
                    workOrderId,
                    technicianId: id
                }))
            });

            const updatedWO = new WorkOrder({
                ...wo.toJSON(),
                assignedTechnicianId: resolvedIds[0],
                status: 'ASSIGNED'
            });
            await woRepo.save(updatedWO);

            for (const techId of resolvedIds) {
                const tech = await techRepo.findById(techId);
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
            const updatedWO = new WorkOrder({
                ...wo.toJSON(),
                assignedTechnicianId: null,
                status: 'OPEN'
            });
            await woRepo.save(updatedWO);
        }

        revalidatePath("/work-orders");
        revalidatePath(`/work-orders/${workOrderId}`);
        revalidateWorkOrders();
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
                    in: ["OPEN"]
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
        const workOrders = await prisma.workOrder.findMany({
            where: {
                assignedTechnicianId: null,
                status: { in: ["OPEN", "PENDING_APPROVAL"] }
            },
            include: { asset: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        });

        const woItems = workOrders.map(wo => ({
            id: wo.id,
            type: 'WO',
            title: wo.title,
            assetName: wo.assetId,
            priority: wo.priority as string,
            status: wo.status as string,
            category: wo.category as string
        }));

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
            priority: 'MEDIUM',
            status: 'SCHEDULED',
            category: 'PREVENTIVE',
            dueDate: sch.nextDueDate.toISOString()
        }));

        return [...woItems, ...pmItems];
    } catch (error) {
        console.error("Error fetching planner items:", error);
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

        return activeWOs.map(wo => ({
            ...wo,
            createdAt: wo.createdAt.toISOString()
        }));
    } catch (error) {
        console.error("Failed to get active WOs:", error);
        return [];
    }
}

export async function createWorkOrder(rawData: any) {
    const session = await auth();
    if (!session?.user) {
        return { success: false, message: "Non autorizzato. Effettua il login." };
    }

    try {
        const validation = workOrderSchema.safeParse(rawData);
        if (!validation.success) {
            const zError = validation.error as any;
            const issues = zError.issues || zError.errors || [];
            const errorMsg = issues.length > 0
                ? issues.map((e: any) => e.message).join(", ")
                : "Unknown Validation Error";
            return { success: false, message: "Dati non validi: " + errorMsg };
        }
        const data = validation.data;

        await ensureVirtualAsset(data.assetId);

        const newWO = await prisma.workOrder.create({
            data: {
                title: data.title,
                description: data.description,
                assetId: data.assetId,
                priority: data.priority as any,
                category: data.category as any,
                status: data.status as any,
                type: data.type as any,
                dueDate: data.dueDate,
                requesterId: data.requesterId || session.user.id,
                validatedById: data.validatedById,
                assignedTechnicianId: data.assignedTechnicianId,
                plantId: data.plantId || (await prisma.asset.findUnique({ where: { id: data.assetId } }))?.plantId || (session.user as any).plantId,
                checklist: data.checklist && data.checklist.length > 0 ? {
                    create: data.checklist.map((c: any) => ({
                        label: c.label,
                        completed: c.completed
                    }))
                } : undefined
            }
        });

        await logAction('CREATE_WO', newWO.id, `Created Work Order: ${newWO.title}`);

        if (newWO.assignedTechnicianId) {
            const tech = await prisma.technician.findUnique({ where: { id: newWO.assignedTechnicianId } });
            if (tech && tech.userId) {
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

        if ((newWO.category === 'SAFETY' || newWO.assetId === 'SYS-SAFETY') &&
            (newWO.priority === 'HIGH' || newWO.priority === 'STOPPED')) {

            const supervisors = await prisma.user.findMany({
                where: { role: 'SUPERVISOR' },
                select: { id: true }
            });

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

        revalidatePath('/work-orders');
        revalidatePath('/requests');
        revalidatePath('/');
        revalidateWorkOrders();
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
                status: 'ASSIGNED',
                type: 'FAULT',
                priority: priority as WorkOrderPriority,
                assignedTechnicianId: technicianId,
                assignedTo: tech?.name || 'Assigned'
            }
        });

        await prisma.workOrderTechnician.create({
            data: {
                workOrderId: id,
                technicianId: technicianId
            }
        });

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
        revalidateWorkOrders();
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

            try {
                const { learnFromWorkOrder } = await import('@/lib/ai-service');
                if (wo.ewoFilled && wo.ewo) {
                    await learnFromWorkOrder(
                        wo.ewo.description || wo.description,
                        wo.ewo.solutionApplied,
                        wo.category
                    );
                } else if (feedback) {
                    await learnFromWorkOrder(wo.description, feedback, wo.category);
                }
            } catch (kError) {
                console.error("Learning Trigger Failed:", kError);
            }

            if (wo.originScheduleId && wo.originSchedule) {
                const sched = wo.originSchedule;
                const nextDate = new Date();
                const daysToAdd = sched.frequencyDays;
                nextDate.setDate(nextDate.getDate() + daysToAdd);

                await prisma.preventiveSchedule.update({
                    where: { id: sched.id },
                    data: {
                        lastRunDate: new Date(),
                        nextDueDate: nextDate
                    }
                });
            }

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
                    status: 'IN_PROGRESS',
                }
            });
            await logAction('REVIEW_WO', id, 'Rejected and Sent Back');
        }

        revalidatePath('/work-orders');
        revalidatePath(`/work-orders/${id}`);
        revalidatePath('/maintenance/schedule');
        revalidateWorkOrders();
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
        const wo = await prisma.workOrder.findUnique({ where: { id } });
        let typeUpdate = {};

        if (wo?.type === 'REQUEST' && status !== 'PENDING_APPROVAL' && status !== 'CANCELED') {
            typeUpdate = { type: 'FAULT' };
        }

        const validStatus = status as WorkOrderStatus;

        await prisma.workOrder.update({
            where: { id },
            data: {
                status: validStatus,
                ...typeUpdate
            }
        });

        await logAction('UPDATE_WO_STATUS', id, `Status changed to ${status}`);

        revalidatePath('/maintenance');
        revalidatePath('/work-orders');
        revalidatePath('/requests');
        revalidatePath('/');
        revalidateWorkOrders();
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
        revalidatePath('/');
        revalidateWorkOrders();
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

        await logAction('UPDATE_WO_DETAILS', id, 'Updated details');

        revalidatePath('/work-orders');
        revalidatePath('/maintenance');
        revalidatePath(`/work-orders/${id}`);
        revalidateWorkOrders();
        return { success: true, message: 'Ordine aggiornato', data: updated };
    } catch (error) {
        console.error("Update WO Error:", error);
        return { success: false, message: 'Errore aggiornamento' };
    }
}

export async function createPreventiveFromEWO(
    workOrderId: string,
    assetId: string,
    taskTitle: string,
    description: string,
    frequency: string,
    frequencyDays: number
) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };

    try {
        let actualAssetId = assetId;
        if (assetId === 'auto-resolve-in-server') {
            const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId }, select: { assetId: true } });
            if (wo) {
                actualAssetId = wo.assetId;
            } else {
                return { success: false, message: 'Work Order non trovato per risalire all\'asset' };
            }
        }

        const nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + frequencyDays);

        const schedule = await prisma.preventiveSchedule.create({
            data: {
                taskTitle,
                description,
                frequency,
                frequencyDays,
                assetId: actualAssetId,
                nextDueDate,
                activities: JSON.stringify([{ label: taskTitle, completed: false }])
            }
        });

        await logAction('CREATE_PREVENTIVE', schedule.id, `Created from EWO #${workOrderId}`);

        revalidatePath('/planning/calendar');
        revalidatePath(`/assets/${actualAssetId}`);
        revalidatePath('/work-orders');

        return { success: true, message: 'Piano Preventivo Generato con Successo!' };
    } catch (error) {
        console.error("Create Preventive Error:", error);
        return { success: false, message: 'Errore durante la creazione del piano preventivo' };
    }
}

export async function startWorkSession(workOrderId: string) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };

    try {
        await prisma.workOrderTimer.updateMany({
            where: { workOrderId, userId: session.user.id, endTime: null },
            data: { endTime: new Date() }
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
        revalidateWorkOrders();
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
            const durationArr = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

            const tech = await prisma.technician.findUnique({ where: { userId: session.user.id } });

            if (tech && durationArr > 0) {
                await prisma.laborLog.create({
                    data: {
                        workOrderId: workOrderId,
                        technicianId: tech.id,
                        technicianName: tech.name,
                        hours: parseFloat(durationArr.toFixed(2)),
                        date: end,
                        note: note
                    }
                });
            }

            await prisma.workOrderTimer.update({
                where: { id: activeTimer.id },
                data: {
                    endTime: end,
                    duration: Math.round((end.getTime() - start.getTime()) / 1000 / 60),
                    note
                }
            });
        }

        await prisma.workOrder.update({
            where: { id: workOrderId },
            data: { status: 'ON_HOLD' }
        });

        revalidatePath(`/work-orders/${workOrderId}`);
        revalidateWorkOrders();
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

            const tech = await prisma.technician.findUnique({ where: { userId: session.user.id } });

            if (tech && durationMinutes > 1) {
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

        await prisma.workOrder.update({
            where: { id: workOrderId },
            data: { status: 'ON_HOLD' }
        });

        revalidatePath(`/work-orders/${workOrderId}`);
        revalidateWorkOrders();
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
        const wo = await prisma.workOrder.findUnique({
            where: { id: workOrderId },
            include: { checklist: true }
        });

        if (!wo) return { success: false, message: 'Ordine non trovato' };

        const pendingItems = wo.checklist.filter(i => !i.completed);
        if (pendingItems.length > 0) {
            return { success: false, message: `Checklist incompleta: ${pendingItems.length} voci rimanenti.` };
        }

        const stopNote = note || "Ordine Completato";
        await stopWorkSession(workOrderId, stopNote);

        await prisma.workOrder.update({
            where: { id: workOrderId },
            data: { status: 'COMPLETED' }
        });

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
        revalidateWorkOrders();
        return { success: true, message: 'Ordine completato' };
    } catch (error) {
        return { success: false, message: 'Errore completamento' };
    }
}

export async function importWorkOrders(workOrders: any[]) {
    const { authorized, message } = await requireRole(['ADMIN', 'PROCESS_ENGINEER']);
    if (!authorized) return { success: false, message: message || "Unauthorized", count: 0, errors: ["Unauthorized"] };
    let count = 0;
    const errors: string[] = [];
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
            await prisma.workOrder.create({ data: woData as any });
            count++;
        } catch (e) {
            errors.push(`Failed to import WO: ${wo.title}`);
        }
    }
    revalidatePath('/work-orders');
    return { success: true, count, errors };
}

export async function assignWorkOrderToSelf(workOrderId: string) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autenticato' };

    try {
        const tech = await prisma.technician.findUnique({
            where: { userId: session.user.id }
        });

        if (!tech) {
            return { success: false, message: 'Profilo tecnico non trovato.' };
        }

        const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
        if (!wo) return { success: false, message: 'Ordine non trovato' };

        if (wo.assignedTechnicianId && wo.assignedTechnicianId !== tech.id) {
            return { success: false, message: 'Ordine già assegnato.' };
        }

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
        revalidateWorkOrders();
        return { success: true, message: 'Ordine preso in carico' };
    } catch (error) {
        console.error("Self Assign Error:", error);
        return { success: false, message: 'Errore durante la presa in carico' };
    }
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

        const updatedPart = await prisma.sparePart.update({
            where: { id: partId },
            data: { quantity: part.quantity - quantity, lastUpdated: new Date() }
        });

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
        await logAction('ADD_PART_WO', workOrderId, `Aggiunto ${quantity}x ${part.name}`);
        revalidateWorkOrders();
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

        const originalPart = await prisma.sparePart.findFirst({ where: { id: woPart.partId } });

        if (originalPart) {
            await prisma.sparePart.update({
                where: { id: originalPart.id },
                data: { quantity: originalPart.quantity + woPart.quantity, lastUpdated: new Date() }
            });
        }

        await prisma.workOrderPart.delete({ where: { id } });

        revalidatePath(`/work-orders/${woPart.workOrderId}`);
        revalidateWorkOrders();
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

        const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
        if (item) revalidatePath(`/work-orders/${item.workOrderId}`);

        revalidateWorkOrders();
        return { success: true, message: 'Checklist aggiornata' };
    } catch (e) {
        return { success: false, message: 'Errore aggiornamento checklist' };
    }
}

export async function confirmEWO(workOrderId: string) {
    const session = await auth();
    if (!session?.user) return { success: false, message: 'Non autorizzato' };
    try {
        await prisma.workOrder.update({
            where: { id: workOrderId },
            data: { ewoFilled: true }
        });
        revalidatePath(`/work-orders/${workOrderId}`);
        revalidateWorkOrders();
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

        await prisma.eWO.upsert({
            where: { workOrderId },
            update: { ...fields, authorName: session.user.name || 'User' },
            create: { ...fields, workOrderId, authorName: session.user.name || 'User' }
        });

        if (partsConsumed && Array.isArray(partsConsumed)) {
            for (const p of partsConsumed) {
                if (p.partId && p.quantity > 0) {
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

        await prisma.workOrder.update({
            where: { id: workOrderId },
            data: { ewoFilled: true }
        });

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

        if (partsConsumed && Array.isArray(partsConsumed)) {
            for (const p of partsConsumed) {
                const part = await prisma.sparePart.findUnique({ where: { id: p.partId } });
                if (part && part.quantity <= part.minQuantity) {
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
                    await checkAndCreatePurchaseRequest(p.partId);
                }
            }
        }

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
        revalidateWorkOrders();
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
        return null;
    }
}
