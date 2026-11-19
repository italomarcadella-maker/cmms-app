import { PrismaClient } from '@prisma/client';

/**
 * Client Prisma "grezzo", senza filtro per plant.
 * Va usato SOLO dal motore dello scope (lib/plant-scope.ts) e da script di manutenzione:
 * il codice applicativo importa `prisma` da '@/lib/prisma', che applica il filtro per plant.
 */
const globalForPrisma = global as unknown as { prismaBase?: PrismaClient };

export const basePrisma =
    globalForPrisma.prismaBase ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaBase = basePrisma;
