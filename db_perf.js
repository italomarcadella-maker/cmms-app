const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Checking DB counts...");
  const t0 = Date.now();
  
  const [usersCount, assetsCount, workOrdersCount, schedulesCount, sparePartsCount, checklistItemsCount] = await Promise.all([
    prisma.user.count(),
    prisma.asset.count(),
    prisma.workOrder.count(),
    prisma.preventiveSchedule.count(),
    prisma.sparePart.count(),
    prisma.checklistItem.count().catch(() => 0)
  ]);
  
  console.log(`Counts took ${Date.now() - t0}ms`);
  console.log(`- Users: ${usersCount}`);
  console.log(`- Assets: ${assetsCount}`);
  console.log(`- WorkOrders: ${workOrdersCount}`);
  console.log(`- Schedules: ${schedulesCount}`);
  console.log(`- SpareParts: ${sparePartsCount}`);
  console.log(`- ChecklistItems: ${checklistItemsCount}`);
  
  console.log("\nTiming work orders fetch...");
  const t1 = Date.now();
  const wos = await prisma.workOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1000,
    include: {
      asset: true,
      timers: true,
      laborLogs: true,
      partsUsed: true,
      checklist: { orderBy: { id: 'asc' } },
      technicians: { include: { technician: true } }
    }
  });
  console.log(`findMany took ${Date.now() - t1}ms to load ${wos.length} work orders`);
  
  console.log("\nTiming assets fetch...");
  const t2 = Date.now();
  const assets = await prisma.asset.findMany({
    include: { plant: true },
    orderBy: { name: 'asc' }
  });
  console.log(`findMany took ${Date.now() - t2}ms to load ${assets.length} assets`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
