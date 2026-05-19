import { prisma } from "@/lib/prisma";
import { callLLM } from "./llm-service";

/**
 * Global AI Engine per CMMS 2.0
 * Raccoglie segnali dai vari moduli (SOP, FPES, Manutenzione) e genera
 * degli insight incrociati memorizzati in GlobalInsight.
 */

export class GlobalAIEngine {
  
  /**
   * Analizza le letture di qualità appena inserite
   */
  static async analyzeQualityDeviation(recipeId: string, newValue: number) {
    try {
      const recipe = await prisma.processRecipe.findUnique({
        where: { id: recipeId },
        include: { asset: true, parameters: true }
      });
      if (!recipe) return;

      // Use AI to analyze deviation
      const prompt = `Analizza questa lettura di qualità per la ricetta "${recipe.name}" (Asset: ${recipe.asset.name}).
      Valore registrato: ${newValue}.
      I parametri previsti dalla ricetta sono: ${recipe.parameters.map((p: any) => `${p.name} (Min: ${p.minValue}, Max: ${p.maxValue})`).join(', ')}.
      Scrivi una breve descrizione (max 2 frasi) di cosa potrebbe indicare questa lettura (es. usura componente, parametro starato) e proponi una priorità tra LOW, MEDIUM, HIGH.
      Formatta la risposta esattamente così:
      TITOLO: [Titolo sintetico]
      PRIORITÀ: [LOW|MEDIUM|HIGH]
      DESCRIZIONE: [La tua analisi]`;

      const aiResponse = await callLLM(prompt, []);
      const content = aiResponse.content;

      // Parse AI response (fallback to regex/substrings)
      const titleMatch = content.match(/TITOLO:\s*(.+)/i);
      const priorityMatch = content.match(/PRIORITÀ:\s*(LOW|MEDIUM|HIGH)/i);
      const descMatch = content.match(/DESCRIZIONE:\s*(.+)/is);

      const title = titleMatch ? titleMatch[1].trim() : `Analisi Qualità - ${recipe.name}`;
      const priority = priorityMatch ? priorityMatch[1].toUpperCase() : 'MEDIUM';
      const description = descMatch ? descMatch[1].trim() : content;

      const insight = await prisma.globalInsight.create({
        data: {
          title: title,
          description: description,
          source: 'QUALITY',
          priority: priority,
          tags: ['qualità', 'deriva', 'AI'],
          assetId: recipe.assetId,
          relatedData: { recipeId, value: newValue }
        }
      });
      
      console.log("[GlobalAIEngine] Generato insight AI da qualità:", insight.id);
      return insight;
    } catch (e) {
      console.error("[GlobalAIEngine] Error in analyzeQualityDeviation", e);
    }
  }

  /**
   * Analizza gli snapshot di simulazione Lean FPES
   */
  static async analyzeSimulationBottleneck(simulationId: string) {
    try {
      const sim = await prisma.lineSimulation.findUnique({
        where: { id: simulationId },
        include: { asset: true }
      });
      if (!sim) return;

      const prompt = `Analizza i risultati della simulazione Lean FPES "${sim.name}" per l'asset "${sim.asset?.name || 'Sconosciuto'}".
      Il Lean Score complessivo è: ${sim.leanScore}/100.
      Suggerisci brevemente (max 2 frasi) come migliorare il tempo di ciclo o risolvere i colli di bottiglia in base a questo punteggio.
      Formatta la risposta esattamente così:
      TITOLO: [Titolo sintetico]
      PRIORITÀ: [LOW|MEDIUM|HIGH]
      DESCRIZIONE: [La tua analisi]`;

      const aiResponse = await callLLM(prompt, []);
      const content = aiResponse.content;

      const titleMatch = content.match(/TITOLO:\s*(.+)/i);
      const priorityMatch = content.match(/PRIORITÀ:\s*(LOW|MEDIUM|HIGH)/i);
      const descMatch = content.match(/DESCRIZIONE:\s*(.+)/is);

      const title = titleMatch ? titleMatch[1].trim() : `Analisi FPES - ${sim.name}`;
      const priority = priorityMatch ? priorityMatch[1].toUpperCase() : (sim.leanScore < 50 ? 'HIGH' : 'LOW');
      const description = descMatch ? descMatch[1].trim() : content;

      const insight = await prisma.globalInsight.create({
        data: {
          title: title,
          description: description,
          source: 'FPES',
          priority: priority,
          tags: ['lean', 'yamazumi', 'collo di bottiglia', 'AI'],
          assetId: sim.assetId,
          relatedData: { simulationId, leanScore: sim.leanScore }
        }
      });

      console.log("[GlobalAIEngine] Generato insight AI da FPES:", insight.id);
      return insight;
    } catch (e) {
      console.error("[GlobalAIEngine] Error in analyzeSimulationBottleneck", e);
    }
  }

  /**
   * Ricerca insight generici non risolti
   */
  static async getActiveInsights() {
    return prisma.globalInsight.findMany({
      where: { isResolved: false },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Risolve un insight
   */
  static async resolveInsight(id: string) {
    return prisma.globalInsight.update({
      where: { id },
      data: { isResolved: true }
    });
  }
}
