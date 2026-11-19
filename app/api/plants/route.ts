import { NextResponse } from "next/server";
import { getPlantSelection } from "@/lib/plant-actions";

export const dynamic = 'force-dynamic';

/** Stabilimenti che l'utente corrente puo' vedere (calcolati sul server dalla sessione). */
export async function GET() {
    try {
        const selection = await getPlantSelection();
        return NextResponse.json({ success: true, ...selection });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
