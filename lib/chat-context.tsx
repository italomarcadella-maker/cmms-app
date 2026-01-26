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

    // Load from Server
    useEffect(() => {
        refreshMessages();

        // Poll for new messages every 10s
        const interval = setInterval(refreshMessages, 10000);
        return () => clearInterval(interval);
    }, []);

    const refreshMessages = async () => {
        const { getChatMessages } = await import('@/lib/actions');
        const data = await getChatMessages();

        const mapped = data.map(m => ({
            ...m,
            role: m.role as "USER" | "TECHNICIAN" | "SUPERVISOR" | "SYSTEM",
            timestamp: m.timestamp.toISOString()
        }));

        // Only update if count changed to avoid excessive re-render or handle merges
        // For now just set
        setMessages(mapped);
    };

    const sendMessage = async (content: string) => {
        if (!user) return;

        // Optimistic UI could go here, but let's stick to true server flow
        const { sendChatMessage } = await import('@/lib/actions');

        const result = await sendChatMessage({
            sender: user.name || "User",
            role: "USER", // This should probably be dynamic based on user role but interface hardcoded "USER"
            content
        });

        if (result.success && result.data) {
            const m = result.data;
            setMessages((prev) => [...prev, {
                ...m,
                role: m.role as any,
                timestamp: m.timestamp.toISOString()
            }]);
        }

        // AI Copilot Integration
        if (content.toLowerCase().startsWith("@ai")) {
            const query = content.replace(/^@ai\s*/i, "");
            try {
                const { generateAIResponse } = await import("./ai-service");
                const aiMsg = await generateAIResponse(query);

                // Save AI response to DB too if we want persistence
                // But normally we'd save it. Assuming `generateAIResponse` just returns object.
                // We should probably save it.
                await sendChatMessage({
                    sender: aiMsg.sender,
                    role: "SYSTEM",
                    content: aiMsg.content,
                    isSystem: true
                });

                refreshMessages(); // Fetch the AI message from DB
            } catch (error) {
                console.error("AI Error:", error);
            }
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
