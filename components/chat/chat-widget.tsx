"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@/lib/chat-context";
import { useAuth } from "@/lib/auth-context";
import { MessageSquare, X, Send, User, Brain, Image as ImageIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { VoiceInput } from "@/components/ui/voice-input";
import { generateAIResponse } from "@/lib/ai-service";

interface Message {
    id: string;
    sender: string;
    role: "USER" | "TECHNICIAN" | "SUPERVISOR" | "SYSTEM";
    content: string;
    timestamp: string;
    isRead: boolean;
    isSystem?: boolean;
    thoughtProcess?: string[];
    imageUrl?: string;
}

export function ChatWidget() {
    const { user } = useAuth();
    const { messages: contextMessages, sendMessage, unreadCount, clearUnread } = useChat();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync with context messages but add local state handling if needed for immediate UI
    useEffect(() => {
        // Converting context messages to local interface if needed, or just using them
        // For now, assuming context messages match the structure or close enough
        setMessages(contextMessages as any);
    }, [contextMessages]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (isOpen && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, isTyping]);

    const handleOpen = () => {
        setIsOpen(true);
        clearUnread();
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!inputValue.trim() && !selectedImage) || isTyping) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: "User",
            role: "USER",
            content: inputValue,
            timestamp: new Date().toISOString(),
            isRead: true,
            imageUrl: selectedImage || undefined
        };

        // Optimistic UI update
        setMessages((prev) => [...prev, userMsg]);
        setInputValue("");
        const imageToSend = selectedImage;
        setSelectedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = "";

        setIsTyping(true);

        try {
            await sendMessage(userMsg.content);

            // AI Check
            if (userMsg.content.includes("@ai") || userMsg.content.toLowerCase().includes("cortex") || imageToSend) {
                const response = await generateAIResponse(userMsg.content, imageToSend || undefined);

                const aiMsg: Message = {
                    id: Date.now().toString(),
                    sender: response.sender,
                    role: "SYSTEM",
                    content: response.content,
                    timestamp: new Date().toISOString(),
                    isRead: false,
                    isSystem: true,
                    thoughtProcess: response.thoughtProcess
                };

                // Optimistic AI response
                setMessages((prev) => [...prev, aiMsg]);

                // We don't need to persist manually if we handle AI generation server side,
                // but since the component does it, we should use a specific action
                // assuming context sendMessage only takes a string. Or use an API route. 
                // However, we just remove the invalid call for now as the server action seems to not support this directly.

                // Persist AI response
                await sendMessage(aiMsg.content);
            }

        } catch (error) {
            console.error("Chat Error:", error);
        } finally {
            setIsTyping(false);
        }
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-card w-80 sm:w-96 border rounded-xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col h-[500px] animate-in slide-in-from-bottom-10 fade-in backdrop-blur-sm">
                    {/* Header */}
                    <div className="bg-primary p-3 flex justify-between items-center text-primary-foreground shrink-0">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            <span className="font-semibold">Team Chat</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-primary/80 rounded transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30"
                    >
                        {messages.length === 0 && (
                            <div className="text-center text-xs text-muted-foreground mt-4 p-4 space-y-3">
                                <p>Benvenuto nella chat del team!</p>
                                <p className="text-indigo-600 font-medium bg-indigo-50 p-2 rounded-lg inline-block border border-indigo-100">
                                    ✨ Tip: Scrivi <strong>@ai</strong> per chiedere aiuto o carica una foto.
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center mt-2">
                                    {["@ai Cosa fare oggi?", "@ai Stato interventi", "@ai Crea ticket"].map(action => (
                                        <button
                                            key={action}
                                            onClick={() => setInputValue(action)}
                                            className="bg-white border hover:bg-muted px-2 py-1 rounded-full text-[10px] transition-colors"
                                        >
                                            {action}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg) => {
                            const isMe = msg.role === 'USER';
                            const isAi = msg.sender === 'AI Copilot';
                            const isSystem = msg.role === 'SYSTEM' && !isAi;

                            if (isSystem) {
                                return (
                                    <div key={msg.id} className="flex justify-center text-xs text-muted-foreground my-2">
                                        <span className="bg-muted px-2 py-1 rounded-full">{msg.content}</span>
                                    </div>
                                );
                            }

                            return (
                                <div key={msg.id} className={cn("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "items-start")}>
                                    <div className="flex items-center gap-1.5 mb-1 px-1">
                                        <span className={cn("text-[10px] font-medium truncate max-w-[120px]", isAi ? "text-indigo-600 flex items-center gap-1" : "text-muted-foreground")}>
                                            {isAi && "🤖"} {msg.sender}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/70">
                                            {format(new Date(msg.timestamp), "HH:mm")}
                                        </span>
                                    </div>
                                    <div className={cn(
                                        "px-3 py-2 text-sm rounded-xl shadow-sm break-words whitespace-pre-wrap",
                                        isMe ? "bg-primary text-primary-foreground rounded-br-none" :
                                            isAi ? "bg-indigo-50 border-indigo-100 text-indigo-900 border rounded-bl-none" : "bg-white border rounded-bl-none"
                                    )}>
                                        {msg.imageUrl && (
                                            <div className="mb-2 relative w-full h-32 rounded-md overflow-hidden border border-border bg-black/5">
                                                <img src={msg.imageUrl} alt="Uploaded" className="object-cover w-full h-full hover:scale-105 transition-transform cursor-pointer" />
                                            </div>
                                        )}
                                        {msg.content}
                                        {msg.thoughtProcess && msg.thoughtProcess.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-indigo-200/50">
                                                <details className="group">
                                                    <summary className="text-[10px] text-indigo-500 font-medium cursor-pointer flex items-center gap-1 hover:text-indigo-700 transition-colors select-none">
                                                        <Brain className="h-3 w-3" />
                                                        Processo di pensiero ({msg.thoughtProcess.length} step)
                                                    </summary>
                                                    <div className="mt-1 pl-2 border-l-2 border-indigo-200 space-y-1">
                                                        {msg.thoughtProcess.map((thought, idx) => (
                                                            <p key={idx} className="text-[10px] text-muted-foreground animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                                                                {idx + 1}. {thought}
                                                            </p>
                                                        ))}
                                                    </div>
                                                </details>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {isTyping && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-2">
                                <div className="flex gap-1">
                                    <span className="animate-bounce">●</span>
                                    <span className="animate-bounce delay-100">●</span>
                                    <span className="animate-bounce delay-200">●</span>
                                </div>
                                Cortex sta pensando...
                            </div>
                        )}
                    </div>

                    {/* Image Preview */}
                    {selectedImage && (
                        <div className="px-3 pt-2 flex items-center gap-2 bg-muted/20 border-t border-dashed border-muted">
                            <div className="relative w-12 h-12 rounded-md overflow-hidden border border-indigo-200 group mt-1 mb-1">
                                <img src={selectedImage} alt="Preview" className="object-cover w-full h-full" />
                                <button
                                    type="button"
                                    onClick={() => setSelectedImage(null)}
                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="h-3 w-3 text-white" />
                                </button>
                            </div>
                            <span className="text-[10px] text-muted-foreground italic">Immagine allegata</span>
                        </div>
                    )}

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-3 bg-card border-t shrink-0 flex gap-2 items-end">
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                        />
                        <button
                            type="button"
                            className={cn("p-2 text-muted-foreground hover:text-indigo-600 transition-colors rounded-md hover:bg-indigo-50", selectedImage && "text-indigo-600 bg-indigo-50")}
                            onClick={() => fileInputRef.current?.click()}
                            title="Carica immagine"
                        >
                            <ImageIcon className="h-5 w-5" />
                        </button>
                        <input
                            autoFocus
                            className="flex-1 bg-muted/50 border-0 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none min-w-0"
                            placeholder="Scrivi messaggio..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                        <div className="shrink-0">
                            <VoiceInput onTranscript={(text: string) => setInputValue(prev => prev + " " + text)} />
                        </div>
                        <button
                            type="submit"
                            disabled={(!inputValue.trim() && !selectedImage) || isTyping}
                            className="bg-primary text-primary-foreground p-2 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={handleOpen}
                className={cn(
                    "h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 pointer-events-auto",
                    isOpen ? "opacity-0 scale-50 pointer-events-none" : "bg-primary text-primary-foreground"
                )}
            >
                <div className="relative">
                    <MessageSquare className="h-6 w-6" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full shadow-sm animate-bounce">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </div>
            </button>
        </div>
    );
}
