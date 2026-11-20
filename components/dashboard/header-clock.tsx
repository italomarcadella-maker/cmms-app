"use client";

import { useNow } from "@/lib/use-now";
import { useFormat } from "@/lib/i18n/client";

/** Data e ora correnti, aggiornate ogni secondo. */
export function HeaderClock() {
    const now = useNow();
    const fmt = useFormat();
    if (!now) return <div className="h-9 w-40" aria-hidden />;
    const d = new Date(now);
    return (
        <div className="text-right" suppressHydrationWarning>
            <div className="text-lg font-medium tabular-nums">{fmt.time(d, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
            <div className="text-xs capitalize text-muted-foreground">{fmt.date(d, { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
    );
}
