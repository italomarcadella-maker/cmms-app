"use client";

import React, { useState, useEffect, useRef } from "react";
import { Brain, X, Send, Sparkles, AlertTriangle, ChevronRight, BarChart3, ShieldAlert } from "lucide-react";
import { askLeanCopilot } from "@/lib/process-actions";
import { toast } from "sonner";

interface Message {
    sender: "user" | "copilot";
    text: string;
    timestamp: Date;
}

interface LeanCopilotProps {
    isOpen: boolean;
    onClose: () => void;
    fpesData: any;
}

// Simple but powerful custom markdown parser to support table/bullet formatting without dependencies
function MarkdownRenderer({ text }: { text: string }) {
    const lines = text.split("\n");
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    const parsedElements = lines.map((line, idx) => {
        const trimmed = line.trim();

        // 1. Headers (### or ####)
        if (trimmed.startsWith("####")) {
            return <h4 key={idx} className="text-sm font-bold text-slate-800 mt-4 mb-2 uppercase tracking-wide flex items-center gap-1.5"><ChevronRight className="h-3 w-3 text-indigo-500" /> {trimmed.replace("####", "").trim()}</h4>;
        }
        if (trimmed.startsWith("###")) {
            return <h3 key={idx} className="text-base font-extrabold text-slate-900 mt-5 mb-2 border-b pb-1 flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-500 animate-pulse" /> {trimmed.replace("###", "").trim()}</h3>;
        }

        // 2. Bullets
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
            const rawContent = trimmed.slice(2);
            // Replace bold `**text**` and code `\`code\``
            return (
                <li key={idx} className="ml-4 list-disc text-xs text-slate-600 mb-1.5 leading-relaxed">
                    {formatText(rawContent)}
                </li>
            );
        }

        // 3. Numeric bullets
        if (/^\d+\.\s/.test(trimmed)) {
            const rawContent = trimmed.replace(/^\d+\.\s/, "");
            return (
                <div key={idx} className="flex gap-2 text-xs text-slate-700 mb-2 leading-relaxed pl-1">
                    <span className="font-extrabold text-indigo-600 bg-indigo-50 h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] border border-indigo-100">{trimmed.match(/^\d+/)?.[0]}</span>
                    <span className="pt-0.5">{formatText(rawContent)}</span>
                </div>
            );
        }

        // 4. Tables
        if (trimmed.startsWith("|")) {
            const cells = trimmed.split("|").map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
            
            // Skip alignment dividers
            if (cells.every(c => c.startsWith(":") || c.startsWith("-"))) {
                return null;
            }

            if (!inTable) {
                inTable = true;
                tableHeaders = cells;
                return null;
            } else {
                tableRows.push(cells);
                
                // If it is the last line or the next line is not a table, flush it
                const nextLine = lines[idx + 1]?.trim() || "";
                if (!nextLine.startsWith("|")) {
                    inTable = false;
                    const headers = [...tableHeaders];
                    const rows = [...tableRows];
                    tableHeaders = [];
                    tableRows = [];

                    return (
                        <div key={idx} className="my-3 overflow-hidden rounded-xl border border-slate-200/80 shadow-sm bg-white/50 backdrop-blur-sm">
                            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                                <thead className="bg-slate-50/70 font-bold text-slate-700">
                                    <tr>
                                        {headers.map((h, hIdx) => (
                                            <th key={hIdx} className="px-3 py-2 border-r last:border-0 border-slate-200/60 font-semibold">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-600">
                                    {rows.map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-slate-50/50 transition">
                                            {row.map((cell, cIdx) => (
                                                <td key={cIdx} className="px-3 py-2 border-r last:border-0 border-slate-150">
                                                    {cell.startsWith("**") ? <strong>{cell.replace(/\*\*/g, "")}</strong> : cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                }
                return null;
            }
        }

        // 5. Paragraph
        if (trimmed.length > 0) {
            return <p key={idx} className="text-xs text-slate-600 leading-relaxed mb-2.5">{formatText(trimmed)}</p>;
        }

        return <div key={idx} className="h-2" />;
    });

    return <div className="space-y-1">{parsedElements}</div>;
}

// Text formatter for bold and code backticks
function formatText(text: string) {
    // Basic formatting for **bold** and `code`
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={index} className="font-extrabold text-slate-800">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
            return <code key={index} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-1 py-0.5 rounded font-mono text-[10px]">{part.slice(1, -1)}</code>;
        }
        return part;
    });
}

export function LeanCopilot({ isOpen, onClose, fpesData }: LeanCopilotProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            sender: "copilot",
            text: "Ciao! Sono il tuo **Lean Copilot**. Ho caricato e analizzato in tempo reale i carichi di lavoro, l'ergonomia e i parametri logistici della tua linea.\n\nVuoi trovare all'istante la configurazione ottimale e bilanciare la linea? Clicca sul pulsante **Ottimizza** in alto o chiedimi consigli specifici!",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    
    const feedRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSendMessage = async (textToSend?: string) => {
        const text = textToSend || input;
        if (!text.trim() || isLoading) return;

        if (!textToSend) setInput("");

        // Append User Message
        const userMsg: Message = { sender: "user", text, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            const response = await askLeanCopilot(fpesData, text);
            const copilotMsg: Message = {
                sender: "copilot",
                text: response.content,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, copilotMsg]);
        } catch (error) {
            console.error("Lean Copilot action error", error);
            toast.error("Errore di connessione a Lean Copilot.");
            setMessages(prev => [...prev, {
                sender: "copilot",
                text: "Scusami, ho riscontrato un problema nel calcolo dei flussi lean della cella. Controlla che le stazioni e i carichi di lavoro siano valorizzati correttamente e riprova.",
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const triggerOptimization = () => {
        handleSendMessage("Ottimizza bilanciamento della linea");
    };

    return (
        <div className={`fixed right-0 top-0 bottom-0 w-[430px] bg-slate-50/80 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.15)] border-l border-white/20 z-50 transform transition-transform duration-300 ease-out flex flex-col overflow-hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            
            {/* Header with vibrant neon details */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 animate-pulse"></div>
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-tr from-violet-600 to-indigo-500 p-2 rounded-xl text-white shadow-[0_0_15px_rgba(139,92,246,0.4)] animate-bounce-slow">
                        <Brain className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="font-extrabold text-sm tracking-wider uppercase">Lean Copilot</h2>
                        <p className="text-[10px] text-cyan-400 font-bold flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                            AI Generativa Attiva
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 hover:text-red-400 transition">
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Sticky Actions Bar */}
            <div className="p-3 bg-white/50 border-b border-slate-200/60 backdrop-blur-md flex gap-2">
                <button
                    onClick={triggerOptimization}
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white py-2 px-3 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                    <Sparkles className="h-3.5 w-3.5" />
                    Ottimizza Bilanciamento
                </button>
                <button
                    onClick={() => handleSendMessage("Mostra linee guida ergonomia")}
                    disabled={isLoading}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-50"
                >
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                    Ergonomia
                </button>
            </div>

            {/* Chat Feed */}
            <div ref={feedRef} className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scroll-smooth">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm border transition-all ${
                            m.sender === "user" 
                                ? "bg-indigo-600 text-white border-indigo-700 rounded-tr-none" 
                                : "bg-white/90 text-slate-800 border-slate-150 rounded-tl-none backdrop-blur-sm"
                        }`}>
                            {m.sender === "copilot" ? (
                                <MarkdownRenderer text={m.text} />
                            ) : (
                                <p className="text-xs leading-relaxed">{m.text}</p>
                            )}
                            <div className={`text-[9px] mt-1.5 text-right ${m.sender === "user" ? "text-indigo-200" : "text-slate-400"}`}>
                                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Pulsing AI Typing Loader */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-[85%] bg-white border rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-3">
                            <div className="flex gap-1.5 items-center">
                                <span className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold">Lean Copilot sta analizzando i carichi...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Input Area */}
            <form
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="p-3 bg-white border-t border-slate-200/80 backdrop-blur-md flex gap-2"
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    placeholder="Chiedi bilanciamento stazioni, ergo, timwoods..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md disabled:opacity-50"
                >
                    <Send className="h-4 w-4" />
                </button>
            </form>
        </div>
    );
}
