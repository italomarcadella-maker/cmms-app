"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { getUserNotifications, markNotificationAsRead } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function NotificationBell() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const data = await getUserNotifications();
            setNotifications(data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every minute
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleNotificationClick = async (notification: any) => {
        if (!notification.read) {
            await markNotificationAsRead(notification.id);
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
        }

        if (notification.link) {
            setIsOpen(false);
            router.push(notification.link);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-background animate-pulse" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border bg-card shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b bg-muted/30">
                        <h3 className="font-semibold text-sm">Notifiche</h3>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-xs text-muted-foreground">Caricamento...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted-foreground">Nessuna notifica</div>
                        ) : (
                            <div className="divide-y">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={cn(
                                            "p-3 text-sm cursor-pointer hover:bg-muted/50 transition-colors",
                                            !notification.read ? "bg-primary/5" : ""
                                        )}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <p className={cn("font-medium", !notification.read && "text-primary")}>
                                                {notification.title}
                                            </p>
                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                                {new Date(notification.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                                            {notification.message}
                                        </p>
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
