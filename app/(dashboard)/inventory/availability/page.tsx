"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
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
import {
    searchPartAvailability, requestPartTransfer, listPartTransfers, decidePartTransfer,
    receivePartTransfer, cancelPartTransfer,
    type AvailabilityGroup, type StockRow, type TransferRow,
} from "@/modules/inventory/adapters/actions/availability-actions";

const STATUS: Record<string, { label: string; variant: "info" | "success" | "critical" | "neutral" | "warning" }> = {
    REQUESTED: { label: "In attesa di approvazione", variant: "warning" },
    APPROVED: { label: "Approvato, in arrivo", variant: "info" },
    RECEIVED: { label: "Ricevuto", variant: "success" },
    REJECTED: { label: "Rifiutato", variant: "critical" },
    CANCELED: { label: "Annullato", variant: "neutral" },
};

export default function AvailabilityPage() {
    return (
        <Suspense fallback={null}>
            <AvailabilityContent />
        </Suspense>
    );
}

function AvailabilityContent() {
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
        if (!res.success) toast.error(res.message ?? "Ricerca non riuscita");
        setGroups(res.groups);
    }, []);

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
                title="Disponibilità tra stabilimenti"
                description="Cerca un ricambio per descrizione: vedi dove è disponibile negli altri stabilimenti e richiedi un trasferimento prima di acquistarlo."
            />

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="search">Cerca ricambio</TabsTrigger>
                    <TabsTrigger value="transfers">
                        Trasferimenti
                        {transfers.some(t => t.canDecide || t.canReceive) && (
                            <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-critical" aria-label="Azioni in sospeso" />
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="mt-4 space-y-4">
                    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); runSearch(query); }}>
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-9"
                                placeholder="Es. cuscinetto 6206, valvola a sfera 1/2..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>
                        <Button type="submit" disabled={loading || query.trim().length < 2}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cerca"}
                        </Button>
                    </form>

                    {searched && !loading && groups.length === 0 && (
                        <Card>
                            <EmptyState
                                icon={<PackageSearch />}
                                title="Nessun ricambio corrispondente"
                                description="Prova con meno parole o con il codice del costruttore. Il confronto avviene sulla descrizione."
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
                                            Corrispondenza {Math.round(group.score * 100)}%
                                        </p>
                                    </div>
                                    {group.totalElsewhere > 0 ? (
                                        <Badge variant="success">{group.totalElsewhere} pz cedibili da altri stabilimenti</Badge>
                                    ) : (
                                        <Badge variant="neutral">Nessuna disponibilità negli altri stabilimenti</Badge>
                                    )}
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Stabilimento</TableHead>
                                            <TableHead>Descrizione a magazzino</TableHead>
                                            <TableHead className="text-right">Giacenza</TableHead>
                                            <TableHead className="text-right">Cedibili</TableHead>
                                            <TableHead>Ubicazione</TableHead>
                                            <TableHead className="w-[1%]" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {group.stocks.map(s => (
                                            <TableRow key={s.partId}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <PlantBadge force name={s.plantName} />
                                                        {s.isOwn && <span className="text-xs text-muted-foreground">il tuo</span>}
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
                                                            <ArrowRightLeft className="h-3.5 w-3.5" /> Richiedi
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
                <DialogTitle>Richiedi trasferimento</DialogTitle>
                <DialogDescription>La richiesta va al responsabile di <strong>{stock.plantName}</strong>, che decide se cedere il ricambio.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
                <p className="text-sm font-medium">{stock.name}</p>
                <div className="grid gap-2">
                    <Label htmlFor="qty">Quantità (max {stock.quantity})</Label>
                    <Input id="qty" type="number" min={1} max={stock.quantity} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Cedibili senza scendere sotto la scorta minima: {stock.surplus}.</p>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="note">Nota (facoltativa)</Label>
                    <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. fermo macchina in corso, serve entro domani" />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Annulla</Button>
                <Button onClick={submit} disabled={busy}>{busy ? "Invio..." : "Invia richiesta"}</Button>
            </DialogFooter>
        </DialogContent>
    );
}

function TransfersTable({ rows, onChanged }: { rows: TransferRow[]; onChanged: () => void }) {
    const [busyId, setBusyId] = useState<string | null>(null);

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
                <EmptyState icon={<ArrowRightLeft />} title="Nessun trasferimento" description="Le richieste di ricambi tra stabilimenti compariranno qui." />
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ricambio</TableHead>
                            <TableHead className="text-right">Pz</TableHead>
                            <TableHead>Da</TableHead>
                            <TableHead>A</TableHead>
                            <TableHead>Stato</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Azioni</TableHead>
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
                                        {r.decisionNote && <p className="text-xs text-muted-foreground">Risposta: {r.decisionNote}</p>}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums">{r.quantity}</TableCell>
                                    <TableCell><PlantBadge force name={r.fromPlantName} /></TableCell>
                                    <TableCell><PlantBadge force name={r.toPlantName} /></TableCell>
                                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("it-IT")}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            {r.canDecide && (
                                                <>
                                                    <Button size="sm" disabled={busyId === r.id} onClick={() => act(r.id, () => decidePartTransfer(r.id, true))}>Approva</Button>
                                                    <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => {
                                                        const reason = window.prompt("Motivo del rifiuto (facoltativo)") ?? undefined;
                                                        act(r.id, () => decidePartTransfer(r.id, false, reason));
                                                    }}>Rifiuta</Button>
                                                </>
                                            )}
                                            {r.canReceive && (
                                                <Button size="sm" disabled={busyId === r.id} onClick={() => act(r.id, () => receivePartTransfer(r.id))}>Conferma ricezione</Button>
                                            )}
                                            {r.canCancel && (
                                                <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => act(r.id, () => cancelPartTransfer(r.id))}>Annulla</Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
