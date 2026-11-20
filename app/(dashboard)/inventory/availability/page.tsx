"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/lib/i18n/toast";
import { useT, useFormat } from "@/lib/i18n/client";
import { ArrowRightLeft, Loader2, PackageSearch, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PlantBadge } from "@/components/ui/plant-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePrompt } from "@/components/ui/prompt-dialog";
import { tk } from "@/lib/i18n/translate";
import {
    searchPartAvailability, requestPartTransfer, listPartTransfers, decidePartTransfer,
    receivePartTransfer, cancelPartTransfer,
    type AvailabilityGroup, type StockRow, type TransferRow,
} from "@/modules/inventory/adapters/actions/availability-actions";

const STATUS: Record<string, { label: string; variant: "info" | "success" | "critical" | "neutral" | "warning" }> = {
    REQUESTED: { label: tk("In attesa di approvazione"), variant: "warning" },
    APPROVED: { label: tk("Approvato, in arrivo"), variant: "info" },
    RECEIVED: { label: tk("Ricevuto"), variant: "success" },
    REJECTED: { label: tk("Rifiutato"), variant: "critical" },
    CANCELED: { label: tk("Annullato"), variant: "neutral" },
};

export default function AvailabilityPage() {
    return (
        <Suspense fallback={null}>
            <AvailabilityContent />
        </Suspense>
    );
}

