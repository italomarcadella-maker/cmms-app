"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, X, MessageSquare, Loader2, Mic, MicOff, Wrench, Package, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { chatWithAsset } from "@/lib/ai-service";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ChatAction {
    type: string;
    label: string;
    payload: any;
}

interface AssetAIChatProps {
    assetId: string;
    assetName: string;
}

export function AssetAIChat({ assetId, assetName }: AssetAIChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, actions?: ChatAction[] }[]>([
        { role: 'assistant', content: `Ciao! Sono l'esperto di **${assetName}**. Come posso aiutarti?` }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (scrollRef.current) {
            // Smooth scroll to bottom
            setTimeout(() => {
                scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
            }, 100);
        }
    }, [messages, isOpen]);

    const handleSend = async (e?: React.FormEvent, overrideText?: string) => {
        e?.preventDefault();
        const textToSend = overrideText || input;

        if (!textToSend.trim() || loading) return;

        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
        setLoading(true);

        try {
            const response = await chatWithAsset(assetId, textToSend, messages);
            setMessages(prev => [...prev, { role: 'assistant', content: response.content, actions: response.actions as ChatAction[] }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Mi dispiace, ho avuto un problema di connessione." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = (action: ChatAction) => {
        if (action.type === 'CREATE_TICKET') {
            toast.success("Ticket creato automaticamente (Simulazione)", { description: action.payload.title });
            // In real app, call server action to create WO
        } else if (action.type === 'ORDER_PART') {
            toast.success("Richiesta ordine inviata", { description: action.payload.partName });
        } else if (action.type === 'NAVIGATE') {
            // Scroll to or navigate
            const el = document.querySelector(action.payload);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            toast.error("Input vocale non supportato in questo browser.");
            return;
        }

        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'it-IT';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        setIsListening(true);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            handleSend(undefined, transcript);
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            console.error(event.error);
            setIsListening(false);
            toast.error("Non ho capito, riprova.");
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };


    return (
        <>
            {/* Toggle Button (Fixed Bottom Right) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 font-bold",
                    isOpen ? "bg-red-500 text-white" : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                )}
            >
                {isOpen ? <X className="h-6 w-6" /> : <><Bot className="h-6 w-6" /> Chat AI</>}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-40 w-[380px] h-[600px] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 ring-1 ring-black/5">

                    {/* Header */}
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 border-b flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
                            <Bot className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Cortex Assistente</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Connesso a {assetName}
                            </p>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={scrollRef}>
                        {messages.map((m, i) => (
                            <div key={i} className={cn("flex flex-col gap-1", m.role === 'user' ? "items-end" : "items-start")}>
                                <div className={cn("flex gap-3 max-w-[85%]", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                                    {m.role === 'assistant' && (
                                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center mt-1">
                                            <Bot className="h-4 w-4 text-indigo-600" />
                                        </div>
                                    )}
                                    <div className={cn(
                                        "p-3 text-sm rounded-2xl shadow-sm whitespace-pre-wrap",
                                        m.role === 'user'
                                            ? "bg-blue-600 text-white rounded-br-none"
                                            : "bg-white border rounded-bl-none text-slate-800"
                                    )}>
                                        {m.content}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {m.actions && m.actions.length > 0 && (
                                    <div className="flex flex-wrap gap-2 ml-11 mt-1">
                                        {m.actions.map((act: any, idx: number) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleAction(act)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors"
                                            >
                                                {act.type === 'CREATE_TICKET' && <Wrench className="h-3 w-3" />}
                                                {act.type === 'ORDER_PART' && <Package className="h-3 w-3" />}
                                                {act.type === 'NAVIGATE' && <FileText className="h-3 w-3" />}
                                                {act.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="flex gap-3 justify-start pl-2">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                                </div>
                                <div className="bg-white border p-3 rounded-2xl rounded-bl-none text-sm text-muted-foreground italic">
                                    Sto analizzando...
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={(e) => handleSend(e)} className="p-3 bg-background border-t">
                        <div className="relative flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                                        toast.error("Riconoscimento vocale non supportato.");
                                        return;
                                    }
                                    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                                    const recognition = new SpeechRecognition();
                                    recognition.lang = 'it-IT';
                                    recognition.onstart = () => setIsListening(true);
                                    recognition.onend = () => setIsListening(false);
                                    recognition.onresult = (event: any) => {
                                        const t = event.results[0][0].transcript;
                                        setInput(t);
                                        handleSend(undefined, t);
                                    };
                                    recognition.start();
                                }}
                                className={cn(
                                    "p-2 rounded-full transition-all",
                                    isListening ? "bg-red-500 text-white animate-pulse" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                )}
                                title="Parla"
                            >
                                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            </button>

                            <input
                                autoFocus
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Chiedi qualcosa..."
                                className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 border-transparent border focus:border-blue-500 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || loading}
                                className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}
