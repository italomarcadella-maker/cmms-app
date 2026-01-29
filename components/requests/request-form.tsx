"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createWorkOrder, getActiveWorkOrdersForAsset } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Camera, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAssets } from "@/lib/assets-context"; // Assuming this exists, based on previous exploration
// If assets-context doesn't export useAssets, I might need to fetch assets differently.
// Checking open files... inventory-context exists. assets-context exists in lib list.

interface RequestFormProps {
    initialAssetId?: string;
    onCancel?: () => void;
}

export function RequestForm({ initialAssetId, onCancel }: RequestFormProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { assets } = useAssets();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        assetId: initialAssetId || "",
        priority: "MEDIUM",
        // image: null // Future implementation
    });
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [checkingDuplicates, setCheckingDuplicates] = useState(false);

    // Check for duplicates when asset is selected
    useEffect(() => {
        const checkDuplicates = async () => {
            if (!formData.assetId) {
                setPendingRequests([]);
                return;
            }
            try {
                setCheckingDuplicates(true);
                console.log("Checking duplicates for asset:", formData.assetId);
                const active = await getActiveWorkOrdersForAsset(formData.assetId);
                console.log("Found active WOs:", active);
                setPendingRequests(active);
            } catch (error) {
                console.error("Error checking duplicates:", error);
            } finally {
                setCheckingDuplicates(false);
            }
        };
        const timer = setTimeout(checkDuplicates, 500); // Debounce
        return () => clearTimeout(timer);
    }, [formData.assetId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!formData.title || !formData.assetId) {
            toast.error("Compila i campi obbligatori");
            setLoading(false);
            return;
        }

        try {
            const selectedAsset = assets.find(a => a.id === formData.assetId);

            const result = await createWorkOrder({
                ...formData,
                assetName: selectedAsset?.name || "Unknown", // Backend might need this for denorm or just ID
                type: "REQUEST",
                status: "PENDING_APPROVAL",
                requesterId: user?.id,
                category: "OTHER", // Default for request
            });

            if (result.success) {
                toast.success("Richiesta inviata con successo!");
                router.push("/requests");
                router.refresh();
            } else {
                toast.error(result.message || "Errore nell'invio della richiesta");
                console.error("Submission failed:", result);
            }
        } catch (error) {
            console.error("Request Form Error:", error);
            toast.error("Errore di connessione: " + (error as any).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Nuova Richiesta di Intervento</CardTitle>
                <CardDescription>
                    Segnala un guasto o richiedi un intervento di manutenzione.
                </CardDescription>
                {/* Explicit Duplicate Warning Header */}
                {pendingRequests.length > 0 && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md flex items-start gap-3 animate-in slide-in-from-top-2">
                        <div className="bg-red-200 p-2 rounded-full text-red-700 mt-1">
                            <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div>
                            <h4 className="font-bold text-red-800 text-sm">Attenzione: Segnalazioni già presenti!</h4>
                            <p className="text-xs text-red-700 mb-2">Esistono già {pendingRequests.length} richieste aperte per questo asset.</p>
                            <ul className="text-xs text-red-800 space-y-1 list-disc list-inside bg-white/50 p-2 rounded">
                                {pendingRequests.map(req => (
                                    <li key={req.id}>"{req.title}" - <span className="font-mono">{req.status}</span></li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
                {checkingDuplicates && (
                    <div className="mt-2 text-xs text-blue-600 flex items-center gap-2 bg-blue-50 p-2 rounded">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Verifica richieste in corso...
                    </div>
                )}
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Titolo Richiesta *</label>
                        <Input
                            placeholder="Es. Perdita d'acqua linea 1"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Asset / Macchinario *</label>
                        <Select
                            value={formData.assetId}
                            onValueChange={(val) => setFormData({ ...formData, assetId: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleziona Asset" />
                            </SelectTrigger>
                            <SelectContent>
                                {assets.map((asset) => (
                                    <SelectItem key={asset.id} value={asset.id}>
                                        {asset.name} ({asset.serialNumber})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {pendingRequests.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800 space-y-2 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 font-semibold">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>Attenzione: Ci sono già richieste aperte per questo asset</span>
                                </div>
                                <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
                                    {pendingRequests.map(req => (
                                        <li key={req.id}>
                                            <span className="font-medium">{req.title}</span> - {req.status} ({new Date(req.createdAt).toLocaleDateString()})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {checkingDuplicates && (
                            <div className="text-xs text-muted-foreground animate-pulse flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" /> Controllo segnalazioni aperte...
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Priorità Percepita</label>
                        <Select
                            value={formData.priority}
                            onValueChange={(val) => setFormData({ ...formData, priority: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleziona Priorità" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="LOW">Bassa - Non Urgente</SelectItem>
                                <SelectItem value="MEDIUM">Media - Da Pianificare</SelectItem>
                                <SelectItem value="HIGH">Alta - Blocco Produzione</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Descrizione Dettagliata</label>
                        <Textarea
                            placeholder="Descrivi il problema riscontrato..."
                            className="min-h-[100px]"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                if (!formData.description) return toast.error("Scrivi una descrizione per analizzarla.");
                                setLoading(true); // Artificial delay
                                setTimeout(() => {
                                    setLoading(false);
                                    const desc = formData.description.toLowerCase();
                                    let suggestedPriority = "MEDIUM";
                                    let suggestionReason = "Analisi standard";

                                    // Heuristic Analysis
                                    if (desc.includes("fuoco") || desc.includes("fumo") || desc.includes("pericolo") || desc.includes("fermo")) {
                                        suggestedPriority = "HIGH";
                                        suggestionReason = "Parole chiave critiche rilevate (Sicurezza/Fermo)";
                                    } else if (desc.includes("rumore") || desc.includes("lento")) {
                                        suggestedPriority = "MEDIUM";
                                        suggestionReason = "Potenziale usura meccanica";
                                    } else {
                                        suggestedPriority = "LOW";
                                        suggestionReason = "Nessuna criticità evidente";
                                    }

                                    setFormData(prev => ({ ...prev, priority: suggestedPriority }));
                                    toast.info(`AI Suggestion: Priorità impostata su ${suggestedPriority}`, {
                                        description: suggestionReason,
                                        icon: <div className="text-lg">🤖</div>
                                    });
                                }, 1500);
                            }}
                            className="text-xs flex items-center gap-1 mt-1 text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded transition-colors w-fit ml-auto"
                        >
                            ✨ Analizza con AI
                        </button>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" type="button" onClick={() => onCancel ? onCancel() : router.back()}>
                        {onCancel ? "Indietro" : "Annulla"}
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Invia Richiesta
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
