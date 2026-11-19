"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, Gauge, UserCheck, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PriorityPill } from "@/components/ui/status-badge";
import { PlantBadge } from "@/components/ui/plant-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlant } from "@/lib/plant-context";
import { assignWorkOrder, getTechnicians } from "@/lib/actions";
import { assignReading, recordPlannedReading } from "@/modules/energy/adapters/actions/reading-plan-actions";
import { getWeekPlan, type WeekDay, type WeekItem, type WeekItemType, type WeekPlan } from "@/modules/maintenance/adapters/actions/dashboard-widgets-actions";

/** Colori per tipo di intervento. Usano i toni semantici del tema: critico (fucsia FITT, il nostro "rosso"), successo (verde), info (azzurro), avviso (giallo). */
const TYPE_STYLE: Record<WeekItemType, { label: string; dot: string; bar: string; badge: string }> = {
    FAULT: { label: "Guasto", dot: "bg-critical", bar: "border-l-critical", badge: "bg-critical-soft text-critical-strong" },
    PROGRAMMED: { label: "Manutenzione programmata", dot: "bg-success", bar: "border-l-success", badge: "bg-success-soft text-success-strong" },
    CONTRACTOR: { label: "Ditta esterna", dot: "bg-info", bar: "border-l-info", badge: "bg-info-soft text-info-strong" },
    READING: { label: "Lettura pianificata", dot: "bg-warning", bar: "border-l-warning", badge: "bg-warning-soft text-warning-strong" },
    REQUEST: { label: "Richiesta", dot: "bg-muted-foreground", bar: "border-l-muted-foreground", badge: "bg-secondary text-secondary-foreground" },
};
const TYPE_ORDER: WeekItemType[] = ["FAULT", "PROGRAMMED", "CONTRACTOR", "READING", "REQUEST"];

