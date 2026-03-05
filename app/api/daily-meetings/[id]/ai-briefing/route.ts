import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    // In a real application, this would fetch the last ~7 days of closed meetings
    // pass text/kpis to an LLM like OpenAI to generate insights.

    try {
        // We are simulating the AI Analysis Response
        // because connecting to OpenAI requires api keys not guaranteed in this env.
        const mockAiBriefing = {
            meetingId: params.id,
            generatedAt: new Date(),
            areas: {
                SAFETY: {
                    insight: "Nessun quasi-incidente negli ultimi 5 giorni. Ottimo trend.",
                    alertLevel: "LOW"
                },
                QUALITY: {
                    insight: "Attenzione: Ieri e l'altro ieri sono state segnalate Non Conformità ('scarti termoplastici') sulla Linea 2.",
                    alertLevel: "HIGH",
                    suggestedAction: "Chiedere agli operatori se la temperatura acqua di raffreddamento Linea 2 fluttua."
                },
                PRODUCTION: {
                    insight: "OEE medio stabile all'82%. La fermata di 20 min di ieri ha impattato marginalmente.",
                    alertLevel: "LOW"
                },
                MAINTENANCE: {
                    insight: "Ci sono 2 ticket 'Aperti' derivanti dai meeting scorsi assegnati al turno di notte.",
                    alertLevel: "MEDIUM"
                }
            }
        };

        // Slight delay to simulate AI thinking
        await new Promise(r => setTimeout(r, 800));

        return NextResponse.json(mockAiBriefing);
    } catch (error) {
        return NextResponse.json({ error: "Failed to generate AI Briefing" }, { status: 500 });
    }
}
