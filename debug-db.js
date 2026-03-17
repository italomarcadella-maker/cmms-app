
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const projects = await prisma.project.findMany();
    console.log("PROJECTS:", JSON.stringify(projects, null, 2));

    const projectCounts = await prisma.project.count();
    const meterReadingCounts = await prisma.meterReading.count();
    const energyLogCounts = await prisma.energyLog.count();
    
    console.log("COUNTS:", { projectCounts, meterReadingCounts, energyLogCounts });
}

main().catch(console.error).finally(() => prisma.$disconnect());
