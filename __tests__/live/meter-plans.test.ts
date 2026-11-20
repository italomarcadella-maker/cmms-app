// @vitest-environment node
/**
 * Piani a consumo di un contatore sul database VERO, con dati TEMPORANEI ("TEST-MP-...") che alla fine vengono ELIMINATI:
 * la prima lettura fa da base, il consumo oltre l'intervallo genera UN ordine di manutenzione programmata collegato al piano,
 * una nuova verifica non genera un doppione. Non gira nei test normali: serve RUN_LIVE_DB_TESTS=1 e DATABASE_URL.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('@/auth', () => ({ auth: async () => null }));
import { basePrisma } from '@/lib/prisma-base';
import { runUnscoped } from '@/lib/plant-scope';
import { checkMeterPlansNow } from '@/lib/scheduler';

const live = !!process.env.RUN_LIVE_DB_TESTS && !!process.env.DATABASE_URL;
const tag = `TEST-MP-${Date.now()}`;

describe.skipIf(!live)('piani a consumo (database reale)', () => {
    let plantId = '';
    let assetId = '';
    let meterId = '';
    let scheduleId = '';

    beforeAll(async () => {
        plantId = (await basePrisma.plant.findFirstOrThrow({ select: { id: true }, orderBy: { name: 'asc' } })).id;
        assetId = (await basePrisma.asset.create({ data: { name: `${tag}-macchina`, model: 'prova', serialNumber: tag, location: 'prova', purchaseDate: new Date(), plantId } })).id;
        meterId = (await basePrisma.meter.create({ data: { name: `${tag}-ore`, type: 'HOURS', unit: 'h', plantId, assetId } })).id;
        scheduleId = (await basePrisma.preventiveSchedule.create({
            data: {
                taskTitle: `${tag}-piano`, description: 'prova', frequency: 'METER', frequencyDays: 30, assetId,
                triggerType: 'METER', meterId, meterInterval: 100, lastMeterValue: null,
                nextDueDate: new Date(Date.now() + 5 * 365 * 86_400_000),
            },
        })).id;
    });

    afterAll(async () => {
        await basePrisma.workOrder.deleteMany({ where: { assetId } });
        await basePrisma.preventiveSchedule.deleteMany({ where: { id: scheduleId } });
        await basePrisma.meterReading.deleteMany({ where: { meterId } });
        await basePrisma.meter.deleteMany({ where: { id: meterId } });
        await basePrisma.asset.deleteMany({ where: { id: assetId } });
    });

    it('prima lettura = base, consumo oltre 100 ore = un ordine collegato al piano, nessun doppione', async () => {
        const read = (value: number, daysAgo: number) =>
            basePrisma.meterReading.create({ data: { meterId, value, date: new Date(Date.now() - daysAgo * 86_400_000) } });

        await read(10.5, 10);
        const first = await runUnscoped(() => checkMeterPlansNow(meterId));
        expect(first.generated).toBe(0); // la prima lettura e' solo la base
        const afterBase = await basePrisma.preventiveSchedule.findUnique({ where: { id: scheduleId }, select: { lastMeterValue: true } });
        expect(afterBase?.lastMeterValue).toBe(10.5);

        await read(60.25, 5); // consumo 49,75 su 100: non scade
        expect((await runUnscoped(() => checkMeterPlansNow(meterId))).generated).toBe(0);

        await read(125.75, 0); // consumo 115,25 >= 100: scade
        const due = await runUnscoped(() => checkMeterPlansNow(meterId));
        expect(due.errors).toBeUndefined();
        expect(due.generated).toBe(1);

        const orders = await basePrisma.workOrder.findMany({ where: { assetId }, select: { type: true, originScheduleId: true, status: true } });
        expect(orders).toHaveLength(1);
        expect(orders[0]).toMatchObject({ type: 'ROUTINE', originScheduleId: scheduleId, status: 'OPEN' });
        const after = await basePrisma.preventiveSchedule.findUnique({ where: { id: scheduleId }, select: { lastMeterValue: true } });
        expect(after?.lastMeterValue).toBe(125.75);

        // Stessa situazione, nuova verifica: nessun altro ordine
        expect((await runUnscoped(() => checkMeterPlansNow(meterId))).generated).toBe(0);
        expect(await basePrisma.workOrder.count({ where: { assetId } })).toBe(1);
    });
});
