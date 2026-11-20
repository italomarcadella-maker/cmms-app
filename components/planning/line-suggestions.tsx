"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, Lightbulb, ShieldAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlant } from "@/lib/plant-context";
import { tk } from "@/lib/i18n/translate";
import { useT } from "@/lib/i18n/client";
import { DEFAULT_HORIZON_DAYS, HORIZON_CHOICES, summarizeTotals } from "@/modules/maintenance/domain/line-opportunities";
import { getLineOpportunities, type LineOpportunitiesResult } from "@/modules/maintenance/adapters/actions/line-opportunity-actions";
import { LineSuggestionsCard } from "./line-suggestions-card";

type Horizon = (typeof HORIZON_CHOICES)[number];

/** Contenuto della pagina "Linee senza calendario di produzione": scelta dell'orizzonte e una scheda per linea. */
export function LineSuggestions() {
    const t = useT();
    const { selected: plant } = usePlant();
    const [horizon, setHorizon] = useState<Horizon>(DEFAULT_HORIZON_DAYS);
    const [reloadKey, setReloadKey] = useState(0);

    // Il caricamento si ricava confrontando la richiesta in corso con l'ultima risposta: nessun setState sincrono nell'effetto
    const requestKey = `${horizon}:${plant}:${reloadKey}`;
    const [state, setState] = useState<{ key: string; data: LineOpportunitiesResult } | null>(null);
    const data = state?.data ?? null;
    const loading = state?.key !== requestKey;

    useEffect(() => {
        let alive = true;
        getLineOpportunities({ horizonDays: horizon })
            .then(d => { if (alive) setState({ key: requestKey, data: d }); })
            .catch(() => {
                if (alive) setState({ key: requestKey, data: { allowed: true, horizonDays: horizon, canGenerate: false, lines: [], totals: { lines: 0, pending: 0, executable: 0, overdue: 0 }, message: tk("Impossibile caricare i suggerimenti. Riprova.") } });
            });
        return () => { alive = false; };
    }, [horizon, requestKey]);

    if (!data) {
        return (
            <div className="space-y-4" aria-busy="true" aria-label={t("Caricamento dei suggerimenti")}>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (!data.allowed) {
        return (
            <Card>
                <EmptyState icon={<ShieldAlert />} title={t("Accesso non consentito")} description={t("I suggerimenti per le linee senza calendario sono riservati a supervisor, responsabili di plant, ingegneri di processo e amministratori.")} />
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                    {loading ? t("Aggiornamento...") : data.lines.length > 0 ? summarizeTotals(data.totals) : t("Nessun suggerimento")}
                </p>
                <div className="flex items-center gap-2">
                    <label htmlFor="line-suggestions-horizon" className="text-sm font-medium">{t("Scadenze entro")}</label>
                    <Select value={String(horizon)} onValueChange={v => setHorizon(Number(v) as Horizon)}>
                        <SelectTrigger id="line-suggestions-horizon" className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {HORIZON_CHOICES.map(h => <SelectItem key={h} value={String(h)}>{t("{n} giorni", { n: h })}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card>
                <CardContent className="flex flex-wrap items-start gap-3 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info-strong"><CalendarDays className="h-4 w-4" aria-hidden /></span>
                    <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-semibold">{t("Definire il calendario di produzione della linea")}</p>
                        <p className="text-sm text-muted-foreground">
                            {t("Una linea compare qui finché non ha un calendario di produzione. Se la linea ha invece orari di produzione, definiscili dalle impostazioni della linea nella pagina")}{" "}
                            <Link href="/planning/calendar" className="font-medium text-primary hover:underline">{t("Planning e calendario")}</Link>{t(": da quel momento la linea esce da questo elenco.")}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {data.message && <p role="alert" className="rounded-lg border border-critical/40 bg-critical-soft p-3 text-sm text-critical-strong">{t(data.message)}</p>}

            {data.lines.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={<Lightbulb />}
                        title={t("Nessun suggerimento al momento")}
                        description={t("Non ci sono linee senza calendario di produzione con attività pendenti o manutenzioni programmate in scadenza entro {days} giorni. Prova ad ampliare l'orizzonte.", { days: data.horizonDays })}
                    />
                </Card>
            ) : (
                <div className={loading ? "space-y-4 opacity-60 transition-opacity" : "space-y-4 transition-opacity"}>
                    {data.lines.map(line => (
                        <LineSuggestionsCard key={line.key} line={line} canGenerate={data.canGenerate} onChanged={() => setReloadKey(k => k + 1)} />
                    ))}
                </div>
            )}
        </div>
    );
}
