"use client";

import { CalendarClock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlantBadge } from "@/components/ui/plant-badge";
import { MaterialStatusBadge } from "@/components/material-requests/status-badge";
import { isOpenMaterialStatus } from "@/modules/inventory/domain/material-request";
import type { MaterialRequestRow } from "@/modules/inventory/adapters/actions/material-request-actions";
import { useT, useFormat } from "@/lib/i18n/client";

export interface RequestCardProps {
    request: MaterialRequestRow;
    /** "mine": le mie richieste (si puo' annullare). "handle": vista di chi evade (pronto, consegnata, rifiuta). */
    mode: "mine" | "handle";
    busy?: boolean;
    onCancel?: (r: MaterialRequestRow) => void;
    onReady?: (r: MaterialRequestRow) => void;
    onDeliver?: (r: MaterialRequestRow) => void;
    onReject?: (r: MaterialRequestRow) => void;
}

export function MaterialRequestCard({ request: r, mode, busy, onCancel, onReady, onDeliver, onReject }: RequestCardProps) {
    const t = useT();
    const fmt = useFormat();
    const fmtDate = (iso: string | null) => (iso ? fmt.date(iso) : "-");
    const open = isOpenMaterialStatus(r.status);
    const shortage = mode === "handle" && open && r.items.some(i => i.partId && i.available !== null && i.available < i.quantity);

    return (
        <Card>
            <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-semibold">
                            {mode === "handle" ? r.requesterName : t("Richiesta del {date}", { date: fmtDate(r.createdAt) })}
                            {r.department && <span className="font-normal text-muted-foreground"> · {r.department}</span>}
                        </p>
                        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {mode === "handle" && <span>{t("Inviata il {date}", { date: fmtDate(r.createdAt) })}</span>}
                            <PlantBadge plantId={r.plantId} />
                        </p>
                    </div>
                    <MaterialStatusBadge status={r.status} />
                </div>

                <ul className="divide-y divide-border rounded-md border border-border text-sm">
                    {r.items.map(i => (
                        <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                            <span className="min-w-0 break-words">{i.description}</span>
                            <span className="flex shrink-0 items-center gap-3 tabular-nums">
                                {mode === "handle" && open && i.available !== null && (
                                    <span className={i.available < i.quantity ? "text-xs font-medium text-critical-strong" : "text-xs text-muted-foreground"}>
                                        {t("in magazzino: {n}", { n: i.available })}
                                    </span>
                                )}
                                <span className="font-medium">
                                    {i.deliveredQty != null && r.status === "DELIVERED" ? t("{n} consegnati", { n: i.deliveredQty }) : t("{n} pz", { n: i.quantity })}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>

                {(r.neededBy || r.note) && (
                    <div className="space-y-1 text-sm">
                        {r.neededBy && (
                            <p className="flex items-center gap-1.5 text-muted-foreground">
                                <CalendarClock className="h-4 w-4" /> {t("Serve entro il")} <span className="font-medium text-foreground">{fmtDate(r.neededBy)}</span>
                            </p>
                        )}
                        {r.note && (
                            <p className="flex items-start gap-1.5 text-muted-foreground">
                                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" /> <span className="break-words">{r.note}</span>
                            </p>
                        )}
                    </div>
                )}

                {(r.handledByName || r.responseNote) && (
                    <p className="rounded-md bg-secondary px-3 py-2 text-sm">
                        {r.handledByName && <span className="font-medium">{r.handledByName}{r.handledAt ? `, ${fmtDate(r.handledAt)}` : ""}</span>}
                        {r.handledByName && r.responseNote && ": "}
                        {r.responseNote}
                    </p>
                )}

                {shortage && <p className="text-xs text-critical-strong">{t("Almeno un articolo ha una giacenza inferiore alla quantità richiesta: prima di consegnare serve caricare la giacenza.")}</p>}

                {mode === "mine" && r.status === "REQUESTED" && onCancel && (
                    <div className="flex justify-end">
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => onCancel(r)}>{t("Annulla richiesta")}</Button>
                    </div>
                )}

                {mode === "handle" && open && (
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => onReject?.(r)}>{t("Rifiuta")}</Button>
                        {r.status === "REQUESTED" && <Button size="sm" variant="secondary" disabled={busy} onClick={() => onReady?.(r)}>{t("Pronto da ritirare")}</Button>}
                        <Button size="sm" disabled={busy} onClick={() => onDeliver?.(r)}>{t("Consegnata")}</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
