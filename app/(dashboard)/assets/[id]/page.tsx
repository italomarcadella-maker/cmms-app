"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "react-qr-code";
import { Activity, ArrowLeft, FileText, Printer, QrCode } from "lucide-react";

import { useAssets } from "@/lib/assets-context";
import { useAuth } from "@/lib/auth-context";
import { getAssetReliability, type AssetReliability } from "@/modules/maintenance/adapters/actions/asset-reliability-actions";
import { AssetStatusBadge } from "@/components/assets/asset-status-badge";
import { WOStatusBadge } from "@/components/work-orders/wo-status-badge";
import { AssetMaintenancePlan } from "@/components/assets/asset-maintenance-plan";
import { AssetReliabilityPanel, AssetStoppedBanner } from "@/components/assets/asset-reliability-panel";
import { AssetHistory } from "@/components/assets/asset-history";
import { AssetHealthCard } from "@/components/assets/asset-health-card";
import { AssetAIChat } from "@/components/assets/asset-ai-chat";
import { TagGeneratorDialog } from "@/components/assets/tag-generator-dialog";
import { AssetSOPList } from "@/components/assets/asset-sop-list";
import { Button } from "@/components/ui/button";
import { usePrompt } from "@/components/ui/prompt-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={mono ? "font-mono text-sm" : "text-sm font-medium"}>{value || "N/D"}</dd>
        </div>
    );
}

