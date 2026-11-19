'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-guard';
import { isValidSkillLevel } from '../../domain/skill-matrix';

/**
 * Matrice competenze: una riga per tecnico, una colonna per abilitazione (con scadenza) e per competenza (livello 1-4).
 * I tipi di competenza sono un'anagrafica di gruppo; livelli e abilitazioni seguono lo stabilimento del tecnico
 * (l'isolamento e' in lib/prisma.ts). Il vecchio campo Technician.skills non viene toccato.
 */

const VIEW = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'PROCESS_ENGINEER'];
const EDIT = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR'];
const MANAGE_TYPES = ['ADMIN', 'PLANT_MANAGER'];

type Result = { success: boolean; message: string; id?: string };
const ok = (message: string, id?: string): Result => ({ success: true, message, id });
const fail = (message: string): Result => ({ success: false, message });

const MATRIX_PATH = '/technicians/matrix';

// --- Tipi per l'interfaccia ---

export interface MatrixTechnician {
    id: string;
    name: string;
    specialty: string;
    plantName: string | null;
}

export interface MatrixColumn {
    id: string;
    name: string;
}

export interface MatrixQualification {
    technicianId: string;
    typeId: string;
    expiresAt: string | null; // ISO
}

export interface MatrixSkillLevel {
    technicianId: string;
    skillId: string;
    level: number;
}

export interface SkillMatrix {
    technicians: MatrixTechnician[];
    qualificationTypes: MatrixColumn[];
    skillTypes: MatrixColumn[];
    qualifications: MatrixQualification[];
    levels: MatrixSkillLevel[];
    canEdit: boolean;
    canManageTypes: boolean;
}

// --- Lettura ---

export async function getSkillMatrix(): Promise<SkillMatrix> {
    const { authorized, session } = await requireRole(VIEW);
    const empty: SkillMatrix = {
        technicians: [], qualificationTypes: [], skillTypes: [], qualifications: [], levels: [], canEdit: false, canManageTypes: false,
    };
    if (!authorized) return empty;

    const [technicians, qualificationTypes, skillTypes, qualifications, levels] = await Promise.all([
        prisma.technician.findMany({
            select: { id: true, name: true, specialty: true, user: { select: { plant: { select: { name: true } } } } },
            orderBy: { name: 'asc' },
        }), // filtrato per stabilimento
        prisma.qualificationType.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true } }),
        prisma.skillType.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true } }),
        prisma.technicianQualification.findMany({
            where: { type: { isActive: true } },
            select: { technicianId: true, typeId: true, expiresAt: true },
        }), // filtrato per stabilimento
        prisma.technicianSkill.findMany({
            where: { skill: { isActive: true } },
            select: { technicianId: true, skillId: true, level: true },
        }), // filtrato per stabilimento
    ]);

    return {
        technicians: technicians.map(t => ({
            id: t.id,
            name: t.name,
            specialty: t.specialty,
            plantName: t.user?.plant?.name ?? null,
        })),
        qualificationTypes,
        skillTypes,
        qualifications: qualifications.map(q => ({
            technicianId: q.technicianId,
            typeId: q.typeId,
            expiresAt: q.expiresAt ? q.expiresAt.toISOString() : null,
        })),
        levels: levels.filter(l => l.level >= 1 && l.level <= 4),
        canEdit: EDIT.includes(session.user.role),
        canManageTypes: MANAGE_TYPES.includes(session.user.role),
    };
}

export interface ManagedSkillType extends MatrixColumn {
    isActive: boolean;
}

/** Elenco completo (anche le competenze disattivate) per la finestra "Gestisci competenze". */
export async function getManagedSkillTypes(): Promise<ManagedSkillType[]> {
    const { authorized } = await requireRole(MANAGE_TYPES);
    if (!authorized) return [];
    return prisma.skillType.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, isActive: true } });
}

// --- Celle della matrice ---

/** Data aaaa-mm-gg -> mezzogiorno locale; null se non e' una data di calendario valida. */
function parseDay(value: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return null;
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (y < 2000 || y > 2100) return null;
    const date = new Date(y, mo - 1, d, 12, 0, 0);
    if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
    return date;
}

