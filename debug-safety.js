
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const safetyWOs = await prisma.workOrder.findMany({
    where: {
      OR: [
        { category: 'SAFETY' },
        { assetId: 'SYS-SAFETY' }
      ]
    },
    include: {
      asset: true
    }
  });

  console.log('--- SAFETY WORK ORDERS ---');
  safetyWOs.forEach(wo => {
    console.log(`ID: ${wo.id}`);
    console.log(`Title: ${wo.title}`);
    console.log(`Status: ${wo.status}`);
    console.log(`Priority: ${wo.priority}`);
    console.log(`Requester: ${wo.requesterId}`);
    console.log(`PlantID: ${wo.plantId}`);
    console.log(`Asset: ${wo.asset?.name || 'N/A'}`);
    console.log('---------------------------');
  });

  const sessionPlantId = 'FIXME_IF_NEEDED'; // I don't have the session here, but I can check if all have a plantId
  
  const counts = await prisma.workOrder.groupBy({
    by: ['category', 'status', 'priority'],
    where: {
      OR: [
        { category: 'SAFETY' },
        { assetId: 'SYS-SAFETY' }
      ]
    },
    _count: { id: true }
  });
  console.log('--- COUNTS ---');
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
