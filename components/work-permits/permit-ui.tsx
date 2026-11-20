"use client";

import { Badge } from "@/components/ui/badge";
import { useT, useFormat } from "@/lib/i18n/client";
import { EFFECTIVE_STATUS_LABEL, type EffectivePermitStatus } from "@/modules/maintenance/domain/work-permits";

const VARIANT: Record<EffectivePermitStatus, "warning" | "info" | "success" | "neutral" | "critical"> = {
    REQUESTED: "warning",
    APPROVED: "info",
    ACTIVE: "success",
    CLOSED: "neutral",
    REJECTED: "critical",
    CANCELED: "neutral",
    EXPIRED: "critical",
};

/** Stato del permesso: l'informazione e' nel testo, il colore la rinforza soltanto. */
export function PermitStatusBadge({ status }: { status: EffectivePermitStatus }) {
    const t = useT();
    return <Badge variant={VARIANT[status]}>{t(EFFECTIVE_STATUS_LABEL[status])}</Badge>;
}

/** Date e frasi di validita' nella lingua dell'utente (fuso dello stabilimento). */
export function usePermitFormat() {
    const t = useT();
    const fmt = useFormat();

    const formatDateTime = (iso: string | null): string => {
        if (!iso) return "";
        return fmt.dateTime(iso, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
    };

    /** "dal 20/11/2026 08:00 al 20/11/2026 16:00", oppure solo l'inizio / "senza scadenza". */
    const validityText = (validFrom: string | null, validTo: string | null): string => {
        if (!validFrom && !validTo) return t("Validità non ancora definita");
        if (validFrom && validTo) return t("Dal {from} al {to}", { from: formatDateTime(validFrom), to: formatDateTime(validTo) });
        if (validFrom) return t("Dal {from}, senza scadenza", { from: formatDateTime(validFrom) });
        return t("Fino al {to}", { to: formatDateTime(validTo) });
    };

    return { formatDateTime, validityText };
}
