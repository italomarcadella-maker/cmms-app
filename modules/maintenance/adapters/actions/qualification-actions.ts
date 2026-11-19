'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-guard';
import { qualificationState, type QualificationState } from '../../domain/qualifications';

/**
 * Abilitazioni dei manutentori (PLE, lavori in quota, carrello elevatore...).
 * I tipi di abilitazione sono un'anagrafica di gruppo; le abilitazioni dei singoli tecnici
 * seguono lo stabilimento del tecnico. Sono solo nomi e scadenze: nessun dato sanitario.
 */

const VIEW = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'MAINTAINER', 'PROCESS_ENGINEER'];
const EDIT = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR'];
const MANAGE_TYPES = ['ADMIN', 'PLANT_MANAGER'];
const MAX_ITEMS = 30;

type Result = { success: boolean; message: string; id?: string };
const ok = (message: string, id?: string): Result => ({ success: true, message, id });
const fail = (message: string): Result => ({ success: false, message });

const clean = (v: string | null | undefined, max: number) => (v?.trim().slice(0, max) || null);

// --- Tipi per l'interfaccia ---

export interface QualificationTypeRow {
    id: string;
    name: string;
}

export interface TechnicianQualificationRow {
    typeId: string;
    typeName: string;
    expiresAt: string | null;
    notes: string | null;
    state: QualificationState;
}

export interface TechnicianQualifications {
    technicianId: string;
    qualifications: TechnicianQualificationRow[];
}

export interface QualificationOverview {
    types: QualificationTypeRow[];
    technicians: TechnicianQualifications[];
    canEdit: boolean;
    canManageTypes: boolean;
}

// --- Lettura ---

export async function getQualificationOverview(): Promise<QualificationOverview> {
    const { authorized, session } = await requireRole(VIEW);
    const empty: QualificationOverview = { types: [], technicians: [], canEdit: false, canManageTypes: false };
    if (!authorized) return empty;

    const now = new Date();
    const [types, technicians, rows] = await Promise.all([
        prisma.qualificationType.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
        prisma.technician.findMany({ select: { id: true }, orderBy: { name: 'asc' } }), // filtrato per stabilimento
        prisma.technicianQualification.findMany({ include: { type: { select: { name: true, isActive: true } } } }), // filtrato per stabilimento
    ]);

    const byTechnician = new Map<string, TechnicianQualificationRow[]>();
    for (const r of rows) {
        if (!r.type.isActive) continue;
        const list = byTechnician.get(r.technicianId) ?? [];
        list.push({
            typeId: r.typeId,
            typeName: r.type.name,
            expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
            notes: r.notes,
            state: qualificationState(r.expiresAt, now),
        });
        byTechnician.set(r.technicianId, list);
    }
    const order = new Map(types.map((t, i) => [t.id, i]));

    return {
        types: types.map(t => ({ id: t.id, name: t.name })),
        technicians: technicians.map(t => ({
            technicianId: t.id,
            qualifications: (byTechnician.get(t.id) ?? []).sort((a, b) => (order.get(a.typeId) ?? 0) - (order.get(b.typeId) ?? 0)),
        })),
        canEdit: EDIT.includes(session.user.role),
        canManageTypes: MANAGE_TYPES.includes(session.user.role),
    };
}

// --- Abilitazioni di un tecnico ---

export interface QualificationInput {
    typeId: string;
    expiresAt?: string | null; // aaaa-mm-gg
    notes?: string;
}

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

