import { prisma } from "@/lib/prisma";
import { AIMemoryItem } from "./types";

// Simulating a Vector Store using keyword overlap and simple scoring
export class VectorMemory {

    // Stopwords for Italian/English to ignore
    private stopWords = new Set([
        'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
        'the', 'is', 'at', 'which', 'on', 'and', 'or', 'che', 'non', 'del', 'della', 'dei'
    ]);

    private tokenize(text: string): string[] {
        return text.toLowerCase()
            .replace(/[^a-z0-9àèéìòù ]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !this.stopWords.has(w));
    }

    private calculateSimilarity(queryTokens: string[], itemTags: string[]): number {
        let intersection = 0;
        for (const token of queryTokens) {
            if (itemTags.some(tag => tag.includes(token) || token.includes(tag))) {
                intersection += 1;
            }
        }
        // Jaccard-ish index (simplified)
        const union = new Set([...queryTokens, ...itemTags]).size;
        return union === 0 ? 0 : intersection / union;
    }

    async search(query: string, limit: number = 3): Promise<AIMemoryItem[]> {
        const tokens = this.tokenize(query);

        // 1. Fetch Candidates from DB (Knowledge Base & Work Order History)
        // In a real vector DB, we'd query embeddings. Here we fetch broad matches.

        const [kbItems, woItems, anomalies, energyLogs] = await Promise.all([
            prisma.maintenanceKnowledge.findMany({ take: 50 }),
            prisma.workOrder.findMany({
                where: { status: 'CLOSED' },
                take: 50,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.processAnomaly.findMany({ take: 20, orderBy: { detectedAt: 'desc' } }),
            prisma.energyLog.findMany({ take: 20, orderBy: { date: 'desc' } })
        ]);

        const candidates: AIMemoryItem[] = [];

        // Map KB
        kbItems.forEach(k => {
            candidates.push({
                id: k.id,
                tags: k.problemTags.split(','),
                content: k.solution,
                type: 'knowledge',
                createdAt: k.lastUpdated
            });
        });

        // Map WO
        woItems.forEach(w => {
            candidates.push({
                id: w.id,
                tags: this.tokenize(w.title + " " + w.description),
                content: `Intervento storico: ${w.title}. Risolto con queste note: ${w.description}`,
                type: 'history',
                createdAt: w.createdAt
            });
        });

        // Map Process Anomalies
        anomalies.forEach(a => {
            candidates.push({
                id: a.id,
                tags: this.tokenize(a.description),
                content: `Anomalia Processo: ${a.description}. Suggerimento AI: ${a.aiRecommendation}`,
                type: 'process',
                createdAt: a.detectedAt
            });
        });

        // Map Energy Logs (if they have anomalies or significant context)
        energyLogs.forEach(e => {
            if (e.kwhConsumed > 0) { // In a real case, we'd filter for spikes
                candidates.push({
                    id: e.id,
                    tags: ['energia', 'sostenibilità', 'consumo', e.assetId || 'plant'],
                    content: `Consumo Energetico rilevato: ${e.kwhConsumed} kWh. Costo stimato: €${e.costLocal?.toFixed(2)}`,
                    type: 'energy',
                    createdAt: e.date
                });
            }
        });

        // Rank
        const ranked = candidates.map(item => ({
            ...item,
            relevance: this.calculateSimilarity(tokens, item.tags)
        })).filter(i => (i.relevance || 0) > 0.1);

        return ranked.sort((a, b) => (b.relevance || 0) - (a.relevance || 0)).slice(0, limit);
    }

    async learn(description: string, solution: string, category?: string) {
        const tokens = this.tokenize(description);
        const tags = tokens.sort().join(",");

        try {
            // Check for existing similar entry
            const existing = await prisma.maintenanceKnowledge.findFirst({
                where: {
                    problemTags: tags,
                    solution: { contains: solution.substring(0, 20) }
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
                        assetCategory: category || 'General'
                    }
                });
            }
        } catch (error) {
            console.error("VectorMemory Learn Error:", error);
        }
    }
}
