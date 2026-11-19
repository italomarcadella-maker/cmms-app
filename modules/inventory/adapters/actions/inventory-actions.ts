'use server';

import { requireRole } from '@/lib/auth-guard';
import { SUPERVISION, OPERATIVE } from '@/lib/roles';
import { revalidatePath } from 'next/cache';
import { ServiceLocator } from '@/modules/shared/infrastructure/registry/service-locator';
import { PrismaSparePartRepository } from '../db/prisma-spare-part-repository';
import { PrismaPurchaseRequestRepository } from '../db/prisma-purchase-request-repository';
import { PurchaseRequest } from '../../domain/entities/purchase-request';
import { SparePart } from '../../domain/entities/spare-part';
import { makeFulfillPurchaseRequest } from '../../domain/use-cases/fulfill-purchase-request';

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
        return await getRequestRepo().findAllWithPart();
    } catch (e) {
        console.error("Failed to fetch purchase requests:", e);
        return [];
    }
}

export async function updatePurchaseRequestStatus(id: string, status: string) {
    const __guard = await requireRole(SUPERVISION);
    if (!__guard.authorized) return { success: false, message: __guard.message ?? 'Non autorizzato' };
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
    const __guard = await requireRole(SUPERVISION);
    if (!__guard.authorized) return { success: false, message: __guard.message ?? 'Non autorizzato' };
    try {
        const fulfillPurchaseRequest = makeFulfillPurchaseRequest(getRequestRepo(), getPartRepo());
        const result = await fulfillPurchaseRequest(id);

        if (result.success) {
            revalidatePath("/inventory/purchase-requests");
            revalidatePath("/inventory");
        }
        return result;
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
                plantId: json.plantId ?? null,
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
        console.error('[inventory-actions]', error);
        return [];
    }
}

export async function addSparePart(data: { name: string; quantity: number; category?: string; description?: string; location?: string; unitCost?: number; minQuantity?: number; warehouse?: string }) {
    const __guard = await requireRole(OPERATIVE);
    if (!__guard.authorized) return { success: false, message: __guard.message ?? 'Non autorizzato' };
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
                plantId: json.plantId ?? null,
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
        console.error('[inventory-actions]', error);
        return { success: false, message: 'Errore aggiunta ricambio' };
    }
}

export async function updateSparePartQuantity(id: string, quantity: number) {
    const __guard = await requireRole(OPERATIVE);
    if (!__guard.authorized) return { success: false, message: __guard.message ?? 'Non autorizzato' };
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10_000_000) return { success: false, message: 'Quantita\' non valida' };
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
                plantId: json.plantId ?? null,
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
        console.error('[inventory-actions]', error);
        return { success: false, message: 'Errore aggiornamento giacenza' };
    }
}

/** Carico (delta positivo) o scarico (negativo) della giacenza, atomico: non parte da un valore letto prima, quindi due utenti insieme non si sovrascrivono. */
export async function adjustSparePartQuantity(id: string, delta: number) {
    const __guard = await requireRole(OPERATIVE);
    if (!__guard.authorized) return { success: false, message: __guard.message ?? 'Non autorizzato' };
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100_000) return { success: false, message: 'Quantita\' non valida' };
    try {
        const updated = await getPartRepo().adjustQuantity(id, delta);
        if (!updated) return { success: false, message: delta < 0 ? 'Giacenza insufficiente per lo scarico' : 'Ricambio non trovato' };
        const json = updated.toJSON();
        revalidatePath('/inventory');
        return {
            success: true,
            message: delta > 0 ? 'Carico registrato' : 'Scarico registrato',
            data: {
                id: json.id!, name: json.name, plantId: json.plantId ?? null, category: json.category || '', warehouse: json.warehouse || '',
                quantity: json.quantity, minQuantity: json.minQuantity, location: json.location || '', unitCost: json.unitCost,
                lastUpdated: json.lastUpdated ? json.lastUpdated.toISOString() : new Date().toISOString(),
            },
        };
    } catch (error) {
        console.error('adjustSparePartQuantity', error);
        return { success: false, message: 'Errore aggiornamento giacenza' };
    }
}

export async function deleteSparePart(id: string) {
    const __guard = await requireRole(SUPERVISION);
    if (!__guard.authorized) return { success: false, message: __guard.message ?? 'Non autorizzato' };
    try {
        const partRepo = getPartRepo();
        const success = await partRepo.delete(id);
        if (success) {
            revalidatePath('/inventory');
            return { success: true, message: 'Ricambio eliminato' };
        }
        return { success: false, message: 'Impossibile eliminare il ricambio' };
    } catch (error) {
        console.error('[inventory-actions]', error);
        return { success: false, message: 'Errore eliminazione' };
    }
}

