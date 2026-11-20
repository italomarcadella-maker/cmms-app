// @vitest-environment node
/**
 * Gerarchia degli asset, distinta ricambi e permessi di lavoro sul database VERO, con dati TEMPORANEI ("TEST-HP-...")
 * che alla fine vengono ELIMINATI. Verifica le scritture con chiave composta e i controlli di stabilimento mai eseguiti altrove.
 * Non gira nei test normali: serve RUN_LIVE_DB_TESTS=1 e DATABASE_URL.
 *   set -a; source .env; set +a; RUN_LIVE_DB_TESTS=1 npx vitest run __tests__/live
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { basePrisma } from '@/lib/prisma-base';
import { computeScope, withPlantScope, PlantScope } from '@/lib/plant-scope';

const live = !!process.env.RUN_LIVE_DB_TESTS && !!process.env.DATABASE_URL;
const tag = `TEST-HP-${Date.now()}`;

describe.skipIf(!live)('gerarchia, distinta e permessi (database reale)', () => {
    let plants: { id: string }[] = [];
    let parentId = '';
    let childId = '';
    let partId = '';
    let woId = '';
    let typeId = '';

    const as = (plantIds: string[]): PlantScope =>
        computeScope({ userId: 'test-user', role: 'PLANT_MANAGER', memberPlantIds: plantIds, allPlantIds: plants.map(p => p.id) });

    beforeAll(async () => {
        plants = await basePrisma.plant.findMany({ select: { id: true }, orderBy: { name: 'asc' } });
        const base = { model: 'prova', location: 'prova', purchaseDate: new Date(), plantId: plants[0].id } as const;
        const parent = await basePrisma.asset.create({ data: { ...base, name: `${tag}-macchina`, serialNumber: `${tag}-A` } });
        const child = await basePrisma.asset.create({ data: { ...base, name: `${tag}-gruppo`, serialNumber: `${tag}-B`, parentId: parent.id } });
        parentId = parent.id; childId = child.id;
        partId = (await basePrisma.sparePart.create({ data: { name: `${tag}-ricambio`, quantity: 4, minQuantity: 1, plantId: plants[0].id } })).id;
        woId = (await basePrisma.workOrder.create({ data: { title: `${tag}-ordine`, description: 'prova', priority: 'MEDIUM', category: 'OTHER', status: 'OPEN', assetId: childId, plantId: plants[0].id } })).id;
        typeId = (await basePrisma.workPermitType.create({ data: { name: `${tag}-permesso`, precautions: ['una', 'due'] } })).id;
    });

    afterAll(async () => {
        await basePrisma.workPermit.deleteMany({ where: { workOrderId: woId } });
        await basePrisma.workPermitType.deleteMany({ where: { id: typeId } });
        await basePrisma.workOrder.deleteMany({ where: { id: woId } });
        await basePrisma.assetPart.deleteMany({ where: { assetId: { in: [parentId, childId] } } });
        await basePrisma.sparePart.deleteMany({ where: { id: partId } });
        await basePrisma.asset.deleteMany({ where: { id: childId } });
        await basePrisma.asset.deleteMany({ where: { id: parentId } });
    });

    it('la gerarchia lega figlio e padre e la distinta accetta lo stesso ricambio una sola volta (upsert a chiave composta)', async () => {
        await withPlantScope(as([plants[0].id]), async () => {
            const kids = await prisma.asset.findMany({ where: { parentId }, select: { id: true } });
            expect(kids.map(k => k.id)).toEqual([childId]);

            const key = { assetId_partId: { assetId: parentId, partId } };
            await prisma.assetPart.upsert({ where: key, update: { quantity: 2 }, create: { assetId: parentId, partId, quantity: 2 } });
            await prisma.assetPart.upsert({ where: key, update: { quantity: 3 }, create: { assetId: parentId, partId, quantity: 3 } });
            const rows = await prisma.assetPart.findMany({ where: { assetId: parentId } });
            expect(rows).toHaveLength(1);
            expect(rows[0].quantity).toBe(3);
        });
        // Un altro stabilimento non vede la distinta
        if (plants.length > 1) {
            const seen = await withPlantScope(as([plants[1].id]), async () => await prisma.assetPart.count({ where: { assetId: parentId } }));
            expect(seen).toBe(0);
        }
    });

    it('un permesso di lavoro si crea, cambia stato solo dallo stato di partenza e resta isolato per stabilimento', async () => {
        await withPlantScope(as([plants[0].id]), async () => {
            const permit = await prisma.workPermit.create({ data: { workOrderId: woId, typeId, requestedByName: 'prova', status: 'REQUESTED' } });
            const approve = await prisma.workPermit.updateMany({ where: { id: permit.id, status: 'REQUESTED' }, data: { status: 'APPROVED', approvedByName: 'prova', approvedAt: new Date() } });
            expect(approve.count).toBe(1);
            // Seconda approvazione: non e' piu' nello stato di partenza, non deve passare
            const again = await prisma.workPermit.updateMany({ where: { id: permit.id, status: 'REQUESTED' }, data: { status: 'APPROVED' } });
            expect(again.count).toBe(0);
        });
        if (plants.length > 1) {
            const seen = await withPlantScope(as([plants[1].id]), async () => await prisma.workPermit.count({ where: { workOrderId: woId } }));
            expect(seen).toBe(0);
        }
    });
});
