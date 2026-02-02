"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Factory, LayoutTemplate, MapPin, Box, Waypoints } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AssetStatusBadge } from "./asset-status-badge";
import { useRouter } from "next/navigation";
import { AssetStatus } from "@/lib/types";

// Define strict types for the hierarchy
interface Asset {
    id: string;
    name: string;
    model: string;
    serialNumber: string;
    plant?: string | null;
    department?: string | null;
    line?: string | null;
    location: string;
    status: AssetStatus | string;
    [key: string]: any;
}

interface AssetTreeProps {
    assets: Asset[];
    onEdit: (e: React.MouseEvent, asset: Asset) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    canManage: boolean;
}

interface TreeNodeProps {
    label: string;
    icon: React.ReactNode;
    count: number;
    children: React.ReactNode;
    defaultOpen?: boolean;
    level: number;
}

function TreeNode({ label, icon, count, children, defaultOpen = false, level }: TreeNodeProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (!count) return null;

    return (
        <div className="select-none">
            <div
                className={cn(
                    "flex items-center gap-2 py-2 px-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors",
                    level === 0 && "font-semibold text-lg",
                    level === 1 && "font-medium text-base ml-4",
                    level === 2 && "text-sm ml-8"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="text-muted-foreground">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
                <div className="text-primary/80">{icon}</div>
                <span className="flex-1">{label}</span>
                <Badge variant="secondary" className="text-xs h-5 px-1.5 min-w-[20px] justify-center">
                    {count}
                </Badge>
            </div>
            {isOpen && <div className="animate-in slide-in-from-top-1 duration-200">{children}</div>}
        </div>
    );
}

export function AssetTree({ assets, onEdit, onDelete, canManage }: AssetTreeProps) {
    const router = useRouter();

    // Grouping Logic
    const groupedAssets = assets.reduce((acc, asset) => {
        const plant = asset.plant || "Non Assegnato";
        const dept = asset.department || "Generale";
        const line = asset.line || "Nessuna Linea";

        if (!acc[plant]) acc[plant] = {};
        if (!acc[plant][dept]) acc[plant][dept] = {};
        if (!acc[plant][dept][line]) acc[plant][dept][line] = [];

        acc[plant][dept][line].push(asset);
        return acc;
    }, {} as Record<string, Record<string, Record<string, Asset[]>>>);

    return (
        <div className="space-y-2 border rounded-lg p-4 bg-card shadow-sm">
            {Object.keys(groupedAssets).sort().map((plant) => {
                const departments = groupedAssets[plant];
                const plantAssetCount = Object.values(departments).reduce(
                    (total, lines) => total + Object.values(lines).reduce((sub, list) => sub + list.length, 0),
                    0
                );

                return (
                    <TreeNode
                        key={plant}
                        label={plant}
                        icon={<Factory className="h-4 w-4" />}
                        count={plantAssetCount}
                        defaultOpen={true}
                        level={0}
                    >
                        {Object.keys(departments).sort().map((dept) => {
                            const lines = departments[dept];
                            const deptAssetCount = Object.values(lines).reduce((sub, list) => sub + list.length, 0);

                            return (
                                <TreeNode
                                    key={`${plant}-${dept}`}
                                    label={dept}
                                    icon={<LayoutTemplate className="h-4 w-4" />}
                                    count={deptAssetCount}
                                    level={1}
                                >
                                    {Object.keys(lines).sort().map((line) => {
                                        const assetList = lines[line];

                                        return (
                                            <TreeNode
                                                key={`${plant}-${dept}-${line}`}
                                                label={line}
                                                icon={<Waypoints className="h-4 w-4" />}
                                                count={assetList.length}
                                                level={2}
                                            >
                                                <div className="ml-12 grid gap-1 border-l-2 border-muted pl-4 py-1">
                                                    {assetList.map((asset) => (
                                                        <div
                                                            key={asset.id}
                                                            onClick={() => router.push(`/assets/${asset.id}`)}
                                                            className="group flex items-center justify-between p-2 rounded-md hover:bg-muted/80 cursor-pointer border border-transparent hover:border-border transition-all bg-background/50"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <Box className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-medium">{asset.name}</span>
                                                                    <span className="text-xs text-muted-foreground">{asset.serialNumber}</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-4">
                                                                <AssetStatusBadge status={asset.status as AssetStatus} />

                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); onEdit(e, asset); }}
                                                                        className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-primary border border-transparent hover:border-input"
                                                                    >
                                                                        <span className="sr-only">Modifica</span>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                                                    </button>
                                                                    {canManage && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); onDelete(e, asset.id); }}
                                                                            className="p-1.5 hover:bg-red-50 text-muted-foreground hover:text-red-600 rounded-md border border-transparent hover:border-red-200"
                                                                        >
                                                                            <span className="sr-only">Elimina</span>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TreeNode>
                                        );
                                    })}
                                </TreeNode>
                            );
                        })}
                    </TreeNode>
                );
            })}
        </div>
    );
}
