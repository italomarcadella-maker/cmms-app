import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { originSectionId, description, assignee, priority, category, assetId } = body;

        // 1. Create a WorkOrder (EWO/Task)
        const workOrder = await prisma.workOrder.create({
            data: {
                title: `Follow-up Daily Meeting: ${category}`,
                description: description,
                priority: priority || "MEDIUM",
                category: category || "OTHER",
                type: "FAULT",
                originMeetingId: id,
                assetId: assetId || "generic-plant-level", // Assuming a generic asset exists or we handle it
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
