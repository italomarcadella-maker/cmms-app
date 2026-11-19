/**
 * Ruoli dell'applicazione e gruppi di ruoli. Fonte unica: tipi, menu, pagine e azioni del server usano questi.
 * Senza dipendenze: si puo' importare anche dal browser.
 */
export const ROLES = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'PROCESS_ENGINEER', 'MAINTAINER', 'USER'] as const;
export type Role = (typeof ROLES)[number];

/** Solo gli amministratori. */
export const ADMINS: readonly Role[] = ['ADMIN'];
/** Amministratori e responsabili di plant. */
export const MANAGERS: readonly Role[] = ['ADMIN', 'PLANT_MANAGER'];
/** Chi coordina il lavoro: admin, responsabili di plant, supervisor. */
export const SUPERVISION: readonly Role[] = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR'];
/** Supervisione piu' ingegneri di processo. */
export const ENGINEERING: readonly Role[] = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'PROCESS_ENGINEER'];
/** Chi lavora sugli interventi: tutti tranne l'utente base (che puo' solo inviare richieste). */
export const OPERATIVE: readonly Role[] = ['ADMIN', 'PLANT_MANAGER', 'SUPERVISOR', 'PROCESS_ENGINEER', 'MAINTAINER'];
/** Qualunque utente connesso. */
export const EVERYONE: readonly Role[] = ROLES;

export function isRole(value: unknown): value is Role {
    return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function hasRole(role: string | undefined | null, allowed: readonly string[]): boolean {
    return !!role && allowed.includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
    ADMIN: 'Amministratore',
    PLANT_MANAGER: 'Responsabile di plant',
    SUPERVISOR: 'Supervisor',
    PROCESS_ENGINEER: 'Ingegnere di processo',
    MAINTAINER: 'Manutentore',
    USER: 'Utente',
};
