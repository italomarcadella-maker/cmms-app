import { prisma } from '@/lib/prisma';

/**
 * Utenti da avvisare per un evento di uno stabilimento: gli admin (se richiesti) e chi ha uno dei ruoli
 * indicati ed e' assegnato a QUEL plant. Evita notifiche a persone di altri stabilimenti.
 */
export async function usersToNotify(plantId: string | null | undefined, roles: string[]) {
    const wantsAdmin = roles.includes('ADMIN');
    const plantRoles = roles.filter(r => r !== 'ADMIN');
    const or: Record<string, unknown>[] = [];
    if (wantsAdmin) or.push({ role: 'ADMIN' });
    if (plantId && plantRoles.length > 0) {
        or.push({ role: { in: plantRoles }, OR: [{ plantId }, { plants: { some: { plantId } } }] });
    }
    if (or.length === 0) return [];
    return prisma.user.findMany({ where: { isActive: true, OR: or }, select: { id: true } });
}
