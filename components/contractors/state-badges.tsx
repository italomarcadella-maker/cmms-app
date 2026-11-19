import { Badge } from "@/components/ui/badge";
import type { ActivityState, ContractState } from "@/modules/maintenance/domain/contractors";

const CONTRACT: Record<ContractState, { label: string; variant: "success" | "warning" | "critical" | "neutral" | "info" }> = {
    ACTIVE: { label: "In vigore", variant: "success" },
    EXPIRING: { label: "In scadenza", variant: "warning" },
    EXPIRED: { label: "Scaduto", variant: "critical" },
    UPCOMING: { label: "Non ancora iniziato", variant: "info" },
    TERMINATED: { label: "Disdetto", variant: "neutral" },
};

const ACTIVITY: Record<ActivityState, { label: string; variant: "success" | "warning" | "critical" | "neutral" }> = {
    OVERDUE: { label: "In ritardo", variant: "critical" },
    DUE_SOON: { label: "Entro 7 giorni", variant: "warning" },
    OK: { label: "In programma", variant: "success" },
    INACTIVE: { label: "Sospesa", variant: "neutral" },
};

export function ContractStateBadge({ state, daysToEnd }: { state: ContractState; daysToEnd?: number | null }) {
    const s = CONTRACT[state];
    const extra = state === "EXPIRING" && daysToEnd != null ? ` (${daysToEnd} gg)` : "";
    return <Badge variant={s.variant}>{s.label}{extra}</Badge>;
}

export function ActivityStateBadge({ state }: { state: ActivityState }) {
    const s = ACTIVITY[state];
    return <Badge variant={s.variant}>{s.label}</Badge>;
}
