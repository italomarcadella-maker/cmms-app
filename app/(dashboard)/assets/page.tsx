"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, MapPin, Network, Pencil, Plus, Printer, Search, Table as TableIcon, Trash2 } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import { useAssets } from "@/lib/assets-context";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n/client";
import { deleteAsset } from "@/lib/actions";
import { getAssetsStoppedByFault } from "@/modules/maintenance/adapters/actions/asset-reliability-actions";
import { getAssetsHealth, type AssetHealthSummary } from "@/modules/maintenance/adapters/actions/asset-health-actions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AssetStatusBadge } from "@/components/assets/asset-status-badge";
import { AssetFormDialog } from "@/components/assets/asset-form-dialog";
import { QRCodeDialog } from "@/components/assets/qr-code-dialog";
import { AssetTree } from "@/components/assets/asset-tree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { healthTone, toneBarClass } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AssetsPage() {
    const router = useRouter();
    const t = useT();
    const { assets, addAsset, updateAsset } = useAssets();
    const { user } = useAuth();
    const { confirm, dialog: confirmDialog } = useConfirm();
    const [search, setSearch] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [isQrOpen, setIsQrOpen] = useState(false);
    const [qrAsset, setQrAsset] = useState<any>(null);
    const [viewMode, setViewMode] = useState<"list" | "tree">("list");
    const [showGenerics, setShowGenerics] = useState(false);
    // Asset con un guasto aperto che li ferma: una sola query per tutta la lista
    const [stoppedIds, setStoppedIds] = useState<Set<string>>(new Set());
    // Salute calcolata (guasti, richieste, manutenzione programmata): una sola chiamata per tutta la lista
    const [healthById, setHealthById] = useState<Record<string, AssetHealthSummary>>({});
    const assetIdsKey = (assets ?? []).map((a) => a.id).filter((id) => !id.startsWith("SYS-")).join(",");

    useEffect(() => {
        let alive = true;
        getAssetsStoppedByFault().then((ids) => {
            if (alive) setStoppedIds(new Set(ids));
        });
        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        if (!assetIdsKey) return;
        let alive = true;
        getAssetsHealth(assetIdsKey.split(",")).then((r) => {
            if (alive && r.success) setHealthById(r.byAsset);
        });
        return () => {
            alive = false;
        };
    }, [assetIdsKey]);

    const canManage = user?.role === "ADMIN" || user?.role === "SUPERVISOR" || user?.role === "PLANT_MANAGER";

    const defaultAsset = {
        name: "", model: "", serialNumber: "", vendor: "", plant: "", department: "", location: "", line: "", purchaseDate: "", status: "OPERATIONAL", lastMaintenance: "", cespite: ""
    };

    const filteredAssets = (() => {
        if (!assets) return [];
        const q = search.toLowerCase();

        return assets.filter((asset) => {
            const matchesSearch =
                asset.name.toLowerCase().includes(q) ||
                asset.model.toLowerCase().includes(q) ||
                asset.serialNumber.toLowerCase().includes(q) ||
                asset.location.toLowerCase().includes(q);

            // Generic / safety / system assets are hidden unless the toggle is on
            const isGeneric =
                ["SAFETY", "KAIZEN", "OTHER"].includes(asset.type) ||
                asset.location === "VIRTUAL" ||
                asset.id.startsWith("SYS-");

            if (!showGenerics && isGeneric) return false;
            return matchesSearch;
        });
    })();

    const handleSaveAsset = (asset: any) => {
        if (asset.id && assets.some((a) => a.id === asset.id)) {
            updateAsset(asset.id, asset);
        } else {
            addAsset(asset);
        }
        setIsDialogOpen(false);
        setSelectedAsset(null);
    };

    const handleEditClick = (e: React.MouseEvent, asset: any) => {
        e.stopPropagation();
        setSelectedAsset(asset);
        setIsDialogOpen(true);
    };

    const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        // Gruppi e componenti non si eliminano con la macchina: restano nell'elenco come asset senza padre
        const childCount = (assets ?? []).filter((a) => a.parentId === id).length;
        const childNote =
            childCount === 0
                ? ""
                : childCount === 1
                  ? ` ${t("Questo asset ha 1 componente collegato: resterà senza asset padre, non verrà eliminato.")}`
                  : ` ${t("Questo asset ha {count} componenti collegati: resteranno senza asset padre, non verranno eliminati.", { count: childCount })}`;
        const ok = await confirm({
            title: t("Eliminare questo asset?"),
            description: `${t("L'azione non può essere annullata. Se l'asset ha ordini di lavoro o manutenzioni collegate non potrà essere eliminato.")}${childNote}`,
            confirmLabel: t("Elimina"),
            variant: "destructive",
        });
        if (!ok) return;

        try {
            const result = await deleteAsset(id);
            if (result.success) {
                toast.success("Asset eliminato", { description: childCount > 0 ? result.message : undefined });
                router.refresh();
            } else {
                toast.error("Impossibile eliminare l'asset", { description: result.message });
            }
        } catch (error) {
            console.error(error);
            toast.error("Si è verificato un errore imprevisto");
        }
    };

    const handleNewClick = () => {
        setSelectedAsset(defaultAsset);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            <PageHeader
                title={t("Asset e macchinari")}
                description={t("Gestisci attrezzature e macchinari dello stabilimento.")}
                breadcrumb={[{ label: t("Operativo") }, { label: t("Asset e macchinari") }]}
                actions={
                    <Button onClick={handleNewClick}>
                        <Plus className="mr-1.5 h-4 w-4" /> {t("Nuovo asset")}
                    </Button>
                }
                className="mb-2"
            />

            <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="h-9 pl-9"
                        placeholder={t("Cerca per nome, modello, matricola o ubicazione")}
                        aria-label={t("Cerca asset")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <input
                            id="show-generics"
                            type="checkbox"
                            checked={showGenerics}
                            onChange={(e) => setShowGenerics(e.target.checked)}
                            className="h-4 w-4 rounded border-input accent-primary"
                        />
                        <Label htmlFor="show-generics" className="cursor-pointer text-sm font-normal text-muted-foreground">
                            {t("Mostra generici e sicurezza")}
                        </Label>
                    </div>
                    <SegmentedControl
                        aria-label={t("Vista")}
                        value={viewMode}
                        onChange={setViewMode}
                        options={[
                            { value: "list", label: t("Lista"), icon: <TableIcon /> },
                            { value: "tree", label: t("Albero"), icon: <Network /> },
                        ]}
                    />
                </div>
            </div>

            {viewMode === "list" ? (
                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>{t("Asset")}</TableHead>
                                <TableHead>{t("Dettagli")}</TableHead>
                                <TableHead>{t("Ubicazione")}</TableHead>
                                <TableHead>{t("Reparto e linea")}</TableHead>
                                <TableHead>{t("Stato")}</TableHead>
                                <TableHead>{t("Salute")}</TableHead>
                                <TableHead className="w-[120px] text-right">
                                    <span className="sr-only">{t("Azioni")}</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAssets.length === 0 ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={7}>
                                        <EmptyState icon={<Box />} title={t("Nessun asset trovato")} description={t("Modifica la ricerca oppure aggiungi un nuovo asset.")} />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAssets.map((asset) => {
                                    const health = healthById[asset.id];
                                    const score = health?.score ?? null;
                                    const tone = score === null ? null : healthTone(score);
                                    return (
                                        <TableRow key={asset.id} onClick={() => router.push(`/assets/${asset.id}`)} className="group cursor-pointer">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground group-hover:text-primary">
                                                        <Box className="h-4 w-4" />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="font-medium">{asset.name}</div>
                                                        <div className="font-mono text-xs text-muted-foreground">{asset.id.substring(0, 12)}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                <div>{t("Modello: {value}", { value: asset.model })}</div>
                                                <div className="font-mono">{t("Matricola: {value}", { value: asset.serialNumber })}</div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="h-3 w-3" />
                                                    {asset.location}
                                                </div>
                                                {asset.plant && <div className="pl-[18px]">{asset.plant}</div>}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {asset.department && <div>{asset.department}</div>}
                                                {asset.line && <div>{t("Linea {value}", { value: asset.line })}</div>}
                                                {asset.cespite && <div className="font-mono">{t("Cespite {value}", { value: asset.cespite })}</div>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col items-start gap-1">
                                                    <AssetStatusBadge status={asset.status} />
                                                    {stoppedIds.has(asset.id) && <Badge variant="critical">{t("Fermo per guasto")}</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div
                                                    className="flex items-center gap-2"
                                                    title={score === null ? (health?.reason ? t("Salute non valutabile: {reason}", { reason: t(health.reason) }) : t("Salute non valutabile")) : t("Salute {score}%", { score })}
                                                >
                                                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                                        {tone && score !== null && <div className={cn("h-full rounded-full", toneBarClass[tone])} style={{ width: `${score}%` }} />}
                                                    </div>
                                                    <span className={cn("text-xs font-medium tabular-nums", score === null && "text-muted-foreground")}>{score === null ? t("n.d.") : `${score}%`}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-0.5">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => handleEditClick(e, asset)} aria-label={t("Modifica {name}", { name: asset.name })}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    {canManage && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-critical-strong" onClick={(e) => handleDeleteClick(e, asset.id)} aria-label={t("Elimina {name}", { name: asset.name })}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setQrAsset(asset);
                                                            setIsQrOpen(true);
                                                        }}
                                                        aria-label={t("Stampa il QR di {name}", { name: asset.name })}
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <AssetTree assets={filteredAssets} onEdit={handleEditClick} onDelete={handleDeleteClick} canManage={canManage} />
            )}

            <AssetFormDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                asset={selectedAsset || defaultAsset}
                onSave={handleSaveAsset}
            />

            <QRCodeDialog isOpen={isQrOpen} onClose={() => setIsQrOpen(false)} asset={qrAsset} />
            {confirmDialog}
        </div>
    );
}
