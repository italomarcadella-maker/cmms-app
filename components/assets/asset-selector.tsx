"use client";

import { useState, useMemo } from "react";
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
    useMemo(() => {
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
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="border rounded-lg bg-card shadow-sm overflow-hidden min-h-[400px] max-h-[600px] overflow-y-auto">
                {Object.keys(groupedAssets).length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        Nessun asset trovato.
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        {Object.keys(groupedAssets).sort().map((plant) => (
                            <div key={plant}>
                                <div
                                    className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer font-semibold"
                                    onClick={() => toggleNode(plant)}
                                >
                                    {expandedNodes.has(plant) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    <Factory className="h-4 w-4 text-muted-foreground" />
                                    <span>{plant}</span>
                                </div>

                                {expandedNodes.has(plant) && (
                                    <div className="ml-4 border-l pl-2 space-y-1 mt-1">
                                        {Object.keys(groupedAssets[plant]).sort().map((dept) => (
                                            <div key={`${plant}-${dept}`}>
                                                <div
                                                    className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer font-medium text-sm"
                                                    onClick={() => toggleNode(`${plant}-${dept}`)}
                                                >
                                                    {expandedNodes.has(`${plant}-${dept}`) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                    <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                                                    <span>{dept}</span>
                                                </div>

                                                {expandedNodes.has(`${plant}-${dept}`) && (
                                                    <div className="ml-4 border-l pl-2 space-y-1 mt-1">
                                                        {Object.keys(groupedAssets[plant][dept]).sort().map((line) => (
                                                            <div key={`${plant}-${dept}-${line}`}>
                                                                <div
                                                                    className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer text-sm"
                                                                    onClick={() => toggleNode(`${plant}-${dept}-${line}`)}
                                                                >
                                                                    {expandedNodes.has(`${plant}-${dept}-${line}`) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                                    <Waypoints className="h-4 w-4 text-muted-foreground" />
                                                                    <span>{line}</span>
                                                                </div>

                                                                {expandedNodes.has(`${plant}-${dept}-${line}`) && (
                                                                    <div className="ml-6 grid gap-1 mt-1">
                                                                        {groupedAssets[plant][dept][line].map(asset => (
                                                                            <div
                                                                                key={asset.id}
                                                                                onClick={() => onSelect(asset)}
                                                                                className="flex items-center justify-between p-3 rounded-md bg-background border hover:border-primary cursor-pointer hover:shadow-sm transition-all group"
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="p-2 bg-muted rounded-full group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                                                        <Box className="h-4 w-4" />
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="font-medium text-sm">{asset.name}</p>
                                                                                        <p className="text-xs text-muted-foreground">{asset.serialNumber}</p>
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
