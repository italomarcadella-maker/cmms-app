"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { HandHelping, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { PlantBadge } from "@/components/ui/plant-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    listLendableTechnicians, listTechnicianLoans, requestTechnicianLoan, decideTechnicianLoan, cancelTechnicianLoan,
    type LendableTechnician, type LoanRow,
} from "@/modules/maintenance/adapters/actions/loan-actions";

const STATUS: Record<string, { label: string; variant: "info" | "success" | "critical" | "neutral" | "warning" }> = {
    REQUESTED: { label: "In attesa", variant: "warning" },
    APPROVED: { label: "Approvato", variant: "success" },
    REJECTED: { label: "Rifiutato", variant: "critical" },
    CANCELED: { label: "Annullato", variant: "neutral" },
};
const fmt = (iso: string) => new Date(iso).toLocaleDateString("it-IT");
const today = () => new Date().toISOString().slice(0, 10);

export default function TechnicianLoansPage() {
    const [lendable, setLendable] = useState<LendableTechnician[]>([]);
    const [loans, setLoans] = useState<LoanRow[]>([]);
    const [asking, setAsking] = useState<LendableTechnician | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        const [l, r] = await Promise.all([listLendableTechnicians(), listTechnicianLoans()]);
        setLendable(l);
        setLoans(r);
    }, []);
    useEffect(() => {
        let alive = true;
        Promise.all([listLendableTechnicians(), listTechnicianLoans()]).then(([l, r]) => { if (alive) { setLendable(l); setLoans(r); } });
        return () => { alive = false; };
    }, []);

    const act = async (id: string, fn: () => Promise<{ success: boolean; message?: string }>) => {
        setBusyId(id);
        const res = await fn();
        setBusyId(null);
        if (res.success) toast.success(res.message); else toast.error(res.message);
        load();
    };

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <PageHeader
                title="Prestiti di tecnici"
                description="Chiedi in prestito un tecnico di un altro stabilimento per un periodo. Con il via libera del suo responsabile, sarà assegnabile nel tuo plant nelle date indicate."
            />

            <section className="space-y-2">
                <h2 className="text-sm font-semibold">Tecnici disponibili negli altri stabilimenti</h2>
                {lendable.length === 0 ? (
                    <Card><EmptyState icon={<HandHelping />} title="Nessun tecnico di altri stabilimenti" description="Compaiono qui i tecnici attivi assegnati ad altri plant." /></Card>
                ) : (
                    <Card>
                        <CardContent className="divide-y p-0">
                            {lendable.map(t => (
                                <div key={t.technicianId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium">{t.name} <PlantBadge force name={t.plantName} className="ml-1" /></p>
                                        <p className="text-xs text-muted-foreground">{[t.specialty, ...t.skills].filter(Boolean).join(" · ")}</p>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => setAsking(t)}><UserPlus className="h-3.5 w-3.5" /> Chiedi in prestito</Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </section>

            <section className="space-y-2">
                <h2 className="text-sm font-semibold">Richieste e prestiti</h2>
                {loans.length === 0 ? (
                    <Card><EmptyState title="Nessun prestito" description="Le richieste di prestito tra stabilimenti compariranno qui." /></Card>
                ) : (
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tecnico</TableHead>
                                        <TableHead>Da</TableHead>
                                        <TableHead>A</TableHead>
                                        <TableHead>Periodo</TableHead>
                                        <TableHead>Stato</TableHead>
                                        <TableHead className="text-right">Azioni</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loans.map(l => {
                                        const st = STATUS[l.status] ?? { label: l.status, variant: "neutral" as const };
                                        return (
                                            <TableRow key={l.id}>
                                                <TableCell>
                                                    <p className="text-sm font-medium">{l.technicianName}</p>
                                                    {l.note && <p className="text-xs text-muted-foreground">{l.note}</p>}
                                                </TableCell>
                                                <TableCell><PlantBadge force name={l.fromPlantName} /></TableCell>
                                                <TableCell><PlantBadge force name={l.toPlantName} /></TableCell>
                                                <TableCell className="text-sm">{fmt(l.startDate)} - {fmt(l.endDate)}</TableCell>
                                                <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end gap-2">
                                                        {l.canDecide && (
                                                            <>
                                                                <Button size="sm" disabled={busyId === l.id} onClick={() => act(l.id, () => decideTechnicianLoan(l.id, true))}>Approva</Button>
                                                                <Button size="sm" variant="outline" disabled={busyId === l.id} onClick={() => act(l.id, () => decideTechnicianLoan(l.id, false))}>Rifiuta</Button>
                                                            </>
                                                        )}
                                                        {l.canCancel && (
                                                            <Button size="sm" variant="ghost" disabled={busyId === l.id} onClick={() => act(l.id, () => cancelTechnicianLoan(l.id))}>Annulla</Button>
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
                )}
            </section>

            <Dialog open={!!asking} onOpenChange={(o) => { if (!o) setAsking(null); }}>
                {asking && <RequestForm key={asking.technicianId} tech={asking} onClose={() => setAsking(null)} onDone={() => { setAsking(null); load(); }} />}
            </Dialog>
        </div>
    );
}

function RequestForm({ tech, onClose, onDone }: { tech: LendableTechnician; onClose: () => void; onDone: () => void }) {
    const [start, setStart] = useState(today());
    const [end, setEnd] = useState(today());
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setBusy(true);
        const res = await requestTechnicianLoan({ technicianId: tech.technicianId, startDate: start, endDate: end, note });
        setBusy(false);
        if (res.success) { toast.success(res.message); onDone(); } else toast.error(res.message);
    };

    return (
        <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
                <DialogTitle>Chiedi in prestito {tech.name}</DialogTitle>
                <DialogDescription>La richiesta va al responsabile di <strong>{tech.plantName}</strong>.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5"><Label htmlFor="ls">Dal</Label><Input id="ls" type="date" value={start} min={today()} onChange={(e) => setStart(e.target.value)} /></div>
                    <div className="grid gap-1.5"><Label htmlFor="le">Al</Label><Input id="le" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></div>
                </div>
                <div className="grid gap-1.5"><Label htmlFor="ln">Motivo (facoltativo)</Label><Textarea id="ln" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. revisione programmata del compressore" /></div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Annulla</Button>
                <Button onClick={submit} disabled={busy}>{busy ? "Invio..." : "Invia richiesta"}</Button>
            </DialogFooter>
        </DialogContent>
    );
}
