"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    Bar,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";

import { getAssetPareto, type AssetParetoResponse } from "@/modules/maintenance/adapters/actions/pareto-actions";
import type { ParetoMetric, ParetoMonths, ParetoRow } from "@/modules/maintenance/domain/pareto";
import { PARETO_THRESHOLD } from "@/modules/maintenance/domain/pareto";
import { categoryColor, chartColors } from "@/lib/chart-colors";
import { tk } from "@/lib/i18n/translate";
import { useT, useFormat } from "@/lib/i18n/client";
import type { TFunction } from "@/lib/i18n/client";
import type { Formatter } from "@/lib/i18n/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ALL = "__all__";
const OTHERS_KEY = "__others__";
const FAINT = 0.35;

const CATEGORY_LABELS: Record<string, string> = {
    MECHANICAL: tk("Meccanica"),
    ELECTRICAL: tk("Elettrica"),
    HYDRAULIC: tk("Idraulica"),
    PNEUMATIC: tk("Pneumatica"),
    SOFTWARE: tk("Software"),
    CIVIL: tk("Opere civili"),
    PLANT: tk("Impianti"),
    SAFETY: tk("Sicurezza"),
    IMPROVEMENT: tk("Miglioramento"),
    AI_SUGGESTION: tk("Suggerimento IA"),
    OTHER: tk("Altro"),
};

const METRIC_OPTIONS: { value: ParetoMetric; label: string }[] = [
    { value: "EVENTS", label: tk("Interventi (pesati)") },
    { value: "HOURS", label: tk("Ore di lavoro") },
    { value: "COST", label: tk("Costo") },
];

const MONTH_OPTIONS: { value: `${ParetoMonths}`; label: string }[] = [
    { value: "3", label: tk("3 mesi") },
    { value: "6", label: tk("6 mesi") },
    { value: "12", label: tk("12 mesi") },
];

