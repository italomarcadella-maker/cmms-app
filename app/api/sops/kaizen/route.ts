import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sopId, userId, title, description } = body;

        if (!sopId || !userId || !title || !description) {
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
