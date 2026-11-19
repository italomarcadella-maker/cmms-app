"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

import { getAssetHealth, type AssetHealthDetail } from "@/modules/maintenance/adapters/actions/asset-health-actions";
import type { HealthComponent, HealthLoss } from "@/modules/maintenance/domain/asset-health";
import { healthTone, toneBarClass } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const NF = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });

const toneText = {
    success: "text-success-strong",
    warning: "text-warning-strong",
    critical: "text-critical-strong",
} as const;

function ComponentBar({ c }: { c: HealthComponent }) {
    const evaluable = c.score !== null;
    const tone = healthTone(c.score ?? 0);
    return (
        <li className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">
                    {c.label} <span className="text-xs font-normal text-muted-foreground">(peso {NF.format(c.weight)})</span>
                </span>
                <span className={cn("tabular-nums font-semibold", evaluable ? toneText[tone] : "text-muted-foreground")}>
                    {evaluable ? c.score : "n.d."}
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
                {evaluable && <div className={cn("h-full rounded-full", toneBarClass[tone])} style={{ width: `${c.score}%` }} />}
            </div>
            <p className="text-xs text-muted-foreground">{c.detail}</p>
        </li>
    );
}

function lossLabel(l: HealthLoss) {
    return `-${NF.format(l.points)}`;
}

/**
 * Scheda "Salute" dell'asset: punteggio calcolato, i tre componenti con i pesi e da dove vengono i punti persi.
 * `reloadKey` cambia quando i dati dell'asset sono stati modificati (es. un piano creato): la scheda si ricalcola.
 */
export function AssetHealthCard({ assetId, reloadKey = 0 }: { assetId: string; reloadKey?: number }) {
    // Il caricamento si ricava confrontando la richiesta in corso con l'ultima risposta: nessun setState sincrono nell'effetto
    const requestKey = `${assetId}:${reloadKey}`;
    const [state, setState] = useState<{ key: string; data: AssetHealthDetail } | null>(null);
    const data = state?.data ?? null;
    const loading = state?.key !== requestKey;

    useEffect(() => {
        let alive = true;
        getAssetHealth(assetId)
            .then((d) => alive && setState({ key: requestKey, data: d }))
            .catch(() => alive && setState({ key: requestKey, data: { success: false, message: "Errore nel calcolo della salute", health: null, storedScore: null } }));
        return () => {
            alive = false;
        };
    }, [assetId, requestKey]);

    const health = data?.health ?? null;
    const score = health?.score ?? null;
    const tone = score === null ? null : healthTone(score);

    return (
        <section className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm" aria-label="Salute della macchina">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-medium text-muted-foreground">Salute</h2>
                    {loading && !data ? (
                        <Skeleton className="mt-2 h-9 w-24" />
                    ) : (
                        <div className={cn("mt-1 text-3xl font-semibold leading-none tracking-tight tabular-nums", tone ? toneText[tone] : "text-muted-foreground")}>
                            {score === null ? "n.d." : `${score}%`}
                        </div>
                    )}
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground [&>svg]:h-4 [&>svg]:w-4">
                    <Activity />
                </span>
            </div>

            {data && !data.success && <p className="mt-3 text-sm text-muted-foreground">{data.message ?? "Salute non disponibile."}</p>}

            {health && !health.evaluable && (
                <p className="mt-3 rounded-lg bg-muted p-3 text-sm">
                    Non valutabile: {health.notEvaluableReason}.
                </p>
            )}

            {health && health.evaluable && (
                <div className="mt-4 space-y-4">
                    <ul className="space-y-3">
                        {health.components.map((c) => (
                            <ComponentBar key={c.key} c={c} />
                        ))}
                    </ul>

                    {health.capped && health.capValue !== null && (
                        <p className="rounded-lg bg-warning-soft p-3 text-xs text-warning-strong">
                            Senza piano di manutenzione il punteggio non può superare {NF.format(health.capValue)}
                            {health.uncappedScore !== null && health.uncappedScore > health.capValue ? ` (senza il tetto sarebbe ${health.uncappedScore}%)` : ""}.
                        </p>
                    )}

                    <div>
                        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Punti persi</h3>
                        {health.losses.length === 0 ? (
                            <p className="mt-1 text-sm text-muted-foreground">Nessun punto perso.</p>
                        ) : (
                            <ul className="mt-1 space-y-1">
                                {health.losses.map((l, i) => (
                                    <li key={`${l.component}-${i}`} className="flex gap-2 text-sm">
                                        <span className="w-12 shrink-0 font-semibold tabular-nums text-critical-strong">{lossLabel(l)}</span>
                                        <span>{l.reason.charAt(0).toUpperCase() + l.reason.slice(1)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                Il punteggio riguarda la macchina, non chi segnala i guasti. Si ricalcola da guasti, richieste e manutenzione programmata.
            </p>
        </section>
    );
}
