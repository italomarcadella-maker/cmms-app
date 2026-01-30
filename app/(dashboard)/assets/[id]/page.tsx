"use client";

import { useState, useEffect } from "react";
import { useAssets } from "@/lib/assets-context";
import { useWorkOrders } from "@/lib/work-orders-context"; // Assuming this path for work orders context
import { AssetStatusBadge } from "@/components/assets/asset-status-badge"; // Assuming this path for AssetStatusBadge
import { WOStatusBadge } from "@/components/work-orders/wo-status-badge"; // Assuming this path for WOStatusBadge
import { ArrowLeft, QrCode, FileText, AlertCircle, Activity } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "react-qr-code";
import { AssetMaintenancePlan } from "@/components/assets/asset-maintenance-plan";

export default function AssetDetailsPage() {
    const params = useParams();
    const { assets, updateAsset } = useAssets();
    const { workOrders } = useWorkOrders(); // Keeping context for history fallbacks

    const asset = assets.find(a => a.id === params.id) || assets.find(a => a.id === decodeURIComponent(params.id as string));

    if (!asset) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <h2 className="text-xl font-semibold">Asset Non Trovato</h2>
                <p className="text-muted-foreground">L'asset con ID {params.id} non è stato trovato.</p>
                <Link href="/assets" className="text-primary hover:underline flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Torna alla lista</Link>
            </div>
        )
    }

    const [activeWOs, setActiveWOs] = useState<any[]>([]);

    useEffect(() => {
        if (asset?.id) {
            import("@/lib/actions").then(({ getActiveWorkOrdersForAsset }) => {
                getActiveWorkOrdersForAsset(asset.id).then(setActiveWOs);
            });
        }
    }, [asset?.id]);

    const assetWorkOrders = workOrders.filter(wo => wo.assetId === asset.id);
    const assetUrl = typeof window !== 'undefined' ? `${window.location.origin}/assets/${asset.id}` : '';

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex items-center gap-4">
                <Link href="/assets" className="p-2 rounded-full hover:bg-muted text-muted-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                        {asset.name}
                    </h1>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                        <span className="font-mono bg-muted px-2 rounded text-sm">{asset.id}</span>
                        <span>•</span>
                        <span>{asset.vendor} {asset.model}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Main Info Column */}
                <div className="md:col-span-2 space-y-6">
                    {/* Status & Health */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-xl border bg-card p-6 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Stato</p>
                                <AssetStatusBadge status={asset.status} />
                            </div>
                            <div className="h-10 w-10 text-muted-foreground rounded-full bg-muted/50 flex items-center justify-center">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="rounded-xl border bg-card p-6 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground font-medium">Indice di Salute</p>
                                <div className="text-2xl font-bold">{asset.healthScore}%</div>
                            </div>
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${asset.healthScore > 80 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                <Activity className="h-5 w-5" />
                            </div>
                        </div>
                    </div>

                    {/* Active Work Orders (Fresh Data) */}
                    <div className="rounded-xl border bg-card p-6 shadow-sm border-l-4 border-l-blue-500">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" />
                            Ordini e Richieste Attive
                        </h3>
                        {activeWOs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <p className="text-muted-foreground italic text-sm">Nessun lavoro in corso al momento.</p>
                                <p className="text-xs text-muted-foreground/60">Tutto procede regolarmente.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {activeWOs.map(wo => (
                                    <Link href={`/work-orders/${wo.id}`} key={wo.id} className="flex items-center justify-between p-3 rounded-lg border bg-blue-50/50 hover:bg-blue-50 transition-colors">
                                        <div>
                                            <div className="font-medium text-blue-900">{wo.title}</div>
                                            <div className="text-xs text-blue-700/80">{new Date(wo.createdAt).toLocaleDateString()} • {wo.id}</div>
                                        </div>
                                        <WOStatusBadge status={wo.status} />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Maintenance Plan (AI Enabled) */}
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <AssetMaintenancePlan assetId={asset.id} />
                    </div>

                    {/* Closed History (From Context/Props) */}
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <h3 className="font-semibold text-lg mb-4">Storico Interventi Chiusi</h3>
                        {assetWorkOrders.filter(wo => ['CLOSED', 'COMPLETED', 'CANCELED'].includes(wo.status)).length === 0 ? (
                            <p className="text-muted-foreground italic text-sm">Nessun storico disponibile.</p>
                        ) : (
                            <div className="space-y-3">
                                {assetWorkOrders
                                    .filter(wo => ['CLOSED', 'COMPLETED', 'CANCELED'].includes(wo.status))
                                    .map(wo => (
                                        <div key={wo.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 opacity-80">
                                            <div>
                                                <div className="font-medium">{wo.title}</div>
                                                <div className="text-xs text-muted-foreground">{new Date(wo.createdAt).toLocaleDateString()}</div>
                                            </div>
                                            <WOStatusBadge status={wo.status} />
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                    {/* Documents */}
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg">Documenti Tecnici</h3>
                            <button
                                onClick={() => {
                                    const docName = prompt("Nome del documento (es. Manuale Uso):");
                                    if (docName) {
                                        const docType = prompt("Tipo (PDF, DOCX, IMG):", "PDF") || "PDF";
                                        const newDoc = {
                                            name: docName,
                                            type: docType,
                                            url: "#", // Mock URL
                                            date: new Date().toISOString()
                                        };
                                        const currentDocs = asset.documents || [];
                                        updateAsset(asset.id, { documents: [...currentDocs, newDoc] });
                                    }
                                }}
                                className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-md hover:bg-primary/20 font-medium transition-colors"
                            >
                                + Carica Documento
                            </button>
                        </div>

                        {(!asset.documents || asset.documents.length === 0) ? (
                            <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/10">
                                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-muted-foreground italic text-sm">Nessun documento allegato.</p>
                                <p className="text-xs text-muted-foreground/60 mt-1">Carica manuali, schemi o certificazioni.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {asset.documents.map((doc, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded bg-white flex items-center justify-center border shadow-sm">
                                                <FileText className="h-5 w-5 text-blue-500" />
                                            </div>
                                            <div>
                                                <div className="font-medium group-hover:text-primary transition-colors">{doc.name}</div>
                                                <div className="text-xs text-muted-foreground">{doc.type} • {new Date(doc.date || Date.now()).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="text-xs bg-background text-foreground border px-2 py-1 rounded hover:bg-muted">Vedi</button>
                                            <button className="text-xs bg-background text-destructive border border-destructive/20 px-2 py-1 rounded hover:bg-destructive/10">Elimina</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* QR Code Card */}
                    <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col items-center text-center space-y-4">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <QrCode className="h-4 w-4" /> Etichetta Asset
                        </h3>
                        <div className="bg-white p-4 rounded-lg shadow-sm border">
                            <QRCode value={assetUrl} size={150} />
                        </div>
                        <p className="text-xs text-muted-foreground max-w-[200px]">
                            Scansiona per vedere dettagli, cronologia e segnalare problemi.
                        </p>
                    </div>

                    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Ubicazione</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-muted-foreground">Stabilimento</label>
                                <div className="font-medium">{asset.plant}</div>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Dipartimento</label>
                                <div className="font-medium">{asset.department || 'N/A'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Linea</label>
                                <div className="font-medium">{asset.line || 'N/A'}</div>
                            </div>

                        </div>
                    </div>

                    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Dettagli</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-muted-foreground">Numero Seriale</label>
                                <div className="font-mono text-sm">{asset.serialNumber}</div>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Costruttore</label>
                                <div className="font-medium">{asset.vendor}</div>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Codice Cespite</label>
                                <div className="font-mono text-sm">{asset.cespite || 'N/A'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Data Acquisto</label>
                                <div className="text-sm">{asset.purchaseDate}</div>
                            </div>
                        </div>
                    </div>

                    {/* Footer / Legend */}
                    <div className="rounded-xl border bg-muted/30 p-4 shadow-sm text-xs space-y-2">
                        <h4 className="font-semibold text-muted-foreground">Legenda & Info</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                <span>Operativo</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                                <span>In Attenzione</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                                <span>In Fermo</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                                <span>Lavoro Attivo</span>
                            </div>
                        </div>
                        <p className="text-muted-foreground mt-2 border-t pt-2">
                            Contattare il supervisore per modifiche ai dati sensibili.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
