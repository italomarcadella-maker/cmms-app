"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarClock, History, Inbox, Wrench, type LucideIcon } from "lucide-react";

import { useT, useFormat } from "@/lib/i18n/client";
import { tk } from "@/lib/i18n/translate";
import { getAssetHistory, type AssetHistoryItem } from "@/modules/maintenance/adapters/actions/asset-reliability-actions";
import type { HistoryKind } from "@/modules/maintenance/domain/asset-reliability";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { WOStatusBadge } from "@/components/work-orders/wo-status-badge";
import { WOPriorityBadge } from "@/components/work-orders/wo-priority-badge";

const KIND_LABEL: Record<string, { label: string; icon: LucideIcon }> = {
    FAULT: { label: tk("Guasto"), icon: Wrench },
    ROUTINE: { label: tk("Manutenzione programmata"), icon: CalendarClock },
    REQUEST: { label: tk("Richiesta"), icon: Inbox },
};

const EMPTY_TEXT: Record<HistoryKind, string> = {
    ALL: tk("Nessun ordine registrato su questo asset."),
    FAULT: tk("Nessun guasto registrato su questo asset."),
    ROUTINE: tk("Nessuna manutenzione programmata registrata su questo asset."),
    REQUEST: tk("Nessuna richiesta registrata su questo asset."),
};

/** Storico completo degli ordini dell'asset (senza limite di data), filtrabile per tipo, a pagine da 25. */
export function AssetHistory({ assetId }: { assetId: string }) {
    const t = useT();
    const fmt = useFormat();
    const [kind, setKind] = useState<HistoryKind>("ALL");
    const [items, setItems] = useState<AssetHistoryItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Ignora le risposte arrivate dopo un cambio di filtro o di asset
    const requestId = useRef(0);

    // Prima pagina: si ricarica al cambio di asset o di filtro. Lo stato di caricamento si imposta dove cambia il filtro, non qui
    useEffect(() => {
        const id = ++requestId.current;
        getAssetHistory(assetId, { kind, page: 1 }).then((res) => {
            if (id !== requestId.current) return;
            if (!res.success) {
                setError(res.message ?? tk("Errore nel caricamento dello storico"));
                setItems([]);
                setTotal(0);
                setHasMore(false);
            } else {
                setError(null);
                setItems(res.items);
                setTotal(res.total);
                setPage(1);
                setHasMore(res.hasMore);
            }
            setLoading(false);
        });
    }, [assetId, kind]);

    const changeKind = (next: HistoryKind) => {
        if (next === kind) return;
        setLoading(true);
        setKind(next);
    };

    const loadMore = async () => {
        const id = requestId.current;
        setLoadingMore(true);
        const res = await getAssetHistory(assetId, { kind, page: page + 1 });
        if (id !== requestId.current) return;
        if (res.success) {
            // Un ordine nuovo puo' spostare le pagine: si evitano i doppioni
            setItems((prev) => {
                const seen = new Set(prev.map((i) => i.id));
                return [...prev, ...res.items.filter((i) => !seen.has(i.id))];
            });
            setTotal(res.total);
            setPage(res.page);
            setHasMore(res.hasMore);
        } else {
            setError(res.message ?? tk("Errore nel caricamento"));
        }
        setLoadingMore(false);
    };

    return (
        <Card>
            <CardHeader className="gap-3">
                <div className="space-y-1.5">
                    <CardTitle>{t("Storico interventi")}</CardTitle>
                    <CardDescription>{t("Tutti gli ordini di questo asset, dal più recente, senza limite di data.")}</CardDescription>
                </div>
                <div className="overflow-x-auto">
                    <SegmentedControl
                        aria-label={t("Tipo di intervento")}
                        value={kind}
                        onChange={changeKind}
                        options={[
                            { value: "ALL", label: t("Tutti") },
                            { value: "FAULT", label: t("Guasti") },
                            { value: "ROUTINE", label: t("Manutenzione programmata") },
                            { value: "REQUEST", label: t("Richieste") },
                        ]}
                    />
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : error ? (
                    <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">{t(error)}</p>
                ) : items.length === 0 ? (
                    <EmptyState icon={<History />} title={t("Nessuno storico")} description={t(EMPTY_TEXT[kind])} className="py-8" />
                ) : (
                    <>
                        <ul className="space-y-2">
                            {items.map((wo) => {
                                const k = KIND_LABEL[wo.type];
                                const Icon = k?.icon ?? Wrench;
                                return (
                                    <li key={wo.id}>
                                        <Link href={wo.link} className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground" title={k ? t(k.label) : wo.type}>
                                                    <Icon className="h-4 w-4" aria-hidden />
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-medium">{wo.title}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {k ? t(k.label) : wo.type} · {fmt.date(wo.createdAt)}
                                                        {wo.assignee ? ` · ${wo.assignee}` : ""}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                                                {wo.type === "FAULT" && (wo.priority === "STOPPED" || wo.priority === "MALFUNCTIONING") && <WOPriorityBadge priority={wo.priority} />}
                                                <WOStatusBadge status={wo.status} />
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                        <div className="mt-4 flex flex-col items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                                {total === 1
                                    ? t("{shown} di {total} ordine", { shown: items.length, total: fmt.number(total) })
                                    : t("{shown} di {total} ordini", { shown: items.length, total: fmt.number(total) })}
                            </p>
                            {hasMore && (
                                <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                                    {loadingMore ? t("Caricamento...") : t("Carica altri")}
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
