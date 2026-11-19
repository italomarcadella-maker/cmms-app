import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireLogin } from "@/lib/auth-guard";

export async function POST(request: Request) {
    const guard = await requireLogin();
    if (!guard.authorized) return NextResponse.json({ error: guard.message }, { status: 401 });
    try {
        const body = await request.json();
        const { sopId, title, description } = body;
        const userId = guard.session.user.id; // dalla sessione: non si puo' scrivere a nome di un altro

        if (!sopId || !title || !description) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const feedback = await prisma.sopFeedback.create({
            data: {
                sopId,
                userId,
                title,
                description,
                status: "PENDING"
            },
        });

        return NextResponse.json(feedback, { status: 201 });
    } catch (error) {
        console.error("SOP Kaizen Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
