"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PermitRow } from "@/modules/maintenance/adapters/actions/work-permit-actions";
import { ActivatePermitDialog } from "./activate-permit-dialog";
import { PermitStatusBadge, usePermitFormat } from "./permit-ui";
import { useOrderPermits } from "./use-order-permits";
import { useT } from "@/lib/i18n/client";

/**
 * Permessi di lavoro nella scheda mobile: elenco in sola lettura e attivazione dei permessi approvati.
 * Richiesta, approvazione, chiusura e annullamento restano nella versione completa. Senza permessi non mostra nulla.
 */
export function MobileOrderPermits({ workOrderId, canWork, onChanged }: { workOrderId: string; canWork: boolean; onChanged?: () => void }) {
    const t = useT();
    const { validityText } = usePermitFormat();
    const { data, reload } = useOrderPermits(workOrderId);
    const [activating, setActivating] = useState<PermitRow | null>(null);

    if (!data || data.permits.length === 0) return null;
    // Il collegamento sta dentro la frase: si traduce la frase intera con un segnaposto e lo si sostituisce con il link
    const [linkBefore, linkAfter] = t("Per richiedere, approvare o chiudere un permesso apri la {link}.", { link: "{link}" }).split("{link}");
    const done = () => { reload(); onChanged?.(); };

    return (
        <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("Permessi di lavoro")}</h2>
            <ul className="space-y-3">
                {data.permits.map(p => (
                    <li key={p.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2">
                            <p className="font-medium leading-snug">{p.typeName}</p>
                            <PermitStatusBadge status={p.effectiveStatus} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{validityText(p.validFrom, p.validTo)}</p>
                        {p.place && <p className="text-sm text-muted-foreground">{t("Luogo: {place}", { place: p.place })}</p>}
                        {p.status === "REJECTED" && p.rejectionReason && <p className="mt-1 text-sm">{t("Motivo del rifiuto: {reason}", { reason: p.rejectionReason })}</p>}
                        {p.qualificationIssue && <p role="alert" className="mt-1 text-sm font-medium text-warning-strong">{t("Tecnici non abilitati: {issue}.", { issue: p.qualificationIssue })}</p>}
                        {p.status === "APPROVED" && canWork && (
                            <Button type="button" size="lg" className="mt-3 h-12 w-full text-base" onClick={() => setActivating(p)} disabled={!!p.qualificationIssue}>
                                {t("Attiva permesso")}
                            </Button>
                        )}
                    </li>
                ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
                {linkBefore}
                <Link href={`/work-orders/${workOrderId}`} className="font-medium text-primary underline-offset-2 hover:underline">{t("versione completa")}</Link>
                {linkAfter}
            </p>
            <ActivatePermitDialog permit={activating} onClose={() => setActivating(null)} onDone={done} />
        </Card>
    );
}
