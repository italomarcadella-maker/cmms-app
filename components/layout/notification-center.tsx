"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { useFormat, useT } from "@/lib/i18n/client";
import { useNotifications } from "@/lib/notifications-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmptyState } from "@/components/ui/empty-state";
import { PushToggle } from "@/components/notifications/push-toggle";

export function NotificationCenter() {
    const t = useT();
    const fmt = useFormat();
    const { notifications, unreadCount, markAsRead } = useNotifications();
    const [open, setOpen] = useState(false);

    const handleMarkRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await markAsRead(id);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={unreadCount > 0 ? t("Notifiche: {count} non lette", { count: unreadCount }) : t("Notifiche")}
                    className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <Bell className="h-[18px] w-[18px]" />
                    {unreadCount > 0 && (
                        <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-critical" />
                    )}
                </button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-80 overflow-hidden p-0 sm:w-96">
                <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
                    <h3 className="text-sm font-semibold">{t("Notifiche")}</h3>
                    <span className="text-xs text-muted-foreground">{t("{count} non lette", { count: unreadCount })}</span>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <EmptyState icon={<Bell />} title={t("Nessuna notifica")} description={t("Quando succede qualcosa che ti riguarda lo trovi qui.")} className="py-10" />
                    ) : (
                        <ul className="divide-y">
                            {notifications.map((n) => (
                                <li key={n.id} className={cn("group relative px-4 py-3 transition-colors hover:bg-muted/50", !n.read && "bg-info-soft/50")}>
                                    <div className="flex gap-3">
                                        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-info")} />
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn("text-sm font-medium", n.read && "text-muted-foreground")}>{t(n.title)}</p>
                                                <span className="shrink-0 text-xs text-muted-foreground">
                                                    {fmt.date(n.createdAt, { day: "2-digit", month: "short" })}
                                                </span>
                                            </div>
                                            <p className="line-clamp-3 whitespace-pre-line text-sm leading-snug text-muted-foreground">{t(n.message)}</p>
                                            {n.link && (
                                                <Link
                                                    href={n.link}
                                                    onClick={() => setOpen(false)}
                                                    className="inline-block pt-0.5 text-xs font-medium text-primary hover:underline"
                                                >
                                                    {t("Vedi dettagli")}
                                                </Link>
                                            )}
                                        </div>
                                        {!n.read && (
                                            <button
                                                type="button"
                                                onClick={(e) => handleMarkRead(n.id, e)}
                                                title={t("Segna come letta")}
                                                aria-label={t("Segna come letta")}
                                                className="absolute right-2 top-2 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <PushToggle />
            </PopoverContent>
        </Popover>
    );
}
