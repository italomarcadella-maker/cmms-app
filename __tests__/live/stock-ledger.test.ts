// @vitest-environment node
/**
 * Registro dei movimenti di magazzino sul database VERO. Crea un articolo TEMPORANEO ("TEST-LEDGER-..."), prova carico, scarico,
 * scarico rifiutato, rettifica e isolamento tra stabilimenti, e alla fine ELIMINA articolo e movimenti di prova.
 * Non gira nei test normali: serve RUN_LIVE_DB_TESTS=1 e DATABASE_URL.
 *   set -a; source .env; set +a; RUN_LIVE_DB_TESTS=1 npx vitest run __tests__/live
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Il registro legge l'utente dalla sessione: nel test non c'e' sessione
vi.mock('@/auth', () => ({ auth: async () => null }));
import { prisma } from '@/lib/prisma';
import { basePrisma } from '@/lib/prisma-base';
import { computeScope, withPlantScope, PlantScope } from '@/lib/plant-scope';
import { applyStockChange, setStockQuantity, InsufficientStockError } from '@/lib/stock-ledger';

const live = !!process.env.RUN_LIVE_DB_TESTS && !!process.env.DATABASE_URL;

describe.skipIf(!live)('registro movimenti di magazzino (database reale)', () => {
    let plants: { id: string }[] = [];
    let partId = '';
    const partName = `TEST-LEDGER-${Date.now()}`;

    const as = (plantIds: string[]): PlantScope =>
        computeScope({ userId: 'test-user', role: 'PLANT_MANAGER', memberPlantIds: plantIds, allPlantIds: plants.map(p => p.id) });

    beforeAll(async () => {
        plants = await basePrisma.plant.findMany({ select: { id: true }, orderBy: { name: 'asc' } });
        expect(plants.length).toBeGreaterThan(0);
        const part = await basePrisma.sparePart.create({ data: { name: partName, quantity: 0, minQuantity: 0, plantId: plants[0].id } });
        partId = part.id;
    });

    afterAll(async () => {
        if (!partId) return;
        await basePrisma.stockMovement.deleteMany({ where: { OR: [{ partId }, { partName }] } });
        await basePrisma.sparePart.deleteMany({ where: { id: partId } });
    });

    it('carico, scarico, scarico rifiutato e rettifica lasciano un movimento coerente e non portano la giacenza sotto zero', async () => {
        const scope = as([plants[0].id]);
        await withPlantScope(scope, async () => {
            const run = <T,>(fn: (tx: typeof prisma) => Promise<T>) => prisma.$transaction(async tx => fn(tx as unknown as typeof prisma));

            await run(tx => applyStockChange(tx, { partId, type: 'RECEIPT', delta: 5, reference: 'TEST:1', note: 'prova' }));
            await run(tx => applyStockChange(tx, { partId, type: 'CONSUMPTION', delta: -3, reference: 'TEST:2' }));

            // Scarico oltre la giacenza: rifiutato, nessuna traccia, giacenza invariata
            await expect(run(tx => applyStockChange(tx, { partId, type: 'CONSUMPTION', delta: -10, reference: 'TEST:3' }))).rejects.toBeInstanceOf(InsufficientStockError);

            const adj = await run(tx => setStockQuantity(tx, { partId, type: 'ADJUSTMENT', newQuantity: 7, reference: 'TEST:4' }));
            expect(adj).toMatchObject({ previous: 2, delta: 5, balanceAfter: 7 });
        });

        const part = await basePrisma.sparePart.findUnique({ where: { id: partId }, select: { quantity: true } });
        expect(part?.quantity).toBe(7);
        const moves = await basePrisma.stockMovement.findMany({ where: { partId }, orderBy: { createdAt: 'asc' } });
        expect(moves.map(m => [m.type, m.delta, m.balanceAfter])).toEqual([['RECEIPT', 5, 5], ['CONSUMPTION', -3, 2], ['ADJUSTMENT', 5, 7]]);
        expect(moves.every(m => m.partName === partName && m.plantId === plants[0].id)).toBe(true);
    });

    it('i movimenti di uno stabilimento non sono visibili da un altro', async () => {
        if (plants.length < 2) return; // serve almeno un secondo stabilimento
        const other = as([plants[1].id]);
        const seen = await withPlantScope(other, async () => await prisma.stockMovement.count({ where: { partId } }));
        expect(seen).toBe(0);
        const own = await withPlantScope(as([plants[0].id]), async () => await prisma.stockMovement.count({ where: { partId } }));
        expect(own).toBe(3);
    });
});
