// Backfill idempotente per il multi-plant: assegna a un plant i record che ne sono privi.
// Uso: node scripts/backfill-multiplant.js [NOME_PLANT]   (default: il plant che ha gia' piu' asset)
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
    const plants = await p.plant.findMany({ include: { _count: { select: { assets: true } } } });
    if (plants.length === 0) { console.log('Nessun plant: niente da fare.'); return; }
    const wanted = process.argv[2];
    const target = wanted
        ? plants.find(pl => pl.name === wanted)
        : [...plants].sort((a, b) => b._count.assets - a._count.assets)[0];
    if (!target) throw new Error(`Plant "${wanted}" non trovato`);
    console.log(`Plant di destinazione per i record senza plant: ${target.name}`);

    const out = {};
    out.assets = (await p.asset.updateMany({ where: { plantId: null }, data: { plantId: target.id } })).count;
    // Gli ordini ereditano il plant dell'asset, poi il default
    const orphanWos = await p.workOrder.findMany({ where: { plantId: null }, select: { id: true, asset: { select: { plantId: true } } } });
    for (const wo of orphanWos) {
        await p.workOrder.update({ where: { id: wo.id }, data: { plantId: wo.asset?.plantId ?? target.id } });
    }
    out.workOrders = orphanWos.length;
    out.spareParts = (await p.sparePart.updateMany({ where: { plantId: null }, data: { plantId: target.id } })).count;
    out.meters = (await p.meter.updateMany({ where: { plantId: null }, data: { plantId: target.id } })).count;
    out.components = (await p.component.updateMany({ where: { plantId: null }, data: { plantId: target.id } })).count;
    out.projects = (await p.project.updateMany({ where: { plantId: null }, data: { plantId: target.id } })).count;
    out.meetings = (await p.dailyMeeting.updateMany({ where: { plantId: null }, data: { plantId: target.id } })).count;
    out.productionLines = (await p.productionLine.updateMany({ where: { plantId: null }, data: { plantId: target.id } })).count;

    // Utenti non admin senza plant: plant di casa + appartenenza
    const users = await p.user.findMany({ where: { role: { not: 'ADMIN' }, plantId: null }, select: { id: true } });
    for (const u of users) {
        await p.user.update({ where: { id: u.id }, data: { plantId: target.id } });
        await p.userPlant.upsert({ where: { userId_plantId: { userId: u.id, plantId: target.id } }, update: {}, create: { userId: u.id, plantId: target.id } });
    }
    out.usersAssigned = users.length;
    // Chi ha gia' un plant di casa ma nessuna riga in UserPlant
    const homeOnly = await p.user.findMany({ where: { plantId: { not: null }, plants: { none: {} } }, select: { id: true, plantId: true } });
    for (const u of homeOnly) await p.userPlant.create({ data: { userId: u.id, plantId: u.plantId } });
    out.membershipsCreated = homeOnly.length;
    console.log(out);
})().catch(e => { console.error(e.message); process.exit(1); }).finally(() => p.$disconnect());
