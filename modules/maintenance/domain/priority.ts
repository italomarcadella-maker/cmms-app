/**
 * Ordine di urgenza delle priorita' degli ordini di lavoro, dalla piu' urgente.
 * Non si puo' usare l'ordinamento del database sul campo: l'enum e' ordinato per dichiarazione (STOPPED, MALFUNCTIONING,
 * WORKING, NOT_PRODUCTION, HIGH, MEDIUM, LOW), che non coincide con l'urgenza.
 */
export const PRIORITY_ORDER = ['STOPPED', 'MALFUNCTIONING', 'HIGH', 'WORKING', 'MEDIUM', 'NOT_PRODUCTION', 'LOW'] as const;

export function priorityRank(priority: string): number {
    const i = (PRIORITY_ORDER as readonly string[]).indexOf(priority);
    return i === -1 ? PRIORITY_ORDER.length : i;
}

/** Comparatore: prima la priorita' piu' urgente, a parita' l'ordine piu' vecchio. */
export function byUrgency<T extends { priority: string; createdAt: Date }>(a: T, b: T): number {
    return priorityRank(a.priority) - priorityRank(b.priority) || a.createdAt.getTime() - b.createdAt.getTime();
}
