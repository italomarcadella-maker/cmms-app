"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/i18n/toast";
import { tk } from "@/lib/i18n/translate";
import { useT, useFormat } from "@/lib/i18n/client";
import type { Formatter } from "@/lib/i18n/format";
import { CalendarDays, ChevronLeft, ChevronRight, Gauge, UserCheck, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PriorityPill } from "@/components/ui/status-badge";
import { PlantBadge } from "@/components/ui/plant-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlant } from "@/lib/plant-context";
import { useAuth } from "@/lib/auth-context";
import { SUPERVISION, hasRole } from "@/lib/roles";
import { assignWorkOrder, getTechnicians } from "@/lib/actions";
import { createWorkOrderFromSchedule } from "@/modules/maintenance/adapters/actions/schedule-actions";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { getTechnicianPresence } from "@/lib/dashboard-actions";
import { assignReading } from "@/modules/energy/adapters/actions/reading-plan-actions";
import { ReadingEntryForm } from "@/components/energy/reading-entry-form";
import { getWeekPlan, type WeekDay, type WeekItem, type WeekItemType, type WeekPlan } from "@/modules/maintenance/adapters/actions/dashboard-widgets-actions";

/** Colori per tipo di intervento. Usano i toni semantici del tema: critico (fucsia FITT, il nostro "rosso"), successo (verde), info (azzurro), avviso (giallo). */
const TYPE_STYLE: Record<WeekItemType, { label: string; dot: string; bar: string; badge: string }> = {
    FAULT: { label: tk("Guasto"), dot: "bg-critical", bar: "border-l-critical", badge: "bg-critical-soft text-critical-strong" },
    PROGRAMMED: { label: tk("Manutenzione programmata"), dot: "bg-success", bar: "border-l-success", badge: "bg-success-soft text-success-strong" },
    CONTRACTOR: { label: tk("Ditta esterna"), dot: "bg-info", bar: "border-l-info", badge: "bg-info-soft text-info-strong" },
    READING: { label: tk("Lettura pianificata"), dot: "bg-warning", bar: "border-l-warning", badge: "bg-warning-soft text-warning-strong" },
    REQUEST: { label: tk("Richiesta"), dot: "bg-muted-foreground", bar: "border-l-muted-foreground", badge: "bg-secondary text-secondary-foreground" },
};
const TYPE_ORDER: WeekItemType[] = ["FAULT", "PROGRAMMED", "CONTRACTOR", "READING", "REQUEST"];

