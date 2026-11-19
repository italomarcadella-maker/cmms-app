'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-guard';
import { addMeterReading } from './energy-actions';
import { nextReadingDue } from '../../domain/reading-plan';

/**
 * Letture pianificate dei contatori: si stabilisce ogni quanto leggere e chi lo fa; la lettura compare nel
 * calendario e il valore si inserisce direttamente da li'.
 */

const PLANNERS = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'PROCESS_ENGINEER'];
const READERS = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'PROCESS_ENGINEER', 'MAINTAINER'];

export interface ReadingPlan {
    meterId: string;
    frequencyDays: number | null;
    nextDue: string | null;
    assigneeId: string | null;
    assigneeName: string | null;
}

export async function getReadingPlans(): Promise<ReadingPlan[]> {
    const { authorized } = await requireRole(READERS);
    if (!authorized) return [];
    const meters = await prisma.meter.findMany({
        select: { id: true, readingFrequencyDays: true, nextReadingDue: true, readingAssigneeId: true },
    });
    const ids = [...new Set(meters.map(m => m.readingAssigneeId).filter((x): x is string => !!x))];
    const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
    const name = new Map(users.map(u => [u.id, u.name ?? 'Utente']));
    return meters.map(m => ({
        meterId: m.id,
        frequencyDays: m.readingFrequencyDays,
        nextDue: m.nextReadingDue ? m.nextReadingDue.toISOString() : null,
        assigneeId: m.readingAssigneeId,
        assigneeName: m.readingAssigneeId ? name.get(m.readingAssigneeId) ?? 'Utente' : null,
    }));
}

/** Imposta (o toglie, con frequencyDays = null) la lettura pianificata di un contatore. */
export async function setReadingPlan(meterId: string, plan: { frequencyDays: number | null; firstDue?: string; assigneeId?: string | null }) {
    const { authorized, message } = await requireRole(PLANNERS);
    if (!authorized) return { success: false, message };
    try {
        const meter = await prisma.meter.findUnique({ where: { id: meterId }, select: { id: true } }); // filtrato per plant
        if (!meter) return { success: false, message: 'Contatore non trovato.' };

        if (plan.frequencyDays === null) {
            await prisma.meter.update({ where: { id: meterId }, data: { readingFrequencyDays: null, nextReadingDue: null, readingAssigneeId: null } });
        } else {
            const freq = Math.floor(plan.frequencyDays);
            if (!Number.isFinite(freq) || freq < 1 || freq > 366) return { success: false, message: 'Frequenza non valida.' };
            const first = plan.firstDue ? new Date(`${plan.firstDue}T12:00:00`) : new Date();
            if (Number.isNaN(first.getTime())) return { success: false, message: 'Data non valida.' };
            await prisma.meter.update({
                where: { id: meterId },
                data: { readingFrequencyDays: freq, nextReadingDue: first, readingAssigneeId: plan.assigneeId ?? null },
            });
        }
        revalidatePath('/');
        revalidatePath('/sustainability');
        return { success: true, message: plan.frequencyDays === null ? 'Lettura non piu\' pianificata.' : 'Lettura pianificata.' };
    } catch (e) {
        console.error('setReadingPlan', e);
        return { success: false, message: 'Pianificazione non riuscita.' };
    }
}

export async function assignReading(meterId: string, assigneeId: string) {
    const { authorized, message } = await requireRole(PLANNERS);
    if (!authorized) return { success: false, message };
    const meter = await prisma.meter.findUnique({ where: { id: meterId }, select: { id: true } });
    if (!meter) return { success: false, message: 'Contatore non trovato.' };
    await prisma.meter.update({ where: { id: meterId }, data: { readingAssigneeId: assigneeId } });
    revalidatePath('/');
    return { success: true, message: 'Lettura assegnata.' };
}

/** Registra il valore letto e sposta la lettura alla scadenza successiva. */
export async function recordPlannedReading(meterId: string, value: number) {
    const { authorized, message } = await requireRole(READERS);
    if (!authorized) return { success: false, message };
    try {
        if (!Number.isFinite(value) || value < 0) return { success: false, message: 'Inserisci un valore valido.' };
        const meter = await prisma.meter.findUnique({
            where: { id: meterId },
            select: { id: true, readingFrequencyDays: true, nextReadingDue: true },
        });
        if (!meter) return { success: false, message: 'Contatore non trovato.' };

        const res = await addMeterReading({ meterId, value, date: new Date().toISOString().slice(0, 10) });
        if (!res.success) return { success: false, message: 'Lettura non registrata.' };

        if (meter.readingFrequencyDays && meter.nextReadingDue) {
            await prisma.meter.update({
                where: { id: meterId },
                data: { nextReadingDue: nextReadingDue(meter.nextReadingDue, meter.readingFrequencyDays, new Date()) },
            });
        }
        revalidatePath('/');
        return { success: true, message: 'Lettura registrata.', isAnomaly: res.isAnomaly, aiAnalysis: res.aiAnalysis };
    } catch (e) {
        console.error('recordPlannedReading', e);
        return { success: false, message: 'Registrazione non riuscita.' };
    }
}
