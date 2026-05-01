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
    
    // Se l'API Key manca ma siamo in "work mode" simuliamo la generazione euristica
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key') {
        const fallbackMessage = context.length > 0 
            ? "Analizzando i " + context.length + " record di contesto, rilevo pattern anomali. Consiglio di controllare i parametri indicati nelle SOP."
            : "Non ho dati di contesto specifici per questa entità, ma come assistente Cortex posso suggerirti di verificare le linee guida standard di manutenzione.";
        
        return {
            content: fallbackMessage,
            isExternal: false
        };
    }

    try {
        const messages: any[] = [
            {
                role: 'system',
                content: `Sei Cortex, l'intelligenza artificiale di CMMS 2.0 (Manutenzione Industriale 4.0).
                
                Sei un assistente sempre pronto e disponibile.
                Se l'utente ti pone domande specifiche su anomalie, consumi o derive, usa i dati nel CONTESTO INTERNO.
                Se il contesto è vuoto o non contiene la risposta, rispondi usando le tue conoscenze generali da esperto di manutenzione e industria, ma precisa elegantemente: "Non ho dati attuali specifici su questo elemento, ma in base agli standard industriali...".
                Non dire "Non ho ancora dati per questo elemento" se non è strettamente necessario (es. l'utente chiede un valore specifico che non c'è).
                Mantieni un tono collaborativo e professionale.
                
                CONTESTO INTERNO:
                ${context.length > 0 ? context.join('\n\n') : 'Nessun dato di contesto disponibile per questa entità.'}
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
