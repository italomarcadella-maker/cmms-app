"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/lib/i18n/toast";
import { useT, useFormat } from "@/lib/i18n/client";
import { tk } from "@/lib/i18n/translate";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, Minus, Plus, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { PlantBadge } from "@/components/ui/plant-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePlant } from "@/lib/plant-context";
import {
    closeStockCount, getStockCount, saveCountLine,
    type StockCountDetail, type StockCountLineRow,
} from "@/modules/inventory/adapters/actions/stock-actions";
import { evaluateLine, parseCountedInput, summarizeCount } from "@/modules/inventory/domain/stock-count";

function useCountFormats() {
    const fmt = useFormat();
    return {
        eur: { format: (n: number) => fmt.currency(n) },
        eurSigned: { format: (n: number) => fmt.currency(n, "EUR", { signDisplay: "always" }) },
        numberFmt: { format: (n: number) => fmt.number(n) },
        dateFmt: { format: (d: Date) => fmt.date(d, { day: "2-digit", month: "2-digit", year: "numeric" }) },
        dateTimeFmt: { format: (d: Date) => fmt.dateTime(d, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
    };
}

const CATEGORY_LABELS: Record<string, string> = { Consumables: tk("Consumabili"), Spares: tk("Ricambi critici"), Tools: tk("Utensili") };
const PAGE_STEP = 200;

type RowFilter = "ALL" | "TODO" | "VARIANCE";

interface RowProps {
    line: StockCountLineRow;
    /** Quantita' contata gia' salvata sul server. */
    savedQty: number | null;
    editable: boolean;
    showValue: boolean;
    onCommit: (partId: string, value: number | null) => Promise<boolean>;
}

const CountRow = memo(function CountRow({ line, savedQty, editable, showValue, onCommit }: RowProps) {
    const t = useT();
    const { numberFmt, eurSigned } = useCountFormats();
    const [text, setText] = useState(savedQty === null ? "" : String(savedQty));
    const [state, setState] = useState<"idle" | "saving" | "invalid" | "error">("idle");
    const result = evaluateLine({ expectedQty: line.expectedQty, countedQty: savedQty, unitCost: line.unitCost });
    const variance = result.variance;

    const commit = async () => {
        const parsed = parseCountedInput(text);
        if (!parsed.valid) { setState("invalid"); return; }
        if (parsed.value === savedQty) { setState("idle"); return; }
        setState("saving");
        const saved = await onCommit(line.partId, parsed.value);
        setState(saved ? "idle" : "error");
    };

    const tone = variance === null || variance === 0 ? "" : "bg-warning-soft/40";
    const stockChanged = editable && line.currentQty !== null && line.currentQty !== line.expectedQty;

    return (
        <TableRow className={tone}>
            <TableCell className="font-medium">
                <div>{line.partName}</div>
                {line.category && <div className="text-xs font-normal text-muted-foreground">{t(CATEGORY_LABELS[line.category] ?? line.category)}</div>}
            </TableCell>
            <TableCell className="text-muted-foreground">{line.warehouse ?? "-"}</TableCell>
            <TableCell className="text-muted-foreground">{line.location ?? "-"}</TableCell>
            <TableCell className="text-right font-mono tabular-nums">
                {numberFmt.format(line.expectedQty)}
                {stockChanged && <div className="font-sans text-[11px] text-muted-foreground print:hidden">{t("ora a sistema: {qty}", { qty: numberFmt.format(line.currentQty as number) })}</div>}
            </TableCell>
            <TableCell className="w-36 text-right">
                {editable ? (
                    <div className="flex flex-col items-end gap-1">
                        <Input
                            inputMode="numeric"
                            className="h-9 w-28 text-right font-mono tabular-nums"
                            aria-label={t("Quantità contata di {name}", { name: line.partName })}
                            aria-invalid={state === "invalid" || state === "error"}
                            placeholder="-"
                            value={text}
                            onChange={e => { setText(e.target.value); setState("idle"); }}
                            onBlur={commit}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                        />
                        {state === "saving" && <span className="text-[11px] text-muted-foreground">{t("Salvo...")}</span>}
                        {state === "invalid" && <span className="text-[11px] text-critical-strong">{t("Solo numeri interi, 0 o più")}</span>}
                        {state === "error" && <span className="text-[11px] text-critical-strong">{t("Non salvato: riprova")}</span>}
                    </div>
                ) : (
                    <span className="font-mono tabular-nums">{savedQty === null ? t("Non contato") : numberFmt.format(savedQty)}</span>
                )}
            </TableCell>
            <TableCell className="whitespace-nowrap">
                {variance === null ? (
                    <span className="text-xs text-muted-foreground">{t("Non contato")}</span>
                ) : variance === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {t("In linea")}</span>
                ) : (
                    <Badge variant={variance < 0 ? "critical" : "warning"} className="gap-1 font-mono">
                        {variance < 0 ? <Minus className="h-3 w-3" aria-hidden /> : <Plus className="h-3 w-3" aria-hidden />}
                        {variance < 0 ? t("{n} in meno", { n: numberFmt.format(Math.abs(variance)) }) : t("{n} in più", { n: numberFmt.format(Math.abs(variance)) })}
                    </Badge>
                )}
            </TableCell>
            {showValue && (
                <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                    {variance === null || variance === 0 ? "" : result.varianceValue === null ? <span className="font-sans text-xs text-muted-foreground">{t("non calcolabile")}</span> : eurSigned.format(result.varianceValue)}
                </TableCell>
            )}
        </TableRow>
    );
});

export function StockCountSheet({ countId, onBack }: { countId: string; onBack: () => void }) {
    const t = useT();
    const { eur, eurSigned, numberFmt, dateFmt, dateTimeFmt } = useCountFormats();
    const { plantName } = usePlant();
    const { confirm, dialog } = useConfirm();
    const [version, setVersion] = useState(0);
    const [detail, setDetail] = useState<StockCountDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState<Record<string, number | null>>({});
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const requestKey = `${countId}:${version}`;
    const loading = loadedKey !== requestKey;
    const requestId = useRef(0);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<RowFilter>("ALL");
    const [limit, setLimit] = useState(PAGE_STEP);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        const id = ++requestId.current;
        getStockCount(countId)
            .then(res => {
                if (id !== requestId.current) return;
                if (res.success && res.count) {
                    setDetail(res.count);
                    setSaved(Object.fromEntries(res.count.lines.map(l => [l.partId, l.countedQty])));
                    setError(null);
                } else {
                    setDetail(null);
                    setError(res.message ?? tk("Inventario non disponibile."));
                }
                setLoadedKey(requestKey);
            })
            .catch(() => {
                if (id !== requestId.current) return;
                setDetail(null);
                setError(tk("Impossibile caricare l'inventario."));
                setLoadedKey(requestKey);
            });
    }, [countId, requestKey]);

    const lines = useMemo(() => detail?.lines ?? [], [detail]);
    const open = detail?.status === "OPEN";
    const showValue = !!detail?.canManage;

    const summary = useMemo(
        () => summarizeCount(lines.map(l => ({ expectedQty: l.expectedQty, countedQty: saved[l.partId] ?? null, unitCost: l.unitCost }))),
        [lines, saved],
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return lines.filter(l => {
            if (q && !(`${l.partName} ${l.warehouse ?? ""} ${l.location ?? ""} ${l.category ?? ""}`.toLowerCase().includes(q))) return false;
            const counted = saved[l.partId] ?? null;
            if (filter === "TODO") return counted === null;
            if (filter === "VARIANCE") return counted !== null && counted !== l.expectedQty;
            return true;
        });
    }, [lines, saved, search, filter]);

    const commit = useCallback(async (partId: string, value: number | null) => {
        const res = await saveCountLine(countId, partId, value);
        if (!res.success) { toast.error(res.message); return false; }
        setSaved(prev => ({ ...prev, [partId]: value }));
        return true;
    }, [countId]);

    const printSheet = () => {
        setLimit(Number.MAX_SAFE_INTEGER);
        setTimeout(() => window.print(), 150);
    };

    const close = async (apply: boolean) => {
        if (!detail) return;
        const toApply = summary.linesWithVariance;
        const ok = await confirm(apply ? {
            title: t("Chiudere aggiornando le giacenze?"),
            description: [
                toApply
                    ? t("{n} articoli contati verranno portati al valore contato ({m} con scostamento rispetto all'atteso), con un movimento di inventario per ciascuno.", { n: numberFmt.format(summary.countedLines), m: numberFmt.format(toApply) })
                    : t("{n} articoli contati verranno portati al valore contato, con un movimento di inventario per ciascuno.", { n: numberFmt.format(summary.countedLines) }),
                summary.notCountedLines ? t("Le {n} righe non contate restano invariate.", { n: numberFmt.format(summary.notCountedLines) }) : "",
                t("L'operazione non si può annullare."),
            ].filter(Boolean).join(" "),
            confirmLabel: t("Chiudi e aggiorna le giacenze"),
            variant: "destructive",
        } : {
            title: t("Chiudere senza modificare le giacenze?"),
            description: t("L'inventario viene chiuso e il conteggio resta consultabile, ma le giacenze del magazzino non cambiano.") + (summary.linesWithVariance ? " " + t("Gli scostamenti ({n} righe) non verranno applicati.", { n: numberFmt.format(summary.linesWithVariance) }) : ""),
            confirmLabel: t("Chiudi senza modificare"),
        });
        if (!ok) return;
        setClosing(true);
        try {
            const res = await closeStockCount(detail.id, { apply });
            if (res.success) { toast.success(res.message); setVersion(v => v + 1); } else toast.error(res.message);
        } catch {
            toast.error(t("Chiusura non riuscita."));
        } finally {
            setClosing(false);
        }
    };

    if (loading && !detail) return <p className="text-sm text-muted-foreground">{t("Caricamento...")}</p>;
    if (!detail) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" /> {t("Tutti gli inventari")}</Button>
                <Card><EmptyState icon={<ClipboardList />} title={t("Inventario non disponibile")} description={error ? t(error) : undefined} /></Card>
            </div>
        );
    }

    const visible = filtered.slice(0, limit);
    const hidden = filtered.length - visible.length;
    const plant = plantName(detail.plantId) ?? detail.plantName;

    return (
        <div className="space-y-5">
            {/* Intestazione della sola stampa */}
            <div className="hidden print:block">
                <h1 className="text-xl font-semibold">{t("Foglio di conteggio inventario")}</h1>
                <p className="text-sm">{t("Stabilimento {plant} · aperto il {date} da {name}", { plant, date: dateFmt.format(new Date(detail.createdAt)), name: detail.createdByName })}{detail.note ? ` · ${detail.note}` : ""}</p>
                <p className="text-sm">{t("Contato da: ______________________  Data: ____ / ____ / ________")}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
                <div className="space-y-1">
                    <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3"><ArrowLeft className="mr-1 h-4 w-4" /> {t("Tutti gli inventari")}</Button>
                    <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
                        {t("Inventario {plant}", { plant })}
                        <Badge variant={open ? "info" : "neutral"}>{open ? t("Aperto") : t("Chiuso")}</Badge>
                        <PlantBadge plantId={detail.plantId} />
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {t("Aperto il {date} da {name}", { date: dateTimeFmt.format(new Date(detail.createdAt)), name: detail.createdByName })}
                        {detail.closedAt ? ` · ${t("chiuso il {date}", { date: dateTimeFmt.format(new Date(detail.closedAt)) })}` : ""}
                        {detail.note ? ` · ${detail.note}` : ""}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={printSheet}><Printer className="mr-2 h-4 w-4" /> {t("Stampa il foglio")}</Button>
                    {open && detail.canManage && (
                        <>
                            <Button variant="outline" disabled={closing} onClick={() => close(false)}>{t("Chiudi senza modificare")}</Button>
                            <Button disabled={closing} onClick={() => close(true)}>{t("Chiudi aggiornando le giacenze")}</Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
                <Card><CardContent className="space-y-2 pt-5">
                    <p className="text-xs font-medium text-muted-foreground">{t("Avanzamento")}</p>
                    <p className="text-2xl font-semibold tabular-nums">{numberFmt.format(summary.countedLines)} <span className="text-sm font-normal text-muted-foreground">{t("di {total} righe", { total: numberFmt.format(summary.totalLines) })}</span></p>
                    <Progress value={summary.progressPct} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.progressPct} aria-label={t("{pct}% delle righe contate", { pct: summary.progressPct })} />
                </CardContent></Card>
                <Card><CardContent className="space-y-1 pt-5">
                    <p className="text-xs font-medium text-muted-foreground">{t("Da contare")}</p>
                    <p className="text-2xl font-semibold tabular-nums">{numberFmt.format(summary.notCountedLines)}</p>
                    <p className="text-xs text-muted-foreground">{t("righe non ancora contate")}</p>
                </CardContent></Card>
                <Card><CardContent className="space-y-1 pt-5">
                    <p className="text-xs font-medium text-muted-foreground">{t("Con scostamento")}</p>
                    <p className="text-2xl font-semibold tabular-nums">{numberFmt.format(summary.linesWithVariance)}</p>
                    <p className="text-xs text-muted-foreground">{t("{short} in meno, {surplus} in più", { short: numberFmt.format(summary.shortageLines), surplus: numberFmt.format(summary.surplusLines) })}</p>
                </CardContent></Card>
                <Card><CardContent className="space-y-1 pt-5">
                    <p className="text-xs font-medium text-muted-foreground">{t("Valore degli scostamenti")}</p>
                    {!showValue ? (
                        <p className="text-sm text-muted-foreground">{t("Visibile a chi coordina il magazzino.")}</p>
                    ) : summary.netVarianceValue === null ? (
                        <p className="text-sm text-muted-foreground">{summary.linesWithVariance === 0 ? t("Nessuno scostamento.") : t("Non calcolabile: mancano i costi unitari.")}</p>
                    ) : (
                        <>
                            <p className="text-2xl font-semibold tabular-nums">{eurSigned.format(summary.netVarianceValue)}</p>
                            <p className="text-xs text-muted-foreground">{t("in valore assoluto {value}", { value: eur.format(summary.absVarianceValue ?? 0) })}</p>
                        </>
                    )}
                    {showValue && summary.varianceValueMissingLines > 0 && summary.netVarianceValue !== null && (
                        <p className="flex items-start gap-1 text-xs text-muted-foreground"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /> {t("{n} righe senza costo unitario non sono nel totale.", { n: numberFmt.format(summary.varianceValueMissingLines) })}</p>
                    )}
                </CardContent></Card>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
                <div className="relative min-w-60 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
                    <Input className="pl-9" placeholder={t("Cerca per articolo, magazzino o ubicazione")} aria-label={t("Cerca nelle righe dell'inventario")} value={search} onChange={e => { setSearch(e.target.value); setLimit(PAGE_STEP); }} />
                </div>
                {([["ALL", t("Tutte")], ["TODO", t("Da contare")], ["VARIANCE", t("Con scostamento")]] as [RowFilter, string][]).map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={filter === value}
                        onClick={() => { setFilter(value); setLimit(PAGE_STEP); }}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${filter === value ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <Card>
                {filtered.length === 0 ? (
                    <EmptyState icon={<ClipboardList />} title={t("Nessuna riga da mostrare")} description={t("Cambia la ricerca o il filtro.")} />
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("Articolo")}</TableHead>
                                    <TableHead>{t("Magazzino")}</TableHead>
                                    <TableHead>{t("Ubicazione")}</TableHead>
                                    <TableHead className="text-right">{t("A sistema")}</TableHead>
                                    <TableHead className="text-right">{t("Contato")}</TableHead>
                                    <TableHead>{t("Scostamento")}</TableHead>
                                    {showValue && <TableHead className="text-right">{t("Valore")}</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visible.map(l => (
                                    <CountRow key={`${version}:${l.partId}`} line={l} savedQty={saved[l.partId] ?? null} editable={open} showValue={showValue} onCommit={commit} />
                                ))}
                            </TableBody>
                        </Table>
                        {hidden > 0 && (
                            <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm print:hidden">
                                <span className="text-muted-foreground">{t("Mostrate {shown} righe su {total}.", { shown: numberFmt.format(visible.length), total: numberFmt.format(filtered.length) })}</span>
                                <Button variant="outline" size="sm" onClick={() => setLimit(l => l + PAGE_STEP)}>{t("Mostra altre {n}", { n: numberFmt.format(Math.min(PAGE_STEP, hidden)) })}</Button>
                            </div>
                        )}
                    </>
                )}
            </Card>
            {open && !detail.canManage && (
                <p className="text-xs text-muted-foreground print:hidden">{t("Puoi registrare i conteggi; la chiusura dell'inventario spetta al supervisor o al responsabile di plant.")}</p>
            )}
            {dialog}
        </div>
    );
}
