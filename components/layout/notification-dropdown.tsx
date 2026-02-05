"use client";

import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { useNotifications } from "@/lib/notifications-context";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function NotificationDropdown() {
    const { notifications, unreadCount, markAsRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const handleNotificationClick = async (id: string, link?: string) => {
        await markAsRead(id);
        if (link) {
            setOpen(false);
            router.push(link);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 animate-pulse border border-background" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="flex justify-between items-center p-4 border-b">
                    <span className="font-semibold">Notifiche</span>
                    {unreadCount > 0 && <span className="text-xs text-muted-foreground">{unreadCount} nuove</span>}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Nessuna notifica.
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div
                                key={n.id}
                                className={cn(
                                    "flex flex-col items-start gap-1 p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b last:border-0",
                                    !n.read ? "bg-muted/30" : "opacity-70"
                                )}
                                onClick={() => handleNotificationClick(n.id, n.link || undefined)}
                            >
                                <div className="flex justify-between w-full items-center">
                                    <span className="text-sm font-semibold">{n.title}</span>
                                    {!n.read && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                                </div>
                                <span className="text-xs text-muted-foreground line-clamp-2">
                                    {n.message}
                                </span>
                                <span className="text-[10px] text-muted-foreground/70 mt-1">
                                    {new Date(n.createdAt).toLocaleString()}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
