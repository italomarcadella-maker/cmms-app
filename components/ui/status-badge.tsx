import * as React from "react"
import { AlertOctagon, Ban, Box, CheckCircle2, PowerOff, Wrench } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Single source of truth for how work-order status, work-order priority and asset status look.
 * The same status always gets the same colour, in the dashboard, the lists, the details and the kanban.
 */

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
    label: string
    icon?: React.ReactNode
    /** Show the coloured dot (default) or a custom icon instead. */
    dot?: boolean
}

function Pill({ tone, label, icon, dot = true, className, ...props }: PillProps) {
    const t = toneClasses[tone]
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
                t.pill,
                className
            )}
            {...props}
        >
            {icon ?? (dot && <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />)}
            {label}
        </span>
    )
}

// --- Work order status ---------------------------------------------------------------------------

const workOrderStatus: Record<string, { tone: Tone; label: string }> = {
    OPEN: { tone: "info", label: "Aperto" },
    PENDING_APPROVAL: { tone: "warning", label: "Da approvare" },
    APPROVED: { tone: "info", label: "Approvato" },
    ASSIGNED: { tone: "info", label: "Assegnato" },
    IN_PROGRESS: { tone: "progress", label: "In corso" },
    ON_HOLD: { tone: "neutral", label: "In attesa" },
    PENDING_REVIEW: { tone: "warning", label: "Da verificare" },
    COMPLETED: { tone: "success", label: "Completato" },
    CLOSED: { tone: "neutral", label: "Chiuso" },
    CANCELED: { tone: "neutral", label: "Annullato" },
}

export function WorkOrderStatusPill({ status, className }: { status: string; className?: string }) {
    const cfg = workOrderStatus[status] ?? { tone: "neutral" as Tone, label: status }
    return <Pill tone={cfg.tone} label={cfg.label} className={className} />
}

// --- Work order priority -------------------------------------------------------------------------

const workOrderPriority: Record<string, { tone: Tone; label: string; icon?: React.ReactNode }> = {
    STOPPED: { tone: "critical", label: "Macchina ferma", icon: <AlertOctagon className="h-3 w-3" /> },
    MALFUNCTIONING: { tone: "warning", label: "Malfunzionante", icon: <Wrench className="h-3 w-3" /> },
    WORKING: { tone: "info", label: "In lavoro" },
    NOT_PRODUCTION: { tone: "neutral", label: "Non in produzione" },
    HIGH: { tone: "critical", label: "Alta" },
    MEDIUM: { tone: "warning", label: "Media" },
    LOW: { tone: "neutral", label: "Bassa" },
}

export function PriorityPill({ priority, className }: { priority: string; className?: string }) {
    const cfg = workOrderPriority[priority] ?? { tone: "neutral" as Tone, label: priority }
    return <Pill tone={cfg.tone} label={cfg.label} icon={cfg.icon} className={className} />
}

// --- Asset status --------------------------------------------------------------------------------

const assetStatus: Record<string, { tone: Tone; label: string; icon: React.ReactNode }> = {
    OPERATIONAL: { tone: "success", label: "In uso", icon: <CheckCircle2 className="h-3 w-3" /> },
    MAINTENANCE: { tone: "warning", label: "In manutenzione", icon: <AlertOctagon className="h-3 w-3" /> },
    OFFLINE: { tone: "neutral", label: "Offline", icon: <PowerOff className="h-3 w-3" /> },
    DECOMMISSIONED: { tone: "critical", label: "Rottamato", icon: <Ban className="h-3 w-3" /> },
    STORAGE: { tone: "info", label: "Accantonato", icon: <Box className="h-3 w-3" /> },
}

export function AssetStatusPill({ status, className }: { status: string; className?: string }) {
    const cfg = assetStatus[status] ?? { tone: "neutral" as Tone, label: status, icon: undefined }
    return <Pill tone={cfg.tone} label={cfg.label} icon={cfg.icon} className={className} />
}

/** Tone for a 0-100 health score: used for bars and numbers so colour means the same everywhere. */
export function healthTone(score: number): Tone {
    if (score >= 80) return "success"
    if (score >= 50) return "warning"
    return "critical"
}

export const toneBarClass: Record<Tone, string> = {
    success: "bg-success",
    info: "bg-info",
    warning: "bg-warning",
    critical: "bg-critical",
    neutral: "bg-muted-foreground",
    progress: "bg-primary",
}
