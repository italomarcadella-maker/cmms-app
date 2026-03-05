import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const plants = await prisma.plant.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                location: true,
            }
        });

        return NextResponse.json({ success: true, plants });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
