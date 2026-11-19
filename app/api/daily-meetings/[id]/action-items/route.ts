import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { SUPERVISION } from "@/lib/roles";
import { WorkOrderCategory, WorkOrderPriority } from "@prisma/client";
import { ensureSystemAsset, isSystemAssetId } from "@/lib/system-assets";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await requireRole(SUPERVISION);
    if (!guard.authorized) return NextResponse.json({ error: guard.message }, { status: guard.message === 'Non autenticato' ? 401 : 403 });
    try {
        const { id } = await params;
        const body = await request.json();
        const { originSectionId, description, assignee, priority, category, assetId } = body;
        if (typeof description !== "string" || !description.trim()) return NextResponse.json({ error: "Descrizione mancante" }, { status: 400 });
        if (priority && !Object.values(WorkOrderPriority).includes(priority)) return NextResponse.json({ error: "Priorita' non valida" }, { status: 400 });
        if (category && !Object.values(WorkOrderCategory).includes(category)) return NextResponse.json({ error: "Categoria non valida" }, { status: 400 });
        // La sezione deve appartenere alla riunione indicata (e a uno stabilimento visibile)
        const section = await prisma.meetingSection.findFirst({ where: { id: originSectionId, meetingId: id }, select: { id: true } });
        if (!section) return NextResponse.json({ error: "Sezione non trovata" }, { status: 404 });

        // Senza macchina indicata il follow-up va sull'asset di sistema "Altro / Generico" (prima si usava un asset inesistente e la creazione falliva)
        const targetAssetId: string = typeof assetId === "string" && assetId ? assetId : "SYS-OTHER";
        if (isSystemAssetId(targetAssetId)) await ensureSystemAsset(targetAssetId);

        // 1. Create a WorkOrder (EWO/Task)
        const workOrder = await prisma.workOrder.create({
            data: {
                title: `Follow-up Daily Meeting: ${category}`,
                description: description,
                priority: priority || "MEDIUM",
                category: category || "OTHER",
                type: "FAULT",
                originMeetingId: id,
                assetId: targetAssetId,
                assignedTo: assignee,
                // Optional logic based on real app state
            }
        });

        // 2. Create the Meeting Action Item to link them
        const actionItem = await prisma.meetingActionItem.create({
            data: {
                sectionId: originSectionId,
                description,
                assigneeName: assignee,
                linkedWorkOrderId: workOrder.id
            }
        });

        return NextResponse.json({ workOrder, actionItem });
    } catch (error) {
        console.error("Create Meeting Action Error:", error);
        return NextResponse.json({ error: "Failed to build action task" }, { status: 500 });
    }
}
