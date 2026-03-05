"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Fetch all purchase requests, ordered by newest first
export async function getPurchaseRequests() {
    try {
        return await prisma.purchaseRequest.findMany({
            include: { part: true },
            orderBy: { requestedAt: "desc" }
        });
    } catch (e) {
        console.error("Failed to fetch purchase requests:", e);
        return [];
    }
}

// Update the status of a purchase request
export async function updatePurchaseRequestStatus(id: string, status: string) {
    try {
        const updateData: any = { status };

        if (status === "ORDERED") {
            updateData.orderedAt = new Date();
        }

        await prisma.purchaseRequest.update({
            where: { id },
            data: updateData
        });

        revalidatePath("/inventory/purchase-requests");
        return { success: true, message: "Stato aggiornato con successo" };
    } catch (e) {
        console.error("Failed to update status:", e);
        return { success: false, message: "Errore nell'aggiornamento dello stato" };
    }
}

export async function fulfillPurchaseRequest(id: string) {
    try {
        const req = await prisma.purchaseRequest.findUnique({ where: { id } });
        if (!req) return { success: false, message: "Richiesta non trovata" };

        if (req.status === "RECEIVED") return { success: false, message: "Già ricevuta" };

        // Update stock
        const part = await prisma.sparePart.findUnique({ where: { id: req.partId } });
        if (part) {
            await prisma.sparePart.update({
                where: { id: part.id },
                data: { quantity: part.quantity + req.quantity, lastUpdated: new Date() }
            });
        }

        // Update request status
        await prisma.purchaseRequest.update({
            where: { id },
            data: { status: "RECEIVED", receivedAt: new Date() }
        });

        revalidatePath("/inventory/purchase-requests");
        revalidatePath("/inventory");
        return { success: true, message: "Merce ricevuta e giacenza aggiornata" };
    } catch (e) {
        console.error("Failed to fulfill request:", e);
        return { success: false, message: "Errore durante la chiusura automatica" };
    }
}
