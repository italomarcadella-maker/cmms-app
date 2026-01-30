
import { NextResponse } from "next/server";
import { checkAndGeneratePreventiveWorkOrders } from "@/lib/scheduler";

export const dynamic = 'force-dynamic'; // Ensure it's not cached

export async function GET() {
    try {
        const result = await checkAndGeneratePreventiveWorkOrders();
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST() {
    return GET();
}
