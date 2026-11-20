"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/i18n/toast";
import { useT, useFormat } from "@/lib/i18n/client";
import { tk } from "@/lib/i18n/translate";
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
    REQUESTED: { label: tk("In attesa"), variant: "warning" },
    APPROVED: { label: tk("Approvato"), variant: "success" },
    REJECTED: { label: tk("Rifiutato"), variant: "critical" },
    CANCELED: { label: tk("Annullato"), variant: "neutral" },
};
const today = () => new Date().toISOString().slice(0, 10);

export default function TechnicianLoansPage() {
    const t = useT();
    const f = useFormat();
    const fmt = (iso: string) => f.date(iso);
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
                title={t("Prestiti di tecnici")}
                description={t("Chiedi in prestito un tecnico di un altro stabilimento per un periodo. Con il via libera del suo responsabile, sarà assegnabile nel tuo plant nelle date indicate.")}
            />

            <section className="space-y-2">
                <h2 className="text-sm font-semibold">{t("Tecnici disponibili negli altri stabilimenti")}</h2>
                {lendable.length === 0 ? (
                    <Card><EmptyState icon={<HandHelping />} title={t("Nessun tecnico di altri stabilimenti")} description={t("Compaiono qui i tecnici attivi assegnati ad altri plant.")} /></Card>
                ) : (
                    <Card>
                        <CardContent className="divide-y p-0">
                            {lendable.map(tech => (
                                <div key={tech.technicianId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-medium">{tech.name} <PlantBadge force name={tech.plantName} className="ml-1" /></p>
                                        <p className="text-xs text-muted-foreground">{[tech.specialty, ...tech.skills].filter(Boolean).join(" · ")}</p>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => setAsking(tech)}><UserPlus className="h-3.5 w-3.5" /> {t("Chiedi in prestito")}</Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </section>

            <section className="space-y-2">
                <h2 className="text-sm font-semibold">{t("Richieste e prestiti")}</h2>
                {loans.length === 0 ? (
                    <Card><EmptyState title={t("Nessun prestito")} description={t("Le richieste di prestito tra stabilimenti compariranno qui.")} /></Card>
                ) : (
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("Tecnico")}</TableHead>
                                        <TableHead>{t("Da")}</TableHead>
                                        <TableHead>{t("A")}</TableHead>
                                        <TableHead>{t("Periodo")}</TableHead>
                                        <TableHead>{t("Stato")}</TableHead>
                                        <TableHead className="text-right">{t("Azioni")}</TableHead>
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
                                                <TableCell><Badge variant={st.variant}>{t(st.label)}</Badge></TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end gap-2">
                                                        {l.canDecide && (
                                                            <>
                                                                <Button size="sm" disabled={busyId === l.id} onClick={() => act(l.id, () => decideTechnicianLoan(l.id, true))}>{t("Approva")}</Button>
                                                                <Button size="sm" variant="outline" disabled={busyId === l.id} onClick={() => act(l.id, () => decideTechnicianLoan(l.id, false))}>{t("Rifiuta")}</Button>
                                                            </>
                                                        )}
                                                        {l.canCancel && (
                                                            <Button size="sm" variant="ghost" disabled={busyId === l.id} onClick={() => act(l.id, () => cancelTechnicianLoan(l.id))}>{t("Annulla")}</Button>
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
    const t = useT();
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
                <DialogTitle>{t("Chiedi in prestito {name}", { name: tech.name })}</DialogTitle>
                <DialogDescription>{t("La richiesta va al responsabile di {plant}.", { plant: tech.plantName })}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5"><Label htmlFor="ls">{t("Dal")}</Label><Input id="ls" type="date" value={start} min={today()} onChange={(e) => setStart(e.target.value)} /></div>
                    <div className="grid gap-1.5"><Label htmlFor="le">{t("Al")}</Label><Input id="le" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></div>
                </div>
                <div className="grid gap-1.5"><Label htmlFor="ln">{t("Motivo (facoltativo)")}</Label><Textarea id="ln" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Es. revisione programmata del compressore")} /></div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>{t("Annulla")}</Button>
                <Button onClick={submit} disabled={busy}>{busy ? t("Invio...") : t("Invia richiesta")}</Button>
            </DialogFooter>
        </DialogContent>
    );
}
