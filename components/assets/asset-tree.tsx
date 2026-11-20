"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Factory, LayoutTemplate, Box, Waypoints } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { tk } from "@/lib/i18n/translate";
import { Badge } from "@/components/ui/badge";
import { AssetStatusBadge } from "./asset-status-badge";
import { useRouter } from "next/navigation";
import { AssetStatus } from "@/lib/types";
import { buildAssetTree, isSystemAsset, type AssetTreeNode } from "@/modules/maintenance/domain/asset-hierarchy";

// Define strict types for the hierarchy
interface Asset {
    id: string;
    name: string;
    model: string;
    serialNumber: string;
    plant?: string | null;
    plantId?: string | null;
    department?: string | null;
    line?: string | null;
    parentId?: string | null;
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
    const t = useT();
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
                <span className="flex-1">{t(label)}</span>
                <Badge variant="secondary" className="text-xs h-5 px-1.5 min-w-[20px] justify-center">
                    {count}
                </Badge>
            </div>
            {isOpen && <div className="animate-in slide-in-from-top-1 duration-200">{children}</div>}
        </div>
    );
}

/** Asset e tutti i suoi discendenti presenti nell'elenco. */
function countNodes(node: AssetTreeNode<Asset>): number {
    return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

interface AssetRowProps {
    node: AssetTreeNode<Asset>;
    onEdit: AssetTreeProps["onEdit"];
    onDelete: AssetTreeProps["onDelete"];
    canManage: boolean;
}

/** Una macchina (o un gruppo, o un componente) con i suoi figli annidati, aperti/chiusi con la freccia. */
function AssetRow({ node, onEdit, onDelete, canManage }: AssetRowProps) {
    const t = useT();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const asset = node.item;
    const hasChildren = node.children.length > 0;
    const descendants = countNodes(node) - 1;

    return (
        <div>
            <div
                onClick={() => router.push(`/assets/${asset.id}`)}
                className="group flex items-center justify-between p-2 rounded-md hover:bg-muted/80 cursor-pointer border border-transparent hover:border-border transition-all bg-background/50"
            >
                <div className="flex items-center gap-2 min-w-0">
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v); }}
                            aria-expanded={isOpen}
                            aria-label={isOpen ? t("Chiudi i componenti di {name}", { name: asset.name }) : t("Apri i componenti di {name}", { name: asset.name })}
                            className="p-0.5 rounded text-muted-foreground hover:bg-background hover:text-foreground"
                        >
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    ) : (
                        <span className="inline-block w-5" aria-hidden />
                    )}
                    <Box className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">{asset.name}</span>
                        <span className="text-xs text-muted-foreground">{asset.serialNumber}</span>
                    </div>
                    {hasChildren && (
                        <Badge variant="secondary" className="text-xs h-5 px-1.5 shrink-0">
                            {descendants === 1 ? t("1 componente") : t("{count} componenti", { count: descendants })}
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <AssetStatusBadge status={asset.status as AssetStatus} />

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(e, asset); }}
                            className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-primary border border-transparent hover:border-input"
                        >
                            <span className="sr-only">{t("Modifica")}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                        </button>
                        {canManage && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(e, asset.id); }}
                                className="p-1.5 hover:bg-red-50 text-muted-foreground hover:text-red-600 rounded-md border border-transparent hover:border-red-200"
                            >
                                <span className="sr-only">{t("Elimina")}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {hasChildren && isOpen && (
                <div className="ml-6 grid gap-1 border-l-2 border-muted pl-3 py-1 animate-in slide-in-from-top-1 duration-200">
                    {node.children.map((child) => (
                        <AssetRow key={child.item.id} node={child} onEdit={onEdit} onDelete={onDelete} canManage={canManage} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function AssetTree({ assets, onEdit, onDelete, canManage }: AssetTreeProps) {
    // Gerarchia macchina -> gruppo -> componente. Gli asset di sistema non hanno padre ne' figli; un figlio il cui padre
    // non e' nell'elenco (nascosto dalla ricerca o dai filtri) compare come radice, cosi' non sparisce.
    const roots = buildAssetTree(assets.map((a) => (isSystemAsset(a.id) ? { ...a, parentId: null } : a)));

    // Le macchine principali si raggruppano come prima: stabilimento > reparto > linea (testi dell'asset)
    const groupedAssets = roots.reduce((acc, node) => {
        const asset = node.item;
        const plant = asset.plant || tk("Non Assegnato");
        const dept = asset.department || tk("Generale");
        const line = asset.line || tk("Nessuna Linea");

        if (!acc[plant]) acc[plant] = {};
        if (!acc[plant][dept]) acc[plant][dept] = {};
        if (!acc[plant][dept][line]) acc[plant][dept][line] = [];

        acc[plant][dept][line].push(node);
        return acc;
    }, {} as Record<string, Record<string, Record<string, AssetTreeNode<Asset>[]>>>);

    // I conteggi comprendono i componenti annidati: il totale resta il numero degli asset mostrati
    const sizeOf = (list: AssetTreeNode<Asset>[]) => list.reduce((sum, n) => sum + countNodes(n), 0);

    return (
        <div className="space-y-2 border rounded-lg p-4 bg-card shadow-sm">
            {Object.keys(groupedAssets).sort().map((plant) => {
                const departments = groupedAssets[plant];
                const plantAssetCount = Object.values(departments).reduce(
                    (total, lines) => total + Object.values(lines).reduce((sub, list) => sub + sizeOf(list), 0),
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
                            const deptAssetCount = Object.values(lines).reduce((sub, list) => sub + sizeOf(list), 0);

                            return (
                                <TreeNode
                                    key={`${plant}-${dept}`}
                                    label={dept}
                                    icon={<LayoutTemplate className="h-4 w-4" />}
                                    count={deptAssetCount}
                                    level={1}
                                >
                                    {Object.keys(lines).sort().map((line) => {
                                        const nodes = lines[line];

                                        return (
                                            <TreeNode
                                                key={`${plant}-${dept}-${line}`}
                                                label={line}
                                                icon={<Waypoints className="h-4 w-4" />}
                                                count={sizeOf(nodes)}
                                                level={2}
                                            >
                                                <div className="ml-12 grid gap-1 border-l-2 border-muted pl-4 py-1">
                                                    {nodes.map((node) => (
                                                        <AssetRow key={node.item.id} node={node} onEdit={onEdit} onDelete={onDelete} canManage={canManage} />
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
