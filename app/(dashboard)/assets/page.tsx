"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Box, MapPin, Pencil, Trash2 } from "lucide-react";
import { useAssets } from "@/lib/assets-context";
import { AssetStatusBadge } from "@/components/assets/asset-status-badge";
import { AssetFormDialog } from "@/components/assets/asset-form-dialog";

import { useAuth } from "@/lib/auth-context";
import { deleteAsset } from "@/lib/actions";

export default function AssetsPage() {
    const router = useRouter();
    const { assets, addAsset, updateAsset } = useAssets();
    const { user } = useAuth(); // Auth context for role check
    const [search, setSearch] = useState("");
    const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<any>(null); // Use selectedAsset for editing

    const canManage = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

    const defaultAsset = {
        name: "", model: "", serialNumber: "", vendor: "", plant: "Main Plant", department: "", location: "", purchaseDate: "", status: "OPERATIONAL", healthScore: 100, lastMaintenance: "", line: "", cespite: ""
    };

    useEffect(() => {
        if (!assets) return;
        const lowercasedSearch = search.toLowerCase();
        const filtered = assets.filter(
            (asset) =>
                asset.name.toLowerCase().includes(lowercasedSearch) ||
                asset.model.toLowerCase().includes(lowercasedSearch) ||
                asset.serialNumber.toLowerCase().includes(lowercasedSearch) ||
                asset.location.toLowerCase().includes(lowercasedSearch)
        );
        setFilteredAssets(filtered);
    }, [search, assets]);

    const handleSaveAsset = (asset: any) => {
        if (asset.id && assets.some(a => a.id === asset.id)) {
            updateAsset(asset.id, asset);
        } else {
            addAsset(asset);
        }
        setIsDialogOpen(false);
        setSelectedAsset(null);
    };

    const handleEditClick = (e: React.MouseEvent, asset: any) => {
        e.stopPropagation(); // Prevent row click
        setSelectedAsset(asset);
        setIsDialogOpen(true);
    };

    const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Sei sicuro di voler eliminare questo asset? Questa azione non può essere annullata.")) return;

        try {
            const result = await deleteAsset(id);
            if (result.success) {
                router.refresh(); // Or reload window if needed, but router refresh is better
            } else {
                alert("Errore durante l'eliminazione: " + result.message);
            }
        } catch (error) {
            console.error(error);
            alert("Si è verificato un errore.");
        }
    };

    const handleNewClick = () => {
        setSelectedAsset(defaultAsset);
        setIsDialogOpen(true);
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                        Asset (Macchinari)
                    </h1>
                    <p className="text-muted-foreground mt-1">Gestisci attrezzature e macchinari.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleNewClick}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                    >
                        <Plus className="h-4 w-4" /> Nuovo Asset
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Cerca asset..."
                    className="pl-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* List */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                            <tr>
                                <th className="px-4 py-3">Nome Asset</th>
                                <th className="px-4 py-3">Dettagli</th>
                                <th className="px-4 py-3">Ubicazione</th>
                                <th className="px-4 py-3">Info Aggiuntive</th>
                                <th className="px-4 py-3">Stato</th>
                                <th className="px-4 py-3">Salute</th>
                                <th className="px-4 py-3 w-[100px] text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredAssets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground italic">
                                        Nessun asset trovato.
                                    </td>
                                </tr>
                            ) : (
                                filteredAssets.map((asset) => (
                                    <tr
                                        key={asset.id}
                                        onClick={() => router.push(`/assets/${asset.id}`)}
                                        className="group hover:bg-muted/30 transition-colors cursor-pointer"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-background group-hover:text-primary transition-colors border">
                                                    <Box className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-foreground">{asset.name}</div>
                                                    <div className="text-xs text-muted-foreground font-mono">{asset.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            <div className="flex flex-col text-xs">
                                                <span>Mod: {asset.model}</span>
                                                <span className="font-mono">SN: {asset.serialNumber}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col text-xs">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <MapPin className="h-3 w-3" />
                                                    <span>{asset.location}</span>
                                                </div>
                                                <span className="text-muted-foreground pl-4.5">{asset.plant}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col text-xs text-muted-foreground">
                                                {asset.department && <span>Dip: {asset.department}</span>}
                                                {asset.line && <span>Linea: {asset.line}</span>}
                                                {asset.cespite && <span className="font-mono">Cesp: {asset.cespite}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <AssetStatusBadge status={asset.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${asset.healthScore > 80 ? 'bg-emerald-500' : asset.healthScore > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                        style={{ width: `${asset.healthScore}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-medium">{asset.healthScore}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={(e) => handleEditClick(e, asset)}
                                                    className="p-2 hover:bg-background rounded-full text-muted-foreground hover:text-primary shadow-sm border border-transparent hover:border-border transition-all"
                                                    title="Modifica"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                {canManage && (
                                                    <button
                                                        onClick={(e) => handleDeleteClick(e, asset.id)}
                                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full text-muted-foreground hover:text-red-600 shadow-sm border border-transparent hover:border-red-200 transition-all"
                                                        title="Elimina"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AssetFormDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                asset={selectedAsset || defaultAsset}
                onSave={handleSaveAsset}
            />
        </div>
    );
}
