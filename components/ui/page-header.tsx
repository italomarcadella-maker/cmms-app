import * as React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

export interface Crumb {
    label: string
    href?: string
}

interface PageHeaderProps {
    title: string
    description?: string
    /** Primary actions, aligned to the right on wide screens (e.g. a "New work order" button). */
    actions?: React.ReactNode
    breadcrumb?: Crumb[]
    className?: string
}

/** Standard page heading: optional breadcrumb, title, description and actions. Replaces the hand-written headers. */
export function PageHeader({ title, description, actions, breadcrumb, className }: PageHeaderProps) {
    return (
        <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
            <div className="min-w-0 space-y-1">
                {breadcrumb && breadcrumb.length > 0 && (
                    <nav aria-label="Percorso" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        {breadcrumb.map((crumb, i) => (
                            <React.Fragment key={`${crumb.label}-${i}`}>
                                {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
                                {crumb.href ? (
                                    <Link href={crumb.href} className="hover:text-foreground hover:underline">
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span aria-current="page">{crumb.label}</span>
                                )}
                            </React.Fragment>
                        ))}
                    </nav>
                )}
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
                {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    )
}
