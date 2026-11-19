import { checkAndGeneratePreventiveWorkOrders } from "@/lib/scheduler";
import { runUnscoped } from "@/lib/plant-scope";
import { refreshAllAssetHealthNow } from "@/lib/asset-health-sync";
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
        const result = await runUnscoped(async () => {
            const generated = await checkAndGeneratePreventiveWorkOrders();
            // Punteggio di salute degli asset: ricalcolato dopo gli ordini appena generati (e per il passare del tempo: piani scaduti, finestra di 12 mesi).
            // Un errore qui non deve far fallire la generazione degli ordini.
            let health: { evaluated: number; updated: number; notEvaluable: number } | { error: string };
            try {
                health = await refreshAllAssetHealthNow();
            } catch (err) {
                console.error('[cron] refreshAssetHealth', err);
                health = { error: 'Errore nel ricalcolo della salute degli asset' };
            }
            return { ...generated, health };
        });
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
