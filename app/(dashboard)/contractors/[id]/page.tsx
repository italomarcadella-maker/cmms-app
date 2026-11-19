"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, FileSignature, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PlantBadge } from "@/components/ui/plant-badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { frequencyText } from "@/modules/maintenance/domain/contractors";
import { ActivityFormDialog, ContractFormDialog, ContractorFormDialog, ExecutionDialog } from "@/components/contractors/contractor-dialogs";
import { ActivityStateBadge, ContractStateBadge } from "@/components/contractors/state-badges";
import {
    deleteActivity, deleteContract, getContractorDetail, setActivityActive,
    type ContractorDetail,
} from "@/modules/maintenance/adapters/actions/contractor-actions";

const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("it-IT") : "-");

export default function ContractorDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { confirm, dialog } = useConfirm();
    const [version, setVersion] = useState(0);
    const [data, setData] = useState<ContractorDetail | null>(null);

    useEffect(() => {
        let alive = true;
        getContractorDetail(id).then(d => { if (alive) setData(d); });
        return () => { alive = false; };
    }, [id, version]);

    const reload = () => setVersion(v => v + 1);

    if (!data) return <p className="text-sm text-muted-foreground">Caricamento...</p>;
    const c = data.contractor;
    if (!c) {
        return (
            <Card className="mx-auto max-w-xl">
                <EmptyState title="Ditta non trovata" description="Non esiste, oppure non hai contratti con questa ditta nei tuoi stabilimenti." action={<Button asChild variant="outline"><Link href="/contractors">Torna alle ditte</Link></Button>} />
            </Card>
        );
    }

    const act = async (fn: () => Promise<{ success: boolean; message: string }>) => {
        const res = await fn();
        if (res.success) toast.success(res.message); else toast.error(res.message);
        reload();
    };

    const removeContract = async (contractId: string, title: string) => {
        const ok = await confirm({ title: "Eliminare il contratto?", description: `"${title}" e tutte le sue attività e gli interventi registrati verranno eliminati.`, confirmLabel: "Elimina", variant: "destructive" });
        if (ok) act(() => deleteContract(contractId));
    };
    const removeActivity = async (activityId: string, title: string) => {
        const ok = await confirm({ title: "Eliminare l'attività?", description: `"${title}" e il suo storico di interventi verranno eliminati.`, confirmLabel: "Elimina", variant: "destructive" });
        if (ok) act(() => deleteActivity(activityId));
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <PageHeader
                breadcrumb={[{ label: "Ditte esterne", href: "/contractors" }, { label: c.name }]}
                title={c.name}
                description={[c.vatNumber && `P. IVA ${c.vatNumber}`, c.contactName, c.contactPhone, c.contactEmail].filter(Boolean).join(" · ") || "Nessun referente indicato"}
                actions={data.canManage && (
                    <ContractorFormDialog contractor={c} trigger={<Button variant="outline"><Pencil className="h-4 w-4" /> Modifica</Button>} onSaved={reload} />
                )}
            />
            {c.notes && <p className="text-sm text-muted-foreground">{c.notes}</p>}

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Contratti</h2>
                    {data.canManage && (
                        <ContractFormDialog contractorId={c.id} trigger={<Button size="sm"><Plus className="h-4 w-4" /> Nuovo contratto</Button>} onSaved={reload} />
                    )}
                </div>
                {data.contracts.length === 0 ? (
                    <Card><EmptyState icon={<FileSignature />} title="Nessun contratto nei tuoi stabilimenti" description="Crea un contratto per stabilimento, poi aggiungi le attività periodiche previste." /></Card>
                ) : data.contracts.map(k => (
                    <Card key={k.id}>
                        <CardContent className="space-y-3 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold">{k.title}</p>
                                        <PlantBadge force name={k.plantName} />
                                        <ContractStateBadge state={k.state} daysToEnd={k.daysToEnd} />
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Dal {fmt(k.startDate)} {k.endDate ? `al ${fmt(k.endDate)}` : "senza scadenza"}
                                        {k.annualValue != null ? ` · ${eur.format(k.annualValue)} l'anno` : ""}
                                        {` · preavviso di rinnovo ${k.renewalNoticeDays} giorni`}
                                    </p>
                                    {k.scope && <p className="mt-1 text-sm text-muted-foreground">{k.scope}</p>}
                                </div>
                                {data.canManage && (
                                    <div className="flex flex-wrap gap-2">
                                        <ActivityFormDialog contract={k} assets={data.assets} trigger={<Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" /> Attività</Button>} onSaved={reload} />
                                        <ContractFormDialog contractorId={c.id} contract={k} trigger={<Button size="sm" variant="ghost"><Pencil className="h-3.5 w-3.5" /> Modifica</Button>} onSaved={reload} />
                                        <Button size="sm" variant="ghost" aria-label={`Elimina ${k.title}`} onClick={() => removeContract(k.id, k.title)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                    </div>
                                )}
                            </div>

                            {(() => {
                                const rows = data.activities.filter(a => a.contractId === k.id);
                                if (rows.length === 0) return <p className="text-sm text-muted-foreground">Nessuna attività periodica per questo contratto.</p>;
                                return (
                                    <div className="overflow-x-auto rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Attività</TableHead>
                                                    <TableHead>Macchina</TableHead>
                                                    <TableHead>Frequenza</TableHead>
                                                    <TableHead>Ultima</TableHead>
                                                    <TableHead>Prossima</TableHead>
                                                    <TableHead className="w-[1%]" />
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {rows.map(a => (
                                                    <TableRow key={a.id} className={a.isActive ? "" : "opacity-60"}>
                                                        <TableCell>
                                                            <p className="text-sm font-medium">{a.title}</p>
                                                            {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                                                            {a.assigneeName && <p className="text-xs text-muted-foreground">Referente interno: {a.assigneeName}</p>}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">{a.assetName ?? "-"}</TableCell>
                                                        <TableCell className="text-sm">{frequencyText(a.frequencyDays)}</TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">{fmt(a.lastDoneAt)}</TableCell>
                                                        <TableCell><div className="flex items-center gap-2"><span className="text-sm tabular-nums">{fmt(a.nextDueDate)}</span><ActivityStateBadge state={a.state} /></div></TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1">
                                                                {a.isActive && <ExecutionDialog activity={a} trigger={<Button size="sm" variant="outline">Registra intervento</Button>} onSaved={reload} />}
                                                                {data.canManage && (
                                                                    <>
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={a.isActive ? "Sospendi" : "Riattiva"} onClick={() => act(() => setActivityActive(a.id, !a.isActive))}>
                                                                            {a.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                                                        </Button>
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Elimina ${a.title}`} onClick={() => removeActivity(a.id, a.title)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                ))}
            </section>

            <section className="space-y-3">
                <h2 className="text-base font-semibold">Storico degli interventi</h2>
                {data.executions.length === 0 ? (
                    <Card><EmptyState title="Nessun intervento registrato" description="Quando la ditta interviene, registralo dall'attività: si aggiorna la scadenza successiva." /></Card>
                ) : (
                    <Card>
                        <CardContent className="overflow-x-auto p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Attività</TableHead>
                                        <TableHead>Esito</TableHead>
                                        <TableHead className="text-right">Costo</TableHead>
                                        <TableHead>Note e rapporto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.executions.map(e => (
                                        <TableRow key={e.id}>
                                            <TableCell className="text-sm tabular-nums">{fmt(e.doneAt)}</TableCell>
                                            <TableCell className="text-sm">{e.activityTitle}</TableCell>
                                            <TableCell>{e.outcome === "ISSUES" ? <Badge variant="warning">Con criticità</Badge> : <Badge variant="success">In regola</Badge>}</TableCell>
                                            <TableCell className="text-right text-sm tabular-nums">{e.cost != null ? eur.format(e.cost) : "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {e.notes}
                                                {e.reportUrl && (
                                                    <a href={e.reportUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-primary hover:underline">
                                                        Rapporto <ExternalLink className="h-3 w-3" aria-hidden />
                                                    </a>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </section>
            {dialog}
        </div>
    );
}
