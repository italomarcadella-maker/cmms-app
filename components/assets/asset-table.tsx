"use client";

import { useState } from "react";
import { Asset } from "@/lib/types";
import { AssetStatusBadge } from "./asset-status-badge";
import { Search, MapPin, Factory, Building2 } from "lucide-react";
import { useAssets } from "@/lib/assets-context";

export function AssetTable() {
    const { assets } = useAssets();
    const [query, setQuery] = useState("");

    const filtered = assets.filter(a =>
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.serialNumber.toLowerCase().includes(query.toLowerCase()) ||
        a.vendor.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                    placeholder="Cerca per nome, seriale o costruttore..."
                    className="w-full rounded-md border bg-background pl-9 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            <div className="rounded-md border bg-card">
                <table className="w-full text-sm text-left">
                    <thead className="border-b bg-muted/40 text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 font-medium">Nome Asset</th>
                            <th className="px-4 py-3 font-medium hidden md:table-cell">Dettagli</th>
                            <th className="px-4 py-3 font-medium hidden sm:table-cell">Stabilimento</th>
                            <th className="px-4 py-3 font-medium">Stato</th>
                            <th className="px-4 py-3 font-medium text-right">Salute</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((asset) => (
                            <tr
                                key={asset.id}
                                className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer group"
                                onClick={() => window.location.href = `/assets/${asset.id}`}
                            >
                                <td className="px-4 py-3">
                                    <div className="font-medium text-foreground group-hover:text-primary transition-colors">{asset.name}</div>
                                    <div className="text-xs text-muted-foreground">{asset.model}</div>
                                </td>
                                <td className="px-4 py-3 hidden md:table-cell">
                                    <div className="space-y-1 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Factory className="h-3 w-3" /> {asset.vendor}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Building2 className="h-3 w-3" /> {asset.model}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 hidden sm:table-cell">
                                    <div className="flex flex-col text-xs">
                                        <span className="font-medium">{asset.plant}</span>
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <MapPin className="h-3 w-3" /> {asset.location}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <AssetStatusBadge status={asset.status} />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="font-mono">{asset.healthScore}%</span>
                                        <div className="h-2 w-16 rounded-full bg-secondary overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all"
                                                style={{ width: `${asset.healthScore}%`, backgroundColor: asset.healthScore < 50 ? 'rgb(239 68 68)' : undefined }}
                                            />
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                    Nessun asset trovato per "{query}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
