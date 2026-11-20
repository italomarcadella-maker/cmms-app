"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "@/lib/i18n/toast";
import { useT, useFormat } from "@/lib/i18n/client";
import { tk } from "@/lib/i18n/translate";
import { ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlantBadge } from "@/components/ui/plant-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { usePlant } from "@/lib/plant-context";
import {
    getStockCountOptions, listStockCounts, startStockCount,
    type StockCountListItem, type StockCountOptions,
} from "@/modules/inventory/adapters/actions/stock-actions";
import { StockCountSheet } from "./stock-count-sheet";

const ANY = "__any__";
const CATEGORY_LABELS: Record<string, string> = { Consumables: tk("Consumabili"), Spares: tk("Ricambi critici"), Tools: tk("Utensili") };
function useFormats() {
    const fmt = useFormat();
    return {
        numberFmt: { format: (n: number) => fmt.number(n) },
        dateTimeFmt: { format: (d: Date) => fmt.dateTime(d, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
    };
}

export function StockCountsView({ initialCountId }: { initialCountId?: string }) {
    const t = useT();
    const { numberFmt, dateTimeFmt } = useFormats();
    const { selected: plantSelected } = usePlant();
    const [openId, setOpenId] = useState<string | null>(initialCountId ?? null);
    const [version, setVersion] = useState(0);
    const [counts, setCounts] = useState<StockCountListItem[]>([]);
    const [options, setOptions] = useState<StockCountOptions>({ plants: [], combos: [], canStart: false });
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const requestKey = `${version}:${plantSelected}`;
    const loading = loadedKey !== requestKey;
    const requestId = useRef(0);

    const [starting, setStarting] = useState(false);

    useEffect(() => {
        const id = ++requestId.current;
        Promise.all([listStockCounts(), getStockCountOptions()])
            .then(([list, opts]) => {
                if (id !== requestId.current) return;
                setCounts(list);
                setOptions(opts);
                setLoadedKey(requestKey);
            })
            .catch(() => {
                if (id !== requestId.current) return;
                setCounts([]);
                setLoadedKey(requestKey);
            });
    }, [requestKey]);

    if (openId) {
        return (
            <div className="mx-auto max-w-6xl">
                <StockCountSheet countId={openId} onBack={() => { setOpenId(null); setVersion(v => v + 1); }} />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <PageHeader
                title={t("Inventari")}
                description={t("Conta fisicamente i ricambi, confronta il contato con la giacenza a sistema e, se vuoi, allinea le giacenze con un movimento di inventario.")}
                breadcrumb={[{ label: t("Magazzino ricambi"), href: "/inventory" }, { label: t("Inventari") }]}
                actions={(
                    <>
                        <Link href="/inventory/movements" className="inline-flex h-10 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">{t("Storico movimenti")}</Link>
                        {options.canStart && <Button onClick={() => setStarting(true)}><Plus className="mr-2 h-4 w-4" /> {t("Avvia un inventario")}</Button>}
                    </>
                )}
            />

            <Card>
                {loading && counts.length === 0 ? (
                    <p className="p-6 text-sm text-muted-foreground">{t("Caricamento...")}</p>
                ) : counts.length === 0 ? (
                    <EmptyState
                        icon={<ClipboardList />}
                        title={t("Nessun inventario")}
                        description={options.canStart ? t("Avvia un inventario per contare i ricambi di uno stabilimento.") : t("Quando il supervisor avvia un inventario lo trovi qui e puoi registrare i conteggi.")}
                        action={options.canStart ? <Button onClick={() => setStarting(true)}><Plus className="mr-2 h-4 w-4" /> {t("Avvia un inventario")}</Button> : undefined}
                    />
                ) : (
                    <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={loading}>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("Stabilimento")}</TableHead>
                                    <TableHead>{t("Stato")}</TableHead>
                                    <TableHead>{t("Aperto")}</TableHead>
                                    <TableHead>{t("Avanzamento")}</TableHead>
                                    <TableHead>{t("Note")}</TableHead>
                                    <TableHead className="text-right"><span className="sr-only">{t("Azioni")}</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {counts.map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-wrap items-center gap-2">{c.plantName}<PlantBadge plantId={c.plantId} /></div>
                                        </TableCell>
                                        <TableCell><Badge variant={c.status === "OPEN" ? "info" : "neutral"}>{c.status === "OPEN" ? t("Aperto") : t("Chiuso")}</Badge></TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {dateTimeFmt.format(new Date(c.createdAt))}
                                            <div className="text-xs">{t("da {name}", { name: c.createdByName })}</div>
                                            {c.closedAt && <div className="text-xs">{t("chiuso il {date}", { date: dateTimeFmt.format(new Date(c.closedAt)) })}</div>}
                                        </TableCell>
                                        <TableCell className="tabular-nums">{t("{counted} di {total} righe", { counted: numberFmt.format(c.countedLines), total: numberFmt.format(c.totalLines) })}</TableCell>
                                        <TableCell className="max-w-56 text-muted-foreground">{c.note ?? "-"}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => setOpenId(c.id)}>{c.status === "OPEN" ? t("Apri e conta") : t("Vedi")}</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            {starting && (
                <StartDialog
                    options={options}
                    defaultPlantId={plantSelected !== "ALL" ? plantSelected : options.plants.length === 1 ? options.plants[0].id : ""}
                    onClose={() => setStarting(false)}
                    onStarted={id => { setStarting(false); setOpenId(id); }}
                />
            )}
        </div>
    );
}

function StartDialog({ options, defaultPlantId, onClose, onStarted }: {
    options: StockCountOptions;
    defaultPlantId: string;
    onClose: () => void;
    onStarted: (countId: string) => void;
}) {
    const t = useT();
    const [plantId, setPlantId] = useState(defaultPlantId);
    const [warehouse, setWarehouse] = useState(ANY);
    const [category, setCategory] = useState(ANY);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const combos = useMemo(() => options.combos.filter(c => !plantId || c.plantId === plantId), [options.combos, plantId]);
    const warehouses = useMemo(() => [...new Set(combos.map(c => c.warehouse).filter((w): w is string => !!w))].sort((a, b) => a.localeCompare(b, "it")), [combos]);
    const categories = useMemo(() => [...new Set(combos.map(c => c.category).filter((w): w is string => !!w))].sort((a, b) => a.localeCompare(b, "it")), [combos]);

    const submit = async () => {
        if (!plantId) { toast.warning(t("Scegli lo stabilimento.")); return; }
        setBusy(true);
        try {
            const res = await startStockCount({
                plantId,
                warehouse: warehouse === ANY ? undefined : warehouse,
                category: category === ANY ? undefined : category,
                note: note.trim() || undefined,
            });
            if (res.success && res.id) { toast.success(res.message); onStarted(res.id); } else toast.error(res.message);
        } catch {
            toast.error(t("Impossibile avviare l'inventario."));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("Avvia un inventario")}</DialogTitle>
                    <DialogDescription>
                        {t("Si crea una riga per ogni articolo dello stabilimento, con la giacenza a sistema di adesso. Puoi limitare l'inventario a un magazzino o a una categoria. Per stabilimento può essere aperto un solo inventario alla volta.")}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {options.plants.length > 1 && (
                        <div className="space-y-2">
                            <Label htmlFor="count-plant">{t("Stabilimento")}</Label>
                            <Select value={plantId || undefined} onValueChange={v => { setPlantId(v); setWarehouse(ANY); setCategory(ANY); }}>
                                <SelectTrigger id="count-plant"><SelectValue placeholder={t("Scegli lo stabilimento")} /></SelectTrigger>
                                <SelectContent>{options.plants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="count-wh">{t("Magazzino (facoltativo)")}</Label>
                        <Select value={warehouse} onValueChange={setWarehouse}>
                            <SelectTrigger id="count-wh"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ANY}>{t("Tutti i magazzini")}</SelectItem>
                                {warehouses.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="count-cat">{t("Categoria (facoltativa)")}</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger id="count-cat"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ANY}>{t("Tutte le categorie")}</SelectItem>
                                {categories.map(c => <SelectItem key={c} value={c}>{t(CATEGORY_LABELS[c] ?? c)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="count-note">{t("Nota (facoltativa)")}</Label>
                        <Input id="count-note" maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder={t("Es. inventario di fine anno")} />
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={busy}>{t("Annulla")}</Button>
                    <Button onClick={submit} disabled={busy}>{busy ? t("Avvio...") : t("Avvia l'inventario")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
