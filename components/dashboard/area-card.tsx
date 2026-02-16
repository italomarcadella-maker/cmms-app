"use client";

import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AreaCardProps {
    title: string;
    count: number;
    icon: LucideIcon;
    href: string;
    color: string; // e.g. "bg-blue-500"
}

export function AreaCard({ title, count, icon: Icon, href, color }: AreaCardProps) {
    return (
        <Link
            href={href}
            className="relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] group"
        >
            <div className={cn("absolute inset-0 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity", color)} />

            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
                    <div className="text-3xl font-bold tracking-tight">{count}</div>
                    <p className="text-xs text-muted-foreground mt-1">Richieste attive</p>
                </div>
                <div className={cn("p-2.5 rounded-lg text-white shadow-sm", color)}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>

            {/* Micro-indicator for active status */}
            {count > 0 && (
                <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-red-500 animate-pulse ring-2 ring-background" />
            )}
        </Link>
    );
}
