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
                    gte: subDays(new Date(), 7)
                },
                isResolved: false
            },
            include: {
                asset: { select: { name: true, line: true } }
            },
            take: 5
        });

        const hasAnomalies = recentAnomalies.length > 0;
        let productionInsight = "OEE medio stabile. Nessun fermo o anomalia di processo rilevata nell'ultima settimana.";
        let productionAlertLevel = "LOW";

        // If Anomalies exist, override the mock production insight with real data
        if (hasAnomalies) {
            const anomalyText = recentAnomalies.map(a => `- ${a.asset.name} (${a.asset.line || 'N/A'}): ${a.description}`).join(' | ');
            productionInsight = `Attenzione alle anomalie di processo attive:\n${anomalyText}`;
            productionAlertLevel = "HIGH";
        }

        // Fetch real SAFETY Category Work Orders
        const openSafetyCount = await prisma.workOrder.count({
            where: {
                category: 'SAFETY',
                status: { in: ['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL'] }
            }
        });

        let safetyInsight = "Nessun problema o ticket di sicurezza segnalato recentemente. Ottimo trend.";
        let safetyAlertLevel = "LOW";
        let safetyAction = undefined;

        if (openSafetyCount > 0) {
            safetyInsight = `Attenzione: ci sono ${openSafetyCount} ticket di SICUREZZA aperti o in corso.`;
            safetyAlertLevel = "HIGH";
            safetyAction = "Controllare e risolvere prioritariamente le segnalazioni di sicurezza.";
        }

        // Fetch real QUALITY related Work Orders (with "qualità" or "scarto" in title/desc)
        const qualityWOs = await prisma.workOrder.findMany({
            where: {
                OR: [
                    { description: { contains: 'qualità', mode: 'insensitive' } },
                    { description: { contains: 'scarto', mode: 'insensitive' } },
                    { title: { contains: 'qualità', mode: 'insensitive' } },
                    { title: { contains: 'scarto', mode: 'insensitive' } }
                ],
                status: { in: ['OPEN', 'IN_PROGRESS'] }
            },
            select: { title: true }
        });

        let qualityInsight = "Nessuna anomalia di qualità o scarto segnalata.";
        let qualityAlertLevel = "LOW";
        let qualityAction = undefined;

        if (qualityWOs.length > 0) {
            qualityInsight = `Rilevati ${qualityWOs.length} ticket relativi a difetti di qualità o scarti: ${qualityWOs.map(w => w.title).join(', ')}`;
            qualityAlertLevel = "HIGH";
            qualityAction = "Rivedere i parametri operativi delle linee coinvolte nei difetti di qualità.";
        }

        // Fetch real MAINTENANCE tickets (open vs in progress)
        const openWOsCount = await prisma.workOrder.count({
            where: { status: 'OPEN' }
        });
        const inProgressWOsCount = await prisma.workOrder.count({
            where: { status: 'IN_PROGRESS' }
        });

        let maintenanceInsight = "Tutte le attività di manutenzione sono sotto controllo.";
        let maintenanceAlertLevel = "LOW";

        if (openWOsCount > 0 || inProgressWOsCount > 0) {
            maintenanceInsight = `Ci sono ${openWOsCount} ordini di lavoro aperti e ${inProgressWOsCount} in corso di esecuzione.`;
            maintenanceAlertLevel = (openWOsCount + inProgressWOsCount) > 5 ? "HIGH" : "MEDIUM";
        }

        const briefing = {
            meetingId: id,
            generatedAt: new Date(),
            areas: {
                SAFETY: {
                    insight: safetyInsight,
                    alertLevel: safetyAlertLevel,
                    suggestedAction: safetyAction
                },
                QUALITY: {
                    insight: qualityInsight,
                    alertLevel: qualityAlertLevel,
                    suggestedAction: qualityAction
                },
                PRODUCTION: {
                    insight: productionInsight,
                    alertLevel: productionAlertLevel,
                    suggestedAction: hasAnomalies ? "Verificare parametri macchina con Manutenzione e Ingegneria." : undefined
                },
                MAINTENANCE: {
                    insight: maintenanceInsight,
                    alertLevel: maintenanceAlertLevel
                }
            }
        };

        // Slight delay to simulate AI processing
        await new Promise(r => setTimeout(r, 300));

        return NextResponse.json(briefing);
    } catch (error) {
        console.error("AI Briefing Error:", error);
        return NextResponse.json({ error: "Failed to generate AI Briefing" }, { status: 500 });
    }
}
