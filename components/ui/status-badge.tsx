import * as React from "react"
import { AlertOctagon, Ban, Box, CheckCircle2, PowerOff, Wrench } from "lucide-react"

import { tk } from "@/lib/i18n/translate"
import { Pill, type Tone } from "@/components/ui/status-pill"

/**
 * Single source of truth for how work-order status, work-order priority and asset status look.
 * The same status always gets the same colour, in the dashboard, the lists, the details and the kanban.
 */

export type { Tone }

// --- Work order status ---------------------------------------------------------------------------

const workOrderStatus: Record<string, { tone: Tone; label: string }> = {
    OPEN: { tone: "info", label: tk("Aperto") },
    PENDING_APPROVAL: { tone: "warning", label: tk("Da approvare") },
    APPROVED: { tone: "info", label: tk("Approvato") },
    ASSIGNED: { tone: "info", label: tk("Assegnato") },
    IN_PROGRESS: { tone: "progress", label: tk("In corso") },
    ON_HOLD: { tone: "neutral", label: tk("In attesa") },
    PENDING_REVIEW: { tone: "warning", label: tk("Da verificare") },
    COMPLETED: { tone: "success", label: tk("Completato") },
    CLOSED: { tone: "neutral", label: tk("Chiuso") },
    CANCELED: { tone: "neutral", label: tk("Annullato") },
}

export function WorkOrderStatusPill({ status, className }: { status: string; className?: string }) {
    const cfg = workOrderStatus[status] ?? { tone: "neutral" as Tone, label: status }
    return <Pill tone={cfg.tone} label={cfg.label} className={className} />
}

// --- Work order priority -------------------------------------------------------------------------

const workOrderPriority: Record<string, { tone: Tone; label: string; icon?: React.ReactNode }> = {
    STOPPED: { tone: "critical", label: tk("Macchina ferma"), icon: <AlertOctagon className="h-3 w-3" /> },
    MALFUNCTIONING: { tone: "warning", label: tk("Malfunzionante"), icon: <Wrench className="h-3 w-3" /> },
    WORKING: { tone: "info", label: tk("In lavoro") },
    NOT_PRODUCTION: { tone: "neutral", label: tk("Non in produzione") },
    HIGH: { tone: "critical", label: tk("Alta") },
    MEDIUM: { tone: "warning", label: tk("Media") },
    LOW: { tone: "neutral", label: tk("Bassa") },
}

export function PriorityPill({ priority, className }: { priority: string; className?: string }) {
    const cfg = workOrderPriority[priority] ?? { tone: "neutral" as Tone, label: priority }
    return <Pill tone={cfg.tone} label={cfg.label} icon={cfg.icon} className={className} />
}

// --- Asset status --------------------------------------------------------------------------------

const assetStatus: Record<string, { tone: Tone; label: string; icon: React.ReactNode }> = {
    OPERATIONAL: { tone: "success", label: tk("In uso"), icon: <CheckCircle2 className="h-3 w-3" /> },
    MAINTENANCE: { tone: "warning", label: tk("In manutenzione"), icon: <AlertOctagon className="h-3 w-3" /> },
    OFFLINE: { tone: "neutral", label: tk("Offline"), icon: <PowerOff className="h-3 w-3" /> },
    DECOMMISSIONED: { tone: "critical", label: tk("Rottamato"), icon: <Ban className="h-3 w-3" /> },
    STORAGE: { tone: "info", label: tk("Accantonato"), icon: <Box className="h-3 w-3" /> },
}

export function AssetStatusPill({ status, className }: { status: string; className?: string }) {
    const cfg = assetStatus[status] ?? { tone: "neutral" as Tone, label: status, icon: undefined }
    return <Pill tone={cfg.tone} label={cfg.label} icon={cfg.icon} className={className} />
}

/** Tone for a 0-100 health score: used for bars and numbers so colour means the same everywhere. */
export function healthTone(score: number): "success" | "warning" | "critical" {
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
