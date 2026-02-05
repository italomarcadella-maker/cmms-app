"use client";

import { useState } from "react";
import { Asset } from "@/lib/types";
import { AssetStatusBadge } from "./asset-status-badge";
import { Search, MapPin, Factory, Building2, QrCode, CheckSquare, Square } from "lucide-react";
import { useAssets } from "@/lib/assets-context";
import { Button } from "@/components/ui/button";
import { TagGeneratorDialog } from "./tag-generator-dialog";
import { Checkbox } from "@/components/ui/checkbox";

export function AssetTable() {
    const { assets } = useAssets();
    const [query, setQuery] = useState("");
    const [tagAssets, setTagAssets] = useState<Asset[] | null>(null); // For single or multiple
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const filtered = assets.filter(a =>
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.serialNumber.toLowerCase().includes(query.toLowerCase()) ||
        a.vendor.toLowerCase().includes(query.toLowerCase())
    );

    const toggleSelectAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(a => a.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleBulkPrint = () => {
        const selectedAssets = assets.filter(a => selectedIds.has(a.id));
        setTagAssets(selectedAssets);
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                        placeholder="Cerca per nome, seriale o costruttore..."
                        className="w-full rounded-md border bg-background pl-9 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                {selectedIds.size > 0 && (
                    <Button onClick={handleBulkPrint} className="animate-in fade-in zoom-in">
                        <QrCode className="mr-2 h-4 w-4" />
                        Stampa ({selectedIds.size})
                    </Button>
                )}
            </div>

            <div className="rounded-md border bg-card">
                <table className="w-full text-sm text-left">
                    <thead className="border-b bg-muted/40 text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 w-[40px]">
                                <Checkbox
                                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </th>
                            <th className="px-4 py-3 font-medium">Nome Asset</th>
                            <th className="px-4 py-3 font-medium hidden md:table-cell">Dettagli</th>
                            <th className="px-4 py-3 font-medium hidden sm:table-cell">Stabilimento</th>
                            <th className="px-4 py-3 font-medium">Stato</th>
                            <th className="px-4 py-3 font-medium text-right">Salute / Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((asset) => (
                            <tr
                                key={asset.id}
                                className={`border-b last:border-0 hover:bg-muted/50 transition-colors group ${selectedIds.has(asset.id) ? 'bg-muted/30' : ''}`}
                            >
                                <td className="px-4 py-3">
                                    <Checkbox
                                        checked={selectedIds.has(asset.id)}
                                        onCheckedChange={() => toggleSelect(asset.id)}
                                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                    />
                                </td>
                                <td className="px-4 py-3 cursor-pointer" onClick={() => window.location.href = `/assets/${asset.id}`}>
                                    <div className="font-medium text-foreground group-hover:text-primary transition-colors">{asset.name}</div>
                                    <div className="text-xs text-muted-foreground">{asset.model}</div>
                                </td>
                                <td className="px-4 py-3 hidden md:table-cell cursor-pointer" onClick={() => window.location.href = `/assets/${asset.id}`}>
                                    <div className="space-y-1 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Factory className="h-3 w-3" /> {asset.vendor}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Building2 className="h-3 w-3" /> {asset.model}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 hidden sm:table-cell cursor-pointer" onClick={() => window.location.href = `/assets/${asset.id}`}>
                                    <div className="flex flex-col text-xs">
                                        <span className="font-medium">{asset.plant}</span>
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <MapPin className="h-3 w-3" /> {asset.location}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 cursor-pointer" onClick={() => window.location.href = `/assets/${asset.id}`}>
                                    <AssetStatusBadge status={asset.status} />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        <div className="flex items-center gap-2" title={`Salute: ${asset.healthScore}%`}>
                                            <span className="font-mono text-xs">{asset.healthScore}%</span>
                                            <div className="h-2 w-12 rounded-full bg-secondary overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all"
                                                    style={{ width: `${asset.healthScore}%`, backgroundColor: asset.healthScore < 50 ? 'rgb(239 68 68)' : undefined }}
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTagAssets([asset]);
                                            }}
                                            title="Genera QR Tag"
                                        >
                                            <QrCode className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                    Nessun asset trovato per "{query}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {tagAssets && (
                <TagGeneratorDialog
                    assets={tagAssets}
                    onClose={() => setTagAssets(null)}
                />
            )}
        </div>
    );
}
