'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { ServiceLocator } from '@/modules/shared/infrastructure/registry/service-locator';
import { PrismaSparePartRepository } from '../db/prisma-spare-part-repository';
import { PrismaPurchaseRequestRepository } from '../db/prisma-purchase-request-repository';
import { PurchaseRequest } from '../../domain/entities/purchase-request';
import { SparePart } from '../../domain/entities/spare-part';

// Register dependencies if not registered
try {
    ServiceLocator.resolve('ISparePartRepository');
} catch {
    ServiceLocator.register('ISparePartRepository', new PrismaSparePartRepository());
}
try {
    ServiceLocator.resolve('IPurchaseRequestRepository');
} catch {
    ServiceLocator.register('IPurchaseRequestRepository', new PrismaPurchaseRequestRepository());
}

const getPartRepo = () => ServiceLocator.resolve<PrismaSparePartRepository>('ISparePartRepository');
const getRequestRepo = () => ServiceLocator.resolve<PrismaPurchaseRequestRepository>('IPurchaseRequestRepository');

export async function getPurchaseRequests() {
    try {
        return await prisma.purchaseRequest.findMany({
            include: { part: true },
            orderBy: { requestedAt: "desc" }
        });
    } catch (e) {
        console.error("Failed to fetch purchase requests:", e);
        return [];
    }
}

export async function updatePurchaseRequestStatus(id: string, status: string) {
    try {
        const reqRepo = getRequestRepo();
        const request = await reqRepo.findById(id);
        if (!request) return { success: false, message: "Richiesta non trovata" };

        const updatedRequest = new PurchaseRequest({
            ...request.toJSON(),
            status
        });
        updatedRequest.updateStatus(status);

        await reqRepo.save(updatedRequest);

        revalidatePath("/inventory/purchase-requests");
        return { success: true, message: "Stato aggiornato con successo" };
    } catch (e) {
        console.error("Failed to update status:", e);
        return { success: false, message: "Errore nell'aggiornamento dello stato" };
    }
}

export async function fulfillPurchaseRequest(id: string) {
    try {
        const reqRepo = getRequestRepo();
        const partRepo = getPartRepo();

        const req = await reqRepo.findById(id);
        if (!req) return { success: false, message: "Richiesta non trovata" };

        if (req.status === "RECEIVED") return { success: false, message: "Già ricevuta" };

        const part = await partRepo.findById(req.partId);
        if (part) {
            part.adjustQuantity(req.quantity);
            await partRepo.save(part);
        }

        req.updateStatus("RECEIVED");
        await reqRepo.save(req);

        revalidatePath("/inventory/purchase-requests");
        revalidatePath("/inventory");
        return { success: true, message: "Merce ricevuta e giacenza aggiornata" };
    } catch (e) {
        console.error("Failed to fulfill request:", e);
        return { success: false, message: "Errore durante la chiusura automatica" };
    }
}
export async function getSpareParts(): Promise<any[]> {
    try {
        const partRepo = getPartRepo();
        const parts = await partRepo.findAll();
        return parts.map(part => {
            const json = part.toJSON();
            return {
                id: json.id!,
                name: json.name,
                category: json.category || '',
                warehouse: json.warehouse || '',
                quantity: json.quantity,
                minQuantity: json.minQuantity,
                location: json.location || '',
                unitCost: json.unitCost,
                lastUpdated: json.lastUpdated ? json.lastUpdated.toISOString() : new Date().toISOString()
            };
        });
    } catch (error) {
        return [];
    }
}

export async function addSparePart(data: { name: string; quantity: number; category?: string; description?: string; location?: string; unitCost?: number; minQuantity?: number; warehouse?: string }) {
    try {
        const partRepo = getPartRepo();
        const partEntity = new SparePart({
            ...data,
            minQuantity: data.minQuantity || 0
        });
        const newPart = await partRepo.save(partEntity);
        const json = newPart.toJSON();
        return {
            success: true,
            message: 'Ricambio aggiunto',
            data: {
                id: json.id!,
                name: json.name,
                category: json.category || '',
                warehouse: json.warehouse || '',
                quantity: json.quantity,
                minQuantity: json.minQuantity,
                location: json.location || '',
                unitCost: json.unitCost,
                lastUpdated: json.lastUpdated ? json.lastUpdated.toISOString() : new Date().toISOString()
            }
        };
    } catch (error) {
        return { success: false, message: 'Errore aggiunta ricambio' };
    }
}

export async function updateSparePartQuantity(id: string, quantity: number) {
    try {
        const partRepo = getPartRepo();
        const part = await partRepo.findById(id);
        if (!part) return { success: false, message: 'Ricambio non trovato' };

        const updatedPart = new SparePart({
            ...part.toJSON(),
            quantity
        });
        const saved = await partRepo.save(updatedPart);
        const json = saved.toJSON();

        revalidatePath('/inventory');
        return {
            success: true,
            message: 'Giacenza aggiornata',
            data: {
                id: json.id!,
                name: json.name,
                category: json.category || '',
                warehouse: json.warehouse || '',
                quantity: json.quantity,
                minQuantity: json.minQuantity,
                location: json.location || '',
                unitCost: json.unitCost,
                lastUpdated: json.lastUpdated ? json.lastUpdated.toISOString() : new Date().toISOString()
            }
        };
    } catch (error) {
        return { success: false, message: 'Errore aggiornamento giacenza' };
    }
}

export async function deleteSparePart(id: string) {
    try {
        const partRepo = getPartRepo();
        const success = await partRepo.delete(id);
        if (success) {
            revalidatePath('/inventory');
            return { success: true, message: 'Ricambio eliminato' };
        }
        return { success: false, message: 'Impossibile eliminare il ricambio' };
    } catch (error) {
        return { success: false, message: 'Errore eliminazione' };
    }
}

