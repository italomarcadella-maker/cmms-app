"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "@/lib/i18n/toast";
import { useT, useFormat } from "@/lib/i18n/client";
import { tk } from "@/lib/i18n/translate";

import {
    getAssetBom,
    removeAssetPart,
    searchAssetPartCandidates,
    setAssetPart,
    type AssetBom,
    type AssetBomRow,
    type PartCandidate,
} from "@/modules/maintenance/adapters/actions/asset-hierarchy-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePrompt } from "@/components/ui/prompt-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MIN_SEARCH_LENGTH = 2;

interface AssetBomProps {
    assetId: string;
    /** Chi puo' aggiungere, modificare e togliere ricambi (come lato server: amministratori, responsabili, supervisor, ingegneri). */
    canEdit: boolean;
}

function StockBadge({ row }: { row: AssetBomRow }) {
    const t = useT();
    const fmt = useFormat();
    if (!row.belowMin) return <Badge variant="success">{t("Disponibile")}</Badge>;
    if (row.stock === 0)
        return <Badge variant="critical">{row.missing > 0 ? t("Esaurito (mancano {count})", { count: fmt.number(row.missing) }) : t("Esaurito")}</Badge>;
    if (row.missing > 0) return <Badge variant="critical">{t("Sotto scorta (mancano {count})", { count: fmt.number(row.missing) })}</Badge>;
    return <Badge variant="warning">{t("Al minimo")}</Badge>;
}

