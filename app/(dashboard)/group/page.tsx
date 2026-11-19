"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Factory, GitCompareArrows } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PlantBadge } from "@/components/ui/plant-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePlant } from "@/lib/plant-context";
import {
    getPlantComparison, getModelBenchmark, type PlantKpi, type ModelBenchmarkRow,
} from "@/modules/maintenance/adapters/actions/group-actions";

const nf = new Intl.NumberFormat("it-IT");
const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function GroupPage() {
    return (
        <Suspense fallback={null}>
            <GroupContent />
        </Suspense>
    );
}

function GroupContent() {
    const params = useSearchParams();
    const { selected } = usePlant();
    const [tab, setTab] = useState(params.get("tab") === "models" ? "models" : "plants");
    const [plants, setPlants] = useState<PlantKpi[] | null>(null);
    const [models, setModels] = useState<ModelBenchmarkRow[] | null>(null);

    useEffect(() => {
        let alive = true;
        getPlantComparison().then(r => { if (alive) setPlants(r.plants); });
        return () => { alive = false; };
    }, [selected]);
    useEffect(() => {
        let alive = true;
        getModelBenchmark().then(r => { if (alive) setModels(r.rows); });
        return () => { alive = false; };
    }, []);

    return (
        <div className="mx-auto max-w-6xl">
            <PageHeader
                title="Confronto stabilimenti"
                description="Gli stessi indicatori affiancati per stabilimento e il confronto della stessa macchina tra plant diversi."
            />
            <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="plants">Per stabilimento</TabsTrigger>
                    <TabsTrigger value="models">Per modello di macchina</TabsTrigger>
                </TabsList>

                <TabsContent value="plants" className="mt-4">
                    {plants === null ? (
                        <p className="text-sm text-muted-foreground">Caricamento...</p>
                    ) : plants.length === 0 ? (
                        <Card><EmptyState icon={<Factory />} title="Nessuno stabilimento visibile" /></Card>
                    ) : (
                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Stabilimento</TableHead>
                                                <TableHead className="text-right">Macchine</TableHead>
                                                <TableHead className="text-right">Salute media</TableHead>
                                                <TableHead className="text-right">Ferme</TableHead>
                                                <TableHead className="text-right">Ordini aperti</TableHead>
                                                <TableHead className="text-right">In ritardo</TableHead>
                                                <TableHead className="text-right">Guasti (30 gg)</TableHead>
                                                <TableHead className="text-right">Fermo (90 gg)</TableHead>
                                                <TableHead className="text-right">Costo fermo</TableHead>
                                                <TableHead className="text-right">Scorte basse</TableHead>
                                                <TableHead className="text-right">Energia (30 gg)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {plants.map(p => (
                                                <TableRow key={p.plantId}>
                                                    <TableCell className="font-medium">{p.plantName}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{p.assets}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{p.avgHealth != null ? `${p.avgHealth}%` : "N/D"}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{p.assetsOffline}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{p.openOrders}</TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {p.overdueOrders > 0 ? <Badge variant="critical">{p.overdueOrders}</Badge> : 0}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">{p.faults30d}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{nf.format(p.downtimeMin90d)} min</TableCell>
                                                    <TableCell className="text-right tabular-nums">{eur.format(p.downtimeCost90d)}</TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {p.lowStock > 0 ? <Badge variant="warning">{p.lowStock}</Badge> : 0}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">{nf.format(p.energyKwh30d)} kWh</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                        Il costo del fermo usa il valore del singolo stabilimento, se impostato, altrimenti quello globale. I dati sono quelli degli stabilimenti che puoi vedere.
                    </p>
                </TabsContent>

                <TabsContent value="models" className="mt-4 space-y-3">
                    {models === null ? (
                        <p className="text-sm text-muted-foreground">Caricamento...</p>
                    ) : models.length === 0 ? (
                        <Card><EmptyState icon={<GitCompareArrows />} title="Nessun modello da confrontare" description="Servono macchine con costruttore e modello indicati." /></Card>
                    ) : (
                        models.map(m => (
                            <Card key={m.key}>
                                <CardContent className="space-y-3 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="font-medium">{[m.vendor, m.model].filter(Boolean).join(" ")}</p>
                                        <Badge variant={m.comparable ? "info" : "neutral"}>
                                            {m.comparable ? `In ${m.plants.length} stabilimenti` : "In un solo stabilimento"} · {m.totalAssets} macchine
                                        </Badge>
                                    </div>
                                    {m.insight && <p className="rounded-md bg-info-soft px-3 py-2 text-sm text-info-strong">{m.insight}</p>}
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Stabilimento</TableHead>
                                                <TableHead className="text-right">Macchine</TableHead>
                                                <TableHead className="text-right">Guasti (12 mesi)</TableHead>
                                                <TableHead className="text-right">Guasti per macchina</TableHead>
                                                <TableHead className="text-right">Fermo</TableHead>
                                                <TableHead className="text-right">Salute media</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {m.plants.map(p => (
                                                <TableRow key={p.plantName}>
                                                    <TableCell><PlantBadge force name={p.plantName} /> {p.isOwn && <span className="ml-1 text-xs text-muted-foreground">il tuo</span>}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{p.assets}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{p.faults}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{String(p.faultsPerAsset).replace(".", ",")}</TableCell>
                                                    <TableCell className="text-right tabular-nums">{nf.format(p.downtimeMin)} min</TableCell>
                                                    <TableCell className="text-right tabular-nums">{p.avgHealth != null ? `${p.avgHealth}%` : "N/D"}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
