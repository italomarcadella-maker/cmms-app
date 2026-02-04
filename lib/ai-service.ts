"use server";

import { prisma } from "@/lib/prisma";

// Simple heuristic engine to simulate "AI" understanding of the database
// In a real scenario, this would call an LLM (OpenAI/Gemini) with function calling.
// Here we use regex-based intent classification for the MVP.

interface AIResponse {
    sender: string;
    content: string;
    actions?: any[];
}

export async function generateMaintenanceSuggestions(assetId: string): Promise<string[]> {
    try {
        // Fetch last 5 closed work orders for this asset
        const history = await prisma.workOrder.findMany({
            where: {
                assetId: assetId,
                status: 'CLOSED'
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                title: true,
                description: true
            }
        });

        if (history.length === 0) {
            return ["Nessuno storico disponibile per questo asset. Procedi secondo manuale."];
        }

        // Simple heuristic: Return unique recent interventions as "suggestions"
        // In a real AI app, we would summarize these.
        const suggestions = history.map(h => `Verifica se il problema è simile a: "${h.title}"`);

        // Add a generic safety tip
        suggestions.push("💡 Ricorda di scollegare l'alimentazione prima di intervenire.");

        return suggestions;
    } catch (error) {
        console.error("AI Suggestion Error:", error);
        return [];
    }
}

export async function generateAIResponse(query: string): Promise<AIResponse> {
    const q = query.toLowerCase();

    // Intent: Count Open Work Orders
    if (q.includes("quanti") && (q.includes("ordini") || q.includes("interventi")) && (q.includes("aperti") || q.includes("da fare"))) {
        try {
            const count = await prisma.workOrder.count({
                where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }
            });
            return {
                sender: "AI Copilot",
                content: `Attualmente ci sono **${count}** interventi aperti o in corso. Vuoi vederli?`,
            };
        } catch (e) {
            console.error("AI DB Error:", e);
            return { sender: "AI Copilot", content: "Non riesco a contare gli ordini in questo momento. Riprova più tardi." };
        }
    }

    // Intent: Show High Priority
    if ((q.includes("urgenti") || q.includes("priorità alta")) && (q.includes("mostra") || q.includes("quali"))) {
        const highPriority = await prisma.workOrder.findMany({
            where: { priority: 'STOPPED', status: { not: 'CLOSED' } },
            take: 3,
            select: { title: true, id: true }
        });

        if (highPriority.length === 0) {
            return { sender: "AI Copilot", content: "Non ci sono interventi urgenti attivi al momento. Ottimo lavoro! 🎉" };
        }

        const list = highPriority.map(w => `- ${w.title} (${w.id})`).join("\n");
        return {
            sender: "AI Copilot",
            content: `Ho trovato questi interventi urgenti:\n${list}\n\nVai alla sezione Interventi per gestirli.`
        };
    }

    // Intent: Broken Assets
    if (q.includes("asset") && (q.includes("ritti") || q.includes("guasti") || q.includes("fermi") || q.includes("offline"))) {
        const broken = await prisma.asset.findMany({
            where: { status: 'OFFLINE' },
            take: 5
        });

        if (broken.length === 0) {
            return { sender: "AI Copilot", content: "Tutti gli asset sembrano operativi! ✅" };
        }

        const list = broken.map(a => `- ${a.name} (${a.location})`).join("\n");
        return {
            sender: "AI Copilot",
            content: `Attenzione, risultano fermi i seguenti asset:\n${list}`
        };
        return {
            sender: "AI Copilot",
            content: `Attenzione, risultano fermi i seguenti asset:\n${list}`
        };
    }

    // Intent: Search Asset Info
    if (q.includes("cerca asset") || q.includes("info asset")) {
        const searchTerm = q.replace("cerca asset", "").replace("info asset", "").trim();
        if (searchTerm.length < 2) {
            return { sender: "AI Copilot", content: "Dimmi il nome o il seriale dell'asset da cercare. Es: '@ai cerca asset Pressa'" };
        }

        const assets = await prisma.asset.findMany({
            where: {
                OR: [
                    { name: { contains: searchTerm } }, // Case insensitive usually supported by provider, or we use explicit mode if needed but let's assume default
                    { serialNumber: { contains: searchTerm } }
                ]
            },
            take: 3
        });

        if (assets.length === 0) {
            return { sender: "AI Copilot", content: `Nessun asset trovato con "${searchTerm}".` };
        }

        const details = assets.map(a =>
            `**${a.name}**\nStato: ${a.status}\nPosizione: ${a.location}\nModello: ${a.model}`
        ).join("\n\n");

        return {
            sender: "AI Copilot",
            content: `Ecco cosa ho trovato:\n\n${details}`
        };
    }
    if (q.includes("consigli") || q.includes("suggerimenti") || q.includes("cosa fare oggi") || q.includes("daily")) {
        // Dynamic import to avoid circular dependency issues if any
        const { generateDailySuggestions } = await import("@/lib/actions");
        const result = await generateDailySuggestions();

        return {
            sender: "AI Copilot",
            content: result.message
        };
    }

    // Intent: Help
    if (q.includes("aiuto") || q.includes("ciao") || q.includes("cosa sai fare")) {
        return {
            sender: "AI Copilot",
            content: "Ciao! Sono il tuo assistente virtuale. Posso aiutarti con:\n- *'Dammi dei consigli'* (Genera suggerimenti automatici)\n- Conteggio ordini aperti\n- Lista interventi urgenti\n- Stato degli asset\n\nProva a chiedermi: 'Cosa fare oggi?'"
        };
    }

    return {
        sender: "AI Copilot",
        content: "Mi dispiace, non ho capito la richiesta. Prova a chiedermi lo stato degli ordini o degli asset."
    };
}

