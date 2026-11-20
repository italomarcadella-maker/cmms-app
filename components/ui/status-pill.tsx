"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n/client"

export type Tone = "success" | "info" | "warning" | "critical" | "neutral" | "progress"

const toneClasses: Record<Tone, { pill: string; dot: string }> = {
    success: { pill: "bg-success-soft text-success-strong", dot: "bg-success" },
    info: { pill: "bg-info-soft text-info-strong", dot: "bg-info" },
    warning: { pill: "bg-warning-soft text-warning-strong", dot: "bg-warning" },
    critical: { pill: "bg-critical-soft text-critical-strong", dot: "bg-critical" },
    neutral: { pill: "bg-secondary text-secondary-foreground", dot: "bg-muted-foreground" },
    progress: { pill: "bg-primary text-primary-foreground", dot: "bg-primary-foreground" },
}

interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
    tone: Tone
    /** Testo italiano (chiave di traduzione): viene tradotto qui, quindi i componenti server possono usarlo senza hook. */
    label: string
    icon?: React.ReactNode
    /** Show the coloured dot (default) or a custom icon instead. */
    dot?: boolean
}

/** Pillola colorata di stato. E' un componente client perche' traduce l'etichetta; le pagine server la usano normalmente. */
export function Pill({ tone, label, icon, dot = true, className, ...props }: PillProps) {
    const t = useT()
    const classes = toneClasses[tone]
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
                classes.pill,
                className
            )}
            {...props}
        >
            {icon ?? (dot && <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", classes.dot)} />)}
            {t(label)}
        </span>
    )
}
