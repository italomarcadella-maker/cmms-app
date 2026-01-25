'use server';

import { prisma } from '@/lib/prisma';
import { WorkOrderStatus } from '@/lib/types';

export async function getDashboardStats() {
    const totalAssets = await prisma.asset.count();
    const openWorkOrders = await prisma.workOrder.count({
        where: { status: 'OPEN' },
    });
    const completedWorkOrders = await prisma.workOrder.count({
        where: { status: 'COMPLETED' },
    });
    const lowHealthAssets = await prisma.asset.count({
        where: { healthScore: { lt: 70 } },
    });

    return {
        totalAssets,
        openWorkOrders,
        completedWorkOrders,
        lowHealthAssets,
    };
}

export async function getWorkOrders() {
    const workOrders = await prisma.workOrder.findMany({
        include: {
            asset: {
                select: {
                    name: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    // Map to match the UI expected type if necessary, or just return as is and adjust UI
    return workOrders.map((wo: any) => ({
        ...wo,
        assetName: wo.asset.name,
        dueDate: wo.dueDate.toISOString().split('T')[0], // Simple date format
        createdAt: wo.createdAt.toISOString().split('T')[0],
    }));
}

export async function getAssets() {
    const assets = await prisma.asset.findMany({
        orderBy: {
            name: 'asc',
        },
    });

    return assets.map((asset: any) => ({
        ...asset,
        purchaseDate: asset.purchaseDate.toISOString().split('T')[0],
        lastMaintenance: asset.lastMaintenance ? asset.lastMaintenance.toISOString().split('T')[0] : 'N/A',
    }));
}

export async function createWorkOrder(data: any) {
    const { checklist, ...rest } = data;

    // Create the work order
    const workOrder = await prisma.workOrder.create({
        data: {
            ...rest,
            createdAt: new Date(),
            checklist: checklist ? {
                create: checklist.map((item: any) => ({
                    label: item.label,
                    completed: item.completed || false
                }))
            } : undefined
        },
        include: {
            asset: true,
            checklist: true
        }
    });

    return workOrder;
}

export async function getTechnicians() {
    return await prisma.technician.findMany();
}

export async function updateWorkOrderStatus(id: string, status: WorkOrderStatus) {
    await prisma.workOrder.update({
        where: { id },
        data: { status }
    });
}

export async function assignWorkOrder(workOrderId: string, technicianId: string) {
    const tech = await prisma.technician.findUnique({ where: { id: technicianId } });
    if (!tech) throw new Error("Technician not found");

    const workOrder = await prisma.workOrder.update({
        where: { id: workOrderId },
        data: {
            assignedTechnicianId: technicianId,
            assignedTo: tech.name // Keeping legacy field for now
        }
    });

    // Notification Logic
    // Attempt to find a User that matches the Technician name to notify them
    const user = await prisma.user.findFirst({
        where: { name: tech.name }
    });

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

export async function getUserNotifications() {
    const session = await auth();
    if (!session?.user?.email) return [];

    // Need to fetch user id from session or db if not in session type clearly
    // Session user usually has email, let's find user by email to be safe if ID not present
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

    await prisma.notification.update({
        where: { id },
        data: { read: true }
    });

    // No path revalidate needed usually for client component polling/fetching, 
    // but if we server render headers, we might. 
    // Let's rely on client state update or router refresh.
    return { success: true };
}

// --- Energy / Metrics Actions ---

export async function getMeters() {
    return await prisma.meter.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function createMeter(data: any) {
    // validation could be added here
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

    // "AI" Anomaly Detection Logic
    // 1. Fetch last 5 readings
    const lastReadings = await prisma.meterReading.findMany({
        where: { meterId: data.meterId },
        orderBy: { date: 'desc' },
        take: 5
    });

    let isAnomaly = false;
    let aiAnalysis = null;

    if (lastReadings.length > 0) {
        // Calculate average consumption trend (if cumulative) or plain average (if instantaneous)
        // Assuming cumulative for meters like Gas/Water/Elec often are, but let's treat 'value' as daily consumption for simplicity
        // OR treating 'value' as the reading itself. 
        // For simplicity in this demo, 'value' is the absolute reading.

        const lastReading = lastReadings[0];
        const consumption = data.value - lastReading.value;

        if (consumption < 0) {
            // Negative consumption impossible for standard counters (unless rollover)
            isAnomaly = true;
            aiAnalysis = "Rilevato valore inferiore alla lettura precedente. Possibile errore di inserimento o sostituzione contatore.";
        } else if (lastReadings.length >= 3) {
            // Calculate average consumption of previous intervals
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
                const threshold = avgCons * 0.5; // 50% deviation tolerance

                if (consumption > avgCons + threshold) {
                    isAnomaly = true;
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
        include: {
            meter: true
        },
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

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function importAssets(assets: any[]) {
    const session = await auth();
    // Optional: Check permissions
    // if (!session?.user || (session.user as any).role !== 'ADMIN') { ... }

    let count = 0;
    let errors: string[] = [];

    for (const asset of assets) {
        try {
            // Check required fields
            if (!asset.name || !asset.model) {
                continue; // Skip invalid rows
            }

            // Prepare data
            const assetData = {
                name: asset.name,
                model: asset.model,
                serialNumber: asset.serialNumber || `SN-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Fallback
                location: asset.location || 'Unknown',
                status: asset.status || 'OPERATIONAL',
                healthScore: parseInt(asset.healthScore) || 100,
                purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : new Date(),
                department: asset.category || 'General',
                plant: 'Default Plant',
            };

            // If ID provided, try to update, otherwise create
            if (asset.id) {
                await prisma.asset.upsert({
                    where: { id: asset.id },
                    update: assetData,
                    create: { id: asset.id, ...assetData }
                });
            } else {
                await prisma.asset.create({
                    data: assetData
                });
            }
            count++;
        } catch (e) {
            console.error("Error importing asset:", e);
            errors.push(`Failed to import ${asset.name || 'Unknown Asset'}`);
        }
    }

    revalidatePath('/assets');
    return { success: true, count, errors };
}

export async function importWorkOrders(workOrders: any[]) {
    let count = 0;
    let errors: string[] = [];

    for (const wo of workOrders) {
        try {
            // Check required fields
            if (!wo.title || !wo.assetName) continue;

            const asset = await prisma.asset.findFirst({
                where: { name: wo.assetName }
            });

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

            await prisma.workOrder.create({
                data: woData
            });
            count++;
        } catch (e) {
            console.error("Error importing WO", e);
            errors.push(`Failed to import WO: ${wo.title}`);
        }
    }

    revalidatePath('/work-orders');
    return { success: true, count, errors };
}

export async function deleteAsset(id: string) {
    const session = await auth();
    if (!session?.user || (session.user as any).role === 'USER') {
        throw new Error("Unauthorized");
    }

    try {
        await prisma.asset.delete({
            where: { id }
        });
        revalidatePath('/assets');
        return { success: true };
    } catch (error) {
        console.error("Error deleting asset:", error);
        return { success: false, message: "Failed to delete asset" };
    }
}

export async function deleteWorkOrder(id: string) {
    const session = await auth();
    if (!session?.user || (session.user as any).role === 'USER') {
        throw new Error("Unauthorized");
    }

    try {
        await prisma.workOrder.delete({
            where: { id }
        });
        revalidatePath('/work-orders');
        return { success: true };
    } catch (error) {
        console.error("Error deleting work order:", error);
        return { success: false, message: "Failed to delete work order" };
    }
}
