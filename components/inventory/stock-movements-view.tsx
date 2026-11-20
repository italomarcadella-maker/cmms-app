"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "@/lib/i18n/toast";
import { useT, useFormat } from "@/lib/i18n/client";
import { tk } from "@/lib/i18n/translate";
import { ChevronLeft, ChevronRight, Download, History, Search, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PlantBadge } from "@/components/ui/plant-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePlant } from "@/lib/plant-context";
import {
    exportStockMovements, getStockMovements, searchStockParts,
    type PartSearchHit, type StockMovementsResult, type StockMovementRow,
} from "@/modules/inventory/adapters/actions/stock-actions";
import {
    STOCK_MOVEMENT_TYPES, STOCK_MOVEMENT_LABELS, buildCsv, formatSignedQty, movementTypeLabel, parseMovementReference,
} from "@/modules/inventory/domain/stock-movement";

const ALL = "__all__";

// Il riferimento arriva dal dominio come frase italiana con l'id in coda: qui si ricompone nella lingua dell'utente
const REFERENCE_KEYS: Record<string, string> = {
    WORK_ORDER: tk("Ordine {id}"),
    MATERIAL_REQUEST: tk("Richiesta di materiale {id}"),
    PURCHASE_REQUEST: tk("Richiesta d'acquisto {id}"),
    TRANSFER: tk("Trasferimento {id}"),
    STOCK_COUNT: tk("Inventario {id}"),
};

