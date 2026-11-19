'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-guard';
import { crossPlant, getPlantScope, resolveWritePlantId, PlantScopeError } from '@/lib/plant-scope';
import { usersToNotify } from '@/lib/plant-users';

/**
 * Prestito di tecnici tra stabilimenti.
 * Il plant che ha bisogno di un tecnico lo richiede; il responsabile del plant di appartenenza approva.
 * Con il prestito approvato, e nelle date indicate, il tecnico compare tra quelli assegnabili nel plant che lo riceve
 * (regola nel filtro di lib/prisma.ts). Del tecnico degli altri plant si vedono solo nome, specialita' e competenze:
 * mai la tariffa oraria.
 */

const READERS = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR'];

export interface LendableTechnician {
    technicianId: string;
    name: string;
    specialty: string;
    skills: string[];
    plantId: string;
    plantName: string;
}

export interface LoanRow {
    id: string;
    technicianName: string;
    fromPlantName: string;
    toPlantName: string;
    startDate: string;
    endDate: string;
    status: string;
    note: string | null;
    canDecide: boolean;
    canCancel: boolean;
}

async function ownPlantIds() {
    const scope = await getPlantScope();
    if (scope.mode === 'all' || scope.mode === 'bypass') return { all: true, ids: scope.allowedPlantIds };
    return { all: false, ids: scope.plantIds };
}

/** Tecnici di altri stabilimenti che si possono chiedere in prestito. */
export async function listLendableTechnicians(): Promise<LendableTechnician[]> {
    const { authorized } = await requireRole(READERS);
    if (!authorized) return [];
    const own = await ownPlantIds();
    const rows = await crossPlant('TECHNICIAN_LOAN_LOOKUP', () => prisma.technician.findMany({
        select: {
            id: true, name: true, specialty: true, skills: true,
            user: { select: { plantId: true, isActive: true, plant: { select: { name: true } } } },
        },
        orderBy: { name: 'asc' },
    }));
    return rows
        .filter(t => t.user.isActive !== false && t.user.plantId && !own.ids.includes(t.user.plantId))
        .map(t => ({
            technicianId: t.id,
            name: t.name,
            specialty: t.specialty,
            skills: t.skills,
            plantId: t.user.plantId as string,
            plantName: t.user.plant?.name ?? '-',
        }));
}

export async function requestTechnicianLoan(input: { technicianId: string; startDate: string; endDate: string; note?: string; toPlantId?: string }) {
    const { authorized, message, session } = await requireRole(READERS);
    if (!authorized) return { success: false, message };
    try {
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { success: false, message: 'Date non valide.' };
        if (end < start) return { success: false, message: 'La data di fine precede quella di inizio.' };
        end.setHours(23, 59, 59, 999);

        const toPlantId = await resolveWritePlantId(input.toPlantId);
        const tech = await crossPlant('TECHNICIAN_LOAN_REQUEST', () => prisma.technician.findUnique({
            where: { id: input.technicianId },
            select: { id: true, name: true, user: { select: { plantId: true } } },
        }), { technicianId: input.technicianId });
        const fromPlantId = tech?.user.plantId;
        if (!tech || !fromPlantId) return { success: false, message: 'Tecnico non trovato.' };
        if (fromPlantId === toPlantId) return { success: false, message: 'Il tecnico e\' gia\' nel tuo stabilimento.' };

        const loan = await prisma.technicianLoan.create({
            data: {
                technicianId: tech.id, fromPlantId, toPlantId, startDate: start, endDate: end,
                note: input.note?.trim() || null, requestedById: session.user.id,
            },
        });
        const approvers = await usersToNotify(fromPlantId, ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR']);
        if (approvers.length > 0) {
            await prisma.notification.createMany({
                data: approvers.map(u => ({
                    userId: u.id,
                    title: 'Richiesta di prestito tecnico',
                    message: `Un altro stabilimento chiede ${tech.name} dal ${start.toLocaleDateString('it-IT')} al ${end.toLocaleDateString('it-IT')}.`,
                    link: '/technicians/loans',
                })),
            });
        }
        revalidatePath('/technicians/loans');
        return { success: true, message: 'Richiesta inviata al responsabile dello stabilimento del tecnico.', id: loan.id };
    } catch (e) {
        if (e instanceof PlantScopeError) return { success: false, message: e.message };
        console.error('requestTechnicianLoan', e);
        return { success: false, message: 'Richiesta non riuscita.' };
    }
}

export async function listTechnicianLoans(): Promise<LoanRow[]> {
    const { authorized, session } = await requireRole(READERS);
    if (!authorized) return [];
    const own = await ownPlantIds();
    const mine = (id: string) => own.all || own.ids.includes(id);
    const rows = await prisma.technicianLoan.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
            technician: { select: { name: true } },
            fromPlant: { select: { name: true } },
            toPlant: { select: { name: true } },
        },
    });
    return rows.map(r => ({
        id: r.id,
        technicianName: r.technician.name,
        fromPlantName: r.fromPlant.name,
        toPlantName: r.toPlant.name,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        status: r.status,
        note: r.note,
        canDecide: r.status === 'REQUESTED' && mine(r.fromPlantId),
        canCancel: ['REQUESTED', 'APPROVED'].includes(r.status) && (r.requestedById === session.user.id || mine(r.toPlantId) || mine(r.fromPlantId)),
    }));
}

export async function decideTechnicianLoan(id: string, approve: boolean) {
    const { authorized, message, session } = await requireRole(READERS);
    if (!authorized) return { success: false, message };
    const loan = await prisma.technicianLoan.findUnique({ where: { id } });
    if (!loan) return { success: false, message: 'Richiesta non trovata.' };
    const own = await ownPlantIds();
    if (!own.all && !own.ids.includes(loan.fromPlantId)) return { success: false, message: 'Decide lo stabilimento a cui il tecnico appartiene.' };
    if (loan.status !== 'REQUESTED') return { success: false, message: 'La richiesta e\' gia\' stata gestita.' };
    await prisma.technicianLoan.update({
        where: { id },
        data: { status: approve ? 'APPROVED' : 'REJECTED', decidedById: session.user.id, decidedAt: new Date() },
    });
    const targets = await usersToNotify(loan.toPlantId, ['PLANT_MANAGER', 'SUPERVISOR']);
    const ids = [...new Set([loan.requestedById, ...targets.map(t => t.id)])];
    await prisma.notification.createMany({
        data: ids.map(userId => ({
            userId,
            title: approve ? 'Prestito tecnico approvato' : 'Prestito tecnico rifiutato',
            message: approve ? 'Il tecnico sara\' assegnabile nel tuo stabilimento nelle date richieste.' : 'La richiesta di prestito e\' stata rifiutata.',
            link: '/technicians/loans',
        })),
    });
    revalidatePath('/technicians/loans');
    revalidatePath('/technicians');
    return { success: true, message: approve ? 'Prestito approvato.' : 'Richiesta rifiutata.' };
}

export async function cancelTechnicianLoan(id: string) {
    const { authorized, message } = await requireRole(READERS);
    if (!authorized) return { success: false, message };
    const loan = await prisma.technicianLoan.findUnique({ where: { id } });
    if (!loan) return { success: false, message: 'Richiesta non trovata.' };
    if (!['REQUESTED', 'APPROVED'].includes(loan.status)) return { success: false, message: 'Non annullabile.' };
    await prisma.technicianLoan.update({ where: { id }, data: { status: 'CANCELED' } });
    revalidatePath('/technicians/loans');
    revalidatePath('/technicians');
    return { success: true, message: 'Prestito annullato.' };
}
