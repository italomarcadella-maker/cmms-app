import { NextResponse } from "next/server";
import { getWorkOrders } from "@/lib/actions";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const data = await getWorkOrders();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Failed to fetch work orders via API:", error);
        return NextResponse.json({ error: "Failed to fetch work orders" }, { status: 500 });
    }
}
