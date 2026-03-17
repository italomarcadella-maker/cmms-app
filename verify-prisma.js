
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Checking ProjectTaskNote model...");
  if (prisma.projectTaskNote) {
    console.log("SUCCESS: ProjectTaskNote model exists in Prisma Client.");
  } else {
    console.log("FAILURE: ProjectTaskNote model not found.");
    process.exit(1);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
