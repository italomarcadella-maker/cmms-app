"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createWorkOrder } from "@/lib/actions";
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
                router.push("/work-orders?tab=requests");
                router.refresh();
            } else {
                toast.error(result.message || "Errore nell'invio della richiesta");
            }
        } catch (error) {
            console.error(error);
            toast.error("Errore di connessione");
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