export async function generateEWOAnalysis(description: string, assetName?: string) {
    // Simulate AI Analysis
    await new Promise(resolve => setTimeout(resolve, 500)); // Reduced fake latency

    // 1. Check Self-Learning Knowledge Base
    try {
        const learnedSolution = await getKnowledgeSuggestions(description);
        if (learnedSolution) {
            return {
                causeAnalysis: "Riconosciuto pattern ricorrente dallo storico interventi.",
                solutionApplied: learnedSolution,
                preventiveActions: "Applicare procedura consolidata per questa casistica."
            };
        }
    } catch (e) {
        console.error("KB Lookup failed", e);
    }

    const d = description.toLowerCase();
    let cause = "Analisi non determinabile automaticamente. Verificare componenti interni.";
    let solution = "Intervento manuale richiesto.";
    let prevention = "Incrementare frequenza controlli.";

    if (d.includes("perdita") || d.includes("loss") || d.includes("acqua") || d.includes("olio")) {
        cause = "1. Guarnizione deteriorata\n2. Pressione eccessiva\n3. Vibrazioni anomale\n4. Erraggio bulloni\n5. Materiale non conforme";
        solution = "Sostituzione kit guarnizioni e serraggio controllato.";
        prevention = "Verifica tenuta mensile; Installazione sensori di pressione.";
    } else if (d.includes("blocco") || d.includes("fermo") || d.includes("jam")) {
        cause = "1. Detriti nel meccanismo\n2. Lubrificazione insufficiente\n3. Usura guide\n4. Disallineamento\n5. Sovraccarico motore";
        solution = "Pulizia approfondita, riallineamento assi e lubrificazione.";
        prevention = "Pulizia giornaliera a fine turno; Controllo annuale allineamento.";
    } else if (d.includes("rumore") || d.includes("noise") || d.includes("vibrazione")) {
        cause = "1. Cuscinetto sgranato\n2. Albero sbilanciato\n3. Viti allentate\n4. Accoppiamento difettoso\n5. Mancanza grasso";
        solution = "Sostituzione cuscinetti e bilanciatura dinamica.";
        prevention = "Analisi vibrazionale trimestrale.";
    } else if (d.includes("elettrico") || d.includes("scatto") || d.includes("fusibile")) {
        cause = "1. Cortocircuito bobina\n2. Cavo isolamento rotto\n3. Sovraccarico linea\n4. Contatto ossidato\n5. Componente difettoso";
        solution = "Sostituzione componente e verifica isolamento cavi.";
        prevention = "Termografia semestrale quadro elettrico.";
    }

    return {
        causeAnalysis: cause,
        solutionApplied: solution,
        preventiveActions: prevention
    };
}

