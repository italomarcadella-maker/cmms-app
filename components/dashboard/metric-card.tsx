"use client";

import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

import { isValidElement } from "react";

export function MetricCard({ title, value, icon, subtext, trend, trendUp, color, alert, chartData, chartColor, onClick, active }: any) {
    // Helper to render icon
    const renderIcon = () => {
        if (isValidElement(icon)) {
            // Already an element (e.g. <Activity className="..." />), just render it
            return icon;
        }
        const Icon = icon;
        return Icon ? <Icon className="h-4 w-4" /> : null;
    };

    return (
        <div
            onClick={onClick}
            className={cn(
                "rounded-xl border bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/20 hover:-translate-y-1 cursor-pointer",
                alert && "border-red-500 shadow-red-500/20",
                active && "ring-2 ring-primary border-primary shadow-lg scale-[1.02]"
            )}>
            <div className="flex justify-between items-start mb-2">
                <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{title}</h3>
                <div className={cn("p-2 rounded-lg bg-background/80 backdrop-blur-sm", color)}>
                    {renderIcon()}
                </div>
            </div>

            <div className="flex flex-col">
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}

                {trend && (
                    <div className={cn("mt-2 flex items-center text-xs font-medium", trendUp ? "text-emerald-500" : "text-red-500")}>
                        {trendUp ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                        {trend}
                    </div>
                )}

                {/* Simplified chart visual if needed */}
                {chartData && (
                    <div className="flex items-end gap-1 h-8 mt-2 opacity-50">
                        {/* Placeholder bars */}
                        <div className="bg-primary w-1 h-full rounded-t"></div>
                        <div className="bg-primary w-1 h-3/4 rounded-t"></div>
                        <div className="bg-primary w-1 h-1/2 rounded-t"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
