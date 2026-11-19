"use client";

import Link from "next/link";
import { AlertOctagon, CalendarClock, ClipboardCheck, Clock, Coins, Repeat, Wrench, type LucideIcon } from "lucide-react";

import type { AssetReliability } from "@/modules/maintenance/adapters/actions/asset-reliability-actions";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const NF1 = { maximumFractionDigits: 1 } as const;

function Banner({ tone, icon: Icon, title, children, action }: { tone: "critical" | "warning"; icon: LucideIcon; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div
            role="alert"
            className={cn(
                "flex flex-wrap items-start gap-3 rounded-xl border p-4 text-sm",
                tone === "critical" ? "border-critical/40 bg-critical-soft text-critical-strong" : "border-warning/40 bg-warning-soft text-warning-strong"
            )}
        >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
                <p className="font-semibold">{title}</p>
                {children && <div className="mt-0.5">{children}</div>}
            </div>
            {action}
        </div>
    );
}

/** Avviso "Fermo per guasto aperto": da mostrare sempre in vista, sopra le schede. */
export function AssetStoppedBanner({ data }: { data: AssetReliability | null }) {
    const f = data?.stoppingFault;
    if (!f) return null;
    return (
        <Banner
            tone="critical"
            icon={AlertOctagon}
            title="Fermo per guasto aperto"
            action={
                <Button asChild size="sm" variant="outline" className="shrink-0 border-critical/40 bg-background text-foreground">
                    <Link href={`/work-orders/${f.id}`}>Apri l&apos;ordine</Link>
                </Button>
            }
        >
            <Link href={`/work-orders/${f.id}`} className="underline-offset-2 hover:underline">
                {f.title}
            </Link>{" "}
            (aperto il {new Date(f.createdAt).toLocaleDateString("it-IT")}). La macchina è segnalata come ferma finché l&apos;ordine non viene chiuso.
        </Banner>
    );
}

interface PanelProps {
    data: AssetReliability | null;
    loading: boolean;
    canManagePlans: boolean;
    onCreatePlan: () => void;
}

/** Fascia di indicatori e avvisi della Panoramica. Dove non calcolabile: "n.d." con la spiegazione. */
export function AssetReliabilityPanel({ data, loading, canManagePlans, onCreatePlan }: PanelProps) {
    if (loading || !data) {
        return (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-xl" />
                ))}
            </div>
        );
    }
    if (!data.success) {
        return <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">Indicatori non disponibili: {data.message ?? "errore di caricamento"}.</p>;
    }

    const ind = data.indicators;
    const nd = "n.d.";
    const openCount = data.openFaults.length;

    return (
        <div className="space-y-4">
            {!data.hasPlan && (
                <Banner
                    tone="warning"
                    icon={CalendarClock}
                    title="Nessun piano di manutenzione"
                    action={
                        canManagePlans ? (
                            <Button size="sm" variant="outline" className="shrink-0 border-warning/40 bg-background text-foreground" onClick={onCreatePlan}>
                                Crea il piano
                            </Button>
                        ) : undefined
                    }
                >
                    Questa macchina non ha manutenzioni programmate: nessun intervento preventivo viene generato.
                    {!canManagePlans && " Chiedi a un responsabile di crearne uno."}
                </Banner>
            )}

            {data.closedFaultsWithoutAnalysis > 0 && (
                <Banner tone="warning" icon={ClipboardCheck} title={`${data.closedFaultsWithoutAnalysis} ${data.closedFaultsWithoutAnalysis === 1 ? "guasto chiuso senza analisi" : "guasti chiusi senza analisi"}`}>
                    L&apos;analisi serve a generare i piani preventivi: aprila dall&apos;ordine nello storico interventi.
                </Banner>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatCard
                    label="Guasti ultimi 12 mesi"
                    value={ind.faultsLast12Months}
                    tone={ind.faultsLast12Months > 0 ? "warning" : "success"}
                    icon={<Wrench />}
                    hint={`${ind.faultsTotal} in totale`}
                />
                <StatCard
                    label="MTBF"
                    value={ind.mtbfDays === null ? nd : `${ind.mtbfDays.toLocaleString("it-IT", NF1)} gg`}
                    tone="info"
                    icon={<Repeat />}
                    hint={ind.mtbfDays === null ? "Servono almeno due guasti chiusi" : "Giorni medi tra un guasto e il successivo"}
                />
                <StatCard
                    label="MTTR"
                    value={ind.mttrHours === null ? nd : `${ind.mttrHours.toLocaleString("it-IT", NF1)} h`}
                    tone="info"
                    icon={<Clock />}
                    hint={ind.mttrHours === null ? "Nessun intervento con ore registrate" : `Ore medie di lavoro su ${ind.faultsWithHours} ${ind.faultsWithHours === 1 ? "intervento" : "interventi"} con ore`}
                />
                <StatCard
                    label="Costo totale guasti"
                    value={ind.faultsTotal === 0 ? nd : ind.totalCost.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                    tone="neutral"
                    icon={<Coins />}
                    hint={ind.faultsTotal === 0 ? "Nessun guasto chiuso" : "Ricambi e manodopera dei guasti chiusi"}
                />
                <StatCard
                    label="Ultimo guasto"
                    value={ind.daysSinceLastFault === null ? nd : ind.daysSinceLastFault === 0 ? "Oggi" : `${ind.daysSinceLastFault.toLocaleString("it-IT")} gg fa`}
                    tone="neutral"
                    icon={<CalendarClock />}
                    hint={ind.lastFaultAt ? new Date(ind.lastFaultAt).toLocaleDateString("it-IT") : "Nessun guasto chiuso"}
                />
                <StatCard
                    label="Guasti aperti"
                    value={openCount}
                    tone={openCount > 0 ? "critical" : "success"}
                    icon={<AlertOctagon />}
                    hint={openCount === 0 ? "Nessun guasto in corso" : data.stoppedByFault ? "Compreso un fermo macchina" : "In lavorazione"}
                />
            </div>

            <p className="text-xs text-muted-foreground">
                Gli indicatori contano i guasti chiusi di tutto lo storico.
                {data.restricted && " Come manutentore vedi solo gli ordini che ti riguardano: i valori sono calcolati su quelli."}
            </p>
        </div>
    );
}
