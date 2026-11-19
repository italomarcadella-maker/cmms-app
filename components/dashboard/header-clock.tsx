"use client";

import { useNow } from "@/lib/use-now";

/** Data e ora correnti, aggiornate ogni secondo. */
export function HeaderClock() {
    const now = useNow();
    if (!now) return <div className="h-9 w-40" aria-hidden />;
    const d = new Date(now);
    return (
        <div className="text-right" suppressHydrationWarning>
            <div className="text-lg font-medium tabular-nums">{d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
            <div className="text-xs capitalize text-muted-foreground">{d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
    );
}
