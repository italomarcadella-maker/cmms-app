
import { checkAndGeneratePreventiveWorkOrders } from "@/lib/scheduler";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic'; // Ensure it's not cached

export async function GET(request: Request) {
    try {
        // Optional: Check for Authorization header if using Vercel Cron
        // const authHeader = request.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        //     return new Response('Unauthorized', { status: 401 });
        // }

        const result = await checkAndGeneratePreventiveWorkOrders();

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
