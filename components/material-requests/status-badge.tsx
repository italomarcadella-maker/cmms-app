"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/client";
import { MATERIAL_STATUS_LABELS, isMaterialStatus } from "@/modules/inventory/domain/material-request";

const VARIANTS = {
    REQUESTED: "info",
    READY: "warning",
    DELIVERED: "success",
    REJECTED: "critical",
    CANCELED: "neutral",
} as const;

export function MaterialStatusBadge({ status }: { status: string }) {
    const t = useT();
    if (!isMaterialStatus(status)) return <Badge variant="neutral">{status}</Badge>;
    return <Badge variant={VARIANTS[status]}>{t(MATERIAL_STATUS_LABELS[status])}</Badge>;
}
