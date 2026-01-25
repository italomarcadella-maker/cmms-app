import { Message } from "./chat-context";

interface KnowledgeEntry {
    keywords: string[];
    response: string;
    source: string;
}

// Emulated Knowledge Base
const KNOWLEDGE_BASE: KnowledgeEntry[] = [
    {
        keywords: ["vibrazione", "vibrating", "vibra", "rumore", "scuote"],
        response: "Dall'analisi dello storico e dei manuali tecnici, vibrazioni eccessive sono spesso causate da **disallineamento dell'asse** o **cuscinetti usurati**. \n\n**Azione Consigliata:**\n1. Controllare l'allineamento dell'albero motore.\n2. Verificare lo stato del cuscinetto SKF-6204 (cod. part: SPARE-003).\n3. Serrare i bulloni di ancoraggio alla base.",
        source: "Manuale Manutenzione Sez. 4.2 - Risoluzione Guasti Meccanici"
    },
    {
        keywords: ["temperatura", "surriscaldamento", "caldo", "hot", "overheating", "504"],
        response: "L'errore di temperatura o surriscaldamento indica solitamente un'ostruzione nel circuito di raffreddamento o un guasto al sensore.\n\n**Azione Consigliata:**\n1. Pulire i filtri della ventola di aspirazione.\n2. Verificare che il flusso d'aria non sia ostruito.\n3. Controllare la lettura tramite termometro IR esterno per escludere guasti al sensore.",
        source: "Storico Interventi: Caso #WO-2023-88R"
    },
    {
        keywords: ["pressione", "pressure", "leak", "perdita", "olio"],
        response: "Perdite di pressione sono critiche. Il sistema suggerisce di ispezionare immediatamente le guarnizioni O-ring del circuito idraulico principale.\n\n**Safety Alert:** Assicurarsi di depressurizzare il sistema prima di qualsiasi intervento.",
        source: "Protocollo Sicurezza & Manuale Idraulico Rev. 3"
    },
    {
        keywords: ["elettrico", "corrente", "niente corrente", "spento", "power"],
        response: "Problema elettrico rilevato. Controllare prima di tutto l'interruttore differenziale nel quadro Q-01. Se scattato, verificare isolamento motore prima del riarmo.",
        source: "Schema Elettrico Gen-2024"
    },
    {
        keywords: ["login", "password", "accesso"],
        response: "Per problemi di accesso, contattare l'amministratore IT o provare il reset della password dal portale aziendale. Io sono un assistente tecnico per macchinari, non per account! 🤖",
        source: "Policy Aziendale IT"
    }
];

const DEFAULT_RESPONSE = "Sto analizzando la richiesta... Non ho trovato corrispondenze esatte nel database tecnico attuale. Consiglierei di aprire un Work Order per un'ispezione visiva approfondita o consultare il manuale cartaceo cap. 12 'Guasti Generici'.";

export async function generateAIResponse(query: string): Promise<Message> {
    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const lowerQuery = query.toLowerCase();

    const match = KNOWLEDGE_BASE.find(entry =>
        entry.keywords.some(k => lowerQuery.includes(k))
    );

    const content = match
        ? `${match.response}\n\n*Fonte: ${match.source}*`
        : DEFAULT_RESPONSE;

    return {
        id: `AI-${Date.now()}`,
        sender: "AI Copilot",
        role: "SYSTEM", // We'll map this to a special AI role/style
        content: content,
        timestamp: new Date().toISOString(),
        isRead: false
    };
}
