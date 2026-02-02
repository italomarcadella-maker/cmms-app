"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ChevronRight, ChevronDown, Factory, LayoutTemplate, Waypoints, Box } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Asset } from "@/lib/types";
import { AssetStatusBadge } from "./asset-status-badge";

interface AssetSelectorProps {
    assets: Asset[];
    onSelect: (asset: Asset) => void;
}

export function AssetSelector({ assets, onSelect }: AssetSelectorProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    // Filter assets based on search
    const filteredAssets = useMemo(() => {
        if (!searchTerm) return assets;
        const lowerTerm = searchTerm.toLowerCase();
        return assets.filter(a =>
            a.name.toLowerCase().includes(lowerTerm) ||
            a.serialNumber.toLowerCase().includes(lowerTerm) ||
            a.location.toLowerCase().includes(lowerTerm)
        );
    }, [assets, searchTerm]);

    // Grouping Logic (Same as AssetTree)
    const groupedAssets = useMemo(() => {
        return filteredAssets.reduce((acc, asset) => {
            const plant = asset.plant || "Non Assegnato";
            const dept = asset.department || "Generale";
            const line = asset.line || "Nessuna Linea";

            if (!acc[plant]) acc[plant] = {};
            if (!acc[plant][dept]) acc[plant][dept] = {};
            if (!acc[plant][dept][line]) acc[plant][dept][line] = [];

            acc[plant][dept][line].push(asset);
            return acc;
        }, {} as Record<string, Record<string, Record<string, Asset[]>>>);
    }, [filteredAssets]);

    const toggleNode = (id: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedNodes(newExpanded);
    };

    // Auto-expand if searching
    useEffect(() => {
        if (searchTerm) {
            const allKeys = new Set<string>();
            Object.keys(groupedAssets).forEach(plant => {
                allKeys.add(plant);
                Object.keys(groupedAssets[plant]).forEach(dept => {
                    allKeys.add(`${plant}-${dept}`);
                    Object.keys(groupedAssets[plant][dept]).forEach(line => {
                        allKeys.add(`${plant}-${dept}-${line}`);
                    });
                });
            });
            setExpandedNodes(allKeys);
        }
    }, [searchTerm, groupedAssets]);

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Cerca asset per nome, seriale o posizione..."
                    className="pl-9 bg-background/50 backdrop-blur-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="border rounded-lg bg-card/50 shadow-sm overflow-hidden min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar">
                {Object.keys(groupedAssets).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground gap-2">
                        <Search className="h-8 w-8 opacity-20" />
                        <p>Nessun asset trovato</p>
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        {Object.keys(groupedAssets).sort().map((plant) => (
                            <div key={plant}>
                                <div
                                    className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded-md cursor-pointer font-semibold transition-colors group"
                                    onClick={() => toggleNode(plant)}
                                >
                                    <div className="p-1 rounded-sm bg-blue-500/10 text-blue-600 group-hover:bg-blue-500/20">
                                        {expandedNodes.has(plant) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </div>
                                    <Factory className="h-4 w-4 text-blue-500" />
                                    <span>{plant}</span>
                                </div>

                                {expandedNodes.has(plant) && (
                                    <div className="ml-3 pl-3 border-l-2 border-muted space-y-1 mt-1">
                                        {Object.keys(groupedAssets[plant]).sort().map((dept) => (
                                            <div key={`${plant}-${dept}`}>
                                                <div
                                                    className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded-md cursor-pointer font-medium text-sm transition-colors group"
                                                    onClick={() => toggleNode(`${plant}-${dept}`)}
                                                >
                                                    <div className="p-0.5 rounded-sm text-muted-foreground group-hover:text-foreground">
                                                        {expandedNodes.has(`${plant}-${dept}`) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                    </div>
                                                    <LayoutTemplate className="h-4 w-4 text-orange-500" />
                                                    <span>{dept}</span>
                                                </div>

                                                {expandedNodes.has(`${plant}-${dept}`) && (
                                                    <div className="ml-3 pl-3 border-l-2 border-muted space-y-1 mt-1">
                                                        {Object.keys(groupedAssets[plant][dept]).sort().map((line) => (
                                                            <div key={`${plant}-${dept}-${line}`}>
                                                                <div
                                                                    className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded-md cursor-pointer text-sm transition-colors group"
                                                                    onClick={() => toggleNode(`${plant}-${dept}-${line}`)}
                                                                >
                                                                    <div className="p-0.5 rounded-sm text-muted-foreground group-hover:text-foreground">
                                                                        {expandedNodes.has(`${plant}-${dept}-${line}`) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                                    </div>
                                                                    <Waypoints className="h-4 w-4 text-purple-500" />
                                                                    <span>{line}</span>
                                                                </div>

                                                                {expandedNodes.has(`${plant}-${dept}-${line}`) && (
                                                                    <div className="ml-4 grid gap-2 mt-1 mb-2 pr-2">
                                                                        {groupedAssets[plant][dept][line].map(asset => (
                                                                            <div
                                                                                key={asset.id}
                                                                                onClick={() => onSelect(asset)}
                                                                                className="flex items-center justify-between p-3 rounded-lg bg-card border hover:border-primary/50 cursor-pointer shadow-sm hover:shadow-md transition-all group/asset"
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="p-2 bg-muted rounded-full group-hover/asset:bg-primary/10 group-hover/asset:text-primary transition-colors">
                                                                                        <Box className="h-4 w-4" />
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="font-medium text-sm group-hover/asset:text-primary transition-colors">{asset.name}</p>
                                                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                                            <span className="font-mono bg-muted px-1 rounded">{asset.serialNumber}</span>
                                                                                            {asset.vendor && <span>• {asset.vendor}</span>}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <AssetStatusBadge status={asset.status as any} />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
