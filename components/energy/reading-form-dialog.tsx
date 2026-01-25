"use client";

import { useState } from "react";
import { Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { addMeterReading } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function ReadingFormDialog({ meters }: { meters: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Form State
    const [meterId, setMeterId] = useState(meters[0]?.id || "");
    const [value, setValue] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Result State
    const [result, setResult] = useState<{ success: boolean; isAnomaly?: boolean; aiAnalysis?: string | null } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        try {
            const res = await addMeterReading({
                meterId,
                value: Number(value),
                date
            });
            setResult(res);
            if (res.success && !res.isAnomaly) {
                router.refresh(); // Refresh data
                // Close after brief success show if no anomaly
                setTimeout(() => {
                    setIsOpen(false);
                    setResult(null);
                    setValue("");
                }, 1500);
            }
        } catch (error) {
            console.error(error);
            alert("Errore durante il salvataggio.");
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" disabled={meters.length === 0} className="gap-2">
                    <Plus className="h-4 w-4" /> Nuova Lettura
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Inserisci Lettura</DialogTitle>
                </DialogHeader>

                {result?.isAnomaly ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-sm">Anomalia Rilevata dall'IA</h3>
                                    <p className="text-sm mt-1 opacity-90">{result.aiAnalysis}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setIsOpen(false); setResult(null); setValue(""); }}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-200"
                            >
                                Ho capito, chiudi
                            </Button>
                        </div>
                    </div>
                ) : result?.success ? (
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="h-5 w-5" /> Lettura registrata correttamente!
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Contatore</label>
                            <Select value={meterId} onValueChange={setMeterId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona contatore" />
                                </SelectTrigger>
                                <SelectContent>
                                    {meters.map(m => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name} ({m.type})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Data Lettura</label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Valore</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsOpen(false)}
                            >
                                Annulla
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? "Salvataggio..." : "Salva Lettura"}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