const shiftKey = (key: string, days: number) => {
    const d = new Date(`${key}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};
const asDate = (key: string) => new Date(`${key}T12:00:00Z`);
const weekday = (fmt: Formatter, key: string, style: "short" | "long") => fmt.date(asDate(key), { weekday: style, timeZone: "UTC" });

interface TechOption { id: string; userId: string | null; name: string }

/** Piano della settimana: un clic su un giorno mostra gli interventi, a chi sono assegnati e quelli ancora da assegnare. */
export function WeekCalendar() {
    const t = useT();
    const fmt = useFormat();
    const { selected } = usePlant();
    const { user } = useAuth();
    // Assegnare e' un compito di chi coordina: un manutentore vede il calendario ma non ha i controlli di assegnazione
    const canAssign = hasRole(user?.role, SUPERVISION);
    const [anchor, setAnchor] = useState<string | undefined>(undefined);
    const [plan, setPlan] = useState<WeekPlan | null>(null);
    const [picked, setPicked] = useState<string | null>(null);
    const [techs, setTechs] = useState<TechOption[]>([]);
    const [hidden, setHidden] = useState<Set<WeekItemType>>(new Set());
    const [presence, setPresence] = useState<{ presentCount: number; totalCount: number; absentees: { name: string; reason: string }[] } | null>(null);

    const reload = useCallback(async (day?: string) => {
        setPlan(await getWeekPlan(day));
    }, []);

    useEffect(() => {
        let alive = true;
        getWeekPlan(anchor).then(p => {
            if (!alive) return;
            setPlan(p);
            // Giorno aperto di default: oggi se e' nella settimana, altrimenti il primo con interventi
            setPicked(prev => prev && p.days.some(d => d.date === prev)
                ? prev
                : p.days.find(d => d.date === p.today)?.date ?? p.days.find(d => d.items.length > 0)?.date ?? p.days[0].date);
        });
        return () => { alive = false; };
    }, [anchor, selected]);

    useEffect(() => {
        if (!canAssign) return;
        let alive = true;
        getTechnicians().then(list => {
            if (alive) setTechs((list as TechOption[]).map(x => ({ id: x.id, userId: x.userId ?? null, name: x.name })));
        });
        return () => { alive = false; };
    }, [selected, canAssign]);

    useEffect(() => {
        let alive = true;
        getTechnicianPresence().then(p => { if (alive) setPresence(p); });
        return () => { alive = false; };
    }, [selected]);

    const visible = useCallback((i: WeekItem) => !hidden.has(i.type), [hidden]);
    const day = useMemo(() => plan?.days.find(d => d.date === picked) ?? null, [plan, picked]);
    const loading = !plan;
    const allItems = plan?.days.flatMap(d => d.items) ?? [];
    const weekItems = allItems.filter(visible);
    const weekUnassigned = weekItems.filter(i => i.unassigned).length;
    const typeCounts = TYPE_ORDER.map(t => ({ type: t, count: allItems.filter(i => i.type === t).length }));

    const toggle = (t: WeekItemType) => setHidden(prev => {
        const next = new Set(prev);
        if (next.has(t)) next.delete(t); else next.add(t);
        return next;
    });

    return (
        <Card id="week-calendar" className="overflow-hidden scroll-mt-20">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 p-4">
                <div>
                    <h3 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-5 w-5 text-primary" aria-hidden /> {t("Programmazione della settimana")}</h3>
                    {plan && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {fmt.date(asDate(plan.days[0].date), { day: "numeric", month: "long", timeZone: "UTC" })} - {fmt.date(asDate(plan.days[6].date), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
                            {" · "}{weekItems.length === 1 ? t("1 intervento") : t("{n} interventi", { n: weekItems.length })}
                            {weekUnassigned > 0 && <span className="font-medium text-critical-strong"> · {t("{n} da assegnare", { n: weekUnassigned })}</span>}
                        </p>
                    )}
                    {presence && presence.totalCount > 0 && (
                        <p
                            className="mt-0.5 text-xs text-muted-foreground"
                            title={presence.absentees.length ? presence.absentees.map(a => a.name).join(", ") : undefined}
                        >
                            {t("Oggi in servizio:")} <span className="font-medium text-foreground">{t("{present} su {total}", { present: presence.presentCount, total: presence.totalCount })}</span> {t("tecnici")}
                            {presence.absentees.length > 0 && " · " + t("assenti: {n}", { n: presence.absentees.length })}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => plan && setAnchor(shiftKey(plan.weekStart, -7))} aria-label={t("Settimana precedente")}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => { setAnchor(undefined); setPicked(null); }}>{t("Oggi")}</Button>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => plan && setAnchor(shiftKey(plan.weekStart, 7))} aria-label={t("Settimana successiva")}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>

            {/* Legenda: ogni voce e' anche un filtro */}
            <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2" role="group" aria-label={t("Tipi di intervento")}>
                {typeCounts.filter(t => t.type !== "REQUEST" || t.count > 0).map(({ type, count }) => {
                    const on = !hidden.has(type);
                    return (
                        <button
                            key={type}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggle(type)}
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                                on ? "bg-card font-medium" : "text-muted-foreground line-through opacity-60"
                            )}
                        >
                            <span className={cn("h-2.5 w-2.5 rounded-full", TYPE_STYLE[type].dot)} aria-hidden />
                            {t(TYPE_STYLE[type].label)}
                            <span className="tabular-nums text-muted-foreground">{count}</span>
                        </button>
                    );
                })}
            </div>

            <div className="overflow-x-auto">
                <div className="grid min-w-[560px] grid-cols-7 gap-1.5 p-3" role="tablist" aria-label={t("Giorni della settimana")}>
                    {(plan?.days ?? Array.from({ length: 7 }, (_, i) => ({ date: `skeleton-${i}`, items: [], unassignedCount: 0 } as WeekDay))).map(d => {
                        const isToday = plan?.today === d.date;
                        const isPicked = picked === d.date;
                        const skeleton = d.date.startsWith("skeleton");
                        const items = d.items.filter(visible);
                        const unassigned = items.filter(i => i.unassigned).length;
                        const perType = TYPE_ORDER.map(t => ({ type: t, n: items.filter(i => i.type === t).length })).filter(x => x.n > 0);
                        return (
                            <button
                                key={d.date}
                                type="button"
                                role="tab"
                                aria-selected={isPicked}
                                disabled={skeleton}
                                onClick={() => setPicked(d.date)}
                                className={cn(
                                    "flex min-h-[104px] flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors",
                                    isPicked ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/40 hover:bg-muted/40",
                                    loading && "opacity-60"
                                )}
                            >
                                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{skeleton ? "" : weekday(fmt, d.date, "short")}</span>
                                <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold", isToday && "bg-primary text-primary-foreground")}>
                                    {skeleton ? "" : asDate(d.date).getUTCDate()}
                                </span>
                                {!skeleton && (
                                    items.length === 0 ? <span className="text-[11px] text-muted-foreground">{t("libero")}</span> : (
                                        <>
                                            <span className="flex flex-wrap justify-center gap-x-1.5 gap-y-0.5">
                                                {perType.map(({ type, n }) => (
                                                    <span key={type} className="inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums" title={`${t(TYPE_STYLE[type].label)}: ${n}`}>
                                                        <span className={cn("h-2 w-2 rounded-full", TYPE_STYLE[type].dot)} aria-hidden />{n}
                                                    </span>
                                                ))}
                                            </span>
                                            {unassigned > 0 && <Badge variant="critical" className="px-1.5 py-0 text-[10px]">{t("{n} da assegnare", { n: unassigned })}</Badge>}
                                        </>
                                    )
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {day && <DayPanel day={day} items={day.items.filter(visible)} techs={canAssign ? techs : []} onChanged={() => reload(anchor)} />}
        </Card>
    );
}

function DayPanel({ day, items, techs, onChanged }: { day: WeekDay; items: WeekItem[]; techs: TechOption[]; onChanged: () => void }) {
    const t = useT();
    const fmt = useFormat();
    const unassigned = items.filter(i => i.unassigned);
    const assigned = items.filter(i => !i.unassigned);
    const byPerson = useMemo(() => {
        const map = new Map<string, WeekItem[]>();
        for (const item of assigned) {
            const names = item.assignees.length ? item.assignees : [t("Altro")];
            for (const n of names) map.set(n, [...(map.get(n) ?? []), item]);
        }
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [assigned, t]);

    return (
        <div className="space-y-4 border-t p-4">
            <h4 className="text-sm font-semibold capitalize">{weekday(fmt, day.date, "long")} {fmt.date(asDate(day.date), { day: "numeric", month: "long", timeZone: "UTC" })}</h4>

            {items.length === 0 && <p className="text-sm text-muted-foreground">{t("Nessun intervento da mostrare per questo giorno.")}</p>}

            {unassigned.length > 0 && (
                <section aria-label={t("Da assegnare")} className="space-y-2">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-critical-strong">
                        {t("Da assegnare")} <Badge variant="critical">{unassigned.length}</Badge>
                    </p>
                    <ul className="space-y-2">
                        {unassigned.map(item => <ItemRow key={`${item.kind}-${item.id}`} item={item} date={day.date} techs={techs} onChanged={onChanged} />)}
                    </ul>
                </section>
            )}

            {byPerson.length > 0 && (
                <section aria-label={t("Assegnati")} className="space-y-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <UserCheck className="h-3.5 w-3.5" aria-hidden /> {t("Assegnati")}
                    </p>
                    {byPerson.map(([person, list]) => (
                        <div key={person} className="space-y-1.5">
                            <p className="text-sm font-medium">{person} <span className="text-xs font-normal text-muted-foreground">({list.length})</span></p>
                            <ul className="space-y-1.5">
                                {list.map(item => <ItemRow key={`${person}-${item.kind}-${item.id}`} item={item} date={day.date} onChanged={onChanged} />)}
                            </ul>
                        </div>
                    ))}
                </section>
            )}
        </div>
    );
}

function ItemRow({ item, date, techs, onChanged }: { item: WeekItem; date: string; techs?: TechOption[]; onChanged: () => void }) {
    const t = useT();
    const style = TYPE_STYLE[item.type];
    const router = useRouter();
    const { confirm, dialog } = useConfirm();
    const [opening, setOpening] = useState(false);

    // Manutenzione programmata: la scheda di lavoro esiste solo dopo averla generata (la scadenza successiva si sposta in avanti)
    const openSheet = async () => {
        const ok = await confirm({ title: t("Generare la scheda di lavoro?"), description: t("Per «{title}» verrà creato l'ordine di lavoro con la sua checklist, e la prossima scadenza del piano si sposterà in avanti.", { title: item.title }), confirmLabel: t("Genera e apri") });
        if (!ok) return;
        setOpening(true);
        const res = await createWorkOrderFromSchedule(item.id, new Date(`${date}T12:00:00`));
        setOpening(false);
        if (res.success && res.id) { router.push(`/work-orders/${res.id}`); } else { toast.error(res.message ?? t("Operazione non riuscita")); onChanged(); }
    };
    const [tech, setTech] = useState("");
    const [busy, setBusy] = useState(false);
    const canAssign = !!techs && techs.length > 0 && (item.kind === "WO" || (item.kind === "READ" && techs.some(x => x.userId)));
    const options = item.kind === "READ" ? techs?.filter(x => x.userId) : techs;

    const assign = async () => {
        if (!tech) return;
        setBusy(true);
        const picked = options?.find(x => (item.kind === "READ" ? x.userId : x.id) === tech);
        const res = item.kind === "READ" ? await assignReading(item.id, picked?.userId ?? "") : await assignWorkOrder(item.id, tech);
        setBusy(false);
        if (res?.success) { toast.success(item.kind === "READ" ? t("Lettura assegnata") : t("Intervento assegnato")); onChanged(); } else toast.error(res?.message ?? t("Assegnazione non riuscita"));
    };

    return (
        <li className={cn("relative space-y-2 rounded-lg border border-l-4 bg-card px-3 py-2", item.kind !== "PM" && "transition-colors hover:bg-muted/40", style.bar)}>
            {dialog}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", style.badge)}>{t(style.label)}</span>
                        {item.priority && item.kind === "WO" && <PriorityPill priority={item.priority} />}
                        <Link href={item.href} className="truncate text-sm font-medium after:absolute after:inset-0 hover:text-primary">{item.title}</Link>
                        <PlantBadge plantId={item.plantId} />
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        {item.kind === "READ" ? <Gauge className="h-3 w-3" aria-hidden /> : <Wrench className="h-3 w-3" aria-hidden />}
                        {item.assetName}{item.department ? ` · ${item.department}` : ""}
                    </p>
                </div>
                {canAssign && options && (
                    <div className="relative z-10 flex items-center gap-2">
                        <Select value={tech} onValueChange={setTech}>
                            <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder={t("Assegna a...")} /></SelectTrigger>
                            <SelectContent>{options.map(x => <SelectItem key={x.id} value={item.kind === "READ" ? (x.userId as string) : x.id}>{x.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button size="sm" disabled={!tech || busy} onClick={assign}>{busy ? "..." : t("Assegna")}</Button>
                    </div>
                )}
                {item.kind === "CTR" && (
                    <Link href={item.href} className="relative z-10 text-xs font-medium text-primary hover:underline">{t("Registra intervento")}</Link>
                )}
                {item.kind === "PM" && (
                    <div className="relative z-10 flex items-center gap-3">
                        <Button size="sm" variant="outline" onClick={openSheet} disabled={opening}>{opening ? "..." : t("Apri scheda di lavoro")}</Button>
                        <Link href={item.href} className="text-xs font-medium text-primary hover:underline">{t("Piano")}</Link>
                    </div>
                )}
            </div>

            {item.kind === "READ" && item.meter && (
                <ReadingEntryForm meterId={item.id} unit={item.meter.unit} lastValue={item.meter.lastValue} lastReadAt={item.meter.lastReadAt} onDone={onChanged} />
            )}
        </li>
    );
}