/** Imposta il livello (0-4) di una competenza per un tecnico. Livello 0 = nessuna riga. */
export async function setSkillLevel(technicianId: string, skillId: string, level: number): Promise<Result> {
    const { authorized, message } = await requireRole(EDIT);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    if (!technicianId || typeof technicianId !== 'string' || !skillId || typeof skillId !== 'string') return fail('Dati non validi.');
    if (!isValidSkillLevel(level)) return fail('Il livello deve essere un numero intero da 0 a 4.');

    const technician = await prisma.technician.findUnique({ where: { id: technicianId }, select: { id: true } }); // filtrato per stabilimento
    if (!technician) return fail('Tecnico non trovato.');
    const skill = await prisma.skillType.findUnique({ where: { id: skillId }, select: { id: true, isActive: true } });
    if (!skill || !skill.isActive) return fail('Competenza non trovata o non piu\' attiva.');

    try {
        if (level === 0) {
            await prisma.technicianSkill.deleteMany({ where: { technicianId, skillId } });
        } else {
            await prisma.technicianSkill.upsert({
                where: { technicianId_skillId: { technicianId, skillId } },
                create: { technicianId, skillId, level },
                update: { level },
            });
        }
    } catch (e) {
        console.error('setSkillLevel', e);
        return fail('Salvataggio non riuscito.');
    }
    revalidatePath(MATRIX_PATH);
    return ok('Livello aggiornato.');
}

/** Abilita o toglie un'abilitazione a un tecnico, con scadenza facoltativa (aaaa-mm-gg). */
export async function setQualificationCell(technicianId: string, typeId: string, enabled: boolean, expiresAt?: string | null): Promise<Result> {
    const { authorized, message } = await requireRole(EDIT);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    if (!technicianId || typeof technicianId !== 'string' || !typeId || typeof typeId !== 'string') return fail('Dati non validi.');

    const technician = await prisma.technician.findUnique({ where: { id: technicianId }, select: { id: true } }); // filtrato per stabilimento
    if (!technician) return fail('Tecnico non trovato.');

    try {
        if (!enabled) {
            await prisma.technicianQualification.deleteMany({ where: { technicianId, typeId } });
        } else {
            const type = await prisma.qualificationType.findUnique({ where: { id: typeId }, select: { id: true, isActive: true } });
            if (!type || !type.isActive) return fail('Tipo di abilitazione non trovato o non piu\' attivo.');
            let date: Date | null = null;
            if (expiresAt) {
                date = parseDay(expiresAt);
                if (!date) return fail('Data di scadenza non valida.');
            }
            await prisma.technicianQualification.upsert({
                where: { technicianId_typeId: { technicianId, typeId } },
                create: { technicianId, typeId, expiresAt: date },
                update: { expiresAt: date }, // le note eventuali restano com'erano
            });
        }
    } catch (e) {
        console.error('setQualificationCell', e);
        return fail('Salvataggio non riuscito.');
    }
    revalidatePath(MATRIX_PATH);
    revalidatePath('/technicians');
    return ok(enabled ? 'Abilitazione aggiornata.' : 'Abilitazione rimossa.');
}

// --- Tipi di competenza ---

function checkName(name: string): string | null {
    const n = (typeof name === 'string' ? name : '').trim();
    if (!n) return 'Il nome della competenza e\' obbligatorio.';
    if (n.length > 80) return 'Il nome puo\' avere al massimo 80 caratteri.';
    return null;
}

async function nameTaken(name: string, exceptId?: string) {
    const clash = await prisma.skillType.findFirst({
        where: { name: { equals: name.trim(), mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) },
        select: { id: true },
    });
    return !!clash;
}

export async function createSkillType(name: string): Promise<Result> {
    const { authorized, message } = await requireRole(MANAGE_TYPES);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    const error = checkName(name);
    if (error) return fail(error);
    if (await nameTaken(name)) return fail('Esiste gia\' una competenza con questo nome.');
    try {
        const last = await prisma.skillType.aggregate({ _max: { sortOrder: true } });
        const created = await prisma.skillType.create({ data: { name: name.trim(), sortOrder: (last._max.sortOrder ?? 0) + 1 } });
        revalidatePath(MATRIX_PATH);
        return ok('Competenza aggiunta.', created.id);
    } catch {
        return fail('Esiste gia\' una competenza con questo nome.');
    }
}

export async function renameSkillType(id: string, name: string): Promise<Result> {
    const { authorized, message } = await requireRole(MANAGE_TYPES);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    const error = checkName(name);
    if (error) return fail(error);
    if (await nameTaken(name, id)) return fail('Esiste gia\' una competenza con questo nome.');
    try {
        await prisma.skillType.update({ where: { id }, data: { name: name.trim() } });
        revalidatePath(MATRIX_PATH);
        return ok('Nome aggiornato.');
    } catch {
        return fail('Aggiornamento non riuscito: competenza non trovata o nome gia\' usato.');
    }
}

export async function setSkillTypeActive(id: string, active: boolean): Promise<Result> {
    const { authorized, message } = await requireRole(MANAGE_TYPES);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    try {
        await prisma.skillType.update({ where: { id }, data: { isActive: !!active } });
        revalidatePath(MATRIX_PATH);
        return ok(active ? 'Competenza riattivata.' : 'Competenza disattivata: i livelli gia\' assegnati restano archiviati.');
    } catch {
        return fail('Competenza non trovata.');
    }
}
