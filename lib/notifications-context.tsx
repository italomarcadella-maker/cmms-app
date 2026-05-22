"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getUserNotifications, markNotificationAsRead } from "@/lib/actions";

export interface Notification {
    id: string;
    title: string;
    message: string;
    read: boolean;
    link: string | null;
    createdAt: Date;
}

interface NotificationsContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    refreshNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const refreshNotifications = useCallback(async () => {
        try {
            const data = await getUserNotifications();
            setNotifications(data || []);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    }, []);

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        try {
            await markNotificationAsRead(id);
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

    useEffect(() => {
        Promise.resolve().then(() => {
            refreshNotifications();
        });
        const interval = setInterval(refreshNotifications, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, [refreshNotifications]);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationsContext.Provider value={{ notifications, unreadCount, markAsRead, refreshNotifications }}>
            {children}
        </NotificationsContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationsContext);
    if (context === undefined) {
        throw new Error("useNotifications must be used within a NotificationsProvider");
    }
    return context;
}
