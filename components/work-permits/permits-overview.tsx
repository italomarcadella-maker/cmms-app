"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlant } from "@/lib/plant-context";
import { MANAGERS, SUPERVISION, hasRole } from "@/lib/roles";
import { listPermits, type PermitRow } from "@/modules/maintenance/adapters/actions/work-permit-actions";
import { PermitCard } from "./permit-card";
import { PermitTypesManager } from "./permit-types-manager";
import { usePermitActions } from "./use-permit-actions";
import { useT } from "@/lib/i18n/client";

/** Elenco generale dei permessi: da approvare, attivi (anche approvati in attesa di attivazione), storico; e per chi gestisce i tipi. */
export function PermitsOverview({ role }: { role: string | undefined }) {
    const t = useT();
    const { selected } = usePlant();
    const canApprove = hasRole(role, SUPERVISION);
    const canManageTypes = hasRole(role, MANAGERS);
    const [version, setVersion] = useState(0);
    const [result, setResult] = useState<{ key: string; open: PermitRow[]; history: PermitRow[]; failed: boolean } | null>(null);
    const key = `${selected}:${version}`;
    const actions = usePermitActions(() => setVersion(v => v + 1));

    useEffect(() => {
        let alive = true;
        Promise.all([
            listPermits({ status: ["REQUESTED", "APPROVED", "ACTIVE"] }),
            listPermits({ status: ["CLOSED", "REJECTED", "CANCELED"], limit: 150 }),
        ])
            .then(([open, history]) => { if (alive) setResult({ key, open, history, failed: false }); })
            .catch(e => { console.error(e); if (alive) setResult({ key, open: [], history: [], failed: true }); });
        return () => { alive = false; };
    }, [key]);

    const loading = result?.key !== key;
    const toApprove = (result?.open ?? []).filter(p => p.status === "REQUESTED");
    const active = (result?.open ?? []).filter(p => p.status !== "REQUESTED");

    const list = (items: PermitRow[], emptyTitle: string, emptyDescription: string) => {
        if (!result) return <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
        if (result.failed) return <p role="alert" className="rounded-lg border border-transparent bg-critical-soft p-3 text-sm text-critical-strong">{t("Impossibile caricare i permessi. Riprova tra qualche istante.")}</p>;
        if (items.length === 0) return <EmptyState icon={<ClipboardCheck />} title={emptyTitle} description={emptyDescription} />;
        return (
            <ul className="space-y-3" aria-busy={loading}>
                {items.map(p => (
                    <PermitCard
                        key={p.id}
                        permit={p}
                        showOrder
                        actions={{
                            canApprove,
                            canOperate: false, // attivare, chiudere e annullare si fa dalla scheda dell'ordine
                            busy: actions.busyId === p.id,
                            onApprove: actions.approve,
                            onReject: actions.reject,
                        }}
                    />
                ))}
            </ul>
        );
    };

    return (
        <>
            <Tabs defaultValue="approve">
                <TabsList className="max-w-full overflow-x-auto">
                    <TabsTrigger value="approve">{result && !result.failed ? t("Da approvare ({count})", { count: toApprove.length }) : t("Da approvare")}</TabsTrigger>
                    <TabsTrigger value="active">{result && !result.failed ? t("Attivi ({count})", { count: active.length }) : t("Attivi")}</TabsTrigger>
                    <TabsTrigger value="history">{t("Storico")}</TabsTrigger>
                    {canManageTypes && <TabsTrigger value="types">{t("Tipi di permesso")}</TabsTrigger>}
                </TabsList>
                <TabsContent value="approve" className="pt-3">
                    {list(toApprove, t("Nessun permesso da approvare"), t("Le richieste di permesso dei tecnici compaiono qui."))}
                </TabsContent>
                <TabsContent value="active" className="pt-3">
                    <p className="mb-3 text-sm text-muted-foreground">{t("Permessi in corso e approvati in attesa di attivazione. Per attivarli o chiuderli apri la scheda dell'ordine.")}</p>
                    {list(active, t("Nessun permesso attivo"), t("Qui compaiono i permessi approvati e quelli attivi."))}
                </TabsContent>
                <TabsContent value="history" className="pt-3">
                    {list(result?.history ?? [], t("Nessun permesso nello storico"), t("I permessi chiusi, rifiutati o annullati compaiono qui (gli ultimi 150)."))}
                </TabsContent>
                {canManageTypes && (
                    <TabsContent value="types" className="pt-3">
                        <PermitTypesManager reloadKey={selected} />
                    </TabsContent>
                )}
            </Tabs>
            {actions.dialogs}
        </>
    );
}
