"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "@/lib/i18n/toast";
import { Calendar, Wand2, Plus, Trash2, Scale } from "lucide-react";

import { createPreventiveSchedule, deletePreventiveSchedule, getMetersForSchedule } from "@/modules/maintenance/adapters/actions/schedule-actions";
import { generatePreventiveSuggestions } from "@/lib/ai-service";
import { RECURRENCE_OPTIONS } from "@/lib/types";
import { useT, useFormat } from "@/lib/i18n/client";
import { tk } from "@/lib/i18n/translate";
import { useAuth } from "@/lib/auth-context";
import { frequencyLabel } from "@/modules/maintenance/domain/asset-reliability";
import type { AssetPlanInfo } from "@/modules/maintenance/adapters/actions/asset-reliability-actions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { WOStatusBadge } from "@/components/work-orders/wo-status-badge";

interface Suggestion {
    title: string;
    description: string;
    frequency: string;
    frequencyDays: number;
    confidence: string;
}

interface Props {
    assetId: string;
    /** Piani dell'asset con ultima esecuzione e ordini generati (da getAssetReliability). */
    plans: AssetPlanInfo[];
    loading: boolean;
    /** Da chiamare dopo aver creato o eliminato un piano, per ricaricare i dati della scheda. */
    onChanged: () => void;
    /** Ogni incremento apre il modulo di creazione (usato dall'avviso "Nessun piano di manutenzione"). */
    openCreateSignal?: number;
}

const todayInput = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Data e numero (max 2 decimali) nella lingua dell'utente. */
function useFormatters() {
    const f = useFormat();
    return {
        fmt: (iso: string) => f.date(iso),
        nf: { format: (n: number) => f.number(n, { maximumFractionDigits: 2 }) },
    };
}

// Livelli di confidenza dei suggerimenti: servono solo a farli raccogliere per la traduzione
const CONFIDENCE_LABELS = [tk("Alta"), tk("Media"), tk("Bassa")];

interface MeterOption {
    id: string;
    name: string;
    typeLabel: string;
    unit: string;
    ofAsset: boolean;
    lastValue: number | null;
    lastDate: string | null;
}

/** Numero scritto all'italiana ("1.250,5" o "1250,5") o all'inglese; NaN se non valido. */
function parseNumber(text: string): number {
    const t = text.trim().replace(/\s/g, "");
    if (!t) return NaN;
    const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
    return Number(normalized);
}

/** Avanzamento di un piano a consumo: barra, "320 / 500 h", residuo e data stimata (solo se calcolabile). */
function UsageProgress({ meter }: { meter: NonNullable<AssetPlanInfo["meter"]> }) {
    const t = useT();
    const { fmt, nf } = useFormatters();
    const unit = meter.unit ? ` ${meter.unit}` : "";
    if (meter.currentValue === null || meter.consumed === null || meter.interval === null || meter.usedPct === null) {
        return (
            <p className="mt-3 text-xs text-muted-foreground">
                {meter.interval === null
                    ? t("Intervallo non valido: correggi il piano.")
                    : t("Nessuna lettura del contatore: l'avanzamento si calcola dalla prima lettura registrata.")}
            </p>
        );
    }
    const pct = Math.max(0, Math.min(100, meter.usedPct));
    const tone = meter.overdue ? "bg-critical-strong" : meter.usedPct >= 90 ? "bg-warning-strong" : "bg-primary";
    return (
        <div className="mt-3 space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
                <span className="text-sm font-medium tabular-nums">
                    {nf.format(meter.consumed)} / {nf.format(meter.interval)}{unit}
                </span>
                <span className="text-muted-foreground">
                    {t("{pct}% usato", { pct: nf.format(Math.round(meter.usedPct)) })}
                    {meter.remaining !== null && (meter.remaining > 0 ? ` · ${t("residuo {value}", { value: `${nf.format(meter.remaining)}${unit}` })}` : ` · ${t("intervallo raggiunto")}`)}
                </span>
            </div>
            <div
                role="progressbar"
                aria-label={t("Consumo dall'ultima esecuzione")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pct)}
                aria-valuetext={t("{value} su {total}", { value: nf.format(meter.consumed), total: `${nf.format(meter.interval)}${unit}` })}
                className="h-2 w-full overflow-hidden rounded-full bg-secondary"
            >
                <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
                {t("Ultima lettura: {value}", { value: `${nf.format(meter.currentValue)}${unit}` })}
                {meter.lastReadingDate ? ` ${t("del {date}", { date: fmt(meter.lastReadingDate) })}` : ""}
                {!meter.overdue && !meter.estimatedDueDate && ` · ${t("stima della scadenza non disponibile (servono almeno due letture con consumo)")}`}
            </p>
        </div>
    );
}

