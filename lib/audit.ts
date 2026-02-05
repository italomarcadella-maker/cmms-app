"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function logAction(
    action: string,
    resourceId?: string,
    details?: string
) {
    try {
        const session = await auth();
        // Even if no session (system action?), we might want to log user as 'SYSTEM' or handle it.
        // For now, require user or skip.
        if (!session?.user?.id) return;

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: action,
                resourceId: resourceId,
                details: details
            }
        });
    } catch (e) {
        console.error("Audit Log Error:", e);
        // Fail silently to not block main flow
    }
}