export async function generatePreventiveSuggestions(assetId: string) {
    // 1. Fetch history
    const history = await prisma.workOrder.findMany({
        where: { assetId, status: { in: ['CLOSED', 'COMPLETED'] } },
        orderBy: { createdAt: 'desc' },
        take: 20
    });

    if (history.length < 3) return [];

    const suggestions = [];
    const text = history.map(h => (h.title + " " + h.description).toLowerCase()).join(" ");

    // Heuristics
    if ((text.match(/filtro|filter|intasat/g) || []).length >= 2) {
        suggestions.push({
            title: "Pulizia/Sostituzione Filtri",
            description: "Rilevata frequente occlusione filtri. Si consiglia pulizia periodica.",
            frequency: "MONTHLY",
            frequencyDays: 30,
            confidence: "Alta"
        });
    }

    if ((text.match(/olio|lubrifi|grass/g) || []).length >= 2) {
        suggestions.push({
            title: "Controllo Livelli e Lubrificazione",
            description: "Interventi ricorrenti legati a lubrificazione. Pianificare rabbocchi.",
            frequency: "WEEKLY",
            frequencyDays: 7,
            confidence: "Media"
        });
    }

    if ((text.match(/cinghia|belt|tension/g) || []).length >= 2) {
        suggestions.push({
            title: "Ispezione Cinghie Trasmissione",
            description: "Usura cinghie rilevata nello storico. Controllare tensione e integrità.",
            frequency: "QUARTERLY",
            frequencyDays: 90,
            confidence: "Alta"
        });
    }

    if ((text.match(/sensore|taratura|calibra/g) || []).length >= 2) {
        suggestions.push({
            title: "Verifica/Taratura Sensori",
            description: "Problemi di lettura sensori frequenti. Eseguire calibrazione.",
            frequency: "SEMIANNUAL",
            frequencyDays: 180,
            confidence: "Media"
        });
    }

    // Default suggestion if lots of faults
    if (history.filter(h => h.type === 'FAULT').length > 5 && suggestions.length === 0) {
        suggestions.push({
            title: "Ispezione Generale Preventiva",
            description: "L'asset presenta numerosi guasti generici. Si consiglia un'ispezione completa ricorrente.",
            frequency: "MONTHLY",
            frequencyDays: 30,
            confidence: "Bassa"
        });
    }

    return suggestions;
}

// --- Self-Learning Logic ---

function extractTags(text: string): string[] {
    const stopWords = ['della', 'degli', 'nella', 'con', 'per', 'sul', 'sulla', 'che', 'non', 'del', 'al', 'lo', 'la', 'il', 'un', 'una'];
    return text.toLowerCase()
        .replace(/[^a-z0-9àèéìòù ]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.includes(w));
}

export async function learnFromWorkOrder(description: string, solution: string, category?: string) {
    if (!description || !solution) return;

    // Normalize tags
    const tags = extractTags(description).sort().join(",");
    if (!tags) return;

    try {
        // Try to find an existing entry with exact tags and solution
        const existing = await prisma.maintenanceKnowledge.findFirst({
            where: {
                problemTags: tags,
                solution: { contains: solution.substring(0, 20) } // Loose match on solution start
            }
        });

        if (existing) {
            await prisma.maintenanceKnowledge.update({
                where: { id: existing.id },
                data: { successCount: { increment: 1 }, lastUpdated: new Date() }
            });
        } else {
            await prisma.maintenanceKnowledge.create({
                data: {
                    problemTags: tags,
                    solution: solution,
                    assetCategory: category
                }
            });
        }
    } catch (e) {
        console.error("Learning Error:", e);
    }
}

