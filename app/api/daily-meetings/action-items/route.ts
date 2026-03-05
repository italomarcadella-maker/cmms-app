import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Fetch all action items across meetings
export async function GET(request: Request) {
    try {
        const actionItems = await prisma.meetingActionItem.findMany({
            include: {
                section: {
                    include: {
                        meeting: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(actionItems);
    } catch (error) {
        console.error("GET Action Items Error:", error);
        return NextResponse.json({ error: "Failed to fetch action items" }, { status: 500 });
    }
}

// Update action item status (for Kanban drag-and-drop)
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
        }

        const updatedItem = await prisma.meetingActionItem.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error("PATCH Action Items Error:", error);
        return NextResponse.json({ error: "Failed to update action item" }, { status: 500 });
    }
}
