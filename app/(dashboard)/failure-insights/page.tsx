"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, Lightbulb, Loader2, SearchCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { PlantBadge } from "@/components/ui/plant-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAssets } from "@/lib/assets-context";
import { getFailureInsights, type FailureInsights } from "@/modules/maintenance/adapters/actions/failure-insights-actions";

const NO_ASSET = "none";

export default function FailureInsightsPage() {
    const { assets } = useAssets();
    const [description, setDescription] = useState("");
    const [assetId, setAssetId] = useState(NO_ASSET);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<FailureInsights | null>(null);

    const analyze = async () => {
        setLoading(true);
        const res = await getFailureInsights({ description, assetId: assetId === NO_ASSET ? undefined : assetId });
        setLoading(false);
        if (!res.success) toast.error(res.message ?? "Analisi non riuscita");
        setResult(res);
    };

    return (
        <div className="mx-auto max-w-5xl space-y-4">
            <PageHeader
                title="Analisi guasti di gruppo"
                description="Descrivi il guasto: il sistema cerca come sono stati risolti casi simili in tutti gli stabilimenti e propone le azioni più coerenti, indicando da dove arrivano."
            />

            <Card>
                <CardContent className="space-y-4 p-4">
                    <div className="grid gap-2">
                        <Label htmlFor="desc">Che cosa succede?</Label>
                        <Textarea
                            id="desc"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Es. perdita di olio dal compressore, rumore anomalo al cuscinetto, allarme sovratemperatura motore..."
                        />
                    </div>
                    <div className="grid gap-2 sm:max-w-md">
                        <Label>Macchina (facoltativa: se la indichi, pesano di più i casi sullo stesso modello)</Label>
                        <Select value={assetId} onValueChange={setAssetId}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_ASSET}>Nessuna macchina in particolare</SelectItem>
                                {assets.filter(a => !a.id.startsWith("SYS-")).map(a => (
                                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={analyze} disabled={loading || description.trim().length < 5}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}
                        Analizza
                    </Button>
                </CardContent>
            </Card>

            {result?.success && (
                <>
                    <p className="text-xs text-muted-foreground">
                        Consultati {result.casesConsulted} casi chiusi di {result.plantsConsulted} stabilimenti
                        {result.asset ? ` · macchina: ${result.asset.name} (${result.asset.model})` : ""}.
                    </p>

                    {result.actions.length === 0 ? (
                        <Card>
                            <EmptyState
                                icon={<Lightbulb />}
                                title="Nessun caso simile con una soluzione registrata"
                                description="Quando gli interventi vengono chiusi compilando causa e soluzione (EWO), il sistema impara e li propone qui."
                            />
                        </Card>
                    ) : (
                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold">Azioni più coerenti</h2>
                            {result.actions.map((a, i) => (
                                <Card key={i}>
                                    <CardContent className="space-y-2 p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <p className="font-medium">{a.action}</p>
                                            <Badge variant={a.confidence >= 0.7 ? "success" : a.confidence >= 0.5 ? "info" : "neutral"}>
                                                Coerenza {Math.round(a.confidence * 100)}%
                                            </Badge>
                                        </div>
                                        {a.cause && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Causa tipica:</span> {a.cause}</p>}
                                        {a.prevention && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Per prevenire:</span> {a.prevention}</p>}
                                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                                            <span>{a.occurrences} {a.occurrences === 1 ? "caso" : "casi"} in</span>
                                            {a.plants.map(p => <PlantBadge key={p} force name={p} />)}
                                            {a.avgDowntimeMin != null && <span>· fermo medio {a.avgDowntimeMin} min</span>}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </section>
                    )}

                    {result.cases.length > 0 && (
                        <Card>
                            <CardHeader><CardTitle className="text-sm">Casi simili</CardTitle></CardHeader>
                            <CardContent className="divide-y p-0">
                                {result.cases.map((c, i) => (
                                    <div key={i} className="space-y-1 px-4 py-3 text-sm">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <PlantBadge force name={c.plantName} />
                                            {c.sameModel && <Badge variant="info">stesso modello</Badge>}
                                            <span className="font-medium">{c.title}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(c.date).toLocaleDateString("it-IT")}
                                                {c.assetModel ? ` · ${c.assetVendor ? c.assetVendor + " " : ""}${c.assetModel}` : ""}
                                            </span>
                                            <span className="ml-auto text-xs text-muted-foreground">pertinenza {Math.round(c.score * 100)}%</span>
                                        </div>
                                        {c.solution && <p className="text-muted-foreground"><Building2 className="mr-1 inline h-3 w-3" />{c.solution}</p>}
                                        {c.workOrderId && (
                                            <Link href={`/work-orders/${c.workOrderId}`} className="text-xs text-primary hover:underline">Apri l&apos;ordine</Link>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
