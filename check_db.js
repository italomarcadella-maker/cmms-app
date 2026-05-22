const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany();
  console.log("Projects in DB:", projects);
  const users = await prisma.user.findMany();
  console.log("Users in DB:", users.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
