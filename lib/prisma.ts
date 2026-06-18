import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const basePrisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

export const prisma = basePrisma.$extends({
    query: {
        $allModels: {
            async create({ model, args, query }) {
                const result = await query(args);
                if (model !== 'AuditLog' && ['WorkOrder', 'SparePart', 'User', 'PreventiveSchedule', 'SopDocument', 'ProcessAnomaly'].includes(model)) {
                    logMutation(model, `CREATE_${model.toUpperCase()}`, (result as any)?.id, args.data);
                }
                return result;
            },
            async update({ model, args, query }) {
                const result = await query(args);
                if (model !== 'AuditLog' && ['WorkOrder', 'SparePart', 'User', 'PreventiveSchedule', 'SopDocument', 'ProcessAnomaly'].includes(model)) {
                    logMutation(model, `UPDATE_${model.toUpperCase()}`, (result as any)?.id, args.data);
                }
                return result;
            },
            async delete({ model, args, query }) {
                const result = await query(args);
                if (model !== 'AuditLog' && ['WorkOrder', 'SparePart', 'User', 'PreventiveSchedule', 'SopDocument', 'ProcessAnomaly'].includes(model)) {
                    logMutation(model, `DELETE_${model.toUpperCase()}`, (result as any)?.id, args.where);
                }
                return result;
            }
        }
    }
});

async function logMutation(model: string, action: string, resourceId: string | undefined, details: any) {
    try {
        const { auth } = await import('@/auth');
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) return;

        // Perform write using the base (unextended) client to avoid recursion
        await basePrisma.auditLog.create({
            data: {
                userId,
                action,
                resourceId,
                details: details ? JSON.stringify(details) : null,
            }
        });
    } catch (err) {
        console.error(`[AuditLog Error] Failed to write log for ${model}:`, err);
    }
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;
