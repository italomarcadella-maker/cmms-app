import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const limit = parseInt(searchParams.get('limit') || '10');

    try {
        const meetings = await prisma.dailyMeeting.findMany({
            where: department ? { department } : undefined,
            orderBy: { date: 'desc' },
            take: limit,
            include: {
                sections: true
            }
        });

        return NextResponse.json(meetings);
    } catch (error) {
        console.error("GET Daily Meetings Error:", error);
        return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { department, date, conductedBy } = body;

        // Create a drafted meeting with 4 empty sections ready to be filled
        const newMeeting = await prisma.dailyMeeting.create({
            data: {
                department,
                date: date ? new Date(date) : new Date(),
                conductedBy,
                status: "DRAFT",
                sections: {
                    create: [
                        { type: "SAFETY" },
                        { type: "QUALITY" },
                        { type: "PRODUCTION" },
                        { type: "MAINTENANCE" }
                    ]
                }
            },
            include: {
                sections: true
            }
        });

        return NextResponse.json(newMeeting, { status: 201 });
    } catch (error) {
        console.error("POST Daily Meetings Error:", error);
        return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
    }
}