// Il file CSV resta in formato italiano (e' un file di dati)
const csvDateTime = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function StockMovementsView({ initialPartId }: { initialPartId?: string }) {
    const t = useT();
    const fmt = useFormat();
    const numberFmt = { format: (n: number) => fmt.number(n) };
    const refLabel = (r: { kind: string; label: string }) => REFERENCE_KEYS[r.kind] ? t(REFERENCE_KEYS[r.kind], { id: r.label.slice(r.label.lastIndexOf(" ") + 1) }) : r.label;
    const dateTime = { format: (d: Date) => fmt.dateTime(d, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) };
    const { selected: plantSelected, plantName } = usePlant();
    const [partId, setPartId] = useState<string | undefined>(initialPartId || undefined);
    const [partLabel, setPartLabel] = useState<string | null>(null);
    const [type, setType] = useState<string>(ALL);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [page, setPage] = useState(1);

    // Ricerca dell'articolo
    const [query, setQuery] = useState("");
    const [hits, setHits] = useState<{ query: string; items: PartSearchHit[] } | null>(null);
    const searchId = useRef(0);

    // Dati: in caricamento finche' l'ultima risposta non corrisponde ai filtri attuali (nessun setState sincrono nell'effetto)
    const [data, setData] = useState<StockMovementsResult | null>(null);
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const requestKey = JSON.stringify([partId ?? null, type, from, to, page, plantSelected]);
    const loading = loadedKey !== requestKey;
    const requestId = useRef(0);

    useEffect(() => {
        const id = ++requestId.current;
        getStockMovements({
            partId,
            type: type === ALL ? undefined : type,
            from: from || undefined,
            to: to || undefined,
            page,
        })
            .then(res => {
                if (id !== requestId.current) return;
                setData(res);
                if (res.partLabel) setPartLabel(res.partLabel);
                setLoadedKey(requestKey);
            })
            .catch(() => {
                if (id !== requestId.current) return;
                setData({ success: false, message: tk("Impossibile caricare lo storico dei movimenti."), items: [], total: 0, page: 1, pageSize: 50, partLabel: null });
                setLoadedKey(requestKey);
            });
    }, [partId, type, from, to, page, requestKey]);

    // Ricerca articoli con una breve attesa tra un tasto e l'altro
    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) return;
        const id = ++searchId.current;
        const timer = setTimeout(() => {
            searchStockParts(q)
                .then(items => { if (id === searchId.current) setHits({ query: query, items }); })
                .catch(() => { if (id === searchId.current) setHits({ query: query, items: [] }); });
        }, 250);
        return () => clearTimeout(timer);
    }, [query]);

    const visibleHits = query.trim().length >= 2 && hits?.query === query ? hits.items : null;

    const chooseFilter = (apply: () => void) => { apply(); setPage(1); };

    const pickPart = (p: PartSearchHit) => {
        chooseFilter(() => { setPartId(p.id); setPartLabel(p.name); setQuery(""); });
    };

    const resetFilters = () => {
        setPartId(undefined); setPartLabel(null); setQuery(""); setType(ALL); setFrom(""); setTo(""); setPage(1);
    };

    const hasFilters = !!partId || type !== ALL || !!from || !!to;
    const total = data?.total ?? 0;
    const pageSize = data?.pageSize ?? 50;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = data?.page ?? page;

    const exportCsv = async () => {
        setExporting(true);
        try {
            const res = await exportStockMovements({ partId, type: type === ALL ? undefined : type, from: from || undefined, to: to || undefined });
            if (!res.success) { toast.error(res.message ?? t("Esportazione non riuscita.")); return; }
            if (res.items.length === 0) { toast.info(t("Non ci sono movimenti da esportare con questi filtri.")); return; }
            const csv = buildCsv(
                ["Data e ora", "Articolo", "Stabilimento", "Tipo", "Quantità", "Giacenza dopo", "Riferimento", "Utente", "Nota"],
                res.items.map((m: StockMovementRow) => [
                    csvDateTime.format(new Date(m.createdAt)), m.partName, plantName(m.plantId) ?? "", movementTypeLabel(m.type),
                    m.delta, m.balanceAfter, m.reference ?? "", m.userName ?? "", m.note ?? "",
                ]),
            );
            const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = `movimenti-magazzino-${new Date().toLocaleDateString("it-IT").replace(/\//g, "-")}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success(res.truncated ? t("File esportato: contiene i primi 10.000 movimenti, restringi il periodo per vedere gli altri.") : t("File esportato."));
        } catch {
            toast.error(t("Esportazione non riuscita."));
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <PageHeader
                title={t("Storico movimenti")}
                description={t("Ogni carico, scarico, rettifica, trasferimento e inventario del magazzino ricambi, con la giacenza che ne è risultata.")}
                breadcrumb={[{ label: t("Magazzino ricambi"), href: "/inventory" }, { label: t("Storico movimenti") }]}
                actions={(
                    <>
                        <Link href="/inventory/counts" className="inline-flex h-10 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">{t("Inventari")}</Link>
                        <Button variant="outline" onClick={exportCsv} disabled={exporting || loading || total === 0}>
                            <Download className="mr-2 h-4 w-4" /> {exporting ? t("Esporto...") : t("Esporta CSV")}
                        </Button>
                    </>
                )}
            />

            <Card>
                <CardContent className="grid gap-4 pt-6 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="mov-part-search">{t("Articolo")}</Label>
                        {partId ? (
                            <div className="flex h-10 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm">
                                <span className="truncate font-medium">{partLabel ?? t("Articolo selezionato")}</span>
                                <button
                                    type="button"
                                    onClick={() => chooseFilter(() => { setPartId(undefined); setPartLabel(null); })}
                                    className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground hover:text-foreground"
                                    aria-label={t("Togli il filtro per articolo")}
                                >
                                    <X className="h-3.5 w-3.5" /> {t("Togli")}
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
                                <Input
                                    id="mov-part-search"
                                    className="pl-9"
                                    placeholder={t("Cerca un articolo per nome (almeno 2 lettere)")}
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    autoComplete="off"
                                />
                                {visibleHits && (
                                    <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md" role="listbox" aria-label={t("Articoli trovati")}>
                                        {visibleHits.length === 0 ? (
                                            <li className="px-3 py-2 text-sm text-muted-foreground">{t("Nessun articolo trovato.")}</li>
                                        ) : visibleHits.map(p => (
                                            <li key={p.id} role="option" aria-selected={false}>
                                                <button type="button" onClick={() => pickPart(p)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent">
                                                    <span className="truncate">{p.name}</span>
                                                    <span className="shrink-0 text-xs text-muted-foreground">{t("giacenza {qty}", { qty: numberFmt.format(p.quantity) })}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mov-type">{t("Tipo di movimento")}</Label>
                        <Select value={type} onValueChange={v => chooseFilter(() => setType(v))}>
                            <SelectTrigger id="mov-type"><SelectValue placeholder={t("Tutti i tipi")} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>{t("Tutti i tipi")}</SelectItem>
                                {STOCK_MOVEMENT_TYPES.map(mt => <SelectItem key={mt} value={mt}>{t(STOCK_MOVEMENT_LABELS[mt])}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                            <Label htmlFor="mov-from">{t("Dal")}</Label>
                            <Input id="mov-from" type="date" value={from} max={to || undefined} onChange={e => chooseFilter(() => setFrom(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mov-to">{t("Al")}</Label>
                            <Input id="mov-to" type="date" value={to} min={from || undefined} onChange={e => chooseFilter(() => setTo(e.target.value))} />
                        </div>
                    </div>
                    {hasFilters && (
                        <div className="md:col-span-2 lg:col-span-4">
                            <Button variant="ghost" size="sm" onClick={resetFilters}><X className="mr-1 h-4 w-4" /> {t("Azzera i filtri")}</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                {loading && !data ? (
                    <p className="p-6 text-sm text-muted-foreground">{t("Caricamento...")}</p>
                ) : !data?.success ? (
                    <EmptyState icon={<History />} title={t("Storico non disponibile")} description={t(data?.message ?? "Impossibile caricare i movimenti.")} />
                ) : data.items.length === 0 ? (
                    <EmptyState
                        icon={<History />}
                        title={hasFilters ? t("Nessun movimento con questi filtri") : t("Nessun movimento registrato")}
                        description={hasFilters ? t("Prova a togliere un filtro o ad ampliare il periodo.") : t("I movimenti compaiono qui da quando è attivo lo storico: ogni nuova variazione di giacenza viene registrata.")}
                    />
                ) : (
                    <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={loading}>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("Data")}</TableHead>
                                    <TableHead>{t("Articolo")}</TableHead>
                                    <TableHead>{t("Tipo")}</TableHead>
                                    <TableHead className="text-right">{t("Quantità")}</TableHead>
                                    <TableHead className="text-right">{t("Giacenza dopo")}</TableHead>
                                    <TableHead>{t("Riferimento")}</TableHead>
                                    <TableHead>{t("Utente")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.items.map(m => {
                                    const ref = parseMovementReference(m.reference);
                                    return (
                                        <TableRow key={m.id}>
                                            <TableCell className="whitespace-nowrap text-muted-foreground">{dateTime.format(new Date(m.createdAt))}</TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {m.partId && !partId ? (
                                                        <button type="button" className="text-left hover:underline" onClick={() => chooseFilter(() => { setPartId(m.partId ?? undefined); setPartLabel(m.partName); })}>
                                                            {m.partName}
                                                        </button>
                                                    ) : m.partName}
                                                    {!m.partId && <span className="text-xs font-normal text-muted-foreground">{t("(articolo eliminato)")}</span>}
                                                    <PlantBadge plantId={m.plantId} />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={m.delta > 0 ? "success" : m.delta < 0 ? "warning" : "neutral"}>{t(movementTypeLabel(m.type))}</Badge>
                                                {m.note && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{m.note}</p>}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-right font-mono font-semibold tabular-nums">
                                                {formatSignedQty(m.delta)}
                                                <span className="sr-only">{m.delta > 0 ? " " + t("pezzi in entrata") : m.delta < 0 ? " " + t("pezzi in uscita") : ""}</span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono tabular-nums">{numberFmt.format(m.balanceAfter)}</TableCell>
                                            <TableCell>
                                                {ref ? (ref.href ? <Link href={ref.href} className="text-primary hover:underline">{refLabel(ref)}</Link> : <span>{refLabel(ref)}</span>) : <span className="text-muted-foreground">-</span>}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{m.userName ?? "-"}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
                            <span className="text-muted-foreground">{t("{total} movimenti · pagina {page} di {pages}", { total: numberFmt.format(total), page: currentPage, pages })}</span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" disabled={loading || currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                                    <ChevronLeft className="mr-1 h-4 w-4" /> {t("Precedente")}
                                </Button>
                                <Button variant="outline" size="sm" disabled={loading || currentPage >= pages} onClick={() => setPage(p => p + 1)}>
                                    {t("Successiva")} <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