export function AssetMaintenancePlan({ assetId, plans, loading, onChanged, openCreateSignal = 0 }: Props) {
    const t = useT();
    const { fmt, nf } = useFormatters();
    const { user } = useAuth();
    // Come lato server (createPreventiveSchedule e deletePreventiveSchedule): solo amministratori e responsabili di plant
    const canManage = user?.role === "ADMIN" || user?.role === "PLANT_MANAGER";
    const { confirm, dialog } = useConfirm();
    const rootRef = useRef<HTMLDivElement>(null);

    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [aiLoading, setAiLoading] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [frequency, setFrequency] = useState("MONTHLY");
    const [firstDate, setFirstDate] = useState(todayInput());
    const [triggerType, setTriggerType] = useState<"TIME" | "METER">("TIME");
    const [meterId, setMeterId] = useState("");
    const [meterInterval, setMeterInterval] = useState("");
    const [isRegulatory, setIsRegulatory] = useState(false);
    const [legalReference, setLegalReference] = useState("");
    const [authority, setAuthority] = useState("");

    // Contatori dello stabilimento dell'asset: si caricano solo quando servono (modulo aperto e piano a consumo)
    const [metersState, setMetersState] = useState<{ assetId: string; list: MeterOption[] } | null>(null);
    const needMeters = formOpen && triggerType === "METER";
    useEffect(() => {
        if (!needMeters || metersState?.assetId === assetId) return;
        let cancelled = false;
        getMetersForSchedule(assetId)
            .then((list) => {
                if (!cancelled) setMetersState({ assetId, list });
            })
            .catch(() => {
                if (!cancelled) setMetersState({ assetId, list: [] });
            });
        return () => {
            cancelled = true;
        };
    }, [needMeters, assetId, metersState?.assetId]);
    const metersLoading = needMeters && metersState?.assetId !== assetId;
    const meters = metersState?.assetId === assetId ? metersState.list : [];
    const selectedMeter = meters.find((m) => m.id === meterId) ?? null;

    useEffect(() => {
        if (openCreateSignal > 0) {
            setFormOpen(true);
            rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [openCreateSignal]);

    const handleGenerateSuggestions = async () => {
        setAiLoading(true);
        setSuggestions([]);
        try {
            const data = await generatePreventiveSuggestions(assetId);
            setSuggestions(data);
            if (!data || data.length === 0) {
                toast.warning("Nessun suggerimento disponibile. Lo storico interventi potrebbe essere insufficiente.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Errore nella generazione dei suggerimenti");
        } finally {
            setAiLoading(false);
        }
    };

    const handleApplySuggestion = async (s: Suggestion) => {
        if (!(await confirm({ title: t("Creare il piano di manutenzione?"), description: t("Piano \"{title}\" con frequenza {frequency}.", { title: s.title, frequency: t(frequencyLabel(s.frequency)).toLowerCase() }), confirmLabel: t("Crea piano") }))) return;
        try {
            const res = await createPreventiveSchedule({
                title: s.title,
                description: s.description,
                assetId,
                frequency: s.frequency,
                frequencyDays: s.frequencyDays,
                activities: [],
                firstDate: new Date(),
            });
            if (!res?.success) {
                toast.error(res?.message ?? "Errore nella creazione del piano");
                return;
            }
            toast.success("Piano creato");
            setSuggestions((prev) => prev.filter((x) => x.title !== s.title));
            onChanged();
        } catch {
            toast.error("Errore nella creazione del piano");
        }
    };

    const handleCreate = async () => {
        if (!title.trim()) {
            toast.error("Indica il nome del piano");
            return;
        }
        const first = new Date(`${firstDate}T08:00:00`);
        const isMeterPlan = triggerType === "METER";
        const interval = parseNumber(meterInterval);
        if (isMeterPlan) {
            if (!meterId) {
                toast.error("Scegli il contatore");
                return;
            }
            if (!Number.isFinite(interval) || interval <= 0) {
                toast.error("L'intervallo deve essere un numero maggiore di zero");
                return;
            }
        } else if (!firstDate || Number.isNaN(first.getTime())) {
            toast.error("Indica la data della prima esecuzione");
            return;
        }
        const option = RECURRENCE_OPTIONS.find((o) => o.value === frequency) ?? RECURRENCE_OPTIONS[1];
        setSaving(true);
        try {
            const res = await createPreventiveSchedule({
                title: title.trim(),
                description: description.trim(),
                assetId,
                frequency: option.value,
                frequencyDays: option.days,
                activities: [],
                firstDate: Number.isNaN(first.getTime()) ? new Date() : first,
                triggerType,
                meterId: isMeterPlan ? meterId : null,
                meterInterval: isMeterPlan ? interval : null,
                isRegulatory,
                legalReference: isRegulatory ? legalReference : null,
                authority: isRegulatory ? authority : null,
            });
            if (!res?.success) {
                toast.error(res?.message ?? "Errore nella creazione del piano");
                return;
            }
            toast.success("Piano creato");
            setTitle("");
            setDescription("");
            setFrequency("MONTHLY");
            setFirstDate(todayInput());
            setTriggerType("TIME");
            setMeterId("");
            setMeterInterval("");
            setIsRegulatory(false);
            setLegalReference("");
            setAuthority("");
            setFormOpen(false);
            onChanged();
        } catch {
            toast.error("Errore nella creazione del piano");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!(await confirm({ title: t("Eliminare questo piano?"), description: t("Gli ordini già generati restano nello storico."), confirmLabel: t("Elimina"), variant: "destructive" }))) return;
        const res = await deletePreventiveSchedule(id);
        if (!res?.success) {
            toast.error(res?.message ?? "Errore nell'eliminazione");
            return;
        }
        toast.success("Piano eliminato");
        onChanged();
    };

    return (
        <div ref={rootRef} id="piano-manutenzione" className="scroll-mt-24 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Calendar className="h-5 w-5 text-primary" aria-hidden />
                    {t("Piano di manutenzione")}
                </h3>
                {canManage && (
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setFormOpen((v) => !v)}>
                            <Plus className="mr-1.5 h-4 w-4" /> {t("Nuovo piano")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleGenerateSuggestions} disabled={aiLoading}>
                            <Wand2 className="mr-1.5 h-4 w-4" /> {aiLoading ? t("Analisi in corso...") : t("Suggerimenti AI")}
                        </Button>
                    </div>
                )}
            </div>

            {canManage && formOpen && (
                <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
                    <h4 className="text-sm font-semibold">{t("Nuovo piano di manutenzione")}</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="plan-title">{t("Nome del piano")}</Label>
                            <Input id="plan-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("Es. Controllo cinghie e lubrificazione")} />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="plan-desc">{t("Descrizione (facoltativa)")}</Label>
                            <Input id="plan-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="plan-trigger">{t("Quando scatta")}</Label>
                            <Select value={triggerType} onValueChange={(v) => setTriggerType(v === "METER" ? "METER" : "TIME")}>
                                <SelectTrigger id="plan-trigger">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TIME">{t("A scadenza di tempo")}</SelectItem>
                                    <SelectItem value="METER">{t("A consumo di un contatore")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {triggerType === "TIME" ? (
                            <>
                                <div className="space-y-1.5">
                                    <Label htmlFor="plan-freq">{t("Frequenza")}</Label>
                                    <Select value={frequency} onValueChange={setFrequency}>
                                        <SelectTrigger id="plan-freq">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {RECURRENCE_OPTIONS.map((o) => (
                                                <SelectItem key={o.value} value={o.value}>
                                                    {t(o.label)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="plan-first">{t("Prima esecuzione")}</Label>
                                    <Input id="plan-first" type="date" value={firstDate} onChange={(e) => setFirstDate(e.target.value)} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-1.5">
                                    <Label htmlFor="plan-meter">{t("Contatore")}</Label>
                                    <Select value={meterId || undefined} onValueChange={setMeterId} disabled={metersLoading}>
                                        <SelectTrigger id="plan-meter">
                                            <SelectValue placeholder={metersLoading ? t("Caricamento...") : t("Scegli il contatore")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {meters.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>
                                                    {m.lastValue === null
                                                        ? t("{name} ({type}, nessuna lettura)", { name: m.name, type: t(m.typeLabel) })
                                                        : m.lastDate
                                                          ? t("{name} ({type}, ultima lettura {value} del {date})", { name: m.name, type: t(m.typeLabel), value: `${nf.format(m.lastValue)}${m.unit ? ` ${m.unit}` : ""}`, date: fmt(m.lastDate) })
                                                          : t("{name} ({type}, ultima lettura {value})", { name: m.name, type: t(m.typeLabel), value: `${nf.format(m.lastValue)}${m.unit ? ` ${m.unit}` : ""}` })}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {!metersLoading && meters.length === 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {t("Nessun contatore in questo stabilimento. Crea prima un contatore (ad esempio di tipo Ore di funzionamento) dalla sezione Energia.")}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="plan-interval">{selectedMeter?.unit ? t("Ogni quanto (in {unit})", { unit: selectedMeter.unit }) : t("Ogni quanto")}</Label>
                                    <div className="flex items-center gap-2">
                                        <Input id="plan-interval" inputMode="decimal" value={meterInterval} onChange={(e) => setMeterInterval(e.target.value)} placeholder={t("Es. 500")} />
                                        {selectedMeter?.unit && <span className="shrink-0 text-sm text-muted-foreground">{selectedMeter.unit}</span>}
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground sm:col-span-2">
                                    {t("L'ordine di lavoro viene generato quando il consumo dall'ultima esecuzione raggiunge l'intervallo, alla registrazione di una nuova lettura del contatore.")}
                                </p>
                            </>
                        )}
                        <div className="space-y-2 rounded-lg border bg-card p-3 sm:col-span-2">
                            <div className="flex items-center gap-2">
                                <Checkbox id="plan-regulatory" checked={isRegulatory} onCheckedChange={setIsRegulatory} />
                                <Label htmlFor="plan-regulatory" className="cursor-pointer">{t("Manutenzione o verifica di legge")}</Label>
                            </div>
                            {isRegulatory && (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="plan-legal">{t("Riferimento normativo")}</Label>
                                        <Input id="plan-legal" maxLength={200} value={legalReference} onChange={(e) => setLegalReference(e.target.value)} placeholder={t("Norma, decreto o articolo")} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="plan-authority">{t("Ente")}</Label>
                                        <Input id="plan-authority" maxLength={200} value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder={t("Ente che verifica o riceve la verifica")} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)} disabled={saving}>
                            {t("Annulla")}
                        </Button>
                        <Button size="sm" onClick={handleCreate} disabled={saving}>
                            {saving ? t("Creazione...") : t("Crea piano")}
                        </Button>
                    </div>
                </div>
            )}

            {canManage && suggestions.length > 0 && (
                <div className="rounded-xl border bg-info-soft/40 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <Wand2 className="h-4 w-4 text-info-strong" aria-hidden /> {t("Suggerimenti basati sullo storico")}
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                        {suggestions.map((s) => (
                            <div key={s.title} className="flex items-start justify-between gap-4 rounded-lg border bg-card p-3">
                                <div className="min-w-0">
                                    <div className="font-medium">{s.title}</div>
                                    <div className="mb-2 mt-1 text-xs text-muted-foreground">{s.description}</div>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="info">{t(frequencyLabel(s.frequency))}</Badge>
                                        <Badge variant={s.confidence === "Alta" ? "success" : s.confidence === "Media" ? "warning" : "neutral"}>{t("Confidenza: {value}", { value: t(s.confidence) })}</Badge>
                                    </div>
                                </div>
                                <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => handleApplySuggestion(s)} aria-label={t("Applica il piano {title}", { title: s.title })}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            ) : plans.length === 0 ? (
                <EmptyState icon={<Calendar />} title={t("Nessun piano di manutenzione")} description={t("Questa macchina non ha manutenzioni programmate.")} className="py-8" />
            ) : (
                <ul className="space-y-3">
                    {plans.map((p) => (
                        <li key={p.id} className="rounded-lg border bg-card p-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium">{p.taskTitle}</span>
                                        {p.status === "OVERDUE" ? (
                                            p.meter ? (
                                                <Badge variant="critical">{t("Scaduto a consumo")}</Badge>
                                            ) : (
                                                <Badge variant="critical">{p.daysOverdue === 1 ? t("In ritardo di 1 giorno") : t("In ritardo di {count} giorni", { count: p.daysOverdue })}</Badge>
                                            )
                                        ) : p.meter && p.meter.currentValue === null ? (
                                            <Badge variant="neutral">{t("Nessuna lettura")}</Badge>
                                        ) : (
                                            <Badge variant="success">{t("In regola")}</Badge>
                                        )}
                                        {p.isRegulatory && (
                                            <Badge variant="info">
                                                <Scale className="mr-1 h-3 w-3" aria-hidden /> {t("Di legge")}
                                            </Badge>
                                        )}
                                    </div>
                                    {p.isRegulatory && (p.legalReference || p.authority) && (
                                        <div className="text-xs text-muted-foreground">
                                            {p.legalReference && <>{t("Riferimento:")} <span className="font-semibold text-foreground">{p.legalReference}</span></>}
                                            {p.legalReference && p.authority && " · "}
                                            {p.authority && <>{t("Ente:")} <span className="font-semibold text-foreground">{p.authority}</span></>}
                                        </div>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                        {p.meter ? (
                                            t("Ogni {value} del contatore {name}", { value: `${p.meter.interval !== null ? nf.format(p.meter.interval) : t("n.d.")}${p.meter.unit ? ` ${p.meter.unit}` : ""}`, name: p.meter.name })
                                        ) : (
                                            <>
                                                {t("Frequenza:")} <span className="font-semibold text-foreground">{t(frequencyLabel(p.frequency))}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {canManage && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-critical-strong" onClick={() => handleDelete(p.id)} aria-label={t("Elimina il piano {title}", { title: p.taskTitle })}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            {p.meter && <UsageProgress meter={p.meter} />}
                            <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                                <div>
                                    <dt className="text-muted-foreground">{t("Ultima esecuzione")}</dt>
                                    <dd className="text-sm font-medium">{p.lastRunDate ? fmt(p.lastRunDate) : t("Mai eseguito")}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">{p.meter ? t("Scadenza stimata") : t("Prossima scadenza")}</dt>
                                    <dd className={p.status === "OVERDUE" ? "text-sm font-medium text-critical-strong" : "text-sm font-medium"}>
                                        {p.meter ? (p.meter.overdue ? t("Scaduta") : p.meter.estimatedDueDate ? fmt(p.meter.estimatedDueDate) : t("Non calcolabile")) : fmt(p.nextDueDate)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">{t("Ordini generati")}</dt>
                                    <dd className="text-sm font-medium">
                                        {p.generatedCount === 0 ? (
                                            t("Nessuno")
                                        ) : (
                                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <span className="tabular-nums">{p.generatedCount}</span>
                                                {p.lastOrder && (
                                                    <Link href={`/work-orders/${p.lastOrder.id}`} className="text-xs font-normal text-primary underline-offset-2 hover:underline">
                                                        {t("ultimo del {date}", { date: fmt(p.lastOrder.createdAt) })}
                                                    </Link>
                                                )}
                                                {p.lastOrder && <WOStatusBadge status={p.lastOrder.status} />}
                                            </span>
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        </li>
                    ))}
                </ul>
            )}
            {dialog}
        </div>
    );
}
