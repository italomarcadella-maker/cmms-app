"use client";

import Link from "next/link";
import { AlertTriangle, CheckSquare, ExternalLink, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermitStatusBadge, usePermitFormat } from "./permit-ui";
import { useT } from "@/lib/i18n/client";
import type { PermitRow } from "@/modules/maintenance/adapters/actions/work-permit-actions";

export interface PermitCardActions {
    /** Approvare e rifiutare (supervisione). */
    canApprove?: boolean;
    /** Attivare, chiudere e annullare (chi opera sull'ordine). Assente = sola lettura. */
    canOperate?: boolean;
    busy?: boolean;
    onApprove?: (p: PermitRow) => void;
    onReject?: (p: PermitRow) => void;
    onActivate?: (p: PermitRow) => void;
    onClose?: (p: PermitRow) => void;
    onCancel?: (p: PermitRow) => void;
}

/** Scheda di un permesso: stato, validita', chi ha approvato, avvisi e pulsanti coerenti con lo stato. */
export function PermitCard({ permit, showOrder, actions }: { permit: PermitRow; showOrder?: boolean; actions?: PermitCardActions }) {
    const t = useT();
    const { formatDateTime, validityText } = usePermitFormat();
    const a = actions ?? {};
    const open = permit.status === "REQUESTED" || permit.status === "APPROVED" || permit.status === "ACTIVE";
    const blocked = !!permit.qualificationIssue;

    return (
        <li className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-semibold leading-snug">{permit.typeName}</p>
                    {showOrder && (
                        <Link href={`/work-orders/${permit.workOrderId}`} className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline">
                            {permit.workOrderTitle}{permit.assetName ? ` · ${permit.assetName}` : ""}
                            <ExternalLink className="h-3 w-3" aria-hidden />
                            <span className="sr-only">{t("Apri l'ordine")}</span>
                        </Link>
                    )}
                </div>
                <PermitStatusBadge status={permit.effectiveStatus} />
            </div>

            <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                <div><dt className="inline text-muted-foreground">{t("Validità:")}{" "}</dt><dd className="inline">{validityText(permit.validFrom, permit.validTo)}</dd></div>
                {permit.place && <div><dt className="inline text-muted-foreground">{t("Luogo:")}{" "}</dt><dd className="inline">{permit.place}</dd></div>}
                <div><dt className="inline text-muted-foreground">{t("Richiesto da:")}{" "}</dt><dd className="inline">{t("{name}, il {date}", { name: permit.requestedByName, date: formatDateTime(permit.createdAt) })}</dd></div>
                {permit.status !== "REQUESTED" && permit.status !== "CANCELED" && (
                    <div>
                        <dt className="inline text-muted-foreground">{permit.status === "REJECTED" ? t("Rifiutato da:") : t("Approvato da:")}{" "}</dt>
                        <dd className="inline">
                            {permit.approvedByName
                                ? (permit.approvedAt ? t("{name}, il {date}", { name: permit.approvedByName, date: formatDateTime(permit.approvedAt) }) : permit.approvedByName)
                                : permit.requiresApproval ? t("non registrato") : t("approvazione non richiesta dal tipo")}
                        </dd>
                    </div>
                )}
                {permit.closedAt && <div><dt className="inline text-muted-foreground">{permit.status === "CANCELED" ? t("Annullato il:") : t("Chiuso il:")}{" "}</dt><dd className="inline">{formatDateTime(permit.closedAt)}</dd></div>}
            </dl>
            {permit.notes && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{permit.notes}</p>}
            {permit.status === "REJECTED" && permit.rejectionReason && (
                <p className="mt-2 text-sm"><span className="font-medium">{t("Motivo del rifiuto:")}</span> {permit.rejectionReason}</p>
            )}
            {permit.effectiveStatus === "EXPIRED" && (
                <p className="mt-2 text-sm font-medium text-critical-strong">{t("La validità è terminata il {date}: chiudi o annulla il permesso.", { date: formatDateTime(permit.validTo) })}</p>
            )}

            {blocked && (
                <div role="alert" className="mt-3 flex items-start gap-2 rounded-md border border-transparent bg-warning-soft p-3 text-sm text-warning-strong">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <p><span className="font-medium">{t("Tecnici non abilitati.")}</span> {permit.qualificationIssue}. {t("Il permesso non può essere approvato né attivato finché non sono abilitati o l'ordine viene riassegnato.")}</p>
                </div>
            )}

            {permit.precautionsDone.length > 0 && (permit.status === "ACTIVE" || permit.status === "CLOSED") && (
                <details className="mt-3 text-sm">
                    <summary className="cursor-pointer font-medium">{t("Precauzioni registrate all'attivazione ({done} di {total})", { done: permit.precautionsDone.filter(p => p.checked).length, total: permit.precautionsDone.length })}</summary>
                    <ul className="mt-2 space-y-1">
                        {permit.precautionsDone.map((p, i) => (
                            <li key={i} className="flex items-start gap-2">
                                {p.checked ? <CheckSquare className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <Square className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
                                <span><span className="sr-only">{p.checked ? t("Spuntata:") : t("Non spuntata:")}{" "}</span>{p.label}</span>
                            </li>
                        ))}
                    </ul>
                </details>
            )}

            {open && (a.canApprove || a.canOperate) && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {permit.status === "REQUESTED" && a.canApprove && (
                        <>
                            <Button type="button" size="sm" onClick={() => a.onApprove?.(permit)} disabled={a.busy || blocked}>
                                {a.busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}{t("Approva")}
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => a.onReject?.(permit)} disabled={a.busy}>{t("Rifiuta")}</Button>
                        </>
                    )}
                    {permit.status === "APPROVED" && a.canOperate && (
                        <Button type="button" size="sm" onClick={() => a.onActivate?.(permit)} disabled={a.busy || blocked}>{t("Attiva…")}</Button>
                    )}
                    {permit.status === "ACTIVE" && a.canOperate && (
                        <Button type="button" size="sm" onClick={() => a.onClose?.(permit)} disabled={a.busy}>{t("Chiudi permesso")}</Button>
                    )}
                    {a.canOperate && (
                        <Button type="button" size="sm" variant="outline" onClick={() => a.onCancel?.(permit)} disabled={a.busy}>{t("Annulla permesso")}</Button>
                    )}
                </div>
            )}
        </li>
    );
}