export async function getKnowledgeSuggestions(description: string): Promise<string | null> {
    const tags = extractTags(description);
    if (tags.length === 0) return null;

    // Find entries that have at least one matching tag (approximate)
    // Prisma "contains" is simple. For array overlap we'd need Postgres Arrays, but tags is string.
    // MVP: Search for the most significant tag (longest)
    const significantTag = tags.sort((a, b) => b.length - a.length)[0];

    const relevant = await prisma.maintenanceKnowledge.findMany({
        where: { problemTags: { contains: significantTag } },
        orderBy: { successCount: 'desc' },
        take: 1
    });

    if (relevant.length > 0) return relevant[0].solution;
    return null;
}

export async function getPredictiveInsights() {
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
                    name: asset.name,
                    status: asset.status,
                    healthScore: asset.healthScore,
                    mtbf: null,
                    nextFailureDate: null,
                    riskLevel: 'LOW'
                };
            }

            // Calculate Mean Time Between Failures (MTBF)
            let totalDiff = 0;
            // Iterate pairs
            for (let i = 0; i < faults.length - 1; i++) {
                const recent = new Date(faults[i].createdAt).getTime();
                const older = new Date(faults[i + 1].createdAt).getTime();
                totalDiff += (recent - older);
            }

            const avgDiffMs = totalDiff / (faults.length - 1);
            const mtbfDays = Math.round(avgDiffMs / (1000 * 60 * 60 * 24));

            const lastFaultDate = new Date(faults[0].createdAt);
            const nextFailureMs = lastFaultDate.getTime() + avgDiffMs;
            const nextFailureDate = new Date(nextFailureMs);

            // Risk Calculation
            const now = new Date().getTime();
            const timeSinceLast = now - lastFaultDate.getTime();
            const percentUsed = timeSinceLast / avgDiffMs;

            let riskLevel = 'LOW';
            if (percentUsed > 1.1) riskLevel = 'CRITICAL'; // Overdue
            else if (percentUsed > 0.8) riskLevel = 'HIGH'; // Approaching
            else if (percentUsed > 0.5) riskLevel = 'MEDIUM'; // Halfway

            return {
                id: asset.id,
                name: asset.name,
                status: asset.status,
                healthScore: asset.healthScore,
                mtbf: mtbfDays,
                nextFailureDate,
                riskLevel
            };
        }).sort((a, b) => {
            // Sort Critical first
            const riskScore = { 'CRITICAL': 3, 'HIGH': 2, 'MEDIUM': 1, 'LOW': 0 };
            return riskScore[b.riskLevel as keyof typeof riskScore] - riskScore[a.riskLevel as keyof typeof riskScore];
        });
    } catch (error) {
        console.error("Predictive Error:", error);
        return [];
    }
}

export interface DailyInsight {
    id: string;
    type: 'ALERT' | 'WARNING' | 'INFO' | 'SUCCESS';
    title: string;
    message: string;
    actionLabel?: string;
    actionUrl?: string;
}