function AvailabilityContent() {
    const t = useT();
    const params = useSearchParams();
    const [tab, setTab] = useState(params.get("tab") === "transfers" ? "transfers" : "search");
    const [query, setQuery] = useState(params.get("search") ?? "");
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [groups, setGroups] = useState<AvailabilityGroup[]>([]);
    const [transfers, setTransfers] = useState<TransferRow[]>([]);
    const [request, setRequest] = useState<StockRow | null>(null);

    const loadTransfers = useCallback(async () => setTransfers(await listPartTransfers()), []);

    const runSearch = useCallback(async (q: string) => {
        if (q.trim().length < 2) return;
        setLoading(true);
        const res = await searchPartAvailability(q);
        setLoading(false);
        setSearched(true);
        if (!res.success) toast.error(res.message ?? t("Ricerca non riuscita"));
        setGroups(res.groups);
    }, [t]);

    useEffect(() => {
        let alive = true;
        listPartTransfers().then(r => { if (alive) setTransfers(r); });
        return () => { alive = false; };
    }, []);
    useEffect(() => {
        const initial = params.get("search");
        if (!initial || initial.trim().length < 2) return;
        let alive = true;
        searchPartAvailability(initial).then(res => { if (alive) { setSearched(true); setGroups(res.groups); } });
        return () => { alive = false; };
    }, [params]);

    return (
        <div className="mx-auto max-w-6xl">
            <PageHeader
                title={t("Disponibilità tra stabilimenti")}
                description={t("Cerca un ricambio per descrizione: vedi dove è disponibile negli altri stabilimenti e richiedi un trasferimento prima di acquistarlo.")}
            />

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="search">{t("Cerca ricambio")}</TabsTrigger>
                    <TabsTrigger value="transfers">
                        {t("Trasferimenti")}
                        {transfers.some(tr => tr.canDecide || tr.canReceive) && (
                            <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-critical" aria-label={t("Azioni in sospeso")} />
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="mt-4 space-y-4">
                    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); runSearch(query); }}>
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-9"
                                placeholder={t("Es. cuscinetto 6206, valvola a sfera 1/2...")}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>
                        <Button type="submit" disabled={loading || query.trim().length < 2}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Cerca")}
                        </Button>
                    </form>

                    {searched && !loading && groups.length === 0 && (
                        <Card>
                            <EmptyState
                                icon={<PackageSearch />}
                                title={t("Nessun ricambio corrispondente")}
                                description={t("Prova con meno parole o con il codice del costruttore. Il confronto avviene sulla descrizione.")}
                            />
                        </Card>
                    )}

                    {groups.map(group => (
                        <Card key={group.catalogId}>
                            <CardContent className="p-0">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                                    <div>
                                        <p className="font-medium">{group.catalogName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {t("Corrispondenza {pct}%", { pct: Math.round(group.score * 100) })}
                                        </p>
                                    </div>
                                    {group.totalElsewhere > 0 ? (
                                        <Badge variant="success">{t("{n} pz cedibili da altri stabilimenti", { n: group.totalElsewhere })}</Badge>
                                    ) : (
                                        <Badge variant="neutral">{t("Nessuna disponibilità negli altri stabilimenti")}</Badge>
                                    )}
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("Stabilimento")}</TableHead>
                                            <TableHead>{t("Descrizione a magazzino")}</TableHead>
                                            <TableHead className="text-right">{t("Giacenza")}</TableHead>
                                            <TableHead className="text-right">{t("Cedibili")}</TableHead>
                                            <TableHead>{t("Ubicazione")}</TableHead>
                                            <TableHead className="w-[1%]" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {group.stocks.map(s => (
                                            <TableRow key={s.partId}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <PlantBadge force name={s.plantName} />
                                                        {s.isOwn && <span className="text-xs text-muted-foreground">{t("il tuo")}</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">{s.name}</TableCell>
                                                <TableCell className="text-right tabular-nums">{s.quantity}</TableCell>
                                                <TableCell className="text-right tabular-nums">{s.surplus}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {[s.warehouse, s.location].filter(Boolean).join(" · ") || "-"}
                                                </TableCell>
                                                <TableCell>
                                                    {!s.isOwn && s.surplus > 0 && (
                                                        <Button size="sm" variant="outline" onClick={() => setRequest(s)}>
                                                            <ArrowRightLeft className="h-3.5 w-3.5" /> {t("Richiedi")}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>

                <TabsContent value="transfers" className="mt-4">
                    <TransfersTable rows={transfers} onChanged={loadTransfers} />
                </TabsContent>
            </Tabs>

            <Dialog open={!!request} onOpenChange={(o) => { if (!o) setRequest(null); }}>
                {request && (
                    <RequestForm
                        key={request.partId}
                        stock={request}
                        onClose={() => setRequest(null)}
                        onDone={() => { setRequest(null); setTab("transfers"); loadTransfers(); }}
                    />
                )}
            </Dialog>
        </div>
    );
}

function RequestForm({ stock, onClose, onDone }: { stock: StockRow; onClose: () => void; onDone: () => void }) {
    const t = useT();
    const [quantity, setQuantity] = useState("1");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setBusy(true);
        const res = await requestPartTransfer({ fromPartId: stock.partId, quantity: Number(quantity), note });
        setBusy(false);
        if (res.success) { toast.success(res.message); onDone(); } else toast.error(res.message);
    };

    return (
        <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
                <DialogTitle>{t("Richiedi trasferimento")}</DialogTitle>
                <DialogDescription>{t("La richiesta va al responsabile di {plant}, che decide se cedere il ricambio.", { plant: stock.plantName })}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
                <p className="text-sm font-medium">{stock.name}</p>
                <div className="grid gap-2">
                    <Label htmlFor="qty">{t("Quantità (max {max})", { max: stock.quantity })}</Label>
                    <Input id="qty" type="number" min={1} max={stock.quantity} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                    <p className="text-xs text-muted-foreground">{t("Cedibili senza scendere sotto la scorta minima: {n}.", { n: stock.surplus })}</p>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="note">{t("Nota (facoltativa)")}</Label>
                    <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Es. fermo macchina in corso, serve entro domani")} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>{t("Annulla")}</Button>
                <Button onClick={submit} disabled={busy}>{busy ? t("Invio...") : t("Invia richiesta")}</Button>
            </DialogFooter>
        </DialogContent>
    );
}

function TransfersTable({ rows, onChanged }: { rows: TransferRow[]; onChanged: () => void }) {
    const t = useT();
    const fmt = useFormat();
    const [busyId, setBusyId] = useState<string | null>(null);
    const { ask, dialog } = usePrompt();

    const act = async (id: string, fn: () => Promise<{ success: boolean; message?: string }>) => {
        setBusyId(id);
        const res = await fn();
        setBusyId(null);
        if (res.success) toast.success(res.message); else toast.error(res.message);
        onChanged();
    };

    if (rows.length === 0) {
        return (
            <Card>
                <EmptyState icon={<ArrowRightLeft />} title={t("Nessun trasferimento")} description={t("Le richieste di ricambi tra stabilimenti compariranno qui.")} />
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("Ricambio")}</TableHead>
                            <TableHead className="text-right">{t("Pz")}</TableHead>
                            <TableHead>{t("Da")}</TableHead>
                            <TableHead>{t("A")}</TableHead>
                            <TableHead>{t("Stato")}</TableHead>
                            <TableHead>{t("Data")}</TableHead>
                            <TableHead className="text-right">{t("Azioni")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map(r => {
                            const st = STATUS[r.status] ?? { label: r.status, variant: "neutral" as const };
                            return (
                                <TableRow key={r.id}>
                                    <TableCell>
                                        <p className="text-sm font-medium">{r.partName}</p>
                                        {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
                                        {r.decisionNote && <p className="text-xs text-muted-foreground">{t("Risposta: {note}", { note: r.decisionNote })}</p>}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{r.quantity}</TableCell>
                                    <TableCell><PlantBadge force name={r.fromPlantName} /></TableCell>
                                    <TableCell><PlantBadge force name={r.toPlantName} /></TableCell>
                                    <TableCell><Badge variant={st.variant}>{t(st.label)}</Badge></TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{fmt.date(r.createdAt)}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            {r.canDecide && (
                                                <>
                                                    <Button size="sm" disabled={busyId === r.id} onClick={() => act(r.id, () => decidePartTransfer(r.id, true))}>{t("Approva")}</Button>
                                                    <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={async () => {
                                                        const answer = await ask({ title: t("Rifiutare la richiesta?"), label: t("Motivo del rifiuto (facoltativo)"), confirmLabel: t("Rifiuta"), variant: "destructive" });
                                                        if (answer === null) return;
                                                        const reason = answer;
                                                        act(r.id, () => decidePartTransfer(r.id, false, reason));
                                                    }}>{t("Rifiuta")}</Button>
                                                </>
                                            )}
                                            {r.canReceive && (
                                                <Button size="sm" disabled={busyId === r.id} onClick={() => act(r.id, () => receivePartTransfer(r.id))}>{t("Conferma ricezione")}</Button>
                                            )}
                                            {r.canCancel && (
                                                <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => act(r.id, () => cancelPartTransfer(r.id))}>{t("Annulla")}</Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
            {dialog}
        </Card>
    );
}
