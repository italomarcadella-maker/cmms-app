"use client";

import { useState } from "react";
import { useAssets } from "@/lib/assets-context";
import { Upload, FileText, Check, AlertCircle, X } from "lucide-react";

export function ImportAssetsDialog() {
    const { addAsset } = useAssets();
    const [isOpen, setIsOpen] = useState(false);
    const [csvContent, setCsvContent] = useState("");
    // Use 'any' to avoid strict type checks for temporary import object validation
    // In a real scenario, we would define a mapped type.
    const [preview, setPreview] = useState<any[]>([]);
    const [error, setError] = useState("");

    const handleParse = () => {
        setError("");
        if (!csvContent.trim()) return;

        try {
            const lines = csvContent.trim().split('\n');
            const parsed = lines.map((line) => {
                // Expected format: Name, Model, Serial, Vendor, Location
                const parts = line.split(',');
                if (parts.length < 2) return null; // Skip invalid lines

                return {
                    name: parts[0]?.trim(),
                    model: parts[1]?.trim() || "N/A",
                    serialNumber: parts[2]?.trim() || `SN-${Math.floor(Math.random() * 10000)}`,
                    vendor: parts[3]?.trim() || "Unknown",
                    location: parts[4]?.trim() || "Main Plant",

                    // Default fields for required properties
                    status: "OPERATIONAL",
                    healthScore: 100,
                    purchaseDate: new Date().toISOString().split('T')[0],
                    plant: "Main Plant",
                    department: "Production",
                    line: "Line 1"
                };
            }).filter(Boolean);

            if (parsed.length === 0) {
                setError("Nessun dato valido trovato. Usa il formato: Nome, Modello, Seriale, Costruttore, Ubicazione");
            } else {
                setPreview(parsed);
            }
        } catch (e) {
            setError("Errore durante il parsing del testo.");
        }
    };

    const handleImport = () => {
        preview.forEach(item => {
            addAsset(item);
        });
        setIsOpen(false);
        setCsvContent("");
        setPreview([]);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-secondary/80 transition-all hover:-translate-y-0.5 border"
            >
                <Upload className="h-4 w-4" /> Importa Excel
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-2xl bg-card rounded-xl shadow-xl border animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b shrink-0">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" /> Importazione Massiva Asset
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-muted rounded text-muted-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-sm text-blue-800 flex gap-2">
                        <div className="shrink-0"><AlertCircle className="h-4 w-4" /></div>
                        <div>
                            <p className="font-medium">Formato supportato (CSV):</p>
                            <p className="font-mono text-xs mt-1">Nome, Modello, Seriale, Costruttore, Ubicazione</p>
                            <p className="mt-1 opacity-80">Copia e incolla le righe dal tuo file Excel qui sotto.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <textarea
                            className="w-full h-32 rounded-md border bg-background p-3 text-sm font-mono focus:ring-2 focus:ring-primary outline-none resize-none"
                            placeholder={"Estrusore A, EXT-2000, SN-9988, Bausano, Linea 1\nMulino, GR-500, SN-1122, Tria, Reparto Macinazione"}
                            value={csvContent}
                            onChange={(e) => setCsvContent(e.target.value)}
                        />
                        <button
                            onClick={handleParse}
                            className="text-sm text-primary hover:underline font-medium"
                        >
                            Anteprima Dati
                        </button>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                            {error}
                        </div>
                    )}

                    {preview.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground text-xs uppercase">
                                    <tr>
                                        <th className="px-3 py-2">Nome</th>
                                        <th className="px-3 py-2">Modello</th>
                                        <th className="px-3 py-2">Costruttore</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {preview.map((item, i) => (
                                        <tr key={i} className="bg-card">
                                            <td className="px-3 py-2 font-medium">{item.name}</td>
                                            <td className="px-3 py-2">{item.model}</td>
                                            <td className="px-3 py-2 text-muted-foreground">{item.vendor}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-muted/20 flex justify-end gap-2 shrink-0">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={preview.length === 0}
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Check className="h-4 w-4" /> Importa {preview.length} Asset
                    </button>
                </div>
            </div>
        </div>
    );
}
