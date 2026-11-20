"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/lib/i18n/toast";
import { useT, useFormat } from "@/lib/i18n/client";
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

export default function ContractorDetailPage() {
    const t = useT();
    const fmt = useFormat();
    const eur = (n: number) => fmt.currency(n, "EUR", { maximumFractionDigits: 0 });
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

    if (!data) return <p className="text-sm text-muted-foreground">{t("Caricamento...")}</p>;
    const c = data.contractor;
    if (!c) {
        return (
            <Card className="mx-auto max-w-xl">
                <EmptyState title={t("Ditta non trovata")} description={t("Non esiste, oppure non hai contratti con questa ditta nei tuoi stabilimenti.")} action={<Button asChild variant="outline"><Link href="/contractors">{t("Torna alle ditte")}</Link></Button>} />
            </Card>
        );
    }

    const act = async (fn: () => Promise<{ success: boolean; message: string }>) => {
        const res = await fn();
        if (res.success) toast.success(res.message); else toast.error(res.message);
        reload();
    };

    const removeContract = async (contractId: string, title: string) => {
        const ok = await confirm({ title: t("Eliminare il contratto?"), description: t("\"{title}\" e tutte le sue attività e gli interventi registrati verranno eliminati.", { title }), confirmLabel: t("Elimina"), variant: "destructive" });
        if (ok) act(() => deleteContract(contractId));
    };
    const removeActivity = async (activityId: string, title: string) => {
        const ok = await confirm({ title: t("Eliminare l'attività?"), description: t("\"{title}\" e il suo storico di interventi verranno eliminati.", { title }), confirmLabel: t("Elimina"), variant: "destructive" });
        if (ok) act(() => deleteActivity(activityId));
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <PageHeader
                breadcrumb={[{ label: t("Ditte esterne"), href: "/contractors" }, { label: c.name }]}
                title={c.name}
                description={[c.vatNumber && t("P. IVA {vat}", { vat: c.vatNumber }), c.contactName, c.contactPhone, c.contactEmail].filter(Boolean).join(" · ") || t("Nessun referente indicato")}
                actions={data.canManage && (
                    <ContractorFormDialog contractor={c} trigger={<Button variant="outline"><Pencil className="h-4 w-4" /> {t("Modifica")}</Button>} onSaved={reload} />
                )}
            />
            {c.notes && <p className="text-sm text-muted-foreground">{c.notes}</p>}

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">{t("Contratti")}</h2>
                    {data.canManage && (
                        <ContractFormDialog contractorId={c.id} trigger={<Button size="sm"><Plus className="h-4 w-4" /> {t("Nuovo contratto")}</Button>} onSaved={reload} />
                    )}
                </div>
                {data.contracts.length === 0 ? (
                    <Card><EmptyState icon={<FileSignature />} title={t("Nessun contratto nei tuoi stabilimenti")} description={t("Crea un contratto per stabilimento, poi aggiungi le attività periodiche previste.")} /></Card>
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
                                        {k.endDate ? t("Dal {from} al {to}", { from: fmt.date(k.startDate), to: fmt.date(k.endDate) }) : t("Dal {from} senza scadenza", { from: fmt.date(k.startDate) })}
                                        {k.annualValue != null ? ` · ${t("{value} l'anno", { value: eur(k.annualValue) })}` : ""}
                                        {` · ${t("preavviso di rinnovo {n} giorni", { n: k.renewalNoticeDays })}`}
                                    </p>
                                    {k.scope && <p className="mt-1 text-sm text-muted-foreground">{k.scope}</p>}
                                </div>
                                {data.canManage && (
                                    <div className="flex flex-wrap gap-2">
                                        <ActivityFormDialog contract={k} assets={data.assets} trigger={<Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" /> {t("Attività")}</Button>} onSaved={reload} />
                                        <ContractFormDialog contractorId={c.id} contract={k} trigger={<Button size="sm" variant="ghost"><Pencil className="h-3.5 w-3.5" /> {t("Modifica")}</Button>} onSaved={reload} />
                                        <Button size="sm" variant="ghost" aria-label={t("Elimina {title}", { title: k.title })} onClick={() => removeContract(k.id, k.title)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                    </div>
                                )}
                            </div>

                            {(() => {
                                const rows = data.activities.filter(a => a.contractId === k.id);
                                if (rows.length === 0) return <p className="text-sm text-muted-foreground">{t("Nessuna attività periodica per questo contratto.")}</p>;
                                return (
                                    <div className="overflow-x-auto rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t("Attività")}</TableHead>
                                                    <TableHead>{t("Macchina")}</TableHead>
                                                    <TableHead>{t("Frequenza")}</TableHead>
                                                    <TableHead>{t("Ultima")}</TableHead>
                                                    <TableHead>{t("Prossima")}</TableHead>
                                                    <TableHead className="w-[1%]" />
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {rows.map(a => (
                                                    <TableRow key={a.id} className={a.isActive ? "" : "opacity-60"}>
                                                        <TableCell>
                                                            <p className="text-sm font-medium">{a.title}</p>
                                                            {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                                                            {a.assigneeName && <p className="text-xs text-muted-foreground">{t("Referente interno: {name}", { name: a.assigneeName })}</p>}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">{a.assetName ?? "-"}</TableCell>
                                                        <TableCell className="text-sm">{t(frequencyText(a.frequencyDays))}</TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">{fmt.date(a.lastDoneAt)}</TableCell>
                                                        <TableCell><div className="flex items-center gap-2"><span className="text-sm tabular-nums">{fmt.date(a.nextDueDate)}</span><ActivityStateBadge state={a.state} /></div></TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1">
                                                                {a.isActive && <ExecutionDialog activity={a} trigger={<Button size="sm" variant="outline">{t("Registra intervento")}</Button>} onSaved={reload} />}
                                                                {data.canManage && (
                                                                    <>
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={a.isActive ? t("Sospendi") : t("Riattiva")} onClick={() => act(() => setActivityActive(a.id, !a.isActive))}>
                                                                            {a.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                                                        </Button>
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={t("Elimina {title}", { title: a.title })} onClick={() => removeActivity(a.id, a.title)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
                <h2 className="text-base font-semibold">{t("Storico degli interventi")}</h2>
                {data.executions.length === 0 ? (
                    <Card><EmptyState title={t("Nessun intervento registrato")} description={t("Quando la ditta interviene, registralo dall'attività: si aggiorna la scadenza successiva.")} /></Card>
                ) : (
                    <Card>
                        <CardContent className="overflow-x-auto p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("Data")}</TableHead>
                                        <TableHead>{t("Attività")}</TableHead>
                                        <TableHead>{t("Esito")}</TableHead>
                                        <TableHead className="text-right">{t("Costo")}</TableHead>
                                        <TableHead>{t("Note e rapporto")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.executions.map(e => (
                                        <TableRow key={e.id}>
                                            <TableCell className="text-sm tabular-nums">{fmt.date(e.doneAt)}</TableCell>
                                            <TableCell className="text-sm">{e.activityTitle}</TableCell>
                                            <TableCell>{e.outcome === "ISSUES" ? <Badge variant="warning">{t("Con criticità")}</Badge> : <Badge variant="success">{t("In regola")}</Badge>}</TableCell>
                                            <TableCell className="text-right text-sm tabular-nums">{e.cost != null ? eur(e.cost) : "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {e.notes}
                                                {e.reportUrl && (
                                                    <a href={e.reportUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-primary hover:underline">
                                                        {t("Rapporto")} <ExternalLink className="h-3 w-3" aria-hidden />
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
