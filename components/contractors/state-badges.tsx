"use client";

import { Badge } from "@/components/ui/badge";
import { tk } from "@/lib/i18n/translate";
import { useT } from "@/lib/i18n/client";
import type { ActivityState, ContractState } from "@/modules/maintenance/domain/contractors";

const CONTRACT: Record<ContractState, { label: string; variant: "success" | "warning" | "critical" | "neutral" | "info" }> = {
    ACTIVE: { label: tk("In vigore"), variant: "success" },
    EXPIRING: { label: tk("In scadenza"), variant: "warning" },
    EXPIRED: { label: tk("Scaduto"), variant: "critical" },
    UPCOMING: { label: tk("Non ancora iniziato"), variant: "info" },
    TERMINATED: { label: tk("Disdetto"), variant: "neutral" },
};

const ACTIVITY: Record<ActivityState, { label: string; variant: "success" | "warning" | "critical" | "neutral" }> = {
    OVERDUE: { label: tk("In ritardo"), variant: "critical" },
    DUE_SOON: { label: tk("Entro 7 giorni"), variant: "warning" },
    OK: { label: tk("In programma"), variant: "success" },
    INACTIVE: { label: tk("Sospesa"), variant: "neutral" },
};

export function ContractStateBadge({ state, daysToEnd }: { state: ContractState; daysToEnd?: number | null }) {
    const t = useT();
    const s = CONTRACT[state];
    const extra = state === "EXPIRING" && daysToEnd != null ? ` (${t("{n} gg", { n: daysToEnd })})` : "";
    return <Badge variant={s.variant}>{t(s.label)}{extra}</Badge>;
}

export function ActivityStateBadge({ state }: { state: ActivityState }) {
    const t = useT();
    const s = ACTIVITY[state];
    return <Badge variant={s.variant}>{t(s.label)}</Badge>;
}
