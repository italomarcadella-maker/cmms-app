import { Badge } from "@/components/ui/badge";
import { MATERIAL_STATUS_LABELS, isMaterialStatus } from "@/modules/inventory/domain/material-request";

const VARIANTS = {
    REQUESTED: "info",
    READY: "warning",
    DELIVERED: "success",
    REJECTED: "critical",
    CANCELED: "neutral",
} as const;

export function MaterialStatusBadge({ status }: { status: string }) {
    if (!isMaterialStatus(status)) return <Badge variant="neutral">{status}</Badge>;
    return <Badge variant={VARIANTS[status]}>{MATERIAL_STATUS_LABELS[status]}</Badge>;
}
