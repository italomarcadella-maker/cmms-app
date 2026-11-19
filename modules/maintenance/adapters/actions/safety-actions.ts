'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-guard';
import { PlantScopeError, resolveWritePlantId } from '@/lib/plant-scope';
import { longestStreakDays, wholeDaysBetween } from '../../domain/shifts';

/**
 * Registro eventi di sicurezza e contatore "giorni senza infortuni".
 * Il contatore parte dall'ultimo INFORTUNIO registrato: se non ce n'e' nessuno non si inventa un numero,
 * si chiede di indicare la data dell'ultimo infortunio. Nessun dato personale: niente nomi ne' dati sanitari.
 */

const RECORDERS = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR'];
export type SafetyEventType = 'INJURY' | 'NEAR_MISS' | 'HAZARD';
const TYPES: SafetyEventType[] = ['INJURY', 'NEAR_MISS', 'HAZARD'];

export interface SafetyPlantCounter {
    plantId: string;
    plantName: string;
    lastInjuryAt: string | null;
    daysSince: number | null;
}

export interface SafetyEventRow {
    id: string;
    plantName: string;
    type: SafetyEventType;
    occurredAt: string;
    description: string | null;
}

export interface SafetyCounter {
    /** Ultimo infortunio tra gli stabilimenti visibili (null = nessuno registrato). */
    lastInjuryAt: string | null;
    /** Serie piu' lunga senza infortuni, se calcolabile (servono almeno due infortuni). */
    recordDays: number | null;
    nearMissLast30d: number;
    perPlant: SafetyPlantCounter[];
    recent: SafetyEventRow[];
    canRecord: boolean;
    canDelete: boolean;
}

export async function getSafetyCounter(): Promise<SafetyCounter> {
    const { authorized, session } = await requireRole(['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'MAINTAINER', 'PROCESS_ENGINEER', 'USER']);
    const empty: SafetyCounter = { lastInjuryAt: null, recordDays: null, nearMissLast30d: 0, perPlant: [], recent: [], canRecord: false, canDelete: false };
    if (!authorized) return empty;

    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * 86_400_000);
    const [plants, events] = await Promise.all([
        prisma.plant.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        prisma.safetyEvent.findMany({ orderBy: { occurredAt: 'desc' }, take: 500, include: { plant: { select: { name: true } } } }),
    ]);

    const injuries = events.filter(e => e.type === 'INJURY');
    const perPlant: SafetyPlantCounter[] = plants.map(p => {
        const last = injuries.find(e => e.plantId === p.id);
        return {
            plantId: p.id,
            plantName: p.name,
            lastInjuryAt: last ? last.occurredAt.toISOString() : null,
            daysSince: last ? wholeDaysBetween(last.occurredAt, now) : null,
        };
    });

    return {
        lastInjuryAt: injuries[0] ? injuries[0].occurredAt.toISOString() : null,
        recordDays: longestStreakDays(injuries.map(e => e.occurredAt), now),
        nearMissLast30d: events.filter(e => e.type === 'NEAR_MISS' && e.occurredAt >= since30).length,
        perPlant,
        recent: events.slice(0, 8).map(e => ({
            id: e.id,
            plantName: e.plant.name,
            type: e.type as SafetyEventType,
            occurredAt: e.occurredAt.toISOString(),
            description: e.description,
        })),
        canRecord: RECORDERS.includes(session.user.role),
        canDelete: ['ADMIN', 'PLANT_MANAGER'].includes(session.user.role),
    };
}

export async function recordSafetyEvent(input: { type: SafetyEventType; occurredAt: string; description?: string; plantId?: string }) {
    const { authorized, message, session } = await requireRole(RECORDERS);
    if (!authorized) return { success: false, message };
    try {
        if (!TYPES.includes(input.type)) return { success: false, message: 'Tipo di evento non valido.' };
        const when = new Date(input.occurredAt);
        if (Number.isNaN(when.getTime())) return { success: false, message: 'Data non valida.' };
        if (when.getTime() > Date.now() + 3_600_000) return { success: false, message: 'La data non puo\' essere nel futuro.' };

        const description = input.description?.trim().slice(0, 300) || null;
        const plantId = await resolveWritePlantId(input.plantId);
        await prisma.safetyEvent.create({
            data: { plantId, type: input.type, occurredAt: when, description, createdById: session.user.id },
        });
        revalidatePath('/');
        return { success: true, message: 'Evento registrato.' };
    } catch (e) {
        if (e instanceof PlantScopeError) return { success: false, message: e.message };
        console.error('recordSafetyEvent', e);
        return { success: false, message: 'Registrazione non riuscita.' };
    }
}

export async function deleteSafetyEvent(id: string) {
    const { authorized, message } = await requireRole(['ADMIN', 'PLANT_MANAGER']);
    if (!authorized) return { success: false, message };
    const found = await prisma.safetyEvent.findUnique({ where: { id }, select: { id: true } }); // filtrato per plant
    if (!found) return { success: false, message: 'Evento non trovato.' };
    await prisma.safetyEvent.delete({ where: { id } });
    revalidatePath('/');
    return { success: true, message: 'Evento eliminato.' };
}
