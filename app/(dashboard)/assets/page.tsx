"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, MapPin, Network, Pencil, Plus, Printer, Search, Table as TableIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAssets } from "@/lib/assets-context";
import { useAuth } from "@/lib/auth-context";
import { deleteAsset } from "@/lib/actions";
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

    const canManage = user?.role === "ADMIN" || user?.role === "SUPERVISOR" || user?.role === "PLANT_MANAGER";

    const defaultAsset = {
        name: "", model: "", serialNumber: "", vendor: "", plant: "", department: "", location: "", line: "", purchaseDate: "", status: "OPERATIONAL", healthScore: 100, lastMaintenance: "", cespite: ""
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
        const ok = await confirm({
            title: "Eliminare questo asset?",
            description: "L'azione non può essere annullata. Se l'asset ha ordini di lavoro o manutenzioni collegate non potrà essere eliminato.",
            confirmLabel: "Elimina",
            variant: "destructive",
        });
        if (!ok) return;

        try {
            const result = await deleteAsset(id);
            if (result.success) {
                toast.success("Asset eliminato");
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
                title="Asset e macchinari"
                description="Gestisci attrezzature e macchinari dello stabilimento."
                breadcrumb={[{ label: "Operativo" }, { label: "Asset e macchinari" }]}
                actions={
                    <Button onClick={handleNewClick}>
                        <Plus className="mr-1.5 h-4 w-4" /> Nuovo asset
                    </Button>
                }
                className="mb-2"
            />

            <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="h-9 pl-9"
                        placeholder="Cerca per nome, modello, matricola o ubicazione"
                        aria-label="Cerca asset"
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
                            Mostra generici e sicurezza
                        </Label>
                    </div>
                    <SegmentedControl
                        aria-label="Vista"
                        value={viewMode}
                        onChange={setViewMode}
                        options={[
                            { value: "list", label: "Lista", icon: <TableIcon /> },
                            { value: "tree", label: "Albero", icon: <Network /> },
                        ]}
                    />
                </div>
            </div>

            {viewMode === "list" ? (
                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Asset</TableHead>
                                <TableHead>Dettagli</TableHead>
                                <TableHead>Ubicazione</TableHead>
                                <TableHead>Reparto e linea</TableHead>
                                <TableHead>Stato</TableHead>
                                <TableHead>Salute</TableHead>
                                <TableHead className="w-[120px] text-right">
                                    <span className="sr-only">Azioni</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAssets.length === 0 ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={7}>
                                        <EmptyState icon={<Box />} title="Nessun asset trovato" description="Modifica la ricerca oppure aggiungi un nuovo asset." />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAssets.map((asset) => {
                                    const tone = healthTone(asset.healthScore);
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
                                                <div>Modello: {asset.model}</div>
                                                <div className="font-mono">Matricola: {asset.serialNumber}</div>
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
                                                {asset.line && <div>Linea {asset.line}</div>}
                                                {asset.cespite && <div className="font-mono">Cespite {asset.cespite}</div>}
                                            </TableCell>
                                            <TableCell>
                                                <AssetStatusBadge status={asset.status} />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2" title={`Salute ${asset.healthScore}%`}>
                                                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                                        <div className={cn("h-full rounded-full", toneBarClass[tone])} style={{ width: `${asset.healthScore}%` }} />
                                                    </div>
                                                    <span className="text-xs font-medium tabular-nums">{asset.healthScore}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-0.5">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => handleEditClick(e, asset)} aria-label={`Modifica ${asset.name}`}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    {canManage && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-critical-strong" onClick={(e) => handleDeleteClick(e, asset.id)} aria-label={`Elimina ${asset.name}`}>
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
                                                        aria-label={`Stampa il QR di ${asset.name}`}
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
