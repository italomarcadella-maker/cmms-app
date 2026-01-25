"use client";

import { useState } from "react";
import { useComponents, ComponentItem, WarehouseType } from "@/lib/components-context";
import { Search, Filter, AlertTriangle, CheckCircle2, RotateCcw, Ruler, Info, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MeasureDialog } from "@/components/components/measure-dialog";
import { AddComponentDialog } from "@/components/components/add-component-dialog";
import { ComponentDetailsDialog } from "@/components/components/component-details-dialog";
import { useAssets } from "@/lib/assets-context";
import { Pencil, Plus } from "lucide-react";

export default function ScrewsPage() {
    const { components } = useComponents();
    const { assets } = useAssets();
    const [filter, setFilter] = useState("");
    const [warehouseFilter, setWarehouseFilter] = useState<WarehouseType | 'ALL'>('ALL');

    const filteredComponents = components.filter(c => {
        const matchesFilter = c.code.toLowerCase().includes(filter.toLowerCase()) ||
            c.model.toLowerCase().includes(filter.toLowerCase());
        const matchesWarehouse = warehouseFilter === 'ALL' || c.warehouse === warehouseFilter;
        return matchesFilter && matchesWarehouse;
    });

    const StatusIcon = ({ status }: { status: string }) => {
        switch (status) {
            case 'OPTIMAL': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case 'WARNING': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            case 'NEEDS_NITRIDING': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
            case 'NEEDS_REGENERATION': return <AlertTriangle className="h-4 w-4 text-purple-500" />;
            case 'TO_ORDER': return <ShoppingCart className="h-4 w-4 text-sky-500" />;
            case 'CRITICAL': return <AlertTriangle className="h-4 w-4 text-red-500" />;
            default: return <RotateCcw className="h-4 w-4 text-slate-400" />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                        Database Viti e Cilindri
                    </h1>
                    <p className="text-muted-foreground mt-1">Gestione magazzino e stato componenti critici.</p>
                </div>
                <div className="flex gap-2">
                    <StatusLegend />
                    <AddComponentDialog>
                        <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 hover:bg-emerald-700">
                            <Plus className="h-4 w-4" /> Nuovo
                        </button>
                    </AddComponentDialog>
                    <Link
                        href="/screws/assignment"
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                    >
                        <RotateCcw className="h-4 w-4" /> Assegnazione Asset
                    </Link>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    label="Totale Componenti"
                    value={components.length}
                    sub="In inventario"
                />
                <MetricCard
                    label="In Allerta"
                    value={components.filter(c => c.status !== 'OPTIMAL').length}
                    sub="Richiedono attenzione"
                    alert={components.filter(c => c.status !== 'OPTIMAL').length > 0}
                />
                <MetricCard
                    label="Magazzino Retinato"
                    value={components.filter(c => c.warehouse === 'RETINATO' && !c.assignedAssetId).length}
                    sub="Pezzi disponibili"
                />
                <MetricCard
                    label="Magazzino Magliato"
                    value={components.filter(c => c.warehouse === 'MAGLIATO' && !c.assignedAssetId).length}
                    sub="Pezzi disponibili"
                />
            </div>

            {/* List */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/40">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cerca per codice o modello..."
                            className="pl-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <select
                            className="w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                            value={warehouseFilter}
                            onChange={(e) => setWarehouseFilter(e.target.value as any)}
                        >
                            <option value="ALL">Tutti i Magazzini</option>
                            <option value="RETINATO">Retinato</option>
                            <option value="MAGLIATO">Magliato</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                            <tr>
                                <th className="px-4 py-3">Codice</th>
                                <th className="px-4 py-3">Modello</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Stato</th>
                                <th className="px-4 py-3">Ultima Misura</th>
                                <th className="px-4 py-3">Assegnazione/Posizione</th>
                                <th className="px-4 py-3 text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredComponents.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground italic">
                                        Nessun componente trovato.
                                    </td>
                                </tr>
                            ) : (
                                filteredComponents.map((comp) => (
                                    <tr key={comp.id} className={cn("hover:bg-muted/50 transition-colors", comp.isScrapped && "bg-red-50 hover:bg-red-100 opacity-75")}>
                                        <td className="px-4 py-3 font-medium font-mono">
                                            <ComponentDetailsDialog component={comp}>
                                                <button className="text-left hover:underline decoration-primary hover:text-primary transition-colors flex items-center gap-2">
                                                    {comp.code}
                                                    {comp.isScrapped && <span className="text-[10px] bg-red-200 text-red-800 px-1 rounded">ROTTAMATA</span>}
                                                </button>
                                            </ComponentDetailsDialog>
                                        </td>
                                        <td className="px-4 py-3">{comp.model}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn("px-2 py-0.5 rounded text-xs border", comp.type === 'SCREW' ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
                                                {comp.type === 'SCREW' ? 'VITE' : 'CILINDRO'}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <StatusIcon status={comp.status} />
                                                <span className={cn("text-xs font-medium",
                                                    comp.status === 'OPTIMAL' ? "text-emerald-600" :
                                                        comp.status === 'WARNING' ? "text-amber-600" :
                                                            comp.status === 'NEEDS_NITRIDING' ? "text-orange-600" :
                                                                comp.status === 'NEEDS_REGENERATION' ? "text-purple-600" :
                                                                    comp.status === 'TO_ORDER' ? "text-sky-600" :
                                                                        "text-red-600"
                                                )}>{
                                                        comp.status === 'NEEDS_NITRIDING' ? 'NITRURARE' :
                                                            comp.status === 'NEEDS_REGENERATION' ? 'RIGENERARE' :
                                                                comp.status === 'TO_ORDER' ? 'DA ORDINARE' :
                                                                    comp.status
                                                    }</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {comp.measurements.length > 0
                                                ? `${comp.measurements[comp.measurements.length - 1].value1} mm`
                                                : "-"
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            {comp.assignedAssetId ? (
                                                (() => {
                                                    const asset = assets.find(a => a.id === comp.assignedAssetId);
                                                    return (
                                                        <div className="flex flex-col">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 border font-medium whitespace-nowrap mb-0.5 w-fit">
                                                                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                                                {asset?.name || 'Asset Sconosciuto'}
                                                            </span>
                                                            {asset?.line && (
                                                                <span className="text-[10px] text-muted-foreground ml-1">
                                                                    {asset.line}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border w-fit whitespace-nowrap mb-1">
                                                        <span className="w-2 h-2 rounded-full bg-amber-400 mr-2"></span>
                                                        {comp.warehouse}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground ml-1">
                                                        {comp.location}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <MeasureDialog component={comp}>
                                                    <button className="p-2 hover:bg-muted rounded-md text-primary transition-colors" title="Aggiungi Misura">
                                                        <Ruler className="h-4 w-4" />
                                                    </button>
                                                </MeasureDialog>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div >
        </div >
    );
}

function StatusLegend() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 bg-white text-muted-foreground border px-3 py-2 rounded-lg font-medium shadow-sm hover:bg-muted transition-colors"
                title="Legenda Stati"
            >
                <Info className="h-4 w-4" />
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setOpen(false)}>
                    <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border animate-in zoom-in-95 duration-200 p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Info className="h-5 w-5 text-primary" />
                                Legenda Stati Usura
                            </h3>
                            <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded text-muted-foreground">
                                <div className="sr-only">Chiudi</div>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wider">Viti (Differenza Nominale)</h4>
                                <div className="border rounded-lg overflow-hidden text-sm">
                                    <div className="grid grid-cols-2 bg-muted/50 font-medium p-2 border-b">
                                        <div>Soglia (mm)</div>
                                        <div>Stato</div>
                                    </div>
                                    <div className="grid grid-cols-2 p-2 border-b">
                                        <div>&lt; 0.4</div>
                                        <div className="text-emerald-600 font-medium flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> OPTIMAL</div>
                                    </div>
                                    <div className="grid grid-cols-2 p-2 border-b">
                                        <div>0.5 - 0.6</div>
                                        <div className="text-orange-600 font-medium flex items-center gap-2"><AlertTriangle className="h-3 w-3" /> NITRURARE</div>
                                    </div>
                                    <div className="grid grid-cols-2 p-2 border-b">
                                        <div>0.61 - 1.0</div>
                                        <div className="text-purple-600 font-medium flex items-center gap-2"><AlertTriangle className="h-3 w-3" /> RIGENERARE</div>
                                    </div>
                                    <div className="grid grid-cols-2 p-2">
                                        <div>&gt; 1.0</div>
                                        <div className="text-red-600 font-medium flex items-center gap-2"><AlertTriangle className="h-3 w-3" /> ROTTAMARE</div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wider">Cilindri (Differenza Nominale)</h4>
                                <div className="border rounded-lg overflow-hidden text-sm">
                                    <div className="grid grid-cols-2 bg-muted/50 font-medium p-2 border-b">
                                        <div>Soglia (mm)</div>
                                        <div>Stato</div>
                                    </div>
                                    <div className="grid grid-cols-2 p-2 border-b">
                                        <div>&lt; 0.7</div>
                                        <div className="text-emerald-600 font-medium flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> OPTIMAL</div>
                                    </div>
                                    <div className="grid grid-cols-2 p-2 border-b">
                                        <div>0.7 - 0.8</div>
                                        <div className="text-sky-600 font-medium flex items-center gap-2"><ShoppingCart className="h-3 w-3" /> DA ORDINARE</div>
                                    </div>
                                    <div className="grid grid-cols-2 p-2">
                                        <div>&gt; 0.8</div>
                                        <div className="text-red-600 font-medium flex items-center gap-2"><AlertTriangle className="h-3 w-3" /> ROTTAMARE</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function MetricCard({ label, value, sub, alert }: any) {
    return (
        <div className={cn("p-4 rounded-xl border bg-card shadow-sm", alert && "border-red-200 bg-red-50")}>
            <div className="text-sm text-muted-foreground font-medium">{label}</div>
            <div className={cn("text-2xl font-bold mt-1", alert && "text-red-600")}>{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{sub}</div>
        </div>
    );
}
