import * as React from "react"
import Link from "next/link"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import type { Tone } from "@/components/ui/status-badge"

const iconTone: Record<Tone, string> = {
    success: "bg-success-soft text-success-strong",
    info: "bg-info-soft text-info-strong",
    warning: "bg-warning-soft text-warning-strong",
    critical: "bg-critical-soft text-critical-strong",
    neutral: "bg-secondary text-secondary-foreground",
    progress: "bg-primary text-primary-foreground",
}

export interface StatTrend {
    /** Text to show, e.g. "+12% vs mese scorso". */
    label: string
    direction: "up" | "down" | "flat"
    /** Whether this direction is good news. Drives the colour (green/fuchsia), not the arrow. */
    good?: boolean
}

interface StatCardProps {
    label: string
    value: React.ReactNode
    /** Secondary line under the value. */
    hint?: React.ReactNode
    icon?: React.ReactNode
    tone?: Tone
    trend?: StatTrend
    href?: string
    loading?: boolean
    className?: string
}

/** KPI card: label, big number, optional trend. Replaces MetricCard and the hand-written KPI boxes. */
export function StatCard({ label, value, hint, icon, tone = "info", trend, href, loading, className }: StatCardProps) {
    const body = (
        <div
            className={cn(
                "flex h-full flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-colors",
                href && "hover:border-primary/40",
                className
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
                {icon && (
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg [&>svg]:h-4 [&>svg]:w-4", iconTone[tone])}>
                        {icon}
                    </span>
                )}
            </div>
            {loading ? (
                <Skeleton className="h-8 w-24" />
            ) : (
                <div className="text-3xl font-semibold leading-none tracking-tight tabular-nums">{value}</div>
            )}
            {(hint || trend) && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {trend && (
                        <span
                            className={cn(
                                "inline-flex items-center gap-0.5 font-medium",
                                trend.good === undefined
                                    ? "text-muted-foreground"
                                    : trend.good
                                        ? "text-success-strong"
                                        : "text-critical-strong"
                            )}
                        >
                            {trend.direction === "up" && <ArrowUpRight className="h-3.5 w-3.5" />}
                            {trend.direction === "down" && <ArrowDownRight className="h-3.5 w-3.5" />}
                            {trend.direction === "flat" && <Minus className="h-3.5 w-3.5" />}
                            {trend.label}
                        </span>
                    )}
                    {hint && <span>{hint}</span>}
                </div>
            )}
        </div>
    )

    return href ? (
        <Link href={href} className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {body}
        </Link>
    ) : (
        body
    )
}