/** Formati numerici del Pareto nella lingua dell'utente. */
function paretoFormats(fmt: Formatter) {
    return {
        nf: (v: number) => fmt.number(v, { maximumFractionDigits: 2 }),
        pct: (v: number) => fmt.number(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        eur: (v: number) => fmt.currency(v),
        eur0: (v: number) => fmt.currency(v, "EUR", { maximumFractionDigits: 0 }),
        date: (v: Date | string) => fmt.date(v, { day: "2-digit", month: "2-digit", year: "numeric" }),
    };
}

const rowKey = (r: ParetoRow) => r.assetId ?? OTHERS_KEY;

function formatValue(metric: ParetoMetric, v: number, fmt: Formatter, t: TFunction): string {
    const f = paretoFormats(fmt);
    if (metric === "HOURS") return `${f.nf(v)} h`;
    if (metric === "COST") return f.eur(v);
    return t("{n} punti", { n: f.nf(v) });
}

/** "3 guasti (di cui 1 a macchina ferma), 2 richieste" */
function eventsSummary(r: { faults: number; stoppedFaults: number; requests: number }, t: TFunction): string {
    const faults = t("{n} guasti", { n: r.faults });
    const stopped = r.stoppedFaults > 0 ? ` ${t("(di cui {n} a macchina ferma)", { n: r.stoppedFaults })}` : "";
    return `${faults}${stopped}, ${t("{n} richieste", { n: r.requests })}`;
}

const truncate = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

interface ChartDatum {
    key: string;
    name: string;
    row: ParetoRow;
    value: number;
    faultValue: number;
    requestValue: number;
    cumulative: number;
}

function ParetoTooltip({ active, payload, metric }: { active?: boolean; payload?: { payload?: ChartDatum }[]; metric: ParetoMetric }) {
    const t = useT();
    const fmt = useFormat();
    const f = paretoFormats(fmt);
    const metricLabel = METRIC_OPTIONS.find((m) => m.value === metric)?.label;
    const d = active ? payload?.[0]?.payload : undefined;
    if (!d) return null;
    const r = d.row;
    return (
        <div className="max-w-xs rounded-lg border bg-background p-3 text-xs shadow-md" style={{ borderColor: chartColors.grid }}>
            <p className="text-sm font-semibold">{r.name}</p>
            {!r.isOthers && (r.department || r.line) && (
                <p className="text-muted-foreground">{[r.department, r.line].filter(Boolean).join(" · ")}</p>
            )}
            <div className="mt-2 space-y-0.5">
                <p>
                    <span className="text-muted-foreground">{metricLabel ? t(metricLabel) : ""}: </span>
                    <span className="font-medium">{formatValue(metric, r.value, fmt, t)}</span> {t("({pct}% del totale)", { pct: f.pct(r.sharePct) })}
                </p>
                {metric === "EVENTS" && (
                    <p className="text-muted-foreground">
                        {eventsSummary(r, t)}
                    </p>
                )}
                <p>
                    <span className="text-muted-foreground">{t("Cumulata:")} </span>
                    <span className="font-medium">{f.pct(r.cumulativePct)}%</span>
                </p>
                {r.vital && <p className="font-medium" style={{ color: chartColors.critical }}>{t("Tra le poche vitali")}</p>}
            </div>
        </div>
    );
}

export function AssetPareto() {
    const t = useT();
    const fmt = useFormat();
    const f = paretoFormats(fmt);
    const metricOptions = METRIC_OPTIONS.map((o) => ({ ...o, label: t(o.label) }));
    const monthOptions = MONTH_OPTIONS.map((o) => ({ ...o, label: t(o.label) }));
    const [metric, setMetric] = useState<ParetoMetric>("EVENTS");
    const [months, setMonths] = useState<ParetoMonths>(12);
    const [department, setDepartment] = useState<string>(ALL);
    const [line, setLine] = useState<string>(ALL);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [data, setData] = useState<AssetParetoResponse | null>(null);
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const requestKey = JSON.stringify([months, metric, department, line]);
    // In caricamento finche' l'ultima risposta non corrisponde ai filtri attuali (nessun setState sincrono nell'effetto)
    const loading = loadedKey !== requestKey;
    // Elenchi dei filtri: restano quelli della prima risposta valida, cosi' le select non si svuotano mentre si filtra
    const [filterLists, setFilterLists] = useState<{ departments: string[]; lines: string[] }>({ departments: [], lines: [] });
    const requestId = useRef(0);

    useEffect(() => {
        const id = ++requestId.current;
        getAssetPareto({
            months,
            metric,
            department: department === ALL ? undefined : department,
            line: line === ALL ? undefined : line,
        })
            .then((res) => {
                if (id !== requestId.current) return;
                setData(res);
                if (res.success) setFilterLists({ departments: res.departments, lines: res.lines });
                setLoadedKey(requestKey);
            })
            .catch(() => {
                if (id !== requestId.current) return;
                setData(null);
                setLoadedKey(requestKey);
            });
    }, [months, metric, department, line, requestKey]);

    const result = data?.result ?? null;
    const rows = useMemo(() => result?.rows ?? [], [result]);

    const chartData: ChartDatum[] = useMemo(
        () => rows.map((r) => ({
            key: rowKey(r),
            name: r.name,
            row: r,
            value: r.value,
            faultValue: r.faultValue,
            requestValue: r.requestValue,
            cumulative: Math.round(r.cumulativePct * 10) / 10,
        })),
        [rows],
    );

    const selected = rows.find((r) => rowKey(r) === selectedKey) ?? rows[0] ?? null;
    const selectedDatumKey = selected ? rowKey(selected) : null;
    const metricLabel = metricOptions.find((m) => m.value === metric)?.label ?? "";

    // Non e' una sezione per i manutentori: nessun riquadro, nessun messaggio
    if (data?.unauthorized) return null;

    const weights = data?.weights;
    const range = data ? { from: f.date(new Date(data.from)), to: f.date(new Date(data.to)) } : { from: "", to: "" };
    const description = metric === "EVENTS" && weights
        ? t("Guasti e richieste dal {from} al {to}. Punti: guasto {fault}, guasto a macchina ferma {stopped}, richiesta {request}.", { ...range, fault: f.nf(weights.faultWeight), stopped: f.nf(weights.stoppedFaultWeight), request: f.nf(weights.requestWeight) })
        : data
            ? (metric === "HOURS"
                ? t("Guasti e richieste dal {from} al {to}. Ore di lavoro registrate sugli ordini.", range)
                : t("Guasti e richieste dal {from} al {to}. Ricambi e manodopera degli ordini.", range))
            : t("Le macchine che concentrano la maggior parte dei problemi.");

    const chartLabel = result && rows.length > 0
        ? t("Grafico di Pareto delle macchine per {metric}. {vital} macchine su {total} raggiungono l'{threshold}% del totale. I valori sono nella tabella sottostante.", { metric: metricLabel.toLowerCase(), vital: result.vitalCount, total: result.machines, threshold: PARETO_THRESHOLD })
        : t("Grafico di Pareto");

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("Macchine più problematiche (Pareto)")}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                    <SegmentedControl
                        aria-label={t("Metrica")}
                        options={metricOptions}
                        value={metric}
                        onChange={(v) => { setMetric(v); setSelectedKey(null); }}
                    />
                    <SegmentedControl
                        aria-label={t("Periodo")}
                        options={monthOptions}
                        value={`${months}` as `${ParetoMonths}`}
                        onChange={(v) => { setMonths(Number(v) as ParetoMonths); setSelectedKey(null); }}
                    />
                    <div className="w-44">
                        <Select value={department} onValueChange={(v) => { setDepartment(v); setSelectedKey(null); }}>
                            <SelectTrigger aria-label={t("Reparto")}><SelectValue placeholder={t("Reparto")} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>{t("Tutti i reparti")}</SelectItem>
                                {filterLists.departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-44">
                        <Select value={line} onValueChange={(v) => { setLine(v); setSelectedKey(null); }}>
                            <SelectTrigger aria-label={t("Linea")}><SelectValue placeholder={t("Linea")} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>{t("Tutte le linee")}</SelectItem>
                                {filterLists.lines.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {loading && !data ? (
                    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">{t("Caricamento dati...")}</div>
                ) : !data || !data.success ? (
                    <EmptyState icon={<BarChart3 />} title={t("Pareto non disponibile")} description={data?.message ? t(data.message) : t("Impossibile caricare i dati.")} />
                ) : !result || result.insufficient ? (
                    <EmptyState
                        icon={<BarChart3 />}
                        title={t("Dati insufficienti per un Pareto significativo")}
                        description={t("Servono almeno 3 interventi o richieste nel periodo scelto: ne risultano {n}. Prova ad ampliare il periodo o a togliere i filtri.", { n: result?.totalEvents ?? 0 })}
                    />
                ) : rows.length === 0 ? (
                    <EmptyState
                        icon={<BarChart3 />}
                        title={t("Nessun valore registrato per questa metrica")}
                        description={metric === "HOURS"
                            ? t("Nel periodo ci sono {n} eventi, ma nessuno con ore di lavoro registrate.", { n: result.totalEvents })
                            : t("Nel periodo ci sono {n} eventi, ma nessuno con costi registrati.", { n: result.totalEvents })}
                    />
                ) : (
                    <div className={loading ? "space-y-5 opacity-60 transition-opacity" : "space-y-5 transition-opacity"} aria-busy={loading}>
                        <p className="text-sm text-muted-foreground">
                            {result.vitalCount === 1
                                ? t("1 macchina su {total} ({pct}% del totale) è la “poche vitali”: quelle che servono per arrivare all'{threshold}% del totale.", { total: result.machines, pct: f.pct(result.vitalSharePct), threshold: PARETO_THRESHOLD })
                                : t("{n} macchine su {total} ({pct}% del totale) sono le “poche vitali”: quelle che servono per arrivare all'{threshold}% del totale.", { n: result.vitalCount, total: result.machines, pct: f.pct(result.vitalSharePct), threshold: PARETO_THRESHOLD })}
                        </p>

                        <div className="h-[400px] w-full" role="img" aria-label={chartLabel}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                    <XAxis
                                        dataKey="name"
                                        stroke={chartColors.axis}
                                        fontSize={11}
                                        tickLine={false}
                                        interval={0}
                                        angle={-35}
                                        textAnchor="end"
                                        height={90}
                                        tickFormatter={(v: string) => truncate(String(v))}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        stroke={chartColors.axis}
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v: number) => (metric === "COST" ? f.eur0(v) : f.nf(v))}
                                        width={metric === "COST" ? 70 : 45}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        domain={[0, 100]}
                                        ticks={[0, 20, 40, 60, 80, 100]}
                                        stroke={chartColors.axis}
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v: number) => `${v}%`}
                                        width={45}
                                    />
                                    <Tooltip cursor={{ fill: chartColors.grid, opacity: 0.4 }} content={<ParetoTooltip metric={metric} />} />
                                    <ReferenceLine
                                        yAxisId="right"
                                        y={PARETO_THRESHOLD}
                                        stroke={chartColors.axis}
                                        strokeDasharray="6 4"
                                        label={{ value: `${PARETO_THRESHOLD}%`, position: "insideTopRight", fill: chartColors.axis, fontSize: 11 }}
                                    />
                                    {metric === "EVENTS" ? (
                                        <>
                                            <Bar yAxisId="left" dataKey="faultValue" stackId="v" name={t("Guasti")} maxBarSize={44} cursor="pointer"
                                                onClick={(_d, i) => setSelectedKey(chartData[i]?.key ?? null)}>
                                                {chartData.map((d) => (
                                                    <Cell key={d.key} fill={chartColors.critical} fillOpacity={d.row.vital ? 1 : FAINT} />
                                                ))}
                                            </Bar>
                                            <Bar yAxisId="left" dataKey="requestValue" stackId="v" name={t("Richieste")} maxBarSize={44} cursor="pointer"
                                                radius={[4, 4, 0, 0]} onClick={(_d, i) => setSelectedKey(chartData[i]?.key ?? null)}>
                                                {chartData.map((d) => (
                                                    <Cell key={d.key} fill={chartColors.primary} fillOpacity={d.row.vital ? 1 : FAINT} />
                                                ))}
                                            </Bar>
                                        </>
                                    ) : (
                                        <Bar yAxisId="left" dataKey="value" name={metric === "HOURS" ? t("Ore di lavoro") : t("Costo")} maxBarSize={44} cursor="pointer"
                                            radius={[4, 4, 0, 0]} onClick={(_d, i) => setSelectedKey(chartData[i]?.key ?? null)}>
                                            {chartData.map((d) => (
                                                <Cell key={d.key} fill={chartColors.primary} fillOpacity={d.row.vital ? 1 : FAINT} />
                                            ))}
                                        </Bar>
                                    )}
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="cumulative"
                                        name={t("Cumulata")}
                                        stroke={chartColors.warning}
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: chartColors.warning }}
                                        isAnimationActive={false}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground" aria-label={t("Legenda")}>
                            {metric === "EVENTS" ? (
                                <>
                                    <LegendDot color={chartColors.critical} label={t("Guasti")} />
                                    <LegendDot color={chartColors.primary} label={t("Richieste")} />
                                </>
                            ) : (
                                <LegendDot color={chartColors.primary} label={metric === "HOURS" ? t("Ore di lavoro") : t("Costo")} />
                            )}
                            <li className="flex items-center gap-1.5">
                                <span className="inline-block h-0.5 w-4" style={{ backgroundColor: chartColors.warning }} aria-hidden />
                                {t("Percentuale cumulata (asse destro)")}
                            </li>
                            <li>{t("Colore pieno: poche vitali. Colore chiaro: le altre macchine.")}</li>
                            <li>{t("Clicca su una barra per vedere le categorie.")}</li>
                        </ul>

                        {selected && (
                            <div className="rounded-lg border bg-muted/30 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold">{selected.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {eventsSummary(selected, t)}
                                            {selected.hours > 0 ? ` · ${t("{n} h di lavoro", { n: f.nf(selected.hours) })}` : ""}
                                            {selected.cost > 0 ? ` · ${f.eur(selected.cost)}` : ""}
                                        </p>
                                    </div>
                                    {selected.assetId && (
                                        <Link href={`/assets/${selected.assetId}`} className="text-sm font-medium text-primary hover:underline">
                                            {t("Apri la scheda asset")}
                                        </Link>
                                    )}
                                </div>
                                <p className="mt-3 text-xs font-medium text-muted-foreground">{t("Eventi per categoria")}</p>
                                <ul className="mt-2 space-y-1.5">
                                    {selected.categories.map((c) => {
                                        const max = selected.categories[0]?.count || 1;
                                        return (
                                            <li key={c.category} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-sm">
                                                <span className="truncate">{CATEGORY_LABELS[c.category] ? t(CATEGORY_LABELS[c.category]) : c.category}</span>
                                                <span className="h-3 rounded-sm bg-muted" aria-hidden>
                                                    <span className="block h-3 rounded-sm" style={{ width: `${(c.count / max) * 100}%`, backgroundColor: categoryColor(c.category) }} />
                                                </span>
                                                <span className="text-right tabular-nums">{c.count}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                        <Table>
                            <caption className="mb-2 text-left text-xs text-muted-foreground">
                                {t("Dati del grafico: {metric}, dalla più alla meno problematica.", { metric: metricLabel.toLowerCase() })}
                            </caption>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">#</TableHead>
                                    <TableHead>{t("Macchina")}</TableHead>
                                    <TableHead className="hidden sm:table-cell">{t("Reparto / linea")}</TableHead>
                                    <TableHead className="text-right">{metricLabel}</TableHead>
                                    <TableHead className="text-right">{t("% cumulata")}</TableHead>
                                    <TableHead>{t("Poche vitali")}</TableHead>
                                    <TableHead className="text-right">{t("Categorie")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((r, i) => {
                                    const key = rowKey(r);
                                    return (
                                        <TableRow key={key} data-state={key === selectedDatumKey ? "selected" : undefined}>
                                            <TableCell className="text-muted-foreground">{r.isOthers ? "" : i + 1}</TableCell>
                                            <TableCell className="font-medium">
                                                {r.assetId ? (
                                                    <Link href={`/assets/${r.assetId}`} className="text-primary hover:underline">{r.name}</Link>
                                                ) : r.name}
                                            </TableCell>
                                            <TableCell className="hidden text-muted-foreground sm:table-cell">
                                                {[r.department, r.line].filter(Boolean).join(" · ") || "—"}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{formatValue(metric, r.value, fmt, t)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{f.pct(r.cumulativePct)}%</TableCell>
                                            <TableCell>{r.vital ? t("Sì") : t("No")}</TableCell>
                                            <TableCell className="text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedKey(key)}
                                                    aria-pressed={key === selectedDatumKey}
                                                    aria-label={t("Mostra le categorie di {name}", { name: r.name })}
                                                    className="rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                >
                                                    {t("Dettaglio")}
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <li className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} aria-hidden />
            {label}
        </li>
    );
}
