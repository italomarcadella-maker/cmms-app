import { prisma } from '@/lib/prisma';
import { runUnscoped } from '@/lib/plant-scope';

/**
 * Asset "di sistema": segnaposto condivisi (senza stabilimento) a cui si agganciano le richieste che non riguardano
 * una macchina precisa (segnalazioni di sicurezza, proposte di miglioramento, richieste all'officina, impianti generici).
 * Non sono macchine: restano fuori dai conteggi di macchine e dalla storia di ogni macchina.
 */
export const SYSTEM_ASSETS: Record<string, { name: string; type: 'SAFETY' | 'KAIZEN' | 'OTHER' | 'FACILITY' }> = {
    'SYS-SAFETY': { name: 'Segnalazione Sicurezza', type: 'SAFETY' },
    'SYS-KAIZEN': { name: 'Proposta Miglioramento', type: 'KAIZEN' },
    'SYS-WORKSHOP': { name: 'Richiesta Officina', type: 'OTHER' },
    'SYS-PLANT': { name: 'Manutenzione Impianti', type: 'FACILITY' },
    'SYS-OTHER': { name: 'Altro / Generico', type: 'OTHER' },
};

export const isSystemAssetId = (id: string | null | undefined) => !!id && id.startsWith('SYS-');

/** Crea l'asset di sistema se non esiste ancora (condiviso: creato fuori dallo scope di stabilimento). Non fa nulla per gli altri id. */
export async function ensureSystemAsset(id: string): Promise<void> {
    const info = SYSTEM_ASSETS[id];
    if (!info) return;
    await runUnscoped(() => prisma.asset.upsert({
        where: { id },
        update: {},
        create: {
            id,
            name: info.name,
            type: info.type,
            model: 'System Virtual Asset',
            serialNumber: id,
            location: 'VIRTUAL',
            status: 'OPERATIONAL',
            purchaseDate: new Date(),
            department: 'GENERAL',
        },
    }));
}