/** Sostituisce l'insieme delle abilitazioni del tecnico (le abilitazioni di tipi non piu' attivi restano archiviate). */
export async function setTechnicianQualifications(technicianId: string, items: QualificationInput[]): Promise<Result> {
    const { authorized, message } = await requireRole(EDIT);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    if (!Array.isArray(items)) return fail('Dati non validi.');
    if (items.length > MAX_ITEMS) return fail(`Al massimo ${MAX_ITEMS} abilitazioni per tecnico.`);

    const technician = await prisma.technician.findUnique({ where: { id: technicianId }, select: { id: true } }); // filtrato per stabilimento
    if (!technician) return fail('Tecnico non trovato.');

    const parsed = new Map<string, { typeId: string; expiresAt: Date | null; notes: string | null }>();
    for (const item of items) {
        if (!item?.typeId || typeof item.typeId !== 'string') return fail('Tipo di abilitazione non valido.');
        let expiresAt: Date | null = null;
        if (item.expiresAt) {
            expiresAt = parseDay(item.expiresAt);
            if (!expiresAt) return fail('Data di scadenza non valida.');
        }
        parsed.set(item.typeId, { typeId: item.typeId, expiresAt, notes: clean(item.notes, 200) });
    }

    const ids = [...parsed.keys()];
    if (ids.length > 0) {
        const found = await prisma.qualificationType.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } });
        if (found.length !== ids.length) return fail('Un tipo di abilitazione non esiste o non e\' piu\' attivo.');
    }

    try {
        await prisma.$transaction([
            prisma.technicianQualification.deleteMany({ where: { technicianId, type: { isActive: true } } }),
            ...(ids.length > 0
                ? [prisma.technicianQualification.createMany({
                    data: [...parsed.values()].map(p => ({ technicianId, typeId: p.typeId, expiresAt: p.expiresAt, notes: p.notes })),
                })]
                : []),
        ]);
    } catch (e) {
        console.error('setTechnicianQualifications', e);
        return fail('Salvataggio non riuscito.');
    }
    revalidatePath('/technicians');
    return ok('Abilitazioni aggiornate.');
}

// --- Tipi di abilitazione ---

function checkName(name: string): string | null {
    const n = (name ?? '').trim();
    if (!n) return 'Il nome dell\'abilitazione e\' obbligatorio.';
    if (n.length > 80) return 'Il nome puo\' avere al massimo 80 caratteri.';
    return null;
}

async function nameTaken(name: string, exceptId?: string) {
    const clash = await prisma.qualificationType.findFirst({
        where: { name: { equals: name.trim(), mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) },
        select: { id: true },
    });
    return !!clash;
}

export async function createQualificationType(name: string): Promise<Result> {
    const { authorized, message } = await requireRole(MANAGE_TYPES);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    const error = checkName(name);
    if (error) return fail(error);
    if (await nameTaken(name)) return fail('Esiste gia\' un\'abilitazione con questo nome.');
    try {
        const last = await prisma.qualificationType.aggregate({ _max: { sortOrder: true } });
        const created = await prisma.qualificationType.create({ data: { name: name.trim(), sortOrder: (last._max.sortOrder ?? 0) + 1 } });
        revalidatePath('/technicians');
        return ok('Tipo di abilitazione aggiunto.', created.id);
    } catch {
        return fail('Esiste gia\' un\'abilitazione con questo nome.');
    }
}

export async function renameQualificationType(id: string, name: string): Promise<Result> {
    const { authorized, message } = await requireRole(MANAGE_TYPES);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    const error = checkName(name);
    if (error) return fail(error);
    if (await nameTaken(name, id)) return fail('Esiste gia\' un\'abilitazione con questo nome.');
    try {
        await prisma.qualificationType.update({ where: { id }, data: { name: name.trim() } });
        revalidatePath('/technicians');
        return ok('Nome aggiornato.');
    } catch {
        return fail('Aggiornamento non riuscito: tipo non trovato o nome gia\' usato.');
    }
}

export async function setQualificationTypeActive(id: string, active: boolean): Promise<Result> {
    const { authorized, message } = await requireRole(MANAGE_TYPES);
    if (!authorized) return fail(message ?? 'Non autorizzato');
    try {
        await prisma.qualificationType.update({ where: { id }, data: { isActive: !!active } });
        revalidatePath('/technicians');
        return ok(active ? 'Tipo di abilitazione riattivato.' : 'Tipo di abilitazione disattivato: le abilitazioni gia\' assegnate restano archiviate.');
    } catch {
        return fail('Tipo di abilitazione non trovato.');
    }
}