export async function getDailyInsights(): Promise<DailyInsight[]> {
    const insights: DailyInsight[] = [];

    try {
        // 1. Critical Pending WOs
        const criticalWOs = await prisma.workOrder.count({ where: { priority: 'STOPPED', status: { in: ['OPEN', 'IN_PROGRESS'] } } });
        if (criticalWOs > 0) {
            insights.push({
                id: 'critical-wo',
                type: 'ALERT',
                title: 'Interventi Critici',
                message: `Ci sono ${criticalWOs} interventi ad alta priorità in attesa.`,
                actionLabel: 'Visualizza',
                actionUrl: '/work-orders?priority=STOPPED'
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
        // Use internal logic to avoid recursion or heavy re-calc if possible, but calling the function is cleaner
        const predictive = await getPredictiveInsights();
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
        console.error("Daily Insights Error", e);
        insights.push({
            id: 'err-gen',
            type: 'WARNING',
            title: 'Sistema AI momentaneamente non disponibile',
            message: `Impossibile generare suggerimenti: ${e.message || 'Errore di connessione'}. Riprova più tardi.`
        });
    }

    return insights;
}

// Helper to safely handle DB errors without crashing the UI
async function safeDbCall<T>(promise: Promise<T>, fallback: T): Promise<T> {
    try {
        return await promise;
    } catch (e) {
        console.error("Safe DB Call Failed:", e);
        return fallback;
    }
}

export async function chatWithAsset(assetId: string, message: string, history: { role: string, content: string }[] = []) {
    // 1. Fetch Asset Context
    const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: {
            workOrders: {
                take: 5,
                orderBy: { createdAt: 'desc' },
                where: { status: 'CLOSED' },
                include: { ewo: true } // Include EWO details
            }
        }
    });

    if (!asset) return { role: 'assistant', content: "Non trovo questo asset." };

    const q = message.toLowerCase();

    // 2. Simple Intent Recognition (Simulated LLM)

    // Intent: History/Past Problems
    if (q.includes("storia") || q.includes("problemi") || q.includes("passato") || q.includes("successo")) {
        if (asset.workOrders.length === 0) {
            return { role: 'assistant', content: `Non ho storico interventi per ${asset.name}.` };
        }
        // Access solution from EWO if available, otherwise generic
        const summary = asset.workOrders.map(wo => `- ${wo.createdAt.toLocaleDateString()}: ${wo.title} (${wo.ewo?.solutionApplied || 'Risolto'})`).join("\n");
        return { role: 'assistant', content: `Ecco gli ultimi interventi su ${asset.name}:\n${summary}` };
    }

    // Intent: Manual/Docs
    if (q.includes("manuale") || q.includes("documenti") || q.includes("pdf")) {
        return { role: 'assistant', content: `Puoi trovare il manuale tecnico di ${asset.name} nella sezione "Documenti" o scansionando il QR Code sulla macchina.` };
    }

    // Intent: Troubleshooting (Specific)
    if (q.includes("rumore") || q.includes("vibra")) {
        return { role: 'assistant', content: `Per problemi di rumore/vibrazioni su ${asset.model}, controlla:\n1. Cuscinetti (Spesso usurati)\n2. Allineamento motore\n3. Serraggio bulloni basamento.` };
    }

    if (q.includes("fermo") || q.includes("blocc")) {
        return { role: 'assistant', content: `Se ${asset.name} è bloccata, verifica:\n1. Pulsante emergenza premuto?\n2. Protezioni chiuse correttamente?\n3. Alimentazione aria compressa (se pneumatica).` };
    }

    // Default Fallback
    return {
        role: 'assistant',
        content: `Sono l'assistente virtuale di **${asset.name}**. Conosco il suo storico e i suoi manuali. \nChiedimi: "Quali problemi ha avuto?" o "Cosa fare se fa rumore?"`
    };
}
// --- Quality Checks ---

export async function validateDescriptionQuality(description: string): Promise<{ valid: boolean; reason?: string }> {
    // Simulate thinking
    await new Promise(resolve => setTimeout(resolve, 600));

    const cleanDesc = description.trim();

    // 1. Length Check
    if (cleanDesc.length < 15) {
        return {
            valid: false,
            reason: "Descrizione troppo breve. Inserisci almeno 15 caratteri per aiutare i tecnici."
        };
    }

    // 2. Generic Phrases Check
    const lowDesc = cleanDesc.toLowerCase();
    const genericPhrases = [
        "non va", "non funziona", "rotto", "guasto", "si è rotto", "problema", "fermo", "non parte", "bloccato", "errore"
    ];

    // If description is short (< 40 chars) and contains ONLY generic triggers or is very simple
    if (cleanDesc.length < 40) {
        // Check if it's just a generic phrase
        const isGeneric = genericPhrases.some(phrase => lowDesc === phrase || lowDesc.includes(phrase) && lowDesc.length < phrase.length + 10);

        if (isGeneric) {
            return {
                valid: false,
                reason: "Descrizione troppo generica. Specifica *cosa* non va o *dove* è il problema (es. 'Motore non parte con errore E04')."
            };
        }

        // Check word count
        const words = cleanDesc.split(' ').length;
        if (words < 4) {
            return {
                valid: false,
                reason: "Descrizione poco dettagliata. Aggiungi più contesto."
            };
        }
    }

    // 3. Gibberish Check (Heuristic: typical repetition or weird patterns)
    if (/([a-z])\1{4,}/i.test(cleanDesc)) { // e.g. "aaaaaa"
        return {
            valid: false,
            reason: "La descrizione sembra contenere testo non valido."
        };
    }

    return { valid: true };
}

export async function suggestActivitiesForDowntime(lineName: string, durationHours: number) {
    try {
        // 1. Find Assets on this Line
        const assets = await prisma.asset.findMany({
            where: { line: lineName }, // Assuming 'line' field exists on Asset or mapped somehow. Actually schema says 'line' string?
            // Wait, schema has lines? Let's check schema. Yes, Asset has `line String?`.
            include: {
                schedules: true,
                workOrders: {
                    where: { status: { in: ['OPEN', 'PENDING_APPROVAL'] } }
                }
            }
        });

        if (assets.length === 0) {
            return {
                message: `Nessun asset trovato sulla linea "${lineName}".`,
                suggestions: []
            };
        }

        const suggestions: any[] = [];

        // Fetch Line Schedule to check if it's maintenance window or emergency
        // We simulate a check: if duration > 12h it's likely a weekend stop (Green)
        // If duration < 4h it might be a break.
        const isLongStop = durationHours >= 8;

        for (const asset of assets) {
            // A. Check for "Backlog" WOs (Low Priority)
            const backlog = asset.workOrders.filter(wo => wo.priority !== 'STOPPED');

            if (backlog.length > 0) {
                for (const wo of backlog) {
                    suggestions.push({
                        type: 'WO',
                        title: wo.title,
                        assetName: asset.name,
                        priority: 'MEDIUM',
                        reason: `Recupera ordine in attesa #${wo.id}`
                    });
                }
            }

            // B. Suggest Checks based on Stop Length
            if (isLongStop) {
                // Check if any PM is due in next 14 days
                const dueSoon = asset.schedules.filter(sch => {
                    if (!sch.nextDueDate) return false;
                    const diffDays = Math.ceil((new Date(sch.nextDueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                    return diffDays <= 14;
                });

                for (const pm of dueSoon) {
                    suggestions.push({
                        type: 'PM',
                        title: pm.taskTitle,
                        assetName: asset.name,
                        priority: 'HIGH',
                        reason: `Approfitta del fermo lungo per anticipare scadenza (${new Date(pm.nextDueDate).toLocaleDateString()})`
                    });
                }
            }
        }

        // C. Generic Suggestions
        if (isLongStop && suggestions.length < 3) {
            suggestions.push({
                type: 'GENERIC',
                title: 'Pulizia e Sanificazione Area',
                assetName: 'Linea',
                priority: 'LOW',
                reason: 'Standard per fermi > 8h.'
            });
        }

        if (suggestions.length === 0) {
            return {
                message: "Nessuna attività urgente rilevata. La linea è in ottima salute! 🌟",
                suggestions: []
            };
        }

        return {
            message: `Ho trovato ${suggestions.length} attività suggerite per questo fermo:`,
            suggestions
        };

    } catch (error) {
        console.error("Downtime Suggestion Error:", error);
        return { message: "Errore durante l'analisi.", suggestions: [] };
    }
}