export default function AssetDetailsPage() {
    const params = useParams();
    const { assets, updateAsset } = useAssets();
    const { user } = useAuth();
    const { ask, dialog } = usePrompt();

    const asset = assets.find((a) => a.id === params.id) || assets.find((a) => a.id === decodeURIComponent(params.id as string));

    const [activeWOs, setActiveWOs] = useState<any[]>([]);
    const [showTagGenerator, setShowTagGenerator] = useState(false);
    const [reliability, setReliability] = useState<AssetReliability | null>(null);
    const [reliabilityLoading, setReliabilityLoading] = useState(true);
    const [createPlanSignal, setCreatePlanSignal] = useState(0);
    // Cambia quando i dati dell'asset si ricaricano (es. un piano creato): la scheda Salute si ricalcola
    const [healthReload, setHealthReload] = useState(0);
    // Come lato server: i piani li creano solo amministratori e responsabili di plant
    const canManagePlans = user?.role === "ADMIN" || user?.role === "PLANT_MANAGER";

    useEffect(() => {
        if (asset?.id) {
            import("@/lib/actions").then(({ getActiveWorkOrdersForAsset }) => {
                getActiveWorkOrdersForAsset(asset.id).then(setActiveWOs);
            });
        }
    }, [asset?.id]);

    const assetId = asset?.id;
    const loadReliability = useCallback(async () => {
        if (!assetId) return;
        setReliabilityLoading(true);
        const data = await getAssetReliability(assetId);
        setReliability(data);
        setReliabilityLoading(false);
        setHealthReload((n) => n + 1);
    }, [assetId]);

    useEffect(() => {
        loadReliability();
    }, [loadReliability]);

    const assetUrl = typeof window !== "undefined" ? `${window.location.origin}/assets/${asset?.id}` : "";

    if (!asset) {
        return (
            <EmptyState
                title="Asset non trovato"
                description={`L'asset con ID ${params.id} non esiste o non è visibile nello stabilimento selezionato.`}
                action={
                    <Button asChild variant="outline">
                        <Link href="/assets">
                            <ArrowLeft className="mr-1.5 h-4 w-4" /> Torna alla lista
                        </Link>
                    </Button>
                }
            />
        );
    }

    return (
        <div className="space-y-6 pb-10">
            <PageHeader
                title={asset.name}
                description={[asset.vendor, asset.model].filter(Boolean).join(" · ")}
                breadcrumb={[{ label: "Asset e macchinari", href: "/assets" }, { label: asset.name }]}
                actions={
                    <Button variant="outline" onClick={() => setShowTagGenerator(true)}>
                        <Printer className="mr-1.5 h-4 w-4" /> Stampa etichetta
                    </Button>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main column */}
                <div className="space-y-6 lg:col-span-2">
                    <div className="grid items-start gap-4 md:grid-cols-3">
                        <StatCard label="Stato" value={<AssetStatusBadge status={asset.status} className="text-sm" />} tone="neutral" icon={<Activity />} />
                        <div className="md:col-span-2">
                            <AssetHealthCard assetId={asset.id} reloadKey={healthReload} />
                        </div>
                    </div>

                    <AssetStoppedBanner data={reliability} />

                    <Tabs defaultValue="overview">
                        <TabsList>
                            <TabsTrigger value="overview">Panoramica</TabsTrigger>
                            <TabsTrigger value="history">Storico interventi</TabsTrigger>
                            <TabsTrigger value="docs">Documenti e SOP</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="mt-4 space-y-6">
                            <AssetReliabilityPanel
                                data={reliability}
                                loading={reliabilityLoading && !reliability}
                                canManagePlans={canManagePlans}
                                onCreatePlan={() => setCreatePlanSignal((n) => n + 1)}
                            />

                            <Card>
                                <CardHeader>
                                    <CardTitle>Ordini e richieste attive</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {activeWOs.length === 0 ? (
                                        <EmptyState title="Nessun lavoro in corso" description="Non ci sono ordini di lavoro aperti su questo asset." className="py-8" />
                                    ) : (
                                        <ul className="space-y-2">
                                            {activeWOs.map((wo) => (
                                                <li key={wo.id}>
                                                    <Link href={`/work-orders/${wo.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent">
                                                        <div className="min-w-0">
                                                            <div className="truncate text-sm font-medium">{wo.title}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {new Date(wo.createdAt).toLocaleDateString("it-IT")} · {wo.id.substring(0, 10)}
                                                            </div>
                                                        </div>
                                                        <WOStatusBadge status={wo.status} />
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-5">
                                    <AssetMaintenancePlan
                                        assetId={asset.id}
                                        plans={reliability?.plans ?? []}
                                        loading={reliabilityLoading && !reliability}
                                        onChanged={loadReliability}
                                        openCreateSignal={createPlanSignal}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="history" className="mt-4">
                            <AssetHistory assetId={asset.id} />
                        </TabsContent>

                        <TabsContent value="docs" className="mt-4 space-y-6">
                            <Card>
                                <CardHeader className="flex-row items-start justify-between space-y-0">
                                    <div className="space-y-1.5">
                                        <CardTitle>Documenti tecnici</CardTitle>
                                        <CardDescription>Manuali, schemi e certificazioni.</CardDescription>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                            const docName = await ask({ title: "Aggiungi documento", label: "Nome del documento (es. Manuale uso)", required: true, confirmLabel: "Avanti" });
                                            if (docName) {
                                                const docType = (await ask({ title: "Tipo di documento", label: "Tipo (PDF, DOCX, IMG)", defaultValue: "PDF" })) || "PDF";
                                                const newDoc = { name: docName, type: docType, url: "#", date: new Date().toISOString() };
                                                updateAsset(asset.id, { documents: [...(asset.documents || []), newDoc] });
                                            }
                                        }}
                                    >
                                        Aggiungi documento
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {!asset.documents || asset.documents.length === 0 ? (
                                        <EmptyState icon={<FileText />} title="Nessun documento allegato" description="Aggiungi manuali, schemi o certificazioni." className="py-8" />
                                    ) : (
                                        <ul className="space-y-2">
                                            {asset.documents.map((doc, idx) => (
                                                <li key={idx} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-info-soft text-info-strong">
                                                            <FileText className="h-4 w-4" />
                                                        </span>
                                                        <div>
                                                            <div className="text-sm font-medium">{doc.name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {doc.type} · {new Date(doc.date || Date.now()).toLocaleDateString("it-IT")}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>SOP e ricette macchina</CardTitle>
                                    <CardDescription>Parametri di processo standard estratti da HMI tramite AI.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <AssetSOPList assetId={asset.id} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Side column */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="items-center pb-3 text-center">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <QrCode className="h-4 w-4 text-muted-foreground" /> Etichetta asset
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-3 text-center">
                            <div className="rounded-lg border bg-white p-3">
                                <QRCode value={assetUrl} size={140} />
                            </div>
                            <p className="max-w-[220px] text-xs text-muted-foreground">Scansiona per vedere dettagli, cronologia e segnalare problemi.</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Ubicazione</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-3">
                                <Field label="Stabilimento" value={asset.plant} />
                                <Field label="Reparto" value={asset.department} />
                                <Field label="Linea" value={asset.line} />
                            </dl>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Dettagli</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-3">
                                <Field label="Numero seriale" value={asset.serialNumber} mono />
                                <Field label="Costruttore" value={asset.vendor} />
                                <Field label="Codice cespite" value={asset.cespite} mono />
                                <Field label="Data di acquisto" value={asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("it-IT") : null} />
                            </dl>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AssetAIChat assetId={asset.id} assetName={asset.name} />

            {showTagGenerator && <TagGeneratorDialog assetId={asset.id} assetName={asset.name} onClose={() => setShowTagGenerator(false)} />}
            {dialog}
        </div>
    );
}
