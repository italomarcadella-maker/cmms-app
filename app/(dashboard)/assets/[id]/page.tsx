"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "react-qr-code";
import { Activity, ArrowLeft, FileText, Printer, QrCode } from "lucide-react";

import { useAssets } from "@/lib/assets-context";
import { useAuth } from "@/lib/auth-context";
import { useT, useFormat } from "@/lib/i18n/client";
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
import { AssetBomPanel } from "@/components/assets/asset-bom";
import { AssetComponentsSection } from "@/components/assets/asset-components-section";
import { getAssetPath } from "@/modules/maintenance/domain/asset-hierarchy";
import { ENGINEERING, hasRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { usePrompt } from "@/components/ui/prompt-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
    const t = useT();
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={mono ? "font-mono text-sm" : "text-sm font-medium"}>{value || t("N/D")}</dd>
        </div>
    );
}

export default function AssetDetailsPage() {
    const params = useParams();
    const t = useT();
    const fmt = useFormat();
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
    // Come lato server: la distinta ricambi la modificano amministratori, responsabili di plant, supervisor e ingegneri di processo
    const canEditBom = hasRole(user?.role, ENGINEERING);

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
                title={t("Asset non trovato")}
                description={t("L'asset con ID {id} non esiste o non è visibile nello stabilimento selezionato.", { id: String(params.id) })}
                action={
                    <Button asChild variant="outline">
                        <Link href="/assets">
                            <ArrowLeft className="mr-1.5 h-4 w-4" /> {t("Torna alla lista")}
                        </Link>
                    </Button>
                }
            />
        );
    }

    // Gerarchia: percorso "Macchina > Gruppo > Componente" e componenti diretti
    const hierarchyItems = assets.map((a) => ({ id: a.id, name: a.name, parentId: a.parentId ?? null, plantId: a.plantId ?? null }));
    const ancestors = getAssetPath(hierarchyItems, asset.id).slice(0, -1);
    const childAssets = assets.filter((a) => a.parentId === asset.id);

    return (
        <div className="space-y-6 pb-10">
            <PageHeader
                title={asset.name}
                description={[asset.vendor, asset.model].filter(Boolean).join(" · ")}
                breadcrumb={[
                    { label: t("Asset e macchinari"), href: "/assets" },
                    ...ancestors.map((a) => ({ label: a.name, href: `/assets/${a.id}` })),
                    { label: asset.name },
                ]}
                actions={
                    <Button variant="outline" onClick={() => setShowTagGenerator(true)}>
                        <Printer className="mr-1.5 h-4 w-4" /> {t("Stampa etichetta")}
                    </Button>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main column */}
                <div className="space-y-6 lg:col-span-2">
                    <div className="grid items-start gap-4 md:grid-cols-3">
                        <StatCard label={t("Stato")} value={<AssetStatusBadge status={asset.status} className="text-sm" />} tone="neutral" icon={<Activity />} />
                        <div className="md:col-span-2">
                            <AssetHealthCard assetId={asset.id} reloadKey={healthReload} />
                        </div>
                    </div>

                    <AssetStoppedBanner data={reliability} />

                    <Tabs defaultValue="overview">
                        <TabsList>
                            <TabsTrigger value="overview">{t("Panoramica")}</TabsTrigger>
                            <TabsTrigger value="bom">{t("Distinta ricambi")}</TabsTrigger>
                            <TabsTrigger value="history">{t("Storico interventi")}</TabsTrigger>
                            <TabsTrigger value="docs">{t("Documenti e SOP")}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="mt-4 space-y-6">
                            {childAssets.length > 0 && <AssetComponentsSection assetId={asset.id} items={childAssets} />}

                            <AssetReliabilityPanel
                                data={reliability}
                                loading={reliabilityLoading && !reliability}
                                canManagePlans={canManagePlans}
                                onCreatePlan={() => setCreatePlanSignal((n) => n + 1)}
                            />

                            <Card>
                                <CardHeader>
                                    <CardTitle>{t("Ordini e richieste attive")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {activeWOs.length === 0 ? (
                                        <EmptyState title={t("Nessun lavoro in corso")} description={t("Non ci sono ordini di lavoro aperti su questo asset.")} className="py-8" />
                                    ) : (
                                        <ul className="space-y-2">
                                            {activeWOs.map((wo) => (
                                                <li key={wo.id}>
                                                    <Link href={`/work-orders/${wo.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent">
                                                        <div className="min-w-0">
                                                            <div className="truncate text-sm font-medium">{wo.title}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {fmt.date(wo.createdAt)} · {wo.id.substring(0, 10)}
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

                        <TabsContent value="bom" className="mt-4">
                            <AssetBomPanel assetId={asset.id} canEdit={canEditBom} />
                        </TabsContent>

                        <TabsContent value="history" className="mt-4">
                            <AssetHistory assetId={asset.id} />
                        </TabsContent>

                        <TabsContent value="docs" className="mt-4 space-y-6">
                            <Card>
                                <CardHeader className="flex-row items-start justify-between space-y-0">
                                    <div className="space-y-1.5">
                                        <CardTitle>{t("Documenti tecnici")}</CardTitle>
                                        <CardDescription>{t("Manuali, schemi e certificazioni.")}</CardDescription>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                            const docName = await ask({ title: t("Aggiungi documento"), label: t("Nome del documento (es. Manuale uso)"), required: true, confirmLabel: t("Avanti") });
                                            if (docName) {
                                                const docType = (await ask({ title: t("Tipo di documento"), label: t("Tipo (PDF, DOCX, IMG)"), defaultValue: "PDF" })) || "PDF";
                                                const newDoc = { name: docName, type: docType, url: "#", date: new Date().toISOString() };
                                                updateAsset(asset.id, { documents: [...(asset.documents || []), newDoc] });
                                            }
                                        }}
                                    >
                                        {t("Aggiungi documento")}
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {!asset.documents || asset.documents.length === 0 ? (
                                        <EmptyState icon={<FileText />} title={t("Nessun documento allegato")} description={t("Aggiungi manuali, schemi o certificazioni.")} className="py-8" />
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
                                                                {doc.type} · {fmt.date(doc.date || Date.now())}
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
                                    <CardTitle>{t("SOP e ricette macchina")}</CardTitle>
                                    <CardDescription>{t("Parametri di processo standard estratti da HMI tramite AI.")}</CardDescription>
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
                                <QrCode className="h-4 w-4 text-muted-foreground" /> {t("Etichetta asset")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-3 text-center">
                            <div className="rounded-lg border bg-white p-3">
                                <QRCode value={assetUrl} size={140} />
                            </div>
                            <p className="max-w-[220px] text-xs text-muted-foreground">{t("Scansiona per vedere dettagli, cronologia e segnalare problemi.")}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">{t("Ubicazione")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-3">
                                <Field label={t("Stabilimento")} value={asset.plant} />
                                <Field label={t("Reparto")} value={asset.department} />
                                <Field label={t("Linea")} value={asset.line} />
                            </dl>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">{t("Dettagli")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="space-y-3">
                                <Field label={t("Numero seriale")} value={asset.serialNumber} mono />
                                <Field label={t("Costruttore")} value={asset.vendor} />
                                <Field label={t("Codice cespite")} value={asset.cespite} mono />
                                <Field label={t("Data di acquisto")} value={asset.purchaseDate ? fmt.date(asset.purchaseDate) : null} />
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
