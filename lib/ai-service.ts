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

export async function generateAIResponse(query: string): Promise<AIResponse> {
    const q = query.toLowerCase();

    // Intent: Count Open Work Orders
    if (q.includes("quanti") && (q.includes("ordini") || q.includes("interventi")) && (q.includes("aperti") || q.includes("da fare"))) {
        const count = await prisma.workOrder.count({
            where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }
        });
        return {
            sender: "AI Copilot",
            content: `Attualmente ci sono **${count}** interventi aperti o in corso. Vuoi vederli?`,
        };
    }

    // Intent: Show High Priority
    if ((q.includes("urgenti") || q.includes("priorità alta")) && (q.includes("mostra") || q.includes("quali"))) {
        const highPriority = await prisma.workOrder.findMany({
            where: { priority: 'HIGH', status: { not: 'CLOSED' } },
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
    }

    // Intent: Generate Daily Suggestions
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

    // Fallback
    return {
        sender: "AI Copilot",
        content: "Mi dispiace, non ho capito la richiesta. Prova a chiedermi lo stato degli ordini o degli asset."
    };
}
