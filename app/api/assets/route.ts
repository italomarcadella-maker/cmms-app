import { NextResponse } from "next/server";
import { getAssets } from "@/lib/actions";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const data = await getAssets();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Failed to fetch assets via API:", error);
        return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
    }
}
