"use client";

import { isValidElement } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Legacy KPI box still used by /screws and /technicians/calendar. New code should use <StatCard />.
 * `color` is a text colour class for the icon (e.g. "text-success-strong").
 */
export function MetricCard({ title, value, icon, subtext, trend, trendUp, color, alert, onClick, active }: any) {
    const renderIcon = () => {
        if (isValidElement(icon)) return icon;
        const Icon = icon;
        return Icon ? <Icon className="h-4 w-4" /> : null;
    };

    return (
        <div
            onClick={onClick}
            className={cn(
                "relative overflow-hidden rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-colors",
                onClick && "cursor-pointer hover:border-primary/40",
                alert && "border-critical/50",
                active && "border-primary ring-2 ring-primary/30"
            )}
        >
            <div className="mb-2 flex items-start justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                <div className={cn("rounded-lg bg-secondary p-2", color)}>{renderIcon()}</div>
            </div>

            <div className="flex flex-col">
                <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
                {subtext && <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>}

                {trend && (
                    <div className={cn("mt-2 flex items-center text-xs font-medium", trendUp ? "text-success-strong" : "text-critical-strong")}>
                        {trendUp ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                        {trend}
                    </div>
                )}
            </div>
        </div>
    );
}
