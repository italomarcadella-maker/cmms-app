"use client";

import { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";

interface AssetFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    asset: any;
    onSave: (asset: any) => void;
}

export function AssetFormDialog({ isOpen, onClose, asset, onSave }: AssetFormDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState(asset);

    useEffect(() => {
        setFormData(asset);
    }, [asset]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Ensure required fields like location are populated if missing
        const finalAsset = {
            ...formData,
            id: formData.id || `AST-${Math.floor(Math.random() * 10000)}`,
            // If location was replaced by plant in the UI, we might want to default location to plant or generic
            location: formData.location || formData.plant || "N/A"
        };

        onSave(finalAsset);
        setLoading(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl rounded-lg border bg-background p-6 shadow-lg animate-in zoom-in-95 duration-200">
                <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
                    <h2 className="text-lg font-semibold leading-none tracking-tight">
                        {asset.id ? "Modifica Asset" : "Nuovo Asset"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Inserisci i dettagli del macchinario qui sotto. Clicca salva quando hai finito.
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 py-4">
                        {/* Row 1: Name & Model */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium">
                                    Nome Asset
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    value={formData.name || ''}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                    placeholder="es. Pressa Idraulica"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="model" className="text-sm font-medium">
                                    Modello
                                </label>
                                <input
                                    id="model"
                                    name="model"
                                    value={formData.model || ''}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                    placeholder="es. X-2000"
                                />
                            </div>
                        </div>

                        {/* Row 2: Serial & Vendor */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="serialNumber" className="text-sm font-medium">
                                    Seriale
                                </label>
                                <input
                                    id="serialNumber"
                                    name="serialNumber"
                                    value={formData.serialNumber || ''}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                    placeholder="es. SN-123456"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="vendor" className="text-sm font-medium">
                                    Costruttore
                                </label>
                                <input
                                    id="vendor"
                                    name="vendor"
                                    value={formData.vendor || ''}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                    placeholder="es. Acme Corp"
                                />
                            </div>
                        </div>

                        {/* Row 3: Plant & Department */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="plant" className="text-sm font-medium">
                                    Stabilimento
                                </label>
                                <input
                                    id="plant"
                                    name="plant"
                                    value={formData.plant || ''}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                    placeholder="es. Stabilimento A"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="department" className="text-sm font-medium">
                                    Reparto
                                </label>
                                <input
                                    id="department"
                                    name="department"
                                    value={formData.department || ''}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                    placeholder="es. Produzione"
                                />
                            </div>
                        </div>

                        {/* Row 4: Line & Cespite */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="line" className="text-sm font-medium">
                                    Linea
                                </label>
                                <input
                                    id="line"
                                    name="line"
                                    value={formData.line || ''}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="es. Linea Assemblaggio 1"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="cespite" className="text-sm font-medium">
                                    Cespite
                                </label>
                                <input
                                    id="cespite"
                                    name="cespite"
                                    value={formData.cespite || ''}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="es. CSP-2024-001"
                                />
                            </div>
                        </div>

                        {/* Status & Health (Row 5) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="status" className="text-sm font-medium">
                                    Stato
                                </label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status || 'OPERATIONAL'}
                                    onChange={(e) => setFormData((prev: any) => ({ ...prev, status: e.target.value }))}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="OPERATIONAL">In Uso (Operational)</option>
                                    <option value="MAINTENANCE">In Manutenzione</option>
                                    <option value="STORAGE">Accantonato</option>
                                    <option value="DECOMMISSIONED">Rottamato</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="healthScore" className="text-sm font-medium">
                                    Health Score (0-100)
                                </label>
                                <input
                                    type="number"
                                    id="healthScore"
                                    name="healthScore"
                                    min="0"
                                    max="100"
                                    value={formData.healthScore}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 mt-2 sm:mt-0"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salva
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
