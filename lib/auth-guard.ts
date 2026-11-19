import { auth } from '@/auth';

/**
 * Controllo di accesso per azioni del server e route handler. Una sola implementazione.
 * Il responsabile di plant ha i diritti del supervisor, limitati ai propri stabilimenti (il filtro e' in lib/prisma.ts).
 */
export interface AccessResult {
    authorized: boolean;
    message?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session?: any;
}

export async function requireRole(role: string | readonly string[]): Promise<AccessResult> {
    const session = await auth();
    if (!session?.user) {
        return { authorized: false, message: 'Non autenticato' };
    }
    const roles = Array.isArray(role) ? [...role] : [role as string];
    if (roles.includes('SUPERVISOR') && !roles.includes('PLANT_MANAGER')) roles.push('PLANT_MANAGER');
    if (!roles.includes(session.user.role)) {
        return { authorized: false, message: `Non autorizzato: richiesto ruolo ${roles.join(' o ')}` };
    }
    return { authorized: true, session };
}

/** Basta essere connessi (es. per modificare la propria password o inviare una richiesta). */
export async function requireLogin(): Promise<AccessResult> {
    const session = await auth();
    if (!session?.user?.id) return { authorized: false, message: 'Non autenticato' };
    return { authorized: true, session };
}
