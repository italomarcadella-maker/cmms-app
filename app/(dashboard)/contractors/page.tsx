"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CalendarCheck, CalendarClock, Euro, FileSignature, HardHat, Plus, Wrench } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PlantBadge } from "@/components/ui/plant-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePlant } from "@/lib/plant-context";
import { useT, useFormat } from "@/lib/i18n/client";
import { frequencyText } from "@/modules/maintenance/domain/contractors";
import { ContractorFormDialog, ExecutionDialog, NewContractDialog } from "@/components/contractors/contractor-dialogs";
import { ActivityStateBadge, ContractStateBadge } from "@/components/contractors/state-badges";
import {
    getContractorsOverview, listAllContracts, listContractActivities,
    type ActivityRow, type ContractRow, type ContractorsOverview,
} from "@/modules/maintenance/adapters/actions/contractor-actions";

export default function ContractorsPage() {
    const t = useT();
    const fmt = useFormat();
    const eur = (n: number) => fmt.currency(n, "EUR", { maximumFractionDigits: 0 });
    const { selected } = usePlant();
    const [version, setVersion] = useState(0);
    const [overview, setOverview] = useState<ContractorsOverview | null>(null);
    const [activities, setActivities] = useState<ActivityRow[] | null>(null);
    const [contracts, setContracts] = useState<ContractRow[] | null>(null);

    useEffect(() => {
        let alive = true;
        Promise.all([getContractorsOverview(), listContractActivities(), listAllContracts()]).then(([o, a, c]) => {
            if (!alive) return;
            setOverview(o);
            setActivities(a);
            setContracts(c);
        });
        return () => { alive = false; };
    }, [version, selected]);

    const reload = () => setVersion(v => v + 1);
    const k = overview?.kpis;

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <PageHeader
                title={t("Ditte esterne")}
                description={t("Contratti, attività periodiche e interventi delle ditte esterne, con scadenze e storico. Le attività in programma compaiono in blu nel calendario della dashboard.")}
                actions={overview?.canManage && (
                    <div className="flex flex-wrap gap-2">
                        <NewContractDialog contractors={overview.contractors.filter(c => c.isActive)} trigger={<Button variant="outline"><FileSignature className="h-4 w-4" /> {t("Nuovo contratto")}</Button>} onSaved={reload} />
                        <ContractorFormDialog trigger={<Button><Plus className="h-4 w-4" /> {t("Nuova ditta")}</Button>} onSaved={reload} />
                    </div>
                )}
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard label={t("Contratti in vigore")} value={k?.inForceContracts ?? "-"} icon={<FileSignature />} tone="info" />
                <StatCard label={t("In scadenza")} value={k?.expiringContracts ?? "-"} hint={t("entro il preavviso di rinnovo")} icon={<CalendarClock />} tone={k && k.expiringContracts > 0 ? "warning" : "success"} />
                <StatCard label={t("Attività in ritardo")} value={k?.overdueActivities ?? "-"} icon={<AlertTriangle />} tone={k && k.overdueActivities > 0 ? "critical" : "success"} />
                <StatCard label={t("Prossimi 30 giorni")} value={k?.dueNext30Days ?? "-"} hint={t("attività in programma")} icon={<CalendarCheck />} tone="info" />
                <StatCard label={t("Costo 12 mesi")} value={k ? eur(k.cost12m) : "-"} hint={t("interventi registrati")} icon={<Euro />} tone="neutral" />
            </div>

            <Tabs defaultValue="activities">
                <TabsList>
                    <TabsTrigger value="activities">{t("Attività da fare")}</TabsTrigger>
                    <TabsTrigger value="contractors">{t("Ditte")}</TabsTrigger>
                    <TabsTrigger value="contracts">{t("Contratti")}</TabsTrigger>
                </TabsList>

                <TabsContent value="activities" className="mt-4">
                    {activities === null ? <p className="text-sm text-muted-foreground">{t("Caricamento...")}</p> : activities.length === 0 ? (
                        <Card><EmptyState icon={<Wrench />} title={t("Nessuna attività in programma")} description={t("Aggiungi una ditta, un contratto e le sue attività periodiche: qui compare cosa c'è da fare e da quando.")} action={overview?.canManage ? <ContractorFormDialog trigger={<Button><Plus className="h-4 w-4" /> {t("Nuova ditta")}</Button>} onSaved={reload} /> : undefined} /></Card>
                    ) : (
                        <Card>
                            <CardContent className="overflow-x-auto p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("Attività")}</TableHead>
                                            <TableHead>{t("Ditta")}</TableHead>
                                            <TableHead>{t("Macchina")}</TableHead>
                                            <TableHead>{t("Frequenza")}</TableHead>
                                            <TableHead>{t("Ultima")}</TableHead>
                                            <TableHead>{t("Prossima")}</TableHead>
                                            <TableHead className="w-[1%]" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activities.map(a => (
                                            <TableRow key={a.id}>
                                                <TableCell className="font-medium">{a.title} <PlantBadge plantId={a.plantId} /></TableCell>
                                                <TableCell><Link href={`/contractors/${a.contractorId}`} className="hover:text-primary hover:underline">{a.contractorName}</Link></TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{a.assetName ?? "-"}</TableCell>
                                                <TableCell className="text-sm">{t(frequencyText(a.frequencyDays))}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{fmt.date(a.lastDoneAt)}</TableCell>
                                                <TableCell><div className="flex items-center gap-2"><span className="text-sm tabular-nums">{fmt.date(a.nextDueDate)}</span><ActivityStateBadge state={a.state} /></div></TableCell>
                                                <TableCell>
                                                    <ExecutionDialog activity={a} trigger={<Button size="sm" variant="outline">{t("Registra intervento")}</Button>} onSaved={reload} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="contractors" className="mt-4">
                    {overview === null ? <p className="text-sm text-muted-foreground">{t("Caricamento...")}</p> : overview.contractors.length === 0 ? (
                        <Card><EmptyState icon={<HardHat />} title={t("Nessuna ditta registrata")} description={t("Registra le ditte con cui lavorate, poi aggiungi i contratti per stabilimento.")} action={overview.canManage ? <ContractorFormDialog trigger={<Button><Plus className="h-4 w-4" /> {t("Nuova ditta")}</Button>} onSaved={reload} /> : undefined} /></Card>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {overview.contractors.map(c => (
                                <Link key={c.id} href={`/contractors/${c.id}`} className="block">
                                    <Card className="h-full transition-colors hover:border-primary/40">
                                        <CardContent className="space-y-2 p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold">{c.name}</p>
                                                    <p className="text-xs text-muted-foreground">{[c.contactName, c.contactPhone].filter(Boolean).join(" · ") || t("Nessun referente")}</p>
                                                </div>
                                                {!c.isActive && <Badge variant="neutral">{t("Non attiva")}</Badge>}
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                <Badge variant="info">{c.inForceContracts === 1 ? t("1 contratto in vigore") : t("{n} contratti in vigore", { n: c.inForceContracts })}</Badge>
                                                {c.expiringContracts > 0 && <Badge variant="warning">{t("{n} in scadenza", { n: c.expiringContracts })}</Badge>}
                                                {c.overdueActivities > 0 && <Badge variant="critical">{t("{n} attività in ritardo", { n: c.overdueActivities })}</Badge>}
                                                {c.issues12m > 0 && <Badge variant="warning">{t("{n} criticità (12 mesi)", { n: c.issues12m })}</Badge>}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {t("{n} interventi negli ultimi 12 mesi", { n: c.executions12m })}{c.cost12m > 0 ? ` · ${eur(c.cost12m)}` : ""}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="contracts" className="mt-4">
                    {contracts === null ? <p className="text-sm text-muted-foreground">{t("Caricamento...")}</p> : contracts.length === 0 ? (
                        <Card><EmptyState icon={<FileSignature />} title={t("Nessun contratto")} description={t("Crea un contratto scegliendo la ditta e lo stabilimento; poi aggiungi le attività periodiche.")} action={overview?.canManage ? <NewContractDialog contractors={overview.contractors.filter(c => c.isActive)} trigger={<Button><Plus className="h-4 w-4" /> {t("Nuovo contratto")}</Button>} onSaved={reload} /> : undefined} /></Card>
                    ) : (
                        <Card>
                            <CardContent className="overflow-x-auto p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("Contratto")}</TableHead>
                                            <TableHead>{t("Ditta")}</TableHead>
                                            <TableHead>{t("Stabilimento")}</TableHead>
                                            <TableHead>{t("Scadenza")}</TableHead>
                                            <TableHead className="text-right">{t("Valore annuo")}</TableHead>
                                            <TableHead>{t("Stato")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {contracts.map(c => (
                                            <TableRow key={c.id}>
                                                <TableCell className="font-medium">{c.title}</TableCell>
                                                <TableCell><Link href={`/contractors/${c.contractorId}`} className="hover:text-primary hover:underline">{c.contractorName}</Link></TableCell>
                                                <TableCell><PlantBadge force name={c.plantName} /></TableCell>
                                                <TableCell className="text-sm tabular-nums">{c.endDate ? fmt.date(c.endDate) : t("senza scadenza")}</TableCell>
                                                <TableCell className="text-right text-sm tabular-nums">{c.annualValue != null ? eur(c.annualValue) : "-"}</TableCell>
                                                <TableCell><ContractStateBadge state={c.state} daysToEnd={c.daysToEnd} /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