const shiftKey = (key: string, days: number) => {
    const d = new Date(`${key}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};
const asDate = (key: string) => new Date(`${key}T12:00:00Z`);
const weekday = (key: string, style: "short" | "long") => asDate(key).toLocaleDateString("it-IT", { weekday: style, timeZone: "UTC" });

interface TechOption { id: string; userId: string | null; name: string }

/** Piano della settimana: un clic su un giorno mostra gli interventi, a chi sono assegnati e quelli ancora da assegnare. */
export function WeekCalendar() {
    const { selected } = usePlant();
    const [anchor, setAnchor] = useState<string | undefined>(undefined);
    const [plan, setPlan] = useState<WeekPlan | null>(null);
    const [picked, setPicked] = useState<string | null>(null);
    const [techs, setTechs] = useState<TechOption[]>([]);
    const [hidden, setHidden] = useState<Set<WeekItemType>>(new Set());

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
        let alive = true;
        getTechnicians().then(t => {
            if (alive) setTechs((t as TechOption[]).map(x => ({ id: x.id, userId: x.userId ?? null, name: x.name })));
        });
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
        <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 p-4">
                <div>
                    <h3 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-5 w-5 text-primary" aria-hidden /> Programmazione della settimana</h3>
                    {plan && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {asDate(plan.days[0].date).toLocaleDateString("it-IT", { day: "numeric", month: "long", timeZone: "UTC" })} - {asDate(plan.days[6].date).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
                            {" · "}{weekItems.length} {weekItems.length === 1 ? "intervento" : "interventi"}
                            {weekUnassigned > 0 && <span className="font-medium text-critical-strong"> · {weekUnassigned} da assegnare</span>}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => plan && setAnchor(shiftKey(plan.weekStart, -7))} aria-label="Settimana precedente"><ChevronLeft className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => { setAnchor(undefined); setPicked(null); }}>Oggi</Button>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => plan && setAnchor(shiftKey(plan.weekStart, 7))} aria-label="Settimana successiva"><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>

            {/* Legenda: ogni voce e' anche un filtro */}
            <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2" role="group" aria-label="Tipi di intervento">
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
                            {TYPE_STYLE[type].label}
                            <span className="tabular-nums text-muted-foreground">{count}</span>
                        </button>
                    );
                })}
            </div>

            <div className="overflow-x-auto">
                <div className="grid min-w-[560px] grid-cols-7 gap-1.5 p-3" role="tablist" aria-label="Giorni della settimana">
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
                                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{skeleton ? "" : weekday(d.date, "short")}</span>
                                <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold", isToday && "bg-primary text-primary-foreground")}>
                                    {skeleton ? "" : asDate(d.date).getUTCDate()}
                                </span>
                                {!skeleton && (
                                    items.length === 0 ? <span className="text-[11px] text-muted-foreground">libero</span> : (
                                        <>
                                            <span className="flex flex-wrap justify-center gap-x-1.5 gap-y-0.5">
                                                {perType.map(({ type, n }) => (
                                                    <span key={type} className="inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums" title={`${TYPE_STYLE[type].label}: ${n}`}>
                                                        <span className={cn("h-2 w-2 rounded-full", TYPE_STYLE[type].dot)} aria-hidden />{n}
                                                    </span>
                                                ))}
                                            </span>
                                            {unassigned > 0 && <Badge variant="critical" className="px-1.5 py-0 text-[10px]">{unassigned} da assegnare</Badge>}
                                        </>
                                    )
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {day && <DayPanel day={day} items={day.items.filter(visible)} techs={techs} onChanged={() => reload(anchor)} />}
        </Card>
    );
}

function DayPanel({ day, items, techs, onChanged }: { day: WeekDay; items: WeekItem[]; techs: TechOption[]; onChanged: () => void }) {
    const unassigned = items.filter(i => i.unassigned);
    const assigned = items.filter(i => !i.unassigned);
    const byPerson = useMemo(() => {
        const map = new Map<string, WeekItem[]>();
        for (const item of assigned) {
            const names = item.assignees.length ? item.assignees : ["Altro"];
            for (const n of names) map.set(n, [...(map.get(n) ?? []), item]);
        }
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [assigned]);

    return (
        <div className="space-y-4 border-t p-4">
            <h4 className="text-sm font-semibold capitalize">{weekday(day.date, "long")} {asDate(day.date).toLocaleDateString("it-IT", { day: "numeric", month: "long", timeZone: "UTC" })}</h4>

            {items.length === 0 && <p className="text-sm text-muted-foreground">Nessun intervento da mostrare per questo giorno.</p>}

            {unassigned.length > 0 && (
                <section aria-label="Da assegnare" className="space-y-2">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-critical-strong">
                        Da assegnare <Badge variant="critical">{unassigned.length}</Badge>
                    </p>
                    <ul className="space-y-2">
                        {unassigned.map(item => <ItemRow key={`${item.kind}-${item.id}`} item={item} techs={techs} onChanged={onChanged} />)}
                    </ul>
                </section>
            )}

            {byPerson.length > 0 && (
                <section aria-label="Assegnati" className="space-y-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <UserCheck className="h-3.5 w-3.5" aria-hidden /> Assegnati
                    </p>
                    {byPerson.map(([person, list]) => (
                        <div key={person} className="space-y-1.5">
                            <p className="text-sm font-medium">{person} <span className="text-xs font-normal text-muted-foreground">({list.length})</span></p>
                            <ul className="space-y-1.5">
                                {list.map(item => <ItemRow key={`${person}-${item.kind}-${item.id}`} item={item} onChanged={onChanged} />)}
                            </ul>
                        </div>
                    ))}
                </section>
            )}
        </div>
    );
}

function ItemRow({ item, techs, onChanged }: { item: WeekItem; techs?: TechOption[]; onChanged: () => void }) {
    const style = TYPE_STYLE[item.type];
    const [tech, setTech] = useState("");
    const [busy, setBusy] = useState(false);
    const [value, setValue] = useState("");
    const canAssign = !!techs && (item.kind === "WO" || (item.kind === "READ" && techs.some(t => t.userId)));
    const options = item.kind === "READ" ? techs?.filter(t => t.userId) : techs;

    const assign = async () => {
        if (!tech) return;
        setBusy(true);
        const picked = options?.find(t => (item.kind === "READ" ? t.userId : t.id) === tech);
        const res = item.kind === "READ" ? await assignReading(item.id, picked?.userId ?? "") : await assignWorkOrder(item.id, tech);
        setBusy(false);
        if (res?.success) { toast.success(item.kind === "READ" ? "Lettura assegnata" : "Intervento assegnato"); onChanged(); } else toast.error(res?.message ?? "Assegnazione non riuscita");
    };

    const saveReading = async (e: React.FormEvent) => {
        e.preventDefault();
        const n = Number(value.replace(",", "."));
        setBusy(true);
        const res = await recordPlannedReading(item.id, n);
        setBusy(false);
        if (!res.success) { toast.error(res.message); return; }
        if (res.isAnomaly) toast.warning(res.aiAnalysis ?? "Lettura registrata, ma il valore è anomalo.");
        else toast.success("Lettura registrata");
        setValue("");
        onChanged();
    };

    return (
        <li className={cn("space-y-2 rounded-lg border border-l-4 bg-card px-3 py-2", style.bar)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", style.badge)}>{style.label}</span>
                        {item.priority && item.kind === "WO" && <PriorityPill priority={item.priority} />}
                        <Link href={item.href} className="truncate text-sm font-medium hover:text-primary">{item.title}</Link>
                        <PlantBadge plantId={item.plantId} />
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        {item.kind === "READ" ? <Gauge className="h-3 w-3" aria-hidden /> : <Wrench className="h-3 w-3" aria-hidden />}
                        {item.assetName}{item.department ? ` · ${item.department}` : ""}
                    </p>
                </div>
                {canAssign && options && (
                    <div className="flex items-center gap-2">
                        <Select value={tech} onValueChange={setTech}>
                            <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder="Assegna a..." /></SelectTrigger>
                            <SelectContent>{options.map(t => <SelectItem key={t.id} value={item.kind === "READ" ? (t.userId as string) : t.id}>{t.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button size="sm" disabled={!tech || busy} onClick={assign}>{busy ? "..." : "Assegna"}</Button>
                    </div>
                )}
                {item.kind === "CTR" && (
                    <Link href={item.href} className="text-xs font-medium text-primary hover:underline">Registra intervento</Link>
                )}
                {item.kind === "PM" && item.unassigned && (
                    <Link href="/maintenance/schedule" className="text-xs font-medium text-primary hover:underline">Assegna dal piano</Link>
                )}
            </div>

            {item.kind === "READ" && item.meter && (
                <form onSubmit={saveReading} className="flex flex-wrap items-center gap-2">
                    <Input
                        inputMode="decimal"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={`Valore (${item.meter.unit})`}
                        className="h-8 w-[160px] text-sm"
                        aria-label={`Valore letto in ${item.meter.unit}`}
                    />
                    <Button size="sm" type="submit" disabled={busy || value.trim() === ""}>{busy ? "..." : "Registra lettura"}</Button>
                    {item.meter.lastValue !== null && (
                        <span className="text-xs text-muted-foreground">
                            Ultima: {item.meter.lastValue.toLocaleString("it-IT")} {item.meter.unit}
                            {item.meter.lastReadAt ? ` (${new Date(item.meter.lastReadAt).toLocaleDateString("it-IT")})` : ""}
                        </span>
                    )}
                </form>
            )}
        </li>
    );
}
