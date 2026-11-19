'use server';

import { addDays } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/actions';
import { getPlantScope, runUnscoped } from '@/lib/plant-scope';
import { normalizeKey } from '../../../shared/domain/text-matching';

/**
 * Libreria di gruppo: piani preventivi e SOP pubblicati per modello di macchina.
 * Un plant pubblica un proprio piano/SOP; gli altri lo adottano su una macchina dello stesso modello e poi
 * lo adattano localmente (la copia e' indipendente e mantiene il riferimento al modello di origine).
 */

const ACTORS = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR'];

const modelKey = (vendor: string | null | undefined, model: string) => normalizeKey(`${vendor ?? ''} ${model}`);

export interface LibraryItem {
    id: string;
    kind: 'PM' | 'SOP';
    title: string;
    description: string | null;
    assetVendor: string | null;
    assetModel: string;
    originPlantName: string;
    createdByName: string | null;
    adoptions: number;
    createdAt: string;
    /** Macchine del mio stabilimento dello stesso modello, su cui posso adottarlo. */
    myMatchingAssets: { id: string; name: string }[];
    canDelete: boolean;
}

export interface PublishableItem {
    id: string;
    kind: 'PM' | 'SOP';
    title: string;
    assetName: string;
    assetModel: string;
}

export async function listLibrary(): Promise<LibraryItem[]> {
    const { authorized, session } = await requireRole(['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'MAINTAINER', 'PROCESS_ENGINEER']);
    if (!authorized) return [];
    const scope = await getPlantScope();
    const ownIds = scope.mode === 'all' || scope.mode === 'bypass' ? scope.allowedPlantIds : scope.plantIds;

    const [templates, myAssets] = await Promise.all([
        prisma.sharedTemplate.findMany({ orderBy: { createdAt: 'desc' }, include: { originPlant: { select: { name: true } } } }),
        prisma.asset.findMany({ where: { id: { not: { startsWith: 'SYS-' } } }, select: { id: true, name: true, vendor: true, model: true } }),
    ]);
    return templates.map(t => {
        const key = modelKey(t.assetVendor, t.assetModel);
        return {
            id: t.id,
            kind: t.kind as 'PM' | 'SOP',
            title: t.title,
            description: t.description,
            assetVendor: t.assetVendor,
            assetModel: t.assetModel,
            originPlantName: t.originPlant.name,
            createdByName: t.createdByName,
            adoptions: t.adoptions,
            createdAt: t.createdAt.toISOString(),
            myMatchingAssets: myAssets.filter(a => modelKey(a.vendor, a.model) === key).map(a => ({ id: a.id, name: a.name })),
            canDelete: session.user.role === 'ADMIN' || ownIds.includes(t.originPlantId) && ['PLANT_MANAGER', 'SUPERVISOR'].includes(session.user.role),
        };
    });
}

/** Piani e SOP del mio stabilimento che posso pubblicare. */
export async function listPublishable(): Promise<PublishableItem[]> {
    const { authorized } = await requireRole(ACTORS);
    if (!authorized) return [];
    const [schedules, sops] = await Promise.all([
        prisma.preventiveSchedule.findMany({ include: { asset: { select: { name: true, model: true } } }, orderBy: { taskTitle: 'asc' } }),
        prisma.sopDocument.findMany({ include: { asset: { select: { name: true, model: true } } }, orderBy: { title: 'asc' } }),
    ]);
    return [
        ...schedules.map(s => ({ id: s.id, kind: 'PM' as const, title: s.taskTitle, assetName: s.asset.name, assetModel: s.asset.model })),
        ...sops.map(s => ({ id: s.id, kind: 'SOP' as const, title: s.title, assetName: s.asset.name, assetModel: s.asset.model })),
    ];
}

export async function publishToLibrary(kind: 'PM' | 'SOP', sourceId: string) {
    const { authorized, message, session } = await requireRole(ACTORS);
    if (!authorized) return { success: false, message };
    try {
        if (kind === 'PM') {
            const s = await prisma.preventiveSchedule.findUnique({ where: { id: sourceId }, include: { asset: { select: { vendor: true, model: true, plantId: true } } } });
            if (!s || !s.asset.plantId) return { success: false, message: 'Piano non trovato.' };
            await prisma.sharedTemplate.create({
                data: {
                    kind: 'PM',
                    title: s.taskTitle,
                    description: s.description,
                    assetVendor: s.asset.vendor,
                    assetModel: s.asset.model,
                    payload: { taskTitle: s.taskTitle, description: s.description, frequency: s.frequency, frequencyDays: s.frequencyDays, activities: s.activities },
                    originPlantId: s.asset.plantId,
                    createdById: session.user.id,
                    createdByName: session.user.name ?? null,
                },
            });
        } else {
            const s = await prisma.sopDocument.findUnique({ where: { id: sourceId }, include: { asset: { select: { vendor: true, model: true, plantId: true } } } });
            if (!s || !s.asset.plantId) return { success: false, message: 'SOP non trovata.' };
            await prisma.sharedTemplate.create({
                data: {
                    kind: 'SOP',
                    title: s.title,
                    description: s.product ? `Prodotto: ${s.product}` : null,
                    assetVendor: s.asset.vendor,
                    assetModel: s.asset.model,
                    payload: { title: s.title, aiExtractedParameters: s.aiExtractedParameters, product: s.product },
                    originPlantId: s.asset.plantId,
                    createdById: session.user.id,
                    createdByName: session.user.name ?? null,
                },
            });
        }
        revalidatePath('/library');
        return { success: true, message: 'Pubblicato nella libreria di gruppo.' };
    } catch (e) {
        console.error('publishToLibrary', e);
        return { success: false, message: 'Pubblicazione non riuscita.' };
    }
}

export async function adoptTemplate(templateId: string, assetId: string) {
    const { authorized, message, session } = await requireRole(ACTORS);
    if (!authorized) return { success: false, message };
    try {
        const template = await prisma.sharedTemplate.findUnique({ where: { id: templateId } });
        if (!template) return { success: false, message: 'Elemento non trovato.' };
        // La macchina deve essere del mio stabilimento (filtro per plant) e dello stesso modello
        const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true, vendor: true, model: true, line: true } });
        if (!asset) return { success: false, message: 'Macchina non trovata nel tuo stabilimento.' };
        if (modelKey(asset.vendor, asset.model) !== modelKey(template.assetVendor, template.assetModel)) {
            return { success: false, message: 'La macchina non e\' dello stesso modello.' };
        }
        const payload = template.payload as Record<string, any>;

        if (template.kind === 'PM') {
            const days = Number(payload.frequencyDays) > 0 ? Number(payload.frequencyDays) : 30;
            await prisma.preventiveSchedule.create({
                data: {
                    taskTitle: payload.taskTitle ?? template.title,
                    description: payload.description ?? '',
                    frequency: payload.frequency ?? 'MONTHLY',
                    frequencyDays: days,
                    activities: typeof payload.activities === 'string' ? payload.activities : JSON.stringify(payload.activities ?? []),
                    nextDueDate: addDays(new Date(), days),
                    assetId: asset.id,
                    sourceTemplateId: template.id,
                },
            });
            revalidatePath('/maintenance/schedule');
        } else {
            await prisma.sopDocument.create({
                data: {
                    title: payload.title ?? template.title,
                    assetId: asset.id,
                    aiExtractedParameters: payload.aiExtractedParameters ?? '[]',
                    product: payload.product ?? null,
                    line: asset.line,
                    author: session.user.name ?? 'Libreria di gruppo',
                    sourceTemplateId: template.id,
                    isApproved: false, // va riletta e approvata nel plant che la adotta
                },
            });
            revalidatePath('/process');
        }
        await runUnscoped(() => prisma.sharedTemplate.update({ where: { id: template.id }, data: { adoptions: { increment: 1 } } }));
        revalidatePath('/library');
        return {
            success: true,
            message: template.kind === 'PM'
                ? 'Piano adottato: ora e\' nella tua manutenzione preventiva, adattalo se serve.'
                : 'SOP adottata come bozza: rileggila e approvala prima dell\'uso.',
        };
    } catch (e) {
        console.error('adoptTemplate', e);
        return { success: false, message: 'Adozione non riuscita.' };
    }
}

export async function deleteLibraryItem(templateId: string) {
    const { authorized, message, session } = await requireRole(ACTORS);
    if (!authorized) return { success: false, message };
    const template = await prisma.sharedTemplate.findUnique({ where: { id: templateId } });
    if (!template) return { success: false, message: 'Elemento non trovato.' };
    const scope = await getPlantScope();
    const ownIds = scope.mode === 'all' || scope.mode === 'bypass' ? scope.allowedPlantIds : scope.plantIds;
    if (session.user.role !== 'ADMIN' && !ownIds.includes(template.originPlantId)) {
        return { success: false, message: 'Puoi ritirare solo gli elementi pubblicati dal tuo stabilimento.' };
    }
    await runUnscoped(() => prisma.sharedTemplate.delete({ where: { id: templateId } }));
    revalidatePath('/library');
    return { success: true, message: 'Elemento ritirato dalla libreria.' };
}
