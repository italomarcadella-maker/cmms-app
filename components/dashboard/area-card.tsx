"use client";

import React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { Tone } from "@/components/ui/status-badge";

const iconTone: Record<Tone, string> = {
    success: "bg-success-soft text-success-strong",
    info: "bg-info-soft text-info-strong",
    warning: "bg-warning-soft text-warning-strong",
    critical: "bg-critical-soft text-critical-strong",
    neutral: "bg-secondary text-secondary-foreground",
    progress: "bg-primary text-primary-foreground",
}

interface AreaCardProps {
    title: string;
    count: number | string;
    icon: React.ReactNode;
    href: string;
    tone?: Tone;
    subtitle?: string;
}

/** Compact link tile for a functional area (production lines, facilities, workshop...). */
export function AreaCard({ title, count, icon, href, tone = "info", subtitle = "Richieste attive" }: AreaCardProps) {
    const hasActive = typeof count === "number" && count > 0;

    return (
        <Link
            href={href}
            className="group flex items-start justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <div className="min-w-0">
                <h3 className="truncate text-sm font-medium text-muted-foreground">{title}</h3>
                <div className={cn("mt-1 text-2xl font-semibold tabular-nums", hasActive && "text-foreground")}>{count}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&>svg]:h-[18px] [&>svg]:w-[18px]", iconTone[tone])}>
                {icon}
            </span>
        </Link>
    );
}
