"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useNotifications } from "@/lib/notifications-context";
import { workOrderIdFromLink } from "@/modules/maintenance/domain/maintainer-visibility";
import { cn } from "@/lib/utils";

/** Nella vista mobile i link agli ordini aprono la scheda mobile; gli altri link restano quelli della notifica. */
function mobileHref(link: string | null): string | null {
    if (!link) return null;
    const id = workOrderIdFromLink(link);
    return id ? `/mobile/orders/${encodeURIComponent(id)}` : link;
}

const formatWhen = (d: Date | string) =>
    new Date(d).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

/** Campanella con il numero di notifiche non lette. Si aggiorna ogni minuto (come nella versione completa) e quando l'app torna in primo piano. */
export function MobileNotifications() {
    const { notifications, unreadCount, markAsRead, refreshNotifications } = useNotifications();
    const [open, setOpen] = useState(false);

    // Tornando sull'app (dallo sfondo o da un'altra scheda) si ricaricano subito le notifiche, senza aspettare il prossimo giro
    useEffect(() => {
        const onVisible = () => { if (document.visibilityState === "visible") refreshNotifications(); };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [refreshNotifications]);

    return (
        <Sheet open={open} onOpenChange={o => { setOpen(o); if (o) refreshNotifications(); }}>
            <SheetTrigger asChild>
                <button
                    type="button"
                    aria-label={unreadCount > 0 ? `Notifiche: ${unreadCount} non lette` : "Notifiche"}
                    className="relative flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <Bell className="h-6 w-6" aria-hidden />
                    {unreadCount > 0 && (
                        <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-critical px-1 text-[11px] font-bold leading-none text-critical-foreground">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="flex max-h-[85vh] flex-col gap-0 rounded-t-2xl p-0">
                <SheetHeader className="border-b p-4 text-left">
                    <SheetTitle>Notifiche</SheetTitle>
                    <SheetDescription>{unreadCount === 0 ? "Sei in pari: nessuna notifica da leggere." : `${unreadCount} ${unreadCount === 1 ? "non letta" : "non lette"}`}</SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
                    {notifications.length === 0 ? (
                        <EmptyState icon={<Bell />} title="Nessuna notifica" description="Quando ti viene assegnato un ordine lo trovi qui." className="py-10" />
                    ) : (
                        <ul className="divide-y">
                            {notifications.map(n => {
                                const href = mobileHref(n.link);
                                const body = (
                                    <>
                                        <span className={cn("mt-2 h-2.5 w-2.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} aria-hidden />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-start justify-between gap-2">
                                                <span className={cn("text-base font-medium leading-snug", n.read && "text-muted-foreground")}>{n.title}</span>
                                                <span className="shrink-0 text-xs text-muted-foreground">{formatWhen(n.createdAt)}</span>
                                            </span>
                                            <span className="mt-0.5 block whitespace-pre-line text-sm text-muted-foreground">{n.message}</span>
                                        </span>
                                    </>
                                );
                                const cls = cn("flex min-h-[56px] w-full items-start gap-3 px-4 py-3 text-left", !n.read && "bg-info-soft/50");
                                return (
                                    <li key={n.id}>
                                        {href ? (
                                            <Link href={href} onClick={() => { setOpen(false); if (!n.read) markAsRead(n.id); }} className={cn(cls, "active:bg-accent")}>{body}</Link>
                                        ) : (
                                            <button type="button" onClick={() => { if (!n.read) markAsRead(n.id); }} className={cn(cls, "active:bg-accent")}>{body}</button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
