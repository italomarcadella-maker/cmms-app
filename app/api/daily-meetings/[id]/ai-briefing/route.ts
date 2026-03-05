import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        // Fetch recent Process Anomalies to feed into the "Causal Loop"
        const recentAnomalies = await prisma.processAnomaly.findMany({
            where: {
                detectedAt: {
                    gte: subDays(new Date(), 3)
                },
                isResolved: false
            },
            include: {
                asset: { select: { name: true, line: true } }
            },
            take: 5
        });

        const hasAnomalies = recentAnomalies.length > 0;
        let productionInsight = "OEE medio stabile all'82%. La fermata di 20 min di ieri ha impattato marginalmente.";
        let productionAlertLevel = "LOW";

        // If Anomalies exist, override the mock production insight with real data
        if (hasAnomalies) {
            const anomalyText = recentAnomalies.map(a => `- ${a.asset.name} (${a.asset.line || 'N/A'}): ${a.description}`).join(' | ');
            productionInsight = `Attenzione alle anomalie di processo rilevate recentemente:\n${anomalyText}`;
            productionAlertLevel = "HIGH";
        }

        // We are simulating the AI Analysis Response
        const mockAiBriefing = {
            meetingId: id,
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
                    insight: productionInsight,
                    alertLevel: productionAlertLevel,
                    suggestedAction: hasAnomalies ? "Verificare parametri macchina con Manutenzione e Ingegneria." : undefined
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
        console.error("AI Briefing Error:", error);
        return NextResponse.json({ error: "Failed to generate AI Briefing" }, { status: 500 });
    }
}
