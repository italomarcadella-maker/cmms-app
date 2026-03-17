"use server";

import { prisma } from "@/lib/prisma";

// Simple heuristic engine to simulate "AI" understanding of the database
// In a real scenario, this would call an LLM (OpenAI/Gemini) with function calling.
// Here we use regex-based intent classification for the MVP.

interface AIResponse {
    sender: string;
    content: string;
    actions?: any[];
    thoughtProcess?: string[];
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

import { CortexEngine } from "./ai/cortex";

// Singleton instance to keep memory loaded (in serverless this might reset, but fine for MVP)
const cortex = new CortexEngine();

export async function generateAIResponse(query: string, image?: string): Promise<AIResponse> {
    try {
        const response = await cortex.process(query, undefined, image);

        return {
            sender: "AI Copilot",
            content: response.message,
            actions: response.actions,
            thoughtProcess: response.thoughtProcess
        };
    } catch (e) {
        console.error("Cortex Error:", e);
        return {
            sender: "AI Copilot", // Fallback
            content: "Mi dispiace, i miei circuiti neurali sono momentaneamente sovraccarichi. 🔌\nRiprova tra poco."
        };
    }
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
    await cortex.learn(description, solution, category);
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

export interface BrainSuggestion {
    source: 'SOP' | 'KB' | 'STORICO_WO';
    title: string;
    content: string;
    relevance: number;
}

export async function generateCorporateBrainSuggestions(description: string, assetId: string): Promise<BrainSuggestion[]> {
    // Simulate AI parsing / embedding lookup
    await new Promise(r => setTimeout(r, 1000));

    const results: BrainSuggestion[] = [];
    const keywords = extractTags(description);

    if (!description || keywords.length === 0) {
        return [{
            source: 'SOP',
            title: 'Istruzioni non trovate',
            content: 'La descrizione è troppo breve per effettuare una ricerca nel Corporate Brain.',
            relevance: 0
        }];
    }

    try {
        // 1. Cercare nelle SOP dell'asset
        const sops = await prisma.sopDocument.findMany({
            where: { assetId, isApproved: true }
        });

        if (sops.length > 0) {
            // Fake embedding match based on JSON content
            const sop = sops[0];
            results.push({
                source: 'SOP',
                title: `Procedura Standard: ${sop.title}`,
                content: `È stata trovata una SOP ufficiale. Parametri attesi: ${sop.aiExtractedParameters.substring(0, 100)}...`,
                relevance: 95
            });
        }

        // 2. Cercare nella Knowledge Base aziendale
        const significantTag = keywords.sort((a, b) => b.length - a.length)[0];
        const kb = await prisma.maintenanceKnowledge.findFirst({
            where: { problemTags: { contains: significantTag } },
            orderBy: { successCount: 'desc' }
        });

        if (kb && kb.solution) {
            results.push({
                source: 'KB',
                title: `Soluzione Esperto (Usata ${kb.successCount} volte)`,
                content: kb.solution,
                relevance: 85
            });
        }

        // 3. Cercare nello Storico Work Orders chiusi simili sull'asset
        const historyQuery = historySearchForTags(keywords);

        const historyWo = await prisma.workOrder.findMany({
            where: {
                assetId,
                status: 'CLOSED',
                OR: historyQuery.length > 0 ? historyQuery : undefined
            },
            take: 2,
            orderBy: { createdAt: 'desc' },
            include: { ewo: true }
        });

        for (const wo of historyWo) {
            let solution = "";
            if (wo.ewo && wo.ewo.solutionApplied) {
                solution = wo.ewo.solutionApplied;
            } else if (wo.completionImage) {
                solution = "Risolto (Visualizza foto completamento)";
            } else {
                solution = "Chiuso dai tecnici precedenti senza EWO.";
            }

            results.push({
                source: 'STORICO_WO',
                title: `Oridine Lavoro #${wo.id} - ${wo.title}`,
                content: `Storico: ${solution}`,
                relevance: 70
            });
        }

    } catch (e) {
        console.error("Brain search error", e);
    }

    return results.sort((a, b) => b.relevance - a.relevance);
}

// Helper to construct OR query for Prisma based on keywords
function historySearchForTags(tags: string[]) {
    // Take max 3 tags to avoid huge queries
    const limitedTags = tags.slice(0, 3);
    return limitedTags.map(tag => ({
        description: { contains: tag }
    }));
}

import { DailyInsight } from "./ai/types";

// ... (getPredictiveInsights removed) ...

export async function getDailyInsights(): Promise<DailyInsight[]> {
    return cortex.generateDailyInsights();
}

export async function getPredictiveInsights() {
    return await cortex.getPredictiveAnalysis();
}

// Helper to safely handle DB errors without crashing the UI
async function safeDbCall<T>(promise: Promise<T>, fallback: T): Promise<T> {
    // ...
    try {
        return await promise;
    } catch (e) {
        console.error("Safe DB Call Failed:", e);
        return fallback;
    }
}

export async function chatWithAsset(assetId: string, message: string, history: any[]): Promise<{ role: string; content: string; actions?: any[] }> {
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

// --- Mock AI Service for Widget ---
export interface AIInsight {
    id: string;
    assetName: string;
    type: 'WARNING' | 'CRITICAL' | 'INFO';
    prediction: string;
    confidence: number;
    action: string;
}

export async function getMockInsights(): Promise<AIInsight[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    return [
        {
            id: '1',
            assetName: 'Pressa IDRA 2000',
            type: 'WARNING',
            prediction: 'Alta temperatura olio rilevata. Rischio di fermo entro 48h.',
            confidence: 85,
            action: 'Controllare scambiatore'
        },
        {
            id: '2',
            assetName: 'CNC Mazak #3',
            type: 'CRITICAL',
            prediction: 'Vibrazioni mandrino anomale. Cuscinetto in cedimento.',
            confidence: 94,
            action: 'Sostituzione immediata'
        },
        {
            id: '3',
            assetName: 'Carroponte B',
            type: 'INFO',
            prediction: 'Efficienza motore calata del 5% nell\'ultimo mese.',
            confidence: 60,
            action: 'Pianificare revisione'
        }
    ];
}

// --- PROCESS ENGINEERING AI (HMI VISION & SOP) ---

export async function parseHmiImageToSop(imageUrl: string, assetId: string) {
    // Simulazione di una vera API Vision (es. OpenAI GPT-4 Vision o Gemini)
    // Nella realtà, qui passeremmo l'immagine e chiederemmo un JSON strutturato

    await new Promise(resolve => setTimeout(resolve, 2000)); // Simuliamo caricamento OCR/AI

    // Contenuto "finto" estratto dall'immagine
    // Generiamo parametri realistici tipici di una ricetta di estrusione o stampaggio
    // Contenuto "finto" estratto dall'immagine
    // Generiamo ~150 parametri realistici divisi per categorie
    const categories = [
        { name: "Estrusore Principale", count: 25 },
        { name: "Co-Estrusore A", count: 15 },
        { name: "Co-Estrusore B", count: 15 },
        { name: "Dosaggio e Gravimetria", count: 20 },
        { name: "Testa e Filtro", count: 15 },
        { name: "Calibrazione e Vuoto", count: 15 },
        { name: "Traino e Tensionamento", count: 15 },
        { name: "Raffreddamento vasche", count: 10 },
        { name: "Taglio e Scarico", count: 10 },
        { name: "Parametri Qualità Linea", count: 10 }
    ];

    const extractedParameters: any[] = [];

    // Helper to generate ranges
    const gen = (label: string, value: number, unit: string, tol: number, cat: string) => {
        extractedParameters.push({ label, value, unit, tolerance: tol, category: cat });
    };

    // 1. Estrusore Principale (CAT: Heating & Drive)
    for(let i=1; i<=12; i++) gen(`Temp. Cilindro Zona ${i}`, 180 + (i*2), "°C", 5, "Estrusore Principale");
    gen("Temp. Flangia", 205, "°C", 3, "Estrusore Principale");
    gen("Temp. Collo", 210, "°C", 3, "Estrusore Principale");
    gen("Velocità Vite", 48.5, "rpm", 0.5, "Estrusore Principale");
    gen("Assorbimento Motore", 145, "A", 10, "Estrusore Principale");
    gen("Coppia (%)", 68, "%", 5, "Estrusore Principale");
    gen("Pressione Melt", 240, "bar", 10, "Estrusore Principale");
    gen("Temp. Melt", 215, "°C", 5, "Estrusore Principale");
    gen("Carico Alimentazione", 85, "%", 2, "Estrusore Principale");
    gen("Ventilazione Zona 1-3", 40, "%", 5, "Estrusore Principale");
    gen("Ventilazione Zona 4-8", 60, "%", 5, "Estrusore Principale");

    // 2. Co-Estrusore A (CAT: Side Feed)
    for(let i=1; i<=6; i++) gen(`Co-Ex A: Temp. Zona ${i}`, 190 + i, "°C", 5, "Co-Estrusore A");
    gen("Co-Ex A: Velocità", 22.0, "rpm", 1, "Co-Estrusore A");
    gen("Co-Ex A: Coppia", 45, "%", 5, "Co-Estrusore A");
    gen("Co-Ex A: Pressione", 120, "bar", 10, "Co-Estrusore A");
    for(let i=1; i<=6; i++) gen(`Co-Ex A: Vent. Zona ${i}`, 30, "%", 5, "Co-Estrusore A");

    // 3. Co-Estrusore B
    for(let i=1; i<=6; i++) gen(`Co-Ex B: Temp. Zona ${i}`, 195 - i, "°C", 5, "Co-Estrusore B");
    gen("Co-Ex B: Velocità", 18.5, "rpm", 1, "Co-Estrusore B");
    gen("Co-Ex B: Coppia", 52, "%", 5, "Co-Estrusore B");
    gen("Co-Ex B: Pressione", 135, "bar", 10, "Co-Estrusore B");
    for(let i=1; i<=6; i++) gen(`Co-Ex B: Vent. Zona ${i}`, 35, "%", 5, "Co-Estrusore B");

    // 4. Dosaggio e Gravimetria
    gen("Portata Totale Target", 450, "kg/h", 5, "Dosaggio e Gravimetria");
    gen("Portata Reale", 448.5, "kg/h", 2, "Dosaggio e Gravimetria");
    gen("Dosatore 1 (Master)", 2.5, "%", 0.1, "Dosaggio e Gravimetria");
    gen("Dosatore 2 (Additivo)", 1.2, "%", 0.05, "Dosaggio e Gravimetria");
    gen("Dosatore 3 (Regenerato)", 15.0, "%", 0.5, "Dosaggio e Gravimetria");
    gen("Dosatore 4 (Vergine)", 81.3, "%", 0.5, "Dosaggio e Gravimetria");
    for(let i=1; i<=8; i++) gen(`Consumo Componente ${i}`, 12.5 + i, "kg/h", 1, "Dosaggio e Gravimetria");
    gen("Errore Dosaggio Cumulativo", 0.02, "%", 0.01, "Dosaggio e Gravimetria");
    gen("Livello Tramoggia", 75, "%", 5, "Dosaggio e Gravimetria");
    gen("Velocità Mixer", 120, "rpm", 10, "Dosaggio e Gravimetria");

    // 5. Testa e Filtro
    for(let i=1; i<=8; i++) gen(`Temp. Bullone Termico ${i}`, 210, "°C", 2, "Testa e Filtro");
    gen("Temp. Testa DX", 215, "°C", 2, "Testa e Filtro");
    gen("Temp. Testa SX", 215, "°C", 2, "Testa e Filtro");
    gen("Temp. Cuore", 208, "°C", 2, "Testa e Filtro");
    gen("Delta P Filtro", 15, "bar", 5, "Testa e Filtro");
    gen("Posizione Cambiafiltro", 0, "mm", 0, "Testa e Filtro");
    gen("Temp. Olio Centralina", 45, "°C", 5, "Testa e Filtro");

    // 6. Calibrazione e Vuoto
    for(let i=1; i<=6; i++) gen(`Pompa Vuoto ${i} Power`, 80, "%", 5, "Calibrazione e Vuoto");
    for(let i=1; i<=6; i++) gen(`Livello Vuoto ${i}`, -0.6, "bar", 0.05, "Calibrazione e Vuoto");
    gen("Temp. Acqua Ingresso", 14.5, "°C", 1, "Calibrazione e Vuoto");
    gen("Portata Acqua Totale", 120, "l/min", 10, "Calibrazione e Vuoto");
    gen("Posizione Calibratore", 1250, "mm", 5, "Calibrazione e Vuoto");

    // 7. Traino e Tensionamento
    gen("Velocità Traino", 12.4, "m/min", 0.1, "Traino e Tensionamento");
    gen("Sincronismo (%)", 100.2, "%", 0.1, "Traino e Tensionamento");
    gen("Pressione Cingoli", 4.5, "bar", 0.2, "Traino e Tensionamento");
    gen("Coppia Motore Traino", 35, "%", 5, "Traino e Tensionamento");
    gen("Distanza Rulli Guida", 200, "mm", 1, "Traino e Tensionamento");
    for(let i=1; i<=10; i++) gen(`Tensione Settore ${i}`, 15 + i, "N", 2, "Traino e Tensionamento");

    // 8. Raffreddamento vasche
    for(let i=1; i<=6; i++) {
        gen(`Temp. Vasca ${i}`, 15 + i, "°C", 2, "Raffreddamento vasche");
        gen(`Livello Vasca ${i}`, 95, "%", 2, "Raffreddamento vasche");
    }

    // 9. Taglio e Scarico
    gen("Lunghezza Taglio", 6000, "mm", 2, "Taglio e Scarico");
    gen("Velocità Lama", 2800, "rpm", 50, "Taglio e Scarico");
    gen("Avanzamento Carro", 1.2, "m/s", 0.1, "Taglio e Scarico");
    gen("Pressione Morse", 6.0, "bar", 0.5, "Taglio e Scarico");
    gen("Conteggio Pezzi", 1240, "pcs", 0, "Taglio e Scarico");
    gen("Tempo Ciclo Taglio", 4.2, "s", 0.1, "Taglio e Scarico");
    gen("Posizione Ribaltatore", 0, "deg", 0, "Taglio e Scarico");

    // 10. Parametri Qualità Linea (Ultrasonico / Laser)
    gen("Diametro Esterno Medio", 110.2, "mm", 0.2, "Parametri Qualità Linea");
    gen("Ovalizzazione", 0.15, "mm", 0.1, "Parametri Qualità Linea");
    gen("Spessore Minimo", 5.2, "mm", 0.1, "Parametri Qualità Linea");
    gen("Spessore Massimo", 5.6, "mm", 0.1, "Parametri Qualità Linea");
    for(let i=1; i<=8; i++) gen(`Spessore Punto ${i}`, 5.4, "mm", 0.2, "Parametri Qualità Linea");
    gen("Grammatura (g/m)", 1850, "g/m", 20, "Parametri Qualità Linea");

    // WOW FEATURE: Confronteremo questo risultato con l'ultima SOP approvata per la macchina.
    const anomalies: any[] = [];

    try {
        const lastSop = await prisma.sopDocument.findFirst({
            where: { assetId, isApproved: true },
            orderBy: { createdAt: 'desc' }
        });

        if (lastSop) {
            const previousParams = JSON.parse(lastSop.aiExtractedParameters);

            // Creiamo un dict per lookup facile
            const prevDict: Record<string, any> = {};
            previousParams.forEach((p: any) => { prevDict[p.label] = p; });

            extractedParameters.forEach(current => {
                const prev = prevDict[current.label];
                if (prev) {
                    const diff = current.value - prev.value;
                    const isOutsideTolerance = Math.abs(diff) > current.tolerance;

                    if (isOutsideTolerance) {
                        anomalies.push({
                            label: current.label,
                            expected: prev.value,
                            actual: current.value,
                            diff: diff,
                            description: `Deriva rilevata su ${current.label}: ${diff > 0 ? '+' : ''}${diff}${current.unit} rispetto allo standard approvato. Possibile impatto sulla fusione.`,
                            recommendation: `Verificare rampa di riscaldamento o avvisare il capoturno.`
                        });
                    }
                }
            });

            // Se ci sono anomalie, possibilmente le salviamo nel database (oppure lasciamo decidere all'UI)
            if (anomalies.length > 0) {
                // Per non bloccare, lo facciamo async
                anomalies.map(async (anom) => {
                    await prisma.processAnomaly.create({
                        data: {
                            assetId,
                            description: anom.description,
                            aiRecommendation: anom.recommendation + " (Consigliato controllo tecnico preventivo)"
                        }
                    });

                    // AUTO-BRIDGE: If the anomaly looks mechanical/critical, suggest a Maintenance Ticket draft
                    const isMechanical = anom.label.toLowerCase().includes("pressione") || anom.label.toLowerCase().includes("coppia");
                    if (isMechanical) {
                        // Normally we'd use learnFromWorkOrder or a specific trigger
                        console.log(`[Cortex Bridge] Mechanical Anomaly detected on ${anom.label}. Tagging for maintenance.`);
                    }
                });
            }
        }
    } catch (e) {
        console.error("AI SOP diff failed:", e);
    }

    return {
        success: true,
        detectedTitle: `Ricetta Standard - Scansione ${new Date().toLocaleDateString()}`,
        parameters: extractedParameters,
        anomalies
    };
}
