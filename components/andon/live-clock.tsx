"use client";

import { useEffect, useState } from "react";

import { useFormat } from "@/lib/i18n/client";

/** Real clock for the shop-floor display (updates every second, in the user's language). */
export function LiveClock() {
    const fmt = useFormat();
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        const tick = () => setNow(new Date());
        const first = setTimeout(tick, 0);
        const timer = setInterval(tick, 1000);
        return () => {
            clearTimeout(first);
            clearInterval(timer);
        };
    }, []);

    return (
        <div className="text-right">
            <div className="font-mono text-4xl font-bold tabular-nums" suppressHydrationWarning>
                {now ? fmt.time(now, { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}
            </div>
            <div className="text-sm text-zinc-400" suppressHydrationWarning>
                {now ? fmt.date(now, { weekday: "long", day: "numeric", month: "long" }) : ""}
            </div>
        </div>
    );
}
