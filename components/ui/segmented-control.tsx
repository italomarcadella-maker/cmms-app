"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface SegmentOption<T extends string> {
    value: T
    label: string
    icon?: React.ReactNode
}

interface SegmentedControlProps<T extends string> {
    options: SegmentOption<T>[]
    value: T
    onChange: (value: T) => void
    "aria-label": string
    className?: string
}

/** Small exclusive toggle (e.g. List / Kanban). One implementation instead of a hand-made pill in every page. */
export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
    className,
    ...rest
}: SegmentedControlProps<T>) {
    return (
        <div
            role="radiogroup"
            aria-label={rest["aria-label"]}
            className={cn("inline-flex items-center rounded-lg border bg-muted p-0.5", className)}
        >
            {options.map((opt) => {
                const active = opt.value === value
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>svg]:h-4 [&>svg]:w-4",
                            active
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {opt.icon}
                        {opt.label}
                    </button>
                )
            })}
        </div>
    )
}
