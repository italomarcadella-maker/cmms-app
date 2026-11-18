"use client";

import { useEffect, useState } from "react";

/** Real clock for the shop-floor display (updates every second, Italian format). */
export function LiveClock() {
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
                {now ? now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}
            </div>
            <div className="text-sm text-zinc-400" suppressHydrationWarning>
                {now ? now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }) : ""}
            </div>
        </div>
    );
}
