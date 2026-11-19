"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, UserCheck, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PriorityPill } from "@/components/ui/status-badge";
import { PlantBadge } from "@/components/ui/plant-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlant } from "@/lib/plant-context";
import { assignWorkOrder, getTechnicians } from "@/lib/actions";
import { getWeekPlan, type WeekDay, type WeekItem, type WeekPlan } from "@/modules/maintenance/adapters/actions/dashboard-widgets-actions";

const shiftKey = (key: string, days: number) => {
    const d = new Date(`${key}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
};
const asDate = (key: string) => new Date(`${key}T12:00:00Z`);
const weekday = (key: string, style: "short" | "long") => asDate(key).toLocaleDateString("it-IT", { weekday: style, timeZone: "UTC" });

interface TechOption { id: string; name: string }

/** Piano della settimana: un clic su un giorno mostra gli interventi, a chi sono assegnati e quelli ancora da assegnare. */
export function WeekCalendar() {
    const { selected } = usePlant();
    const [anchor, setAnchor] = useState<string | undefined>(undefined);
    const [plan, setPlan] = useState<WeekPlan | null>(null);
    const [picked, setPicked] = useState<string | null>(null);
    const [techs, setTechs] = useState<TechOption[]>([]);

    const reload = useCallback(async (day?: string) => {
        const p = await getWeekPlan(day);
        setPlan(p);
        return p;
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
        getTechnicians().then(t => { if (alive) setTechs((t as TechOption[]).map(x => ({ id: x.id, name: x.name }))); });
        return () => { alive = false; };
    }, [selected]);

    const day = useMemo(() => plan?.days.find(d => d.date === picked) ?? null, [plan, picked]);
    const loading = !plan;
    const weekTotal = plan?.days.reduce((n, d) => n + d.items.length, 0) ?? 0;
    const weekUnassigned = plan?.days.reduce((n, d) => n + d.unassignedCount, 0) ?? 0;

    const go = (delta: number) => {
        if (!plan) return;
        setAnchor(shiftKey(plan.weekStart, delta * 7));
    };

    return (
        <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 p-4">
                <div>
                    <h3 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-5 w-5 text-primary" aria-hidden /> Programmazione della settimana</h3>
                    {plan && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {asDate(plan.days[0].date).toLocaleDateString("it-IT", { day: "numeric", month: "long", timeZone: "UTC" })} - {asDate(plan.days[6].date).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
                            {" · "}{weekTotal} {weekTotal === 1 ? "intervento" : "interventi"}
                            {weekUnassigned > 0 && <span className="font-medium text-critical-strong"> · {weekUnassigned} da assegnare</span>}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => go(-1)} aria-label="Settimana precedente"><ChevronLeft className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => { setAnchor(undefined); setPicked(null); }}>Oggi</Button>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => go(1)} aria-label="Settimana successiva"><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <div className="grid min-w-[560px] grid-cols-7 gap-1.5 p-3" role="tablist" aria-label="Giorni della settimana">
                    {(plan?.days ?? Array.from({ length: 7 }, (_, i) => ({ date: `skeleton-${i}`, items: [], unassignedCount: 0 } as WeekDay))).map(d => {
                        const isToday = plan?.today === d.date;
                        const isPicked = picked === d.date;
                        const skeleton = d.date.startsWith("skeleton");
                        return (
                            <button
                                key={d.date}
                                type="button"
                                role="tab"
                                aria-selected={isPicked}
                                disabled={skeleton}
                                onClick={() => setPicked(d.date)}
                                className={cn(
                                    "flex min-h-[92px] flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors",
                                    isPicked ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/40 hover:bg-muted/40",
                                    loading && "opacity-60"
                                )}
                            >
                                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{skeleton ? "" : weekday(d.date, "short")}</span>
                                <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold", isToday && "bg-primary text-primary-foreground")}>
                                    {skeleton ? "" : asDate(d.date).getUTCDate()}
                                </span>
                                {!skeleton && (
                                    d.items.length === 0 ? <span className="text-[11px] text-muted-foreground">libero</span> : (
                                        <>
                                            <span className="text-xs font-medium tabular-nums">{d.items.length} {d.items.length === 1 ? "int." : "int."}</span>
                                            {d.unassignedCount > 0 && <Badge variant="critical" className="px-1.5 py-0 text-[10px]">{d.unassignedCount} da assegnare</Badge>}
                                        </>
                                    )
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {day && <DayPanel day={day} techs={techs} onAssigned={() => reload(anchor)} />}
        </Card>
    );
}

function DayPanel({ day, techs, onAssigned }: { day: WeekDay; techs: TechOption[]; onAssigned: () => void }) {
    const unassigned = day.items.filter(i => i.unassigned);
    const assigned = day.items.filter(i => !i.unassigned);
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

            {day.items.length === 0 && <p className="text-sm text-muted-foreground">Nessun intervento programmato per questo giorno.</p>}

            {unassigned.length > 0 && (
                <section aria-label="Da assegnare" className="space-y-2">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-critical-strong">
                        Da assegnare <Badge variant="critical">{unassigned.length}</Badge>
                    </p>
                    <ul className="space-y-2">
                        {unassigned.map(item => <ItemRow key={`${item.kind}-${item.id}`} item={item} techs={techs} onAssigned={onAssigned} />)}
                    </ul>
                </section>
            )}

            {byPerson.length > 0 && (
                <section aria-label="Assegnati" className="space-y-3">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <UserCheck className="h-3.5 w-3.5" aria-hidden /> Assegnati
                    </p>
                    {byPerson.map(([person, items]) => (
                        <div key={person} className="space-y-1.5">
                            <p className="text-sm font-medium">{person} <span className="text-xs font-normal text-muted-foreground">({items.length})</span></p>
                            <ul className="space-y-1.5">
                                {items.map(item => <ItemRow key={`${person}-${item.kind}-${item.id}`} item={item} />)}
                            </ul>
                        </div>
                    ))}
                </section>
            )}
        </div>
    );
}

function ItemRow({ item, techs, onAssigned }: { item: WeekItem; techs?: TechOption[]; onAssigned?: () => void }) {
    const [tech, setTech] = useState("");
    const [busy, setBusy] = useState(false);
    const canAssign = item.kind === "WO" && techs && onAssigned;

    const assign = async () => {
        if (!tech) return;
        setBusy(true);
        const res = await assignWorkOrder(item.id, tech);
        setBusy(false);
        if (res?.success) { toast.success("Intervento assegnato"); onAssigned?.(); } else toast.error(res?.message ?? "Assegnazione non riuscita");
    };

    return (
        <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2">
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    {item.kind === "PM" ? <Badge variant="info">Piano preventivo</Badge> : item.priority && <PriorityPill priority={item.priority} />}
                    <Link href={item.href} className="truncate text-sm font-medium hover:text-primary">{item.title}</Link>
                    <PlantBadge plantId={item.plantId} />
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Wrench className="h-3 w-3" aria-hidden /> {item.assetName}{item.department ? ` · ${item.department}` : ""}
                </p>
            </div>
            {canAssign && (
                <div className="flex items-center gap-2">
                    <Select value={tech} onValueChange={setTech}>
                        <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder="Assegna a..." /></SelectTrigger>
                        <SelectContent>{techs!.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="sm" disabled={!tech || busy} onClick={assign}>{busy ? "..." : "Assegna"}</Button>
                </div>
            )}
            {item.kind === "PM" && item.unassigned && (
                <Link href="/maintenance/schedule" className="text-xs font-medium text-primary hover:underline">Assegna dal piano</Link>
            )}
        </li>
    );
}
