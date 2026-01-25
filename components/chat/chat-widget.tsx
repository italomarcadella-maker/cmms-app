"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@/lib/chat-context";
import { useAuth } from "@/lib/auth-context";
import { MessageSquare, X, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export function ChatWidget() {
    const { user } = useAuth();
    const { messages, sendMessage, unreadCount, clearUnread } = useChat();
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (isOpen && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleOpen = () => {
        setIsOpen(true);
        clearUnread();
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;
        sendMessage(inputValue);
        setInputValue("");
    };

    if (!user) return null; // Don't show if not logged in

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
                            <div className="text-center text-xs text-muted-foreground mt-4 p-4">
                                <p>Benvenuto nella chat del team!</p>
                                <p className="mt-2 text-indigo-600 font-medium bg-indigo-50 p-2 rounded-lg inline-block border border-indigo-100">
                                    ✨ Tip: Scrivi <strong>@ai</strong> per chiedere aiuto all'Assistente Tecnico.
                                </p>
                            </div>
                        )}

                        {messages.map((msg) => {
                            const isMe = msg.role === 'USER';
                            const isAi = msg.sender === 'AI Copilot'; // Simple check
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
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-3 bg-card border-t shrink-0 flex gap-2">
                        <input
                            autoFocus
                            className="flex-1 bg-muted/50 border-0 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Scrivi (@ai per l'assistente)..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim()}
                            className="bg-primary text-primary-foreground p-2 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
