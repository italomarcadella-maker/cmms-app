import { checkAndGeneratePreventiveWorkOrders } from "@/lib/scheduler";
import { runUnscoped } from "@/lib/plant-scope";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic'; // Ensure it's not cached

export async function GET(request: Request) {
    // Vercel Cron invia "Authorization: Bearer <CRON_SECRET>". Senza segreto configurato l'endpoint resta chiuso:
    // genera ordini di lavoro per tutti gli stabilimenti e non deve essere richiamabile da chiunque.
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        // Job di sistema: opera su tutti gli stabilimenti
        const result = await runUnscoped(() => checkAndGeneratePreventiveWorkOrders());
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
