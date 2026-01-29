"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserNotifications, markNotificationAsRead } from "@/lib/actions";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function NotificationCenter({ userId }: { userId?: string }) {
    const { user: authUser } = useAuth();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    // Use prop userId if available (SS), fallback to auth context (CS)
    const activeUserId = userId || authUser?.id;

    const loadNotifications = async () => {
        if (!activeUserId) return;

        try {
            const data = await getUserNotifications();
            setNotifications(data);
            setUnreadCount(data.filter((n: any) => !n.read).length);
        } catch (e) {
            console.error("NotificationCenter: Fetch error", e);
        }
    };

    useEffect(() => {
        loadNotifications();
        // Poll every 30s
        const interval = setInterval(loadNotifications, 30000);
        return () => clearInterval(interval);
    }, [activeUserId]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMarkRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await markNotificationAsRead(id);
        const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
        setNotifications(updated);
        setUnreadCount(updated.filter(n => !n.read).length);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-background ring-1 ring-background" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">
                    <div className="p-3 border-b flex justify-between items-center bg-muted/30">
                        <h3 className="font-semibold text-sm">Notifiche</h3>
                        <span className="text-xs text-muted-foreground">{unreadCount} non lette</span>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                                <Bell className="h-8 w-8 opacity-20" />
                                <p>Nessuna notifica</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={cn(
                                            "p-3 hover:bg-muted/50 transition-colors block relative group",
                                            !n.read ? "bg-blue-50/30" : ""
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            <div className={cn(
                                                "mt-1 h-2 w-2 rounded-full shrink-0",
                                                !n.read ? "bg-blue-500" : "bg-transparent"
                                            )} />
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <p className={cn("text-xs font-semibold", !n.read ? "text-foreground" : "text-muted-foreground")}>
                                                        {n.title}
                                                    </p>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(n.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground leading-snug whitespace-pre-line line-clamp-3">
                                                    {n.message}
                                                </p>
                                                {n.link && (
                                                    <Link
                                                        href={n.link}
                                                        onClick={() => setIsOpen(false)}
                                                        className="text-xs text-primary hover:underline mt-1.5 inline-block font-medium"
                                                    >
                                                        Vedi dettagli →
                                                    </Link>
                                                )}
                                            </div>
                                            {!n.read && (
                                                <button
                                                    onClick={(e) => handleMarkRead(n.id, e)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded shadow-sm text-muted-foreground hover:text-foreground transition-all absolute top-2 right-2"
                                                    title="Segna come letta"
                                                >
                                                    <Check className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
