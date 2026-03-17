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

    if (!process.env.OPENAI_API_KEY) {
        console.warn("No OpenAI API Key found. Returning mock response.");
        return {
            content: "⚠️ **Modalità Demo**: Non ho una chiave API valida per usare il mio vero cervello. Immagina una risposta intelligente qui basata su: " + context.join(", "),
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
                Se la risposta NON è nel contesto, devi dirlo chiaramente e usare le tue conoscenze generali, ma in tal caso inizia la risposta con "⚠️ [ESTERNO]".
                
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
            model: "gpt-4o", // Or gpt-4-turbo
            messages: messages,
            temperature: 0.3, // Low temperature for factual grounding
        });

        const answer = completion.choices[0].message.content || "";
        const isExternal = answer.includes("[ESTERNO]");

        // Remove the flag for the user display, we will handle UI separately or keep it if preferred.
        // Let's keep it clean but return the flag.
        const cleanAnswer = answer.replace("⚠️ [ESTERNO]", "").trim();

        return {
            content: cleanAnswer,
            isExternal: isExternal
        };

    } catch (error) {
        console.error("LLM Call Error:", error);
        return {
            content: "Mi dispiace, il mio collegamento neurale ha avuto un problema.",
            isExternal: false
        };
    }
}
