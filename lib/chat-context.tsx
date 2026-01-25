"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export interface Message {
    id: string;
    sender: string;
    role: "USER" | "TECHNICIAN" | "SUPERVISOR" | "SYSTEM";
    content: string;
    timestamp: string;
    isRead: boolean;
    isSystem?: boolean;
}

interface ChatContextType {
    messages: Message[];
    sendMessage: (content: string) => void;
    unreadCount: number;
    clearUnread: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Load from local storage
    useEffect(() => {
        const saved = localStorage.getItem('chat-messages');
        if (saved) {
            setMessages(JSON.parse(saved));
        } else {
            // Initial welcome message
            setMessages([{
                id: 'init-1',
                sender: 'System',
                role: 'SYSTEM',
                content: 'Benvenuto nella chat interna del team manutenzione.',
                timestamp: new Date().toISOString(),
                isRead: true,
                isSystem: true
            }]);
        }
    }, []);

    // Save to local storage
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('chat-messages', JSON.stringify(messages));
        }
    }, [messages]);

    // Simulate incoming messages randomly
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.85) { // 15% chance every 30s
                const mockSenders = ['Marco Rossi (Supervisor)', 'Luigi Verdi (Tech)', 'Centralino'];
                const mockTexts = [
                    'Qualcuno ha visto il flessibile?',
                    'Ricordatevi di chiudere i task a fine turno.',
                    'Pausa caffè?',
                    'Attenzione: Linea 2 ferma tra 10 minuti.',
                    'Ho bisogno di supporto al Magazzino B.'
                ];

                const senderName = mockSenders[Math.floor(Math.random() * mockSenders.length)];
                const text = mockTexts[Math.floor(Math.random() * mockTexts.length)];

                const newMsg: Message = {
                    id: Date.now().toString(),
                    sender: senderName,
                    role: senderName.includes('Supervisor') ? 'SUPERVISOR' : senderName.includes('Tech') ? 'TECHNICIAN' : 'SYSTEM', // Assign role based on sender
                    content: text,
                    timestamp: new Date().toISOString(),
                    isRead: false // Incoming messages are unread
                };

                setMessages(prev => [...prev, newMsg]);
                setUnreadCount(prev => prev + 1);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const sendMessage = async (content: string) => {
        if (!user) return; // Ensure user is available

        const newMessage: Message = {
            id: Date.now().toString(),
            sender: user.name, // Use user's name
            role: "USER",
            content,
            timestamp: new Date().toISOString(),
            isRead: true
        };

        setMessages((prev) => [...prev, newMessage]);

        // AI Copilot Integration
        if (content.toLowerCase().startsWith("@ai")) {
            // Remove the trigger and clean up
            const query = content.replace(/^@ai\s*/i, "");

            // Generate AI response
            try {
                // Dynamically import to avoid circular dep issues if any, though simple import works too
                // For now assuming direct import is fine.
                const { generateAIResponse } = await import("./ai-service");
                const aiMsg = await generateAIResponse(query);

                setMessages((prev) => [...prev, aiMsg]);
            } catch (error) {
                console.error("AI Error:", error);
                // Optionally add an error message to the chat
                setMessages((prev) => [...prev, {
                    id: Date.now().toString() + '-error',
                    sender: 'System',
                    role: 'SYSTEM',
                    content: 'Errore durante la generazione della risposta AI.',
                    timestamp: new Date().toISOString(),
                    isSystem: true,
                    isRead: false
                }]);
            }
        } else {
            // Standard simulated reply for non-AI messages
            // Simulate reply after 2-5 seconds
            if (Math.random() > 0.5) return; // 50% chance of no reply for realism

            setTimeout(() => {
                const reply: Message = {
                    id: (Date.now() + 1).toString(),
                    sender: "Marco Rossi",
                    role: "TECHNICIAN",
                    content: "Ricevuto. Controllo subito.",
                    timestamp: new Date().toISOString(),
                    isRead: false
                };
                setMessages((prev) => [...prev, reply]);
            }, 3000);
        }
    };

    const clearUnread = () => setUnreadCount(0);

    return (
        <ChatContext.Provider value={{ messages, sendMessage, unreadCount, clearUnread }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChat must be used within a ChatProvider");
    }
    return context;
}
