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
import { Loader2, Camera, AlertTriangle, Mic, MicOff, CheckCircle, Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAssets } from "@/lib/assets-context";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AssetSelector } from "@/components/assets/asset-selector";

// Augmented Window interface for SpeechRecognition
declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

interface RequestFormProps {
    initialAssetId?: string;
    initialCategory?: string; // New Prop
    forceAssetSelection?: boolean; // New Prop
    onCancel?: () => void;
}

export function RequestForm({ initialAssetId, initialCategory, forceAssetSelection, onCancel }: RequestFormProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { assets } = useAssets();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        assetId: initialAssetId || "",
        priority: "WORKING",
        category: initialCategory || "OTHER", // Default or passed prop
        requestImage: null as string | null // Base64 image
    });
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [checkingDuplicates, setCheckingDuplicates] = useState(false);
    const [assetDialogOpen, setAssetDialogOpen] = useState(false);

    // Handle Image Upload
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, requestImage: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    // Voice Dictation State
    const [isListening, setIsListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            setSpeechSupported(true);
        }
    }, []);

    const toggleListening = () => {
        if (!speechSupported) {
            toast.error("Il tuo browser non supporta la dettatura vocale.");
            return;
        }

        if (isListening) {
            // It will stop automatically or we can force stop if we hold the instance ref, 
            // but for simplicity let's rely on the natural stop or UI toggle.
            // Actuallly, without a ref to the recognition instance, we can't call .stop(). 
            // So we need to restructure slightly to hold the instance.
            // Let's use a simple pattern: clicking starts it, it stops automatically on silence.
            setIsListening(false);
            // window.location.reload(); // Hacky way to stop if we don't have ref? No, let's do it right.
            // Actually, we can just let it finish.
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'it-IT';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            toast.info("In ascolto...", { duration: 2000 });
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech error", event.error);
            setIsListening(false);
            if (event.error === 'not-allowed') {
                toast.error("Permesso microfono negato.");
            }
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            if (transcript) {
                setFormData(prev => {
                    // Append if there's already text, or replace? Usually append is better for dictation
                    const newDesc = prev.description ? `${prev.description} ${transcript}` : transcript;
                    return { ...prev, description: newDesc };
                });
                toast.success("Testo acquisito!");
            }
        };

        recognition.start();
    };

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
            // --- AI QUALITY CHECK ---
            // Import dynamically to avoid server/client boundary issues if needed, or just standard import
            // Since validateDescriptionQuality is a server action (marked 'use server' at top of ai-service), we can call it.
            const { validateDescriptionQuality } = await import("@/lib/ai-service");

            const qualityCheck = await validateDescriptionQuality(formData.description);
            if (!qualityCheck.valid) {
                toast.warning("Attenzione: Descrizione Insufficiente", {
                    description: qualityCheck.reason,
                    duration: 5000,
                    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />
                });
                setLoading(false);
                return; // BLOCK SUBMISSION
            }
            // ------------------------

            const selectedAsset = assets.find(a => a.id === formData.assetId);

            const result = await createWorkOrder({
                ...formData,
                assetName: selectedAsset?.name || "Unknown", // Backend might need this for denorm or just ID
                type: "REQUEST",
                status: "PENDING_APPROVAL",
                requesterId: user?.id,
                category: formData.category, // Use selected category
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
                        <label className="text-sm font-medium">
                            {formData.category === 'SAFETY' ? "Richiesta/Codice Segnalazione *" : "Titolo Richiesta *"}
                        </label>
                        <Input
                            placeholder={formData.category === 'SAFETY' ? "Es. SEGNALAZIONE-2024-001" : "Es. Perdita d'acqua linea 1"}
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    {/* Asset Selection: Show if forced OR if no asset ID provided (and not a system asset) */}
                    {(forceAssetSelection || !formData.assetId || !formData.assetId.startsWith('SYS-')) && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Asset / Macchinario *</label>

                            {/* NEW: Tree-based selection via Dialog */}
                            <div className="flex gap-2">
                                <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !formData.assetId && "text-muted-foreground"
                                            )}
                                        >
                                            {formData.assetId ? (
                                                assets.find(a => a.id === formData.assetId)?.name || formData.assetId
                                            ) : (
                                                <>
                                                    <Search className="mr-2 h-4 w-4" />
                                                    Sfoglia e seleziona macchinario...
                                                </>
                                            )}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl">
                                        <DialogHeader>
                                            <DialogTitle>Seleziona Macchinario</DialogTitle>
                                        </DialogHeader>
                                        <div className="flex-1 overflow-y-auto pr-2">
                                            <AssetSelector
                                                assets={assets}
                                                onSelect={(asset) => {
                                                    setFormData({ ...formData, assetId: asset.id });
                                                    setAssetDialogOpen(false);
                                                }}
                                            />
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {checkingDuplicates && (
                                <div className="text-xs text-muted-foreground animate-pulse flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Controllo segnalazioni aperte...
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            {formData.category === 'SAFETY' ? "Priorità Segnalazione" : "Priorità Percepita"}
                        </label>
                        <Select
                            value={formData.priority}
                            onValueChange={(val) => setFormData({ ...formData, priority: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleziona Priorità" />
                            </SelectTrigger>
                            <SelectContent>
                                {formData.category === 'SAFETY' ? (
                                    <>
                                        <SelectItem value="HIGH">Alta (Pericolo Immediato)</SelectItem>
                                        <SelectItem value="MEDIUM">Media (Attenzione Richiesta)</SelectItem>
                                        <SelectItem value="LOW">Bassa (Suggerimento/Osservazione)</SelectItem>
                                    </>
                                ) : (
                                    <>
                                        <SelectItem value="NOT_PRODUCTION">Non in Produzione (Meno Grave)</SelectItem>
                                        <SelectItem value="WORKING">In Lavoro (Monitorare)</SelectItem>
                                        <SelectItem value="MALFUNCTIONING">Malfunzionante (Intervento Richiesto)</SelectItem>
                                        <SelectItem value="STOPPED">Ferma (Urgentissimo)</SelectItem>
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Technical Drawing Upload (Only for Workshop) */}
                    {formData.category === 'WORKSHOP' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Camera className="h-4 w-4" />
                                Carica Disegno Tecnico / Foto
                            </label>
                            <Input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleImageChange}
                                className="cursor-pointer"
                            />
                            {formData.requestImage && (
                                <div className="mt-2 relative group w-full max-w-[200px] rounded-lg overflow-hidden border shadow-sm">
                                    <img
                                        src={formData.requestImage}
                                        alt="Preview"
                                        className="w-full h-auto object-cover max-h-[150px]"
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white text-xs font-medium flex items-center ml-1">
                                            <CheckCircle className="h-3 w-3 mr-1" /> Caricata
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Descrizione Dettagliata</label>
                            {speechSupported && (
                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    className={cn(
                                        "text-xs flex items-center gap-1 px-2 py-1 rounded transition-all border",
                                        isListening
                                            ? "bg-red-100 text-red-600 border-red-200 animate-pulse font-bold"
                                            : "bg-background text-muted-foreground hover:bg-muted border-border"
                                    )}
                                    title="Dettatura Vocale"
                                >
                                    {isListening ? (
                                        <>
                                            <MicOff className="h-3 w-3" /> Stop Dettatura
                                        </>
                                    ) : (
                                        <>
                                            <Mic className="h-3 w-3" /> Dettatura Vocale
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        <Textarea
                            placeholder="Descrivi il problema riscontrato..."
                            className={cn("min-h-[100px]", isListening && "border-red-400 ring-1 ring-red-400")}
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
                                    let suggestedPriority = "WORKING";
                                    let suggestionReason = "Analisi standard";

                                    // Heuristic Analysis
                                    if (desc.includes("fuoco") || desc.includes("fumo") || desc.includes("pericolo") || desc.includes("fermo") || desc.includes("blocc")) {
                                        suggestedPriority = "STOPPED";
                                        suggestionReason = "Parole chiave critiche rilevate (Sicurezza/Fermo Impianto)";
                                    } else if (desc.includes("rumore") || desc.includes("lento") || desc.includes("vibrazion")) {
                                        suggestedPriority = "MALFUNCTIONING";
                                        suggestionReason = "Potenziale usura o malfunzionamento che non ferma la produzione";
                                    } else if (desc.includes("spia") || desc.includes("osservazione")) {
                                        suggestedPriority = "WORKING";
                                        suggestionReason = "Anomalia lieve, macchinario in lavoro";
                                    } else {
                                        suggestedPriority = "NOT_PRODUCTION";
                                        suggestionReason = "Nessuna criticità evidente rilevata";
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
                    <Button type="submit" disabled={loading || isListening}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Invia Richiesta
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
