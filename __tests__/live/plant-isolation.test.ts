// @vitest-environment node
/**
 * Verifica di isolamento tra plant sul database VERO (sola lettura, piu' tentativi di scrittura che DEVONO fallire).
 * Non gira nei test normali: serve RUN_LIVE_DB_TESTS=1 e DATABASE_URL.
 *   set -a; source .env; set +a; RUN_LIVE_DB_TESTS=1 npx vitest run __tests__/live
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { basePrisma } from '@/lib/prisma-base';
import { computeScope, withPlantScope, PlantScope } from '@/lib/plant-scope';

const live = !!process.env.RUN_LIVE_DB_TESTS && !!process.env.DATABASE_URL;

describe.skipIf(!live)('isolamento tra plant (database reale)', () => {
    let plants: { id: string; name: string }[] = [];
    let owner: { id: string; name: string }; // plant con dati
    let other: { id: string; name: string }; // plant senza dati
    let ownerAssetId: string;

    const as = (role: string, plantIds: string[], selected?: string): PlantScope =>
        computeScope({ userId: 'test-user', role, memberPlantIds: plantIds, allPlantIds: plants.map(p => p.id), selected });
    // Gli asset di sistema SYS-* sono condivisi per progetto: i conteggi li escludono
    const real = { id: { not: { startsWith: 'SYS-' } } };
    const run = <T,>(scope: PlantScope, fn: () => Promise<T>) => withPlantScope(scope, fn);

    beforeAll(async () => {
        plants = await basePrisma.plant.findMany({ select: { id: true, name: true } });
        const counts = await Promise.all(plants.map(async p => ({ p, n: await basePrisma.asset.count({ where: { plantId: p.id } }) })));
        counts.sort((a, b) => b.n - a.n);
        owner = counts[0].p;
        other = counts[counts.length - 1].p;
        expect(owner.id).not.toBe(other.id);
        ownerAssetId = (await basePrisma.asset.findFirstOrThrow({ where: { plantId: owner.id }, select: { id: true } })).id;
    });

    it('un utente del plant "vuoto" non vede asset, ordini, ricambi e tecnici dell\'altro', async () => {
        const scope = as('PLANT_MANAGER', [other.id]);
        await run(scope, async () => {
            expect(await prisma.asset.count({ where: real })).toBe(0);
            expect(await prisma.workOrder.count()).toBe(0);
            expect(await prisma.sparePart.count()).toBe(0);
            expect(await prisma.meter.count()).toBe(0);
            expect(await prisma.dailyMeeting.count()).toBe(0);
            expect(await prisma.preventiveSchedule.count()).toBe(0);
        });
    });

    it('il responsabile del plant con i dati vede esattamente i propri', async () => {
        const total = await basePrisma.asset.count({ where: { plantId: owner.id, ...real } });
        const scoped = await run(as('PLANT_MANAGER', [owner.id]), () => prisma.asset.count({ where: real }));
        expect(scoped).toBe(total);
    });

    it('l\'admin su "Tutti" vede tutto; scegliendo un plant vede solo quello', async () => {
        const all = await run(as('ADMIN', []), () => prisma.asset.count({ where: real }));
        expect(all).toBe(await basePrisma.asset.count({ where: real }));
        const one = await run(as('ADMIN', [], other.id), () => prisma.asset.count({ where: real }));
        expect(one).toBe(await basePrisma.asset.count({ where: { plantId: other.id, ...real } }));
    });

    it('un record dell\'altro plant non si legge per id', async () => {
        const found = await run(as('PLANT_MANAGER', [other.id]), () => prisma.asset.findUnique({ where: { id: ownerAssetId } }));
        expect(found).toBeNull();
    });

    it('non si puo\' modificare ne\' eliminare un record dell\'altro plant', async () => {
        // I tentativi di scrittura si fanno SOLO su un asset temporaneo creato per il test: se il filtro avesse un
        // difetto, non si tocca nessun dato reale (una versione precedente di questa verifica rinomino' due asset).
        const temp = await basePrisma.asset.create({
            data: { name: 'TEST-ISOLAMENTO', model: 'test', serialNumber: `TEST-ISOLAMENTO-${Date.now()}`, location: 'test', purchaseDate: new Date(), plantId: owner.id },
        });
        try {
            await run(as('PLANT_MANAGER', [other.id]), async () => {
                await expect(prisma.asset.update({ where: { id: temp.id }, data: { name: 'MODIFICATO' } })).rejects.toThrow();
                await expect(prisma.asset.delete({ where: { id: temp.id } })).rejects.toThrow();
                const r = await prisma.asset.updateMany({ where: { id: temp.id }, data: { name: 'MODIFICATO' } });
                expect(r.count).toBe(0);
            });
            const still = await basePrisma.asset.findUnique({ where: { id: temp.id }, select: { name: true } });
            expect(still?.name).toBe('TEST-ISOLAMENTO');
        } finally {
            await basePrisma.asset.delete({ where: { id: temp.id } });
        }
    });

    it('non si puo\' creare un record in un plant non assegnato', async () => {
        await run(as('PLANT_MANAGER', [other.id]), async () => {
            await expect(prisma.workOrder.create({
                data: { title: 'x', description: 'x', priority: 'LOW', category: 'OTHER', assetId: ownerAssetId, plantId: owner.id },
            })).rejects.toThrow(/Stabilimento non consentito|altro stabilimento/);
        });
    });

    it('un ordine su una macchina di un altro plant viene rifiutato anche senza plantId esplicito', async () => {
        await run(as('PLANT_MANAGER', [other.id]), async () => {
            await expect(prisma.workOrder.create({
                data: { title: 'x', description: 'x', priority: 'LOW', category: 'OTHER', assetId: ownerAssetId },
            })).rejects.toThrow(/altro stabilimento/);
            await expect(prisma.checklistItem.create({ data: { label: 'x', workOrderId: 'inesistente' } })).rejects.toThrow();
        });
    });

    it('il registro degli eventi di sicurezza e\' separato per plant', async () => {
        await run(as('PLANT_MANAGER', [other.id]), async () => {
            expect(await prisma.safetyEvent.count({ where: { plantId: owner.id } })).toBe(0);
            await expect(prisma.safetyEvent.create({
                data: { plantId: owner.id, type: 'INJURY', occurredAt: new Date(), createdById: 'test' },
            })).rejects.toThrow(/Stabilimento non consentito/);
        });
    });

    it('i contratti delle ditte esterne sono separati per plant', async () => {
        const contractor = await basePrisma.contractor.create({ data: { name: `Ditta di prova ${Date.now()}` } });
        const contract = await basePrisma.contractorContract.create({
            data: { contractorId: contractor.id, plantId: owner.id, title: 'Prova isolamento', startDate: new Date() },
        });
        try {
            await run(as('PLANT_MANAGER', [other.id]), async () => {
                expect(await prisma.contractorContract.count({ where: { id: contract.id } })).toBe(0);
                expect(await prisma.contractorContract.findUnique({ where: { id: contract.id } })).toBeNull();
                await expect(prisma.contractorContract.create({
                    data: { contractorId: contractor.id, plantId: owner.id, title: 'x', startDate: new Date() },
                })).rejects.toThrow(/Stabilimento non consentito/);
                await expect(prisma.contractorActivity.create({
                    data: { contractId: contract.id, title: 'x', frequencyDays: 30, nextDueDate: new Date() },
                })).rejects.toThrow(/altro stabilimento|non trovato/);
            });
            await run(as('PLANT_MANAGER', [owner.id]), async () => {
                expect(await prisma.contractorContract.count({ where: { id: contract.id } })).toBe(1);
            });
        } finally {
            await basePrisma.contractor.delete({ where: { id: contractor.id } }); // elimina a cascata anche il contratto di prova
        }
    });

    it('un non-admin non puo\' creare o eliminare stabilimenti', async () => {
        await run(as('PLANT_MANAGER', [other.id]), async () => {
            await expect(prisma.plant.create({ data: { name: 'Pirata' } })).rejects.toThrow();
            await expect(prisma.plant.delete({ where: { id: owner.id } })).rejects.toThrow();
        });
    });

    it('senza stabilimenti assegnati non si vede nulla', async () => {
        await run(computeScope({ userId: 'x', role: 'MAINTAINER' }), async () => {
            expect(await prisma.asset.count({ where: real })).toBe(0);
            expect(await prisma.workOrder.count()).toBe(0);
        });
    });
});
