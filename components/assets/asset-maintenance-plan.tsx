"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Calendar, Wand2, Plus, Trash2 } from "lucide-react";

import { createPreventiveSchedule, deletePreventiveSchedule } from "@/lib/actions";
import { generatePreventiveSuggestions } from "@/lib/ai-service";
import { RECURRENCE_OPTIONS } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { frequencyLabel } from "@/modules/maintenance/domain/asset-reliability";
import type { AssetPlanInfo } from "@/modules/maintenance/adapters/actions/asset-reliability-actions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const fmt = (iso: string) => new Date(iso).toLocaleDateString("it-IT");

export function AssetMaintenancePlan({ assetId, plans, loading, onChanged, openCreateSignal = 0 }: Props) {
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
        if (!(await confirm({ title: "Creare il piano di manutenzione?", description: `Piano "${s.title}" con frequenza ${frequencyLabel(s.frequency).toLowerCase()}.`, confirmLabel: "Crea piano" }))) return;
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
        if (!firstDate || Number.isNaN(first.getTime())) {
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
                firstDate: first,
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
            setFormOpen(false);
            onChanged();
        } catch {
            toast.error("Errore nella creazione del piano");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!(await confirm({ title: "Eliminare questo piano?", description: "Gli ordini già generati restano nello storico.", confirmLabel: "Elimina", variant: "destructive" }))) return;
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
                    Piano di manutenzione
                </h3>
                {canManage && (
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setFormOpen((v) => !v)}>
                            <Plus className="mr-1.5 h-4 w-4" /> Nuovo piano
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleGenerateSuggestions} disabled={aiLoading}>
                            <Wand2 className="mr-1.5 h-4 w-4" /> {aiLoading ? "Analisi in corso..." : "Suggerimenti AI"}
                        </Button>
                    </div>
                )}
            </div>

            {canManage && formOpen && (
                <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
                    <h4 className="text-sm font-semibold">Nuovo piano di manutenzione</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="plan-title">Nome del piano</Label>
                            <Input id="plan-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Controllo cinghie e lubrificazione" />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="plan-desc">Descrizione (facoltativa)</Label>
                            <Input id="plan-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="plan-freq">Frequenza</Label>
                            <Select value={frequency} onValueChange={setFrequency}>
                                <SelectTrigger id="plan-freq">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {RECURRENCE_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="plan-first">Prima esecuzione</Label>
                            <Input id="plan-first" type="date" value={firstDate} onChange={(e) => setFirstDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)} disabled={saving}>
                            Annulla
                        </Button>
                        <Button size="sm" onClick={handleCreate} disabled={saving}>
                            {saving ? "Creazione..." : "Crea piano"}
                        </Button>
                    </div>
                </div>
            )}

            {canManage && suggestions.length > 0 && (
                <div className="rounded-xl border bg-info-soft/40 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <Wand2 className="h-4 w-4 text-info-strong" aria-hidden /> Suggerimenti basati sullo storico
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                        {suggestions.map((s) => (
                            <div key={s.title} className="flex items-start justify-between gap-4 rounded-lg border bg-card p-3">
                                <div className="min-w-0">
                                    <div className="font-medium">{s.title}</div>
                                    <div className="mb-2 mt-1 text-xs text-muted-foreground">{s.description}</div>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="info">{frequencyLabel(s.frequency)}</Badge>
                                        <Badge variant={s.confidence === "Alta" ? "success" : s.confidence === "Media" ? "warning" : "neutral"}>Confidenza: {s.confidence}</Badge>
                                    </div>
                                </div>
                                <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => handleApplySuggestion(s)} aria-label={`Applica il piano ${s.title}`}>
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
                <EmptyState icon={<Calendar />} title="Nessun piano di manutenzione" description="Questa macchina non ha manutenzioni programmate." className="py-8" />
            ) : (
                <ul className="space-y-3">
                    {plans.map((p) => (
                        <li key={p.id} className="rounded-lg border bg-card p-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium">{p.taskTitle}</span>
                                        {p.status === "OVERDUE" ? (
                                            <Badge variant="critical">In ritardo di {p.daysOverdue} {p.daysOverdue === 1 ? "giorno" : "giorni"}</Badge>
                                        ) : (
                                            <Badge variant="success">In regola</Badge>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Frequenza: <span className="font-semibold text-foreground">{frequencyLabel(p.frequency)}</span>
                                    </div>
                                </div>
                                {canManage && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-critical-strong" onClick={() => handleDelete(p.id)} aria-label={`Elimina il piano ${p.taskTitle}`}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                                <div>
                                    <dt className="text-muted-foreground">Ultima esecuzione</dt>
                                    <dd className="text-sm font-medium">{p.lastRunDate ? fmt(p.lastRunDate) : "Mai eseguito"}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Prossima scadenza</dt>
                                    <dd className={p.status === "OVERDUE" ? "text-sm font-medium text-critical-strong" : "text-sm font-medium"}>{fmt(p.nextDueDate)}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Ordini generati</dt>
                                    <dd className="text-sm font-medium">
                                        {p.generatedCount === 0 ? (
                                            "Nessuno"
                                        ) : (
                                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <span className="tabular-nums">{p.generatedCount}</span>
                                                {p.lastOrder && (
                                                    <Link href={`/work-orders/${p.lastOrder.id}`} className="text-xs font-normal text-primary underline-offset-2 hover:underline">
                                                        ultimo del {fmt(p.lastOrder.createdAt)}
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