export function AssetBomPanel({ assetId, canEdit }: AssetBomProps) {
    const t = useT();
    const fmt = useFormat();
    const { confirm, dialog: confirmDialog } = useConfirm();
    const { ask, dialog: promptDialog } = usePrompt();

    // La distinta si ricarica quando cambia l'asset o dopo ogni modifica: lo stato di caricamento si ricava dalla chiave
    const [reload, setReload] = useState(0);
    const requestKey = `${assetId}:${reload}`;
    const [bom, setBom] = useState<{ key: string; data: AssetBom } | null>(null);
    const loading = bom?.key !== requestKey;

    useEffect(() => {
        let alive = true;
        getAssetBom(assetId)
            .then((data) => {
                if (alive) setBom({ key: requestKey, data });
            })
            .catch(() => {
                if (alive) setBom({ key: requestKey, data: { success: false, message: tk("Errore nel caricamento della distinta"), rows: [] } });
            });
        return () => {
            alive = false;
        };
    }, [assetId, requestKey]);

    // Ricerca nel magazzino dello stesso stabilimento
    const [query, setQuery] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [notes, setNotes] = useState("");
    const [busyPart, setBusyPart] = useState<string | null>(null);
    const [results, setResults] = useState<{ key: string; parts: PartCandidate[]; failed: boolean } | null>(null);
    const trimmed = query.trim();
    const searchKey = `${assetId}:${reload}:${trimmed}`;
    const searchActive = canEdit && trimmed.length >= MIN_SEARCH_LENGTH;
    const searching = searchActive && results?.key !== searchKey;
    const shown = searchActive && results?.key === searchKey ? results : null;

    useEffect(() => {
        if (!canEdit || trimmed.length < MIN_SEARCH_LENGTH) return;
        let alive = true;
        const timer = setTimeout(() => {
            searchAssetPartCandidates(assetId, trimmed)
                .then((r) => {
                    if (alive) setResults({ key: searchKey, parts: r.parts, failed: !r.success });
                })
                .catch(() => {
                    if (alive) setResults({ key: searchKey, parts: [], failed: true });
                });
        }, 250);
        return () => {
            alive = false;
            clearTimeout(timer);
        };
    }, [assetId, canEdit, trimmed, searchKey]);

    const data = bom?.data;
    const rows = data?.rows ?? [];
    const lowCount = rows.filter((r) => r.belowMin).length;

    async function addPart(part: PartCandidate) {
        const qty = Number(quantity);
        if (!Number.isInteger(qty) || qty < 1 || qty > 1000) {
            toast.error("Quantità non valida", { description: "Indica un numero intero tra 1 e 1000." });
            return;
        }
        setBusyPart(part.id);
        try {
            const res = await setAssetPart(assetId, part.id, qty, notes);
            if (res.success) {
                toast.success(t("{name} aggiunto alla distinta", { name: part.name }));
                setQuery("");
                setNotes("");
                setQuantity("1");
                setReload((n) => n + 1);
            } else {
                toast.error("Impossibile aggiungere il ricambio", { description: res.message });
            }
        } catch {
            toast.error("Si è verificato un errore imprevisto");
        } finally {
            setBusyPart(null);
        }
    }

    async function changeQuantity(row: AssetBomRow) {
        const value = await ask({
            title: t("Quantità montata: {name}", { name: row.name }),
            label: t("Quanti pezzi monta la macchina (intero da 1 a 1000)"),
            defaultValue: String(row.mounted),
            inputType: "number",
            required: true,
            confirmLabel: t("Salva"),
        });
        if (value === null || value === undefined) return;
        const qty = Number(value);
        if (!Number.isInteger(qty) || qty < 1 || qty > 1000) {
            toast.error("Quantità non valida", { description: "Indica un numero intero tra 1 e 1000." });
            return;
        }
        const res = await setAssetPart(assetId, row.partId, qty, row.notes);
        if (res.success) {
            toast.success("Quantità aggiornata");
            setReload((n) => n + 1);
        } else {
            toast.error("Impossibile aggiornare la quantità", { description: res.message });
        }
    }

    async function removePart(row: AssetBomRow) {
        const ok = await confirm({
            title: t("Togliere il ricambio dalla distinta?"),
            description: t("{name} non risulterà più montato su questa macchina. L'articolo resta in magazzino.", { name: row.name }),
            confirmLabel: t("Togli"),
            variant: "destructive",
        });
        if (!ok) return;
        const res = await removeAssetPart(assetId, row.partId);
        if (res.success) {
            toast.success("Ricambio tolto dalla distinta");
            setReload((n) => n + 1);
        } else {
            toast.error("Impossibile togliere il ricambio", { description: res.message });
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("Distinta ricambi")}</CardTitle>
                <CardDescription>
                    {t("I ricambi montati su questa macchina, con giacenza e scorta minima del magazzino dello stabilimento.")}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                {canEdit && (
                    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                        <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                            <div className="space-y-1.5">
                                <Label htmlFor="bom-search">{t("Aggiungi un ricambio dal magazzino")}</Label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="bom-search"
                                        className="pl-9"
                                        placeholder={t("Cerca per nome o categoria, ad esempio cuscinetto")}
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="bom-qty">{t("Quantità")}</Label>
                                <Input id="bom-qty" type="number" inputMode="numeric" min={1} max={1000} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bom-notes">{t("Note (facoltative)")}</Label>
                            <Input id="bom-notes" maxLength={300} placeholder={t("Ad esempio: lato motore")} value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>

                        {searchActive && (
                            <div aria-live="polite">
                                {searching ? (
                                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" /> {t("Ricerca nel magazzino")}
                                    </p>
                                ) : shown?.failed ? (
                                    <p className="text-sm text-critical-strong">{t("Ricerca non riuscita. Riprova.")}</p>
                                ) : shown && shown.parts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">{t("Nessun articolo del magazzino di questo stabilimento corrisponde a “{query}”.", { query: trimmed })}</p>
                                ) : (
                                    <ul className="divide-y rounded-md border bg-background">
                                        {shown?.parts.map((p) => (
                                            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-medium">{p.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {[p.category, p.location ? t("Ubicazione {value}", { value: p.location }) : null, t("Giacenza {value}", { value: fmt.number(p.stock) })].filter(Boolean).join(" · ")}
                                                    </div>
                                                </div>
                                                {p.alreadyMounted ? (
                                                    <Badge variant="neutral">{t("Già in distinta")}</Badge>
                                                ) : (
                                                    <Button size="sm" variant="outline" disabled={busyPart !== null} onClick={() => addPart(p)}>
                                                        {busyPart === p.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
                                                        {t("Aggiungi")}
                                                    </Button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {loading && !data ? (
                    <div className="space-y-2" aria-busy>
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : data && !data.success ? (
                    <p className="text-sm text-critical-strong">{data.message ? t(data.message) : t("Impossibile caricare la distinta.")}</p>
                ) : rows.length === 0 ? (
                    <EmptyState
                        icon={<Package />}
                        title={t("Nessun ricambio in distinta")}
                        description={canEdit ? t("Cerca un articolo del magazzino qui sopra per collegarlo a questa macchina.") : t("Nessun ricambio è stato ancora collegato a questa macchina.")}
                        className="py-8"
                    />
                ) : (
                    <div className={loading ? "space-y-3 opacity-60 transition-opacity" : "space-y-3 transition-opacity"} aria-busy={loading}>
                        {lowCount > 0 && (
                            <p className="text-sm font-medium text-critical-strong" role="status">
                                {lowCount === 1 ? t("1 ricambio è al minimo o sotto scorta.") : t("{count} ricambi sono al minimo o sotto scorta.", { count: lowCount })}
                            </p>
                        )}
                        <div className="overflow-x-auto rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>{t("Ricambio")}</TableHead>
                                        <TableHead className="text-right">{t("Montati")}</TableHead>
                                        <TableHead className="text-right">{t("Giacenza")}</TableHead>
                                        <TableHead className="text-right">{t("Minimo")}</TableHead>
                                        <TableHead>{t("Ubicazione")}</TableHead>
                                        <TableHead>{t("Scorta")}</TableHead>
                                        {canEdit && (
                                            <TableHead className="w-[90px] text-right">
                                                <span className="sr-only">{t("Azioni")}</span>
                                            </TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>
                                                <div className="font-medium">{row.name}</div>
                                                {(row.category || row.notes) && (
                                                    <div className="text-xs text-muted-foreground">{[row.category, row.notes].filter(Boolean).join(" · ")}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{fmt.number(row.mounted)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{fmt.number(row.stock)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{fmt.number(row.minStock)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{[row.warehouse, row.location].filter(Boolean).join(" · ") || t("N/D")}</TableCell>
                                            <TableCell>
                                                <StockBadge row={row} />
                                            </TableCell>
                                            {canEdit && (
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-0.5">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => changeQuantity(row)} aria-label={t("Modifica la quantità di {name}", { name: row.name })}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-critical-strong" onClick={() => removePart(row)} aria-label={t("Togli {name} dalla distinta", { name: row.name })}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </CardContent>
            {confirmDialog}
            {promptDialog}
        </Card>
    );
}
