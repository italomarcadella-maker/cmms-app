'use server';

import { requireRole, revalidateAssets } from '@/lib/actions';
import { logAction } from '@/lib/audit';
import { assetSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import { ServiceLocator } from '@/modules/shared/infrastructure/registry/service-locator';
import { PrismaAssetRepository } from '../db/prisma-asset-repository';
import { makeCreateAsset } from '../../domain/use-cases/create-asset';
import { Asset, AssetProps } from '../../domain/entities/asset';
import { prisma } from '@/lib/prisma';

// Register dependency if not already registered (idempotent for dev reload)
try {
    ServiceLocator.resolve('IAssetRepository');
} catch {
    ServiceLocator.register('IAssetRepository', new PrismaAssetRepository());
}

const getAssetRepo = () => ServiceLocator.resolve<PrismaAssetRepository>('IAssetRepository');

export async function addAsset(rawData: any) {
    const { authorized, message } = await requireRole(['ADMIN', 'PROCESS_ENGINEER']);
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
            healthScore: data.healthScore,
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
        return { success: false, message: 'Errore creazione asset: ' + error.message };
    }
}

export async function updateAsset(id: string, rawData: any) {
    const { authorized, message } = await requireRole(['ADMIN', 'PROCESS_ENGINEER']);
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
        const { plant, line, ...restData } = data;
        
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
        return { success: false, message: 'Errore aggiornamento asset' };
    }
}

export async function deleteAsset(id: string) {
    const { authorized, message } = await requireRole('ADMIN');
    if (!authorized) return { success: false, message };

    try {
        // Business dependencies validation
        const woCount = await prisma.workOrder.count({ where: { assetId: id } });
        if (woCount > 0) {
            return { success: false, message: `Impossibile eliminare: L'asset ha ${woCount} ordini di lavoro associati. Archivia l'asset invece.` };
        }

        const schedCount = await prisma.preventiveSchedule.count({ where: { assetId: id } });
        if (schedCount > 0) {
            return { success: false, message: `Impossibile eliminare: L'asset ha ${schedCount} manutenzioni programmate.` };
        }

        const assetRepo = getAssetRepo();
        await assetRepo.delete(id);

        await logAction('DELETE_ASSET', id, 'Deleted asset');
        revalidatePath('/');
        revalidateAssets();
        return { success: true, message: 'Asset eliminato con successo' };
    } catch (error) {
        return { success: false, message: 'Errore durante l\'eliminazione' };
    }
}
