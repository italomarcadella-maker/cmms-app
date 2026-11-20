"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, CheckSquare, ExternalLink, Loader2, MapPin, Pause, Play, Square, Timer, User } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePrompt } from "@/components/ui/prompt-dialog";
import { PriorityPill, WorkOrderStatusPill } from "@/components/ui/status-badge";
import { ClaimButton } from "@/components/mobile/claim-button";
import { MobileOrderPermits } from "@/components/work-permits/mobile-permits";
import { useFormat, useT, type TFunction } from "@/lib/i18n/client";
import { useNotifications } from "@/lib/notifications-context";
import { cn } from "@/lib/utils";
import { completeWorkOrder, pauseWorkSession, startWorkSession, toggleChecklistItem } from "@/lib/actions";
import { markWorkOrderNotificationsRead } from "@/modules/maintenance/adapters/actions/mobile-actions";
import type { MobileOrderDetail } from "@/lib/mobile-data";

function formatElapsed(seconds: number): string {
    const s = Math.max(0, seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return [h, m, r].map(n => String(n).padStart(2, "0")).join(":");
}

const formatMinutes = (min: number, t: TFunction) =>
    min >= 60 ? t("{hours} h {minutes} min", { hours: Math.floor(min / 60), minutes: String(min % 60).padStart(2, "0") }) : t("{minutes} min", { minutes: min });

/** Scheda di un ordine per lo smartphone: tutto in una colonna, pulsanti grandi, nessuna tabella. */
export function MobileOrderView({ order }: { order: MobileOrderDetail }) {
    const router = useRouter();
    const t = useT();
    const fmt = useFormat();
    const { refreshNotifications } = useNotifications();
    const { confirm, dialog: confirmDialog } = useConfirm();
    const { ask, dialog: promptDialog } = usePrompt();

    const [items, setItems] = useState(order.checklist);
    const [busy, setBusy] = useState<null | "start" | "pause" | "complete">(null);
    const [elapsed, setElapsed] = useState(0);

    // Dopo ogni azione la pagina del server viene ricaricata: si riparte dai dati nuovi
    useEffect(() => { setItems(order.checklist); }, [order.checklist]);

    // All'apertura le notifiche di questo ordine risultano lette (solo quelle dell'utente: lo garantisce l'azione sul server)
    const markedRef = useRef(false);
    useEffect(() => {
        if (markedRef.current) return;
        markedRef.current = true;
        markWorkOrderNotificationsRead(order.id)
            .then(res => { if (res.success && res.count > 0) refreshNotifications(); })
            .catch(() => { /* non e' grave: restera' "Nuovo" fino alla prossima apertura */ });
    }, [order.id, refreshNotifications]);

    // Timer in corso
    useEffect(() => {
        if (!order.activeSince) { setElapsed(0); return; }
        const start = new Date(order.activeSince).getTime();
        const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [order.activeSince]);

    const canWork = order.mode === "WORK";
    const running = !!order.activeSince;
    const done = items.filter(i => i.completed).length;
    const pending = items.length - done;
    const overdue = order.overdue;
    const dueDay = order.dueDate ? fmt.date(order.dueDate, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Rome" }) : "";

    const toggle = useCallback(async (id: string) => {
        if (!canWork) return;
        const current = items.find(i => i.id === id);
        if (!current) return;
        const next = !current.completed;
        setItems(prev => prev.map(i => (i.id === id ? { ...i, completed: next } : i)));
        try {
            const res = await toggleChecklistItem(id, next);
            if (!res?.success) throw new Error(res?.message);
        } catch (e) {
            setItems(prev => prev.map(i => (i.id === id ? { ...i, completed: !next } : i)));
            toast.error(e instanceof Error && e.message ? e.message : t("Voce non aggiornata. Riprova."));
        }
    }, [canWork, items, t]);

    async function run(kind: "start" | "pause" | "complete", action: () => Promise<{ success?: boolean; message?: string }>, okMessage: string) {
        setBusy(kind);
        try {
            const res = await action();
            if (res?.success) { toast.success(res.message ?? okMessage); router.refresh(); }
            else toast.error(res?.message ?? t("Operazione non riuscita"));
        } catch {
            toast.error(t("Errore di connessione. Riprova."));
        } finally {
            setBusy(null);
        }
    }

    const start = () => run("start", () => startWorkSession(order.id), order.status === "ON_HOLD" ? t("Lavoro ripreso") : t("Lavoro avviato"));

    const pause = async () => {
        const note = await ask({ title: t("Metti in pausa"), description: t("Il tempo lavorato viene registrato."), label: t("Motivo (facoltativo)"), placeholder: t("Es. attesa ricambio, fine turno"), confirmLabel: t("Metti in pausa") });
        if (note === null) return;
        await run("pause", () => pauseWorkSession(order.id, note.trim() || undefined), t("Lavoro in pausa"));
    };

    const complete = async () => {
        if (pending > 0) {
            toast.error(pending === 1 ? t("Checklist incompleta: 1 voce da spuntare.") : t("Checklist incompleta: {n} voci da spuntare.", { n: pending }));
            return;
        }
        const ok = await confirm({ title: t("Concludere il lavoro?"), description: t("L'ordine passa a completato e il timer si ferma."), confirmLabel: t("Concludi") });
        if (!ok) return;
        await run("complete", () => completeWorkOrder(order.id), t("Ordine completato"));
    };

    return (
        <div className="space-y-4">
            {/* Intestazione */}
            <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <PriorityPill priority={order.priority} />
                    <WorkOrderStatusPill status={order.status} />
                    {order.assignedToMe && <Badge variant="info">{t("Assegnato a te")}</Badge>}
                </div>
                <h1 className="text-xl font-bold leading-snug">{order.title}</h1>
                <div className="space-y-1.5 text-sm">
                    <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span>
                            <Link href={`/mobile/assets/${order.asset.id}`} className="font-medium text-primary underline-offset-2 hover:underline">{order.asset.name}</Link>
                            {order.asset.location ? <span className="text-muted-foreground"> · {order.asset.location}</span> : null}
                        </span>
                    </p>
                    <p className={cn("flex items-center gap-2", overdue ? "font-medium text-critical-strong" : "text-muted-foreground")}>
                        <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
                        {order.dueDate ? (overdue ? t("Scaduto il {date}", { date: dueDay }) : t("Scadenza {date}", { date: dueDay })) : t("Nessuna scadenza")}
                    </p>
                    {order.assignees && (
                        <p className="flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4 shrink-0" aria-hidden />{order.assignees}</p>
                    )}
                </div>
            </section>

            {/* Descrizione */}
            <Card className="p-4">
                <h2 className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("Descrizione")}</h2>
                <p className="whitespace-pre-line text-base leading-relaxed">{order.description || t("Nessuna descrizione.")}</p>
            </Card>

            {/* Timer */}
            <Card className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                    <span className={cn("flex h-11 w-11 items-center justify-center rounded-full", running ? "bg-success-soft text-success-strong" : "bg-secondary text-muted-foreground")}>
                        <Timer className="h-6 w-6" aria-hidden />
                    </span>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{running ? t("Lavoro in corso") : t("Timer fermo")}</p>
                        <p className="font-mono text-2xl font-bold tabular-nums" aria-live="off">{formatElapsed(elapsed)}</p>
                    </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                    <p>{t("Totale registrato")}</p>
                    <p className="font-mono text-sm font-semibold text-foreground">{formatMinutes(order.totalMinutes, t)}</p>
                </div>
            </Card>

            {/* Permessi di lavoro (compare solo se l'ordine ne ha) */}
            <MobileOrderPermits workOrderId={order.id} canWork={canWork} />

            {/* Checklist */}
            <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("Checklist")}</h2>
                    {items.length > 0 && <span className="text-sm text-muted-foreground">{t("{done} di {total}", { done, total: items.length })}</span>}
                </div>
                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("Nessuna voce nella checklist.")}</p>
                ) : (
                    <ul className="space-y-2">
                        {items.map(item => (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={item.completed}
                                    disabled={!canWork}
                                    onClick={() => toggle(item.id)}
                                    className={cn(
                                        "flex min-h-[48px] w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        canWork ? "active:bg-accent" : "opacity-70",
                                        item.completed && "bg-secondary/60"
                                    )}
                                >
                                    {item.completed
                                        ? <CheckSquare className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                                        : <Square className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />}
                                    <span className={cn("text-base leading-snug", item.completed && "text-muted-foreground line-through")}>{item.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            {/* Azioni */}
            <section aria-label={t("Azioni")} className="space-y-3">
                {order.mode === "CLAIM" && (
                    <>
                        <p className="text-sm text-muted-foreground">{t("Questo ordine non è ancora assegnato. Prendilo in carico per iniziare a lavorarci.")}</p>
                        <ClaimButton orderId={order.id} />
                    </>
                )}

                {canWork && (
                    <div className="space-y-3">
                        {!running ? (
                            <Button type="button" size="lg" variant="success" className="h-14 w-full text-lg" onClick={start} disabled={busy !== null}>
                                {busy === "start" ? <Loader2 className="mr-2 h-6 w-6 animate-spin" aria-hidden /> : <Play className="mr-2 h-6 w-6" aria-hidden />}
                                {order.status === "ON_HOLD" ? t("Riprendi lavoro") : t("Avvia lavoro")}
                            </Button>
                        ) : (
                            <Button type="button" size="lg" variant="secondary" className="h-14 w-full text-lg" onClick={pause} disabled={busy !== null}>
                                {busy === "pause" ? <Loader2 className="mr-2 h-6 w-6 animate-spin" aria-hidden /> : <Pause className="mr-2 h-6 w-6" aria-hidden />}
                                {t("Metti in pausa")}
                            </Button>
                        )}
                        <Button type="button" size="lg" className="h-14 w-full text-lg" onClick={complete} disabled={busy !== null || running}>
                            {busy === "complete" ? <Loader2 className="mr-2 h-6 w-6 animate-spin" aria-hidden /> : <CheckCircle2 className="mr-2 h-6 w-6" aria-hidden />}
                            {t("Concludi")}
                        </Button>
                        {running && <p className="text-center text-xs text-muted-foreground">{t("Per concludere metti prima in pausa il lavoro: il tempo viene registrato.")}</p>}
                        {!running && pending > 0 && <p className="text-center text-xs text-muted-foreground">{t("Per concludere spunta tutte le voci della checklist.")}</p>}
                    </div>
                )}

                {order.mode === "READONLY" && (
                    <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                        {["COMPLETED", "CLOSED", "CANCELED"].includes(order.status)
                            ? t("Questo ordine è concluso.")
                            : order.status === "PENDING_REVIEW" || order.status === "PENDING_APPROVAL"
                                ? t("In attesa di verifica o approvazione: al momento non ci sono azioni da fare.")
                                : t("Puoi consultare questo ordine, ma non è assegnato a te.")}
                    </p>
                )}

                <Button asChild variant="outline" size="lg" className="h-12 w-full text-base">
                    <Link href={`/work-orders/${order.id}`}><ExternalLink className="mr-2 h-5 w-5" aria-hidden />{t("Apri versione completa")}</Link>
                </Button>
            </section>

            {confirmDialog}
            {promptDialog}
        </div>
    );
}
