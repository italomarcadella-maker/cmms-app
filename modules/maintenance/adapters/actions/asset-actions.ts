'use server';

import { requireRole } from '@/lib/auth-guard';
import { revalidateAssets } from '@/lib/actions';
import { logAction } from '@/lib/audit';
import { assetSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import { ServiceLocator } from '@/modules/shared/infrastructure/registry/service-locator';
import { PrismaAssetRepository } from '../db/prisma-asset-repository';
import { PrismaWorkOrderRepository } from '../db/prisma-work-order-repository';
import { PrismaScheduleRepository } from '../db/prisma-schedule-repository';
import { makeCreateAsset } from '../../domain/use-cases/create-asset';
import { makeDeleteAsset } from '../../domain/use-cases/delete-asset';
import { Asset, AssetProps } from '../../domain/entities/asset';

// Register dependencies if not already registered (idempotent for dev reload)
try {
    ServiceLocator.resolve('IAssetRepository');
} catch {
    ServiceLocator.register('IAssetRepository', new PrismaAssetRepository());
}
try {
    ServiceLocator.resolve('IWorkOrderRepository');
} catch {
    ServiceLocator.register('IWorkOrderRepository', new PrismaWorkOrderRepository());
}
try {
    ServiceLocator.resolve('IScheduleRepository');
} catch {
    ServiceLocator.register('IScheduleRepository', new PrismaScheduleRepository());
}

const getAssetRepo = () => ServiceLocator.resolve<PrismaAssetRepository>('IAssetRepository');
const getWorkOrderRepo = () => ServiceLocator.resolve<PrismaWorkOrderRepository>('IWorkOrderRepository');
const getScheduleRepo = () => ServiceLocator.resolve<PrismaScheduleRepository>('IScheduleRepository');

export async function addAsset(rawData: any) {
    const { authorized, message } = await requireRole(['ADMIN', 'PLANT_MANAGER', 'PROCESS_ENGINEER']);
    if (!authorized) return { success: false, message };

    try {
        const validation = assetSchema.safeParse(rawData);

        if (!validation.success) {
            let errorMsg = "";
            const err: any = validation.error;
            if (err.errors && Array.isArray(err.errors)) {
                errorMsg = err.errors.map((e: any) => e.message).join(", ");
            } else {
                errorMsg = "Errore di validazione sconosciuto";
            }
            return { success: false, message: "Dati non validi: " + errorMsg };
        }
        const data = validation.data;

        const assetProps: AssetProps = {
            name: data.name,
            model: data.model,
            serialNumber: data.serialNumber,
            location: data.location,
            status: data.status as any,
            // healthScore non si inserisce: lo calcola il sistema (lib/asset-health-sync.ts) da guasti, richieste e piani
            type: data.type as any,
            purchaseDate: data.purchaseDate,
            department: data.department || null,
            plantId: data.plant || null,
            line: data.line || null,
            cespite: data.cespite || null,
            vendor: data.vendor || null,
        };

        const createAssetUseCase = makeCreateAsset(getAssetRepo());
        const newAsset = await createAssetUseCase(assetProps);

        await logAction('CREATE_ASSET', newAsset.id!, `Created asset ${newAsset.name}`);
        revalidatePath('/');
        revalidateAssets();
        return { success: true, message: 'Asset creato con successo', data: newAsset.toJSON() };
    } catch (error: any) {
        console.error('[asset-actions]', error);
        return { success: false, message: (error as { code?: string })?.code === 'P2002' ? 'Matricola gia\' presente.' : 'Errore creazione asset.' };
    }
}

export async function updateAsset(id: string, rawData: any) {
    const { authorized, message } = await requireRole(['ADMIN', 'PLANT_MANAGER', 'PROCESS_ENGINEER']);
    if (!authorized) return { success: false, message };

    try {
        const validation = assetSchema.partial().safeParse(rawData);
        if (!validation.success) {
            let errorMsg = "";
            const err: any = validation.error;
            if (err.errors && Array.isArray(err.errors)) {
                errorMsg = err.errors.map((e: any) => e.message).join(", ");
            } else {
                errorMsg = "Dati non validi";
            }
            return { success: false, message: "Dati non validi: " + errorMsg };
        }
        const data = validation.data;

        const assetRepo = getAssetRepo();
        const existingAsset = await assetRepo.findById(id);
        if (!existingAsset) {
            return { success: false, message: 'Asset non trovato' };
        }

        // Apply modifications on the Domain Entity
        const props = existingAsset.toJSON();
        // La salute e' calcolata: un valore arrivato dal browser (es. quello vecchio di una lista) non deve sovrascriverla
        const { plant, line, healthScore: _ignoredHealth, ...restData } = data;
        
        const updatedProps = {
            ...props,
            ...restData,
            plantId: plant !== undefined ? plant : props.plantId,
            line: line !== undefined ? line : props.line
        };

        const updatedAsset = new Asset(updatedProps as any);
        const savedAsset = await assetRepo.save(updatedAsset);

        await logAction('UPDATE_ASSET', id, 'Updated asset details');
        revalidatePath('/');
        revalidateAssets();
        return { success: true, message: 'Asset aggiornato', data: savedAsset.toJSON() };
    } catch (error) {
        console.error('[asset-actions]', error);
        return { success: false, message: 'Errore aggiornamento asset' };
    }
}

export async function deleteAsset(id: string) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };

    try {
        const deleteAssetUseCase = makeDeleteAsset(getAssetRepo(), getWorkOrderRepo(), getScheduleRepo());
        const result = await deleteAssetUseCase(id);

        if (result.success) {
            await logAction('DELETE_ASSET', id, 'Deleted asset');
            revalidatePath('/');
            revalidateAssets();
        }
        return result;
    } catch (error) {
        console.error('[asset-actions]', error);
        return { success: false, message: 'Errore durante l\'eliminazione' };
    }
}
