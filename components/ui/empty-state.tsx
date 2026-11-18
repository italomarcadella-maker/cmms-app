import * as React from "react"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
    icon?: React.ReactNode
    title: string
    description?: string
    action?: React.ReactNode
    className?: string
}

/** Shown when a list or section has nothing to display, instead of a blank area. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
            {icon && (
                <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground [&>svg]:h-6 [&>svg]:w-6">
                    {icon}
                </div>
            )}
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
            {action && <div className="mt-2">{action}</div>}
        </div>
    )
}
