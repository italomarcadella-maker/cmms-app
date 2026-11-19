
import { NextResponse } from "next/server";
import { checkAndGeneratePreventiveWorkOrders } from "@/lib/scheduler";
import { requireRole } from "@/lib/auth-guard";
import { SUPERVISION } from "@/lib/roles";
import { refreshAllAssetHealthNow } from "@/lib/asset-health-sync";

export const dynamic = 'force-dynamic'; // Ensure it's not cached

export async function GET() {
    const guard = await requireRole(SUPERVISION);
    if (!guard.authorized) return NextResponse.json({ success: false, error: guard.message }, { status: guard.message === 'Non autenticato' ? 401 : 403 });
    try {
        const result = await checkAndGeneratePreventiveWorkOrders();
        // Dopo la generazione degli ordini si ricalcola la salute degli asset visibili all'utente (senza far fallire la generazione se qualcosa va storto)
        let health: { evaluated: number; updated: number; notEvaluable: number } | { error: string };
        try {
            health = await refreshAllAssetHealthNow();
        } catch (err) {
            console.error('Scheduler health refresh error:', err);
            health = { error: 'Errore nel ricalcolo della salute degli asset' };
        }
        return NextResponse.json({ ...result, health });
    } catch (error: any) {
        console.error('Scheduler error:', error);
        return NextResponse.json({ success: false, error: 'Errore nella generazione degli ordini' }, { status: 500 });
    }
}

export async function POST() {
    return GET();
}
