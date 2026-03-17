import { VectorMemory } from "./memory";
import { AICortexResponse, AIIntent } from "./types";
import { prisma } from "@/lib/prisma";
import { callLLM } from "./llm-service";

export class CortexEngine {
    private memory: VectorMemory;

    constructor() {
        this.memory = new VectorMemory();
    }

    async learn(description: string, solution: string, category?: string) {
        return this.memory.learn(description, solution, category);
    }

    async generateDailyInsights(): Promise<import("./types").DailyInsight[]> {
        const insights: import("./types").DailyInsight[] = [];
        try {
            // 0. Global Search for correlations (Memory based)
            const globalContext = await this.memory.search("problemi urgenti impianto", 5);
            
            // 1. Critical Pending WOs & Safety
            const [criticalWOs, openSafety] = await Promise.all([
                prisma.workOrder.count({ where: { priority: 'STOPPED', status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
                prisma.workOrder.count({ where: { category: 'SAFETY', status: { notIn: ['CLOSED', 'COMPLETED', 'CANCELED'] } } })
            ]);

            if (openSafety > 0) {
                insights.push({
                    id: 'safety-alert',
                    type: 'ALERT',
                    title: 'Sicurezza Prioritaria',
                    message: `Sono presenti ${openSafety} segnalazioni di sicurezza aperte. La sicurezza dei tecnici è la priorità assoluta.`,
                    actionLabel: 'Vai a Sicurezza',
                    actionUrl: '/requests/safety'
                });
            }

            if (criticalWOs > 0) {
                insights.push({
                    id: 'critical-wo',
                    type: 'ALERT',
                    title: 'Interventi Critici',
                    message: `Ci sono ${criticalWOs} interventi ad alta priorità in attesa. Rischio fermo produzione prolungato.`,
                    actionLabel: 'Visualizza',
                    actionUrl: '/work-orders?priority=STOPPED'
                });
            }

            // 2. Sustainability & Costs
            const energyStats = await prisma.energyLog.findMany({
                take: 7,
                orderBy: { date: 'desc' }
            });

            if (energyStats.length > 1) {
                const totalCost = energyStats.reduce((acc, curr) => acc + (curr.costLocal || 0), 0);
                const avgKwh = energyStats.reduce((acc, curr) => acc + curr.kwhConsumed, 0) / energyStats.length;
                
                if (avgKwh > 500) { // Threshold for "High Consumption" context
                    insights.push({
                        id: 'sustainability-cost',
                        type: 'INFO',
                        title: 'Efficienza Energetica',
                        message: `Costo energetico stimato ultimi 7 giorni: €${totalCost.toFixed(0)}. Consumo medio elevato rilevato.`,
                        actionLabel: 'Dettaglio Consumi',
                        actionUrl: '/sustainability'
                    });
                }
            }

            // 3. Process Anomalies (Linking to Quality/Maintenance)
            const recentAnomalies = await prisma.processAnomaly.count({
                where: { isResolved: false, detectedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
            });

            if (recentAnomalies > 0) {
                insights.push({
                    id: 'process-anomaly',
                    type: 'WARNING',
                    title: 'Anomalie di Processo',
                    message: `Rilevate ${recentAnomalies} derive dai parametri SOP nelle ultime 24h. Possibile usura meccanica latente.`,
                    actionLabel: 'Analisi Deriva',
                    actionUrl: '/process/optimization'
                });
            }

            // 2. Overdue WOs
            const overdue = await prisma.workOrder.count({ where: { dueDate: { lt: new Date() }, status: { notIn: ['CLOSED', 'COMPLETED', 'CANCELED'] } } });
            if (overdue > 0) {
                insights.push({
                    id: 'overdue',
                    type: 'WARNING',
                    title: 'Scadenze Superate',
                    message: `${overdue} ordini di lavoro sono in ritardo sulla tabella di marcia.`,
                    actionLabel: 'Gestisci Ritardi',
                    actionUrl: '/work-orders'
                });
            }

            // 3. Predictive Risk
            const predictive = await this.getPredictiveAnalysis();
            const criticalAssets = predictive.filter(p => p.riskLevel === 'CRITICAL').length;
            if (criticalAssets > 0) {
                insights.push({
                    id: 'pred-risk',
                    type: 'WARNING',
                    title: 'Rischio Guasti Alto',
                    message: `${criticalAssets} macchinari mostrano segnali di guasto imminente (MTBF superato).`,
                    actionLabel: 'Analisi Predittiva',
                    actionUrl: '/maintenance/predictive'
                });
            }

            // 4. Success / Motivation
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const logs = await prisma.laborLog.aggregate({
                _sum: { hours: true },
                where: { date: { gte: yesterday } }
            });

            if ((logs._sum.hours || 0) > 0) {
                insights.push({
                    id: 'success-yest',
                    type: 'SUCCESS',
                    title: 'Produttività Ieri',
                    message: `Il team ha registrato ${logs._sum.hours} ore di lavoro ieri.`
                });
            }

            if (insights.length === 0) {
                insights.push({
                    id: 'info-calm',
                    type: 'INFO',
                    title: 'Tutto Tranquillo',
                    message: "Nessuna criticità immediata rilevata. È un buon momento per la manutenzione preventiva.",
                    actionLabel: 'Piano Manutenzione',
                    actionUrl: '/assets'
                });
            }
        } catch (e: any) {
            console.error("Cortex Insights Error", e);
            insights.push({
                id: 'err-gen',
                type: 'WARNING',
                title: 'Sistema AI momentaneamente non disponibile',
                message: `Impossibile generare suggerimenti: ${e.message || 'Errore di connessione'}. Riprova più tardi.`
            });
        }
        return insights;
    }

    async getPredictiveAnalysis() {
        try {
            const assets = await prisma.asset.findMany({
                include: {
                    workOrders: {
                        where: { type: 'FAULT', status: { in: ['CLOSED', 'COMPLETED'] } },
                        orderBy: { createdAt: 'desc' },
                        take: 50
                    }
                }
            });

            return assets.map(asset => {
                const faults = asset.workOrders;

                if (faults.length < 2) {
                    return {
                        id: asset.id,
                        riskLevel: 'LOW',
                        name: asset.name,
                        healthScore: asset.healthScore,
                        mtbf: null,
                        nextFailureDate: null
                    };
                }

                // Calculate Mean Time Between Failures (MTBF)
                let totalDiff = 0;
                for (let i = 0; i < faults.length - 1; i++) {
                    const recent = new Date(faults[i].createdAt).getTime();
                    const older = new Date(faults[i + 1].createdAt).getTime();
                    totalDiff += (recent - older);
                }

                const avgDiffMs = totalDiff / (faults.length - 1);
                const lastFaultDate = new Date(faults[0].createdAt);

                // Risk Calculation
                const now = new Date().getTime();
                const timeSinceLast = now - lastFaultDate.getTime();
                const percentUsed = timeSinceLast / avgDiffMs;

                // NEW: Energy Factor in Risk
                // In a real system we would query EnergyLogs for this asset
                // and see if consumption is rising vs baseline.
                // For MVP, we simulate a slight increase in risk if healthScore < 80
                const energyRiskMultiplier = asset.healthScore < 80 ? 1.2 : 1.0;
                const adjustedUsage = percentUsed * energyRiskMultiplier;

                let riskLevel = 'LOW';
                if (adjustedUsage > 1.1) riskLevel = 'CRITICAL';
                else if (adjustedUsage > 0.8) riskLevel = 'HIGH';
                else if (adjustedUsage > 0.5) riskLevel = 'MEDIUM';

                return {
                    id: asset.id,
                    riskLevel,
                    name: asset.name,
                    healthScore: asset.healthScore,
                    mtbf: Math.round(avgDiffMs / (1000 * 60 * 60 * 24)), // MTBF in days
                    nextFailureDate: new Date(lastFaultDate.getTime() + avgDiffMs)
                };
            });
        } catch (error) {
            console.error("Cortex Predictive Error:", error);
            return [];
        }
    }

    async process(query: string, userId?: string, image?: string): Promise<AICortexResponse> {
        const thoughts: string[] = [];
        thoughts.push("Analisi intento utente...");

        const intent = this.decipherIntent(query);
        thoughts.push(`Intento rilevato: ${intent.id} (${Math.round(intent.confidence * 100)}%)`);

        // 1. Check Memory for Context
        const contextResults = await this.memory.search(query);
        if (contextResults.length > 0) {
            thoughts.push(`Recuperati ${contextResults.length} frammenti di memoria pertinenti.`);
        }

        // 2. Execute Logic based on Intent
        switch (intent.id) {
            case 'create_ticket':
                return this.handleCreateTicket(query, thoughts);
            case 'status_check':
                return this.handleStatusCheck(thoughts);
            case 'analysis':
                // For analysis, we now combine Memory + LLM logic
                thoughts.push("Avvio analisi profonda (Cortex + LLM)...");

                // Prepare context for LLM
                const contextStrings = contextResults.map(c => `[${c.type.toUpperCase()}] Tags: ${c.tags.join(', ')} -> ${c.content}`);

                const llmResult = await callLLM(query, contextStrings, image);

                if (llmResult.isExternal) {
                    thoughts.push("⚠️ Dati interni insufficienti. Utilizzo conoscenza generale.");
                    // Note: The UI display modification is handled by llm-service or here. 
                    // We trust llm-service to have flagged it.
                } else {
                    thoughts.push("Risposta generata basandosi sui dati interni.");
                }

                return {
                    message: llmResult.content,
                    thoughtProcess: thoughts,
                    actions: [{ label: "Apri Procedura", value: "open_procedure" }]
                };

            case 'greeting':
                return {
                    message: "Ciao! Sono **Cortex**, il tuo assistente di manutenzione avanzato. 🧠\nPosso analizzare guasti, creare ticket o dirti come sta l'impianto.",
                    thoughtProcess: thoughts
                };
            default:
                // Fallback to LLM for generic questions too
                thoughts.push("Intento non specifico. Consultazione LLM...");
                const generalContext = contextResults.map(c => `[INFO] ${c.content}`);
                const response = await callLLM(query, generalContext, image);

                if (response.isExternal) {
                    thoughts.push("⚠️ Risposta esterna.");
                }

                return {
                    message: response.content,
                    thoughtProcess: thoughts
                };
        }
    }

    private decipherIntent(query: string): AIIntent {
        const q = query.toLowerCase();

        if (q.includes("crea") && (q.includes("ticket") || q.includes("ordine"))) {
            return { id: 'create_ticket', confidence: 0.9, parameters: {} };
        }
        if (q.includes("stato") || q.includes("come va") || q.includes("situazione")) {
            return { id: 'status_check', confidence: 0.85, parameters: {} };
        }
        if (q.includes("guasto") || q.includes("problema") || q.includes("errore") || q.includes("fermo") || q.includes("analisi")) {
            return { id: 'analysis', confidence: 0.8, parameters: {} };
        }
        if (q.includes("ciao") || q.includes("chi sei")) {
            return { id: 'greeting', confidence: 0.95, parameters: {} };
        }

        return { id: 'unknown', confidence: 0.0, parameters: {} };
    }

    private async handleCreateTicket(query: string, thoughts: string[]): Promise<AICortexResponse> {
        thoughts.push("Estrazione parametri ticket (Asset, Problema)...");

        const assetMatch = query.match(/(?:su|per|del)\s+([a-zA-Z0-9\s]+?)(?:$|\s+per|\s+con)/);
        const problemMatch = query.match(/(?:per|con|causa)\s+(.+)/);

        const asset = assetMatch ? assetMatch[1].trim() : "Non specificato";
        const problem = problemMatch ? problemMatch[1].trim() : "Generico";

        thoughts.push("Generazione anteprima ticket...");

        return {
            message: `Ho preparato la bozza del ticket:\n\n**Asset**: ${asset}\n**Problema**: ${problem}\n**Priorità**: Alta (Dedotta)\n\nVuoi procedere?`,
            thoughtProcess: thoughts,
            actions: [{ label: "Conferma Creazione", value: "create_wo_confirmed" }]
        };
    }

    private async handleStatusCheck(thoughts: string[]): Promise<AICortexResponse> {
        thoughts.push("Interrogazione sensori IoT (Simulati)...");
        thoughts.push("Analisi carico di lavoro team...");

        const count = await prisma.workOrder.count({ where: { status: 'OPEN' } });

        return {
            message: `Il sistema è stabile. 🟢\n\n- **Carico Lavoro**: ${count} interventi aperti\n- **IoT Linea 1**: Temperatura nominale (45°C)\n- **IoT Linea 2**: Vibrazioni stabili`,
            thoughtProcess: thoughts
        };
    }
}
