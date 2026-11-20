"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Boxes, ChevronRight } from "lucide-react";

import { getAssetRollup, type AssetRollup } from "@/modules/maintenance/adapters/actions/asset-hierarchy-actions";
import { getAssetsHealth, type AssetHealthSummary } from "@/modules/maintenance/adapters/actions/asset-health-actions";
import { AssetStatusBadge } from "@/components/assets/asset-status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { healthTone, toneBarClass } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { useT, useFormat } from "@/lib/i18n/client";
import { tk } from "@/lib/i18n/translate";

export interface ComponentChild {
    id: string;
    name: string;
    model: string;
    serialNumber: string;
    status: string;
}

interface AssetComponentsSectionProps {
    assetId: string;
    /** Figli diretti dell'asset (gruppi e componenti). */
    items: ComponentChild[];
}

/**
 * Elenco dei componenti di una macchina o di un gruppo, con gli indicatori aggregati dell'asset e di tutti i suoi discendenti.
 * Nessuna media della salute: ogni componente mostra la propria, calcolata dal sistema.
 */
export function AssetComponentsSection({ assetId, items }: AssetComponentsSectionProps) {
    const t = useT();
    const fmt = useFormat();
    const [rollup, setRollup] = useState<{ key: string; data: AssetRollup } | null>(null);
    const rollupLoading = rollup?.key !== assetId;

    useEffect(() => {
        let alive = true;
        getAssetRollup(assetId)
            .then((data) => {
                if (alive) setRollup({ key: assetId, data });
            })
            .catch(() => {
                if (alive) setRollup({ key: assetId, data: { success: false, message: tk("Errore nel calcolo"), restricted: false, assetCount: 0, descendantCount: 0, faultsLast12Months: 0, openOrders: 0, openFaults: 0, totalCost: 0, contributors: [] } });
            });
        return () => {
            alive = false;
        };
    }, [assetId]);

    // Salute dei figli: una chiamata per tutto l'elenco; lo stato di caricamento si ricava dalla chiave della richiesta
    const idsKey = items.map((i) => i.id).join(",");
    const [health, setHealth] = useState<{ key: string; byAsset: Record<string, AssetHealthSummary> } | null>(null);
    useEffect(() => {
        if (!idsKey) return;
        let alive = true;
        getAssetsHealth(idsKey.split(","))
            .then((r) => {
                if (alive) setHealth({ key: idsKey, byAsset: r.success ? r.byAsset : {} });
            })
            .catch(() => {
                if (alive) setHealth({ key: idsKey, byAsset: {} });
            });
        return () => {
            alive = false;
        };
    }, [idsKey]);
    const healthById = health?.key === idsKey ? health.byAsset : null;

    const data = rollup?.data;
    const ok = !!data?.success;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-muted-foreground" /> {t("Componenti")}
                </CardTitle>
                <CardDescription>
                    {t("Gruppi e componenti che fanno parte di questo asset. Gli indicatori comprendono l'asset e tutti i suoi componenti, a qualunque livello.")}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard
                        label={t("Asset nel gruppo")}
                        value={ok ? fmt.number(data!.assetCount) : t("n.d.")}
                        hint={ok ? (data!.descendantCount === 1 ? t("Questo asset e 1 componente") : t("Questo asset e {count} componenti", { count: fmt.number(data!.descendantCount) })) : undefined}
                        tone="neutral"
                        loading={rollupLoading}
                    />
                    <StatCard
                        label={t("Guasti ultimi 12 mesi")}
                        value={ok ? fmt.number(data!.faultsLast12Months) : t("n.d.")}
                        hint={ok && data!.restricted ? t("Solo gli ordini che ti riguardano") : t("Guasti chiusi")}
                        tone={ok && data!.faultsLast12Months > 0 ? "warning" : "neutral"}
                        loading={rollupLoading}
                    />
                    <StatCard
                        label={t("Ordini aperti")}
                        value={ok ? fmt.number(data!.openOrders) : t("n.d.")}
                        hint={ok ? (data!.openFaults === 1 ? t("Di cui 1 guasto") : t("Di cui {count} guasti", { count: fmt.number(data!.openFaults) })) : undefined}
                        tone={ok && data!.openOrders > 0 ? "info" : "neutral"}
                        loading={rollupLoading}
                    />
                    <StatCard
                        label={t("Costo dei guasti")}
                        value={ok ? fmt.currency(data!.totalCost) : t("n.d.")}
                        hint={t("Ricambi e manodopera, storico completo")}
                        tone="neutral"
                        loading={rollupLoading}
                    />
                </div>
                {data && !data.success && <p className="text-sm text-critical-strong">{data.message ? t(data.message) : t("Indicatori del gruppo non disponibili.")}</p>}

                {ok && data!.contributors.length > 0 && (
                    <div>
                        <h3 className="mb-2 text-sm font-medium">{t("Dove si concentrano guasti e ordini")}</h3>
                        <ul className="divide-y rounded-lg border text-sm">
                            {data!.contributors.slice(0, 5).map((c) => (
                                <li key={c.assetId} className="flex items-center justify-between gap-3 px-3 py-2">
                                    <Link href={`/assets/${c.assetId}`} className="min-w-0 truncate font-medium hover:underline">
                                        {c.name}
                                    </Link>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        {c.faultsLast12Months === 1 ? t("1 guasto") : t("{count} guasti", { count: fmt.number(c.faultsLast12Months) })} ·{" "}
                                        {c.openOrders === 1 ? t("1 ordine aperto") : t("{count} ordini aperti", { count: fmt.number(c.openOrders) })}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <ul className="space-y-2">
                    {items.map((item) => {
                        const h = healthById?.[item.id];
                        const score = h?.score ?? null;
                        const tone = score === null ? null : healthTone(score);
                        return (
                            <li key={item.id}>
                                <Link href={`/assets/${item.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium">{item.name}</div>
                                        <div className="truncate text-xs text-muted-foreground">
                                            {[item.model, item.serialNumber].filter(Boolean).join(" · ")}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-3">
                                        <AssetStatusBadge status={item.status} />
                                        <div
                                            className="hidden items-center gap-2 sm:flex"
                                            title={healthById === null ? t("Salute in calcolo") : score === null ? (h?.reason ? t("Salute non valutabile: {reason}", { reason: t(h.reason) }) : t("Salute non valutabile")) : t("Salute {score}%", { score })}
                                        >
                                            <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                                                {tone && score !== null && <div className={cn("h-full rounded-full", toneBarClass[tone])} style={{ width: `${score}%` }} />}
                                            </div>
                                            <span className={cn("w-9 text-xs font-medium tabular-nums", score === null && "text-muted-foreground")}>{score === null ? t("n.d.") : `${score}%`}</span>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </CardContent>
        </Card>
    );
}
