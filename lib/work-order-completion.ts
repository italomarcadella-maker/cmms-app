import { prisma } from '@/lib/prisma';

/**
 * Data di chiusura degli ordini (WorkOrder.completedAt). NON e' un file 'use server'.
 *  - Un ordine che passa a COMPLETED o CLOSED riceve la data di chiusura alla PRIMA chiusura (se gia' presente non si tocca).
 *  - Un ordine riaperto (qualsiasi altro stato) la perde.
 * Serve a sapere se un intervento programmato e' stato fatto entro la scadenza (salute degli asset).
 */
export const isClosedStatus = (status: unknown): boolean => status === 'COMPLETED' || status === 'CLOSED';

/** Da chiamare subito dopo un cambio di stato che puo' essere una chiusura o una riapertura. Non lancia mai. */
export async function syncCompletedAt(workOrderId: string, status: unknown): Promise<void> {
    try {
        if (isClosedStatus(status)) {
            await prisma.workOrder.updateMany({ where: { id: workOrderId, completedAt: null }, data: { completedAt: new Date() } });
        } else {
            await prisma.workOrder.updateMany({ where: { id: workOrderId, completedAt: { not: null } }, data: { completedAt: null } });
        }
    } catch (error) {
        console.error('[work-order-completion] syncCompletedAt', workOrderId, error);
    }
}
