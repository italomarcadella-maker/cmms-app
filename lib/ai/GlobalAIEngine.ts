import { prisma } from "@/lib/prisma";

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

      // Esempio logica AI: se l'ultimo valore è fuori un certo intervallo statistico
      // Creiamo un insight
      // Per questa demo, inseriamo un insight fittizio per dimostrare l'integrazione
      const insight = await prisma.globalInsight.create({
        data: {
          title: `Possibile deriva qualitativa - Ricetta: ${recipe.name}`,
          description: `Rilevata una lettura di qualità (${newValue}) che potrebbe indicare un'usura del componente o un parametro starato.`,
          source: 'QUALITY',
          priority: 'MEDIUM',
          tags: ['qualità', 'deriva'],
          assetId: recipe.assetId,
          relatedData: { recipeId, value: newValue }
        }
      });
      
      console.log("[GlobalAIEngine] Generato insight da qualità:", insight.id);
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

      // Generiamo un insight che incrocia questa inefficienza
      const insight = await prisma.globalInsight.create({
        data: {
          title: `Collo di bottiglia identificato - Simulazione: ${sim.name}`,
          description: `La simulazione ha un Lean Score di ${sim.leanScore}/100. L'AI suggerisce di ricalibrare i tempi di ciclo delle postazioni o di verificare la manutenzione della macchina più lenta.`,
          source: 'FPES',
          priority: sim.leanScore < 50 ? 'HIGH' : 'LOW',
          tags: ['lean', 'yamazumi', 'collo di bottiglia'],
          assetId: sim.assetId,
          relatedData: { simulationId, leanScore: sim.leanScore }
        }
      });

      console.log("[GlobalAIEngine] Generato insight da FPES:", insight.id);
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
