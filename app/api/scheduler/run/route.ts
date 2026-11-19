
import { NextResponse } from "next/server";
import { checkAndGeneratePreventiveWorkOrders } from "@/lib/scheduler";
import { requireRole } from "@/lib/auth-guard";
import { SUPERVISION } from "@/lib/roles";

export const dynamic = 'force-dynamic'; // Ensure it's not cached

export async function GET() {
    const guard = await requireRole(SUPERVISION);
    if (!guard.authorized) return NextResponse.json({ success: false, error: guard.message }, { status: guard.message === 'Non autenticato' ? 401 : 403 });
    try {
        const result = await checkAndGeneratePreventiveWorkOrders();
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Scheduler error:', error);
        return NextResponse.json({ success: false, error: 'Errore nella generazione degli ordini' }, { status: 500 });
    }
}

export async function POST() {
    return GET();
}
