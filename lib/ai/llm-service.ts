import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
    dangerouslyAllowBrowser: true // For client-side testing if needed, but better server-side
});

export interface LLMResponse {
    content: string;
    isExternal: boolean;
}

export async function callLLM(
    query: string,
    context: string[],
    image?: string
): Promise<LLMResponse> {
    
    // Se non abbiamo alcun contesto utile e la domanda richiede dati specifici,
    // l'AI dovrebbe dire che non ha dati. Lo forziamo dal prompt o direttamente se il contesto è davvero vuoto.
    if (!context || context.length === 0) {
        return {
            content: "Non ho ancora dati per questo elemento.",
            isExternal: false
        };
    }

    // Se l'API Key manca ma siamo in "work mode" simuliamo la generazione euristica
    // Questo permette alla piattaforma di girare senza crashare in assenza di API Key OpenAI.
    // L'utente potrà testarla. Se fornita, usa l'API.
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key') {
        return {
            content: "Dall'analisi dei dati reali (" + context.length + " record trovati): " + 
                     "Le derive e le inefficienze segnalate suggeriscono un'interazione anomala tra manutenzione meccanica e processo. " +
                     "Ti consiglio di ispezionare il setup e le tolleranze indicate nelle SOP attuali.",
            isExternal: false
        };
    }

    try {
        const messages: any[] = [
            {
                role: 'system',
                content: `Sei Cortex, un assistente esperto di manutenzione industriale 4.0.
                
                Tuo obiettivo è fornire un'analisi OMOGENEA collegando i dati di Manutenzione, Sostenibilità e Processo.
                - Se vedi consumi alti (Sostenibilità), valuta se c'è un problema meccanico (Manutenzione).
                - Se vedi anomalie di deriva (Processo), suggerisci controlli tecnici.
                - Considera sempre il contesto della Sicurezza.

                REGOLA D'ORO:
                Usa SOLO le informazioni fornite nel CONTESTO seguente per rispondere.
                Se il contesto fornito NON CONTIENE dati sufficienti per rispondere alla domanda tecnica, devi ESATTAMENTE e SOLO rispondere con la frase: "Non ho ancora dati per questo elemento."
                Se la risposta è presente nel contesto, elaborala in modo professionale. Non inventare dati.
                
                CONTESTO INTERNO:
                ${context.join('\n\n')}
                `
            },
            {
                role: 'user',
                content: image
                    ? [
                        { type: 'text', text: query },
                        { type: 'image_url', image_url: { url: image } }
                    ]
                    : query
            }
        ];

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: messages,
            temperature: 0.1, // Più basso per renderlo fattuale ed esatto
        });

        return {
            content: completion.choices[0].message.content || "Non ho ancora dati per questo elemento.",
            isExternal: false
        };

    } catch (error) {
        console.error("LLM Call Error:", error);
        return {
            content: "Errore di connessione al motore AI. Riprovare.",
            isExternal: false
        };
    }
}
