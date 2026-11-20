"use client";

import { useState } from "react";
import { Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { MANAGERS, hasRole } from "@/lib/roles";
import type { PermitRow } from "@/modules/maintenance/adapters/actions/work-permit-actions";
import { PermitCard } from "./permit-card";
import { ActivatePermitDialog } from "./activate-permit-dialog";
import { RequestPermitDialog } from "./request-permit-dialog";
import { usePermitActions } from "./use-permit-actions";
import { useOrderPermits } from "./use-order-permits";
import { useT } from "@/lib/i18n/client";

/** Sezione "Permessi di lavoro" della scheda ordine: richiesta, approvazione, attivazione con precauzioni, chiusura. */
export function OrderPermits({ workOrderId }: { workOrderId: string }) {
    const t = useT();
    const { user } = useAuth();
    const { data, failed, loading, reload } = useOrderPermits(workOrderId);
    const actions = usePermitActions(reload);
    const [requesting, setRequesting] = useState(false);
    const [activating, setActivating] = useState<PermitRow | null>(null);

    return (
        <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4" aria-hidden />{t("Permessi di lavoro")}</CardTitle>
                    <CardDescription>{t("Lavori in quota, uso di PLE, spazi confinati e altre attività che richiedono un permesso.")}</CardDescription>
                </div>
                {data?.canRequest && (
                    <Button type="button" size="sm" variant="outline" onClick={() => setRequesting(true)}>
                        <Plus className="mr-1.5 h-4 w-4" aria-hidden />{t("Richiedi permesso")}
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-3" aria-busy={loading}>
                {failed ? (
                    <p role="alert" className="rounded-lg border border-transparent bg-critical-soft p-3 text-sm text-critical-strong">{t("Impossibile caricare i permessi. Riprova tra qualche istante.")}</p>
                ) : !data ? (
                    <Skeleton className="h-16 w-full" />
                ) : (
                    <>
                        {data.permits.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {t("Nessun permesso per questo ordine.")}{" "}
                                {data.types.length === 0
                                    ? t("Non è stato ancora definito nessun tipo di permesso.")
                                    : t("Il lavoro può partire senza: richiedi un permesso solo se l'attività lo prevede.")}
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {data.permits.map(p => (
                                    <PermitCard
                                        key={p.id}
                                        permit={p}
                                        actions={{
                                            canApprove: data.canApprove,
                                            canOperate: true,
                                            busy: actions.busyId === p.id,
                                            onApprove: actions.approve,
                                            onReject: actions.reject,
                                            onActivate: setActivating,
                                            onClose: actions.close,
                                            onCancel: actions.cancel,
                                        }}
                                    />
                                ))}
                            </ul>
                        )}
                        {data.permits.some(p => p.status === "REQUESTED" || p.status === "APPROVED") && (
                            <p className="text-xs text-muted-foreground">{t("Finché c'è un permesso richiesto o approvato ma non attivo, il lavoro non può essere avviato.")}</p>
                        )}
                    </>
                )}
            </CardContent>

            {data && (
                <RequestPermitDialog
                    workOrderId={workOrderId}
                    data={data}
                    canManageTypes={hasRole(user?.role, MANAGERS)}
                    open={requesting}
                    onOpenChange={setRequesting}
                    onDone={reload}
                />
            )}
            <ActivatePermitDialog permit={activating} onClose={() => setActivating(null)} onDone={reload} />
            {actions.dialogs}
        </Card>
    );
}
