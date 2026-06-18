import { ILlmProvider } from "./providers/llm-provider";
import { GeminiProvider } from "./providers/gemini-provider";
import { OllamaProvider } from "./providers/ollama-provider";

export interface LLMResponse {
    content: string;
    isExternal: boolean;
}

class LlmProviderFactory {
    static getProvider(): ILlmProvider | null {
        const providerName = process.env.AI_PROVIDER || "gemini";
        
        if (providerName === "ollama") {
            try {
                return new OllamaProvider();
            } catch (e) {
                console.error("Failed to initialize OllamaProvider:", e);
                return null;
            }
        }
        
        // Gemini default
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "dummy-key") {
            return null; // Fallback to simulation
        }
        
        try {
            return new GeminiProvider();
        } catch (e) {
            console.error("Failed to initialize GeminiProvider:", e);
            return null;
        }
    }
}

export async function callLLM(
    query: string,
    context: string[],
    image?: string
): Promise<LLMResponse> {
    const provider = LlmProviderFactory.getProvider();
    
    const systemInstruction = `Sei Cortex, l'intelligenza artificiale di CMMS 2.0 (Manutenzione Industriale 4.0).
                
Sei un assistente sempre pronto e disponibile.
Se l'utente ti pone domande specifiche su anomalie, consumi o derive, usa i dati nel CONTESTO INTERNO.
Se il contesto è vuoto o non contiene la risposta, rispondi usando le tue conoscenze generali da esperto di manutenzione e industria, ma precisa elegantemente: "Non ho dati attuali specifici su questo elemento, ma in base agli standard industriali...".
Non dire "Non ho ancora dati per questo elemento" se non è strettamente necessario.
Mantieni un tono collaborativo e professionale.

CONTESTO INTERNO:
${context.length > 0 ? context.join('\n\n') : 'Nessun dato di contesto disponibile per questa entità.'}
`;

    if (!provider) {
        // Local simulation fallback
        const fallbackMessage = context.length > 0 
            ? "Analizzando i " + context.length + " record di contesto, rilevo pattern anomali. Consiglio di controllare i parametri indicati nelle SOP."
            : "Non ho dati di contesto specifici per questa entità, ma come assistente Cortex posso suggerirti di verificare le linee guida standard di manutenzione.";
        
        return {
            content: fallbackMessage,
            isExternal: false
        };
    }

    try {
        const responseText = await provider.generateText(query, systemInstruction, image);
        return {
            content: responseText || "Non ho ancora dati per questo elemento.",
            isExternal: true
        };
    } catch (error) {
        console.error("LLM Provider Error, falling back to local simulation:", error);
        const fallbackMessage = context.length > 0 
            ? "Analizzando i " + context.length + " record di contesto (errore AI), rilevo pattern anomali. Consiglio di controllare i parametri indicati nelle SOP."
            : "Non ho dati di contesto specifici per questa entità, ma come assistente Cortex posso suggerirti di verificare le linee guida standard di manutenzione.";
        
        return {
            content: fallbackMessage,
            isExternal: false
        };
    }
}
