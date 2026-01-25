"use client";

import { useState, useEffect } from "react";
import { getMeterReadings } from "@/lib/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, Calendar, Zap, Droplets, Flame } from "lucide-react";

export function ReadingsHistory({ meters }: { meters: any[] }) {
    const [selectedMeter, setSelectedMeter] = useState(meters[0]?.id || "");
    const [readings, setReadings] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!selectedMeter) return;

        const fetchReadings = async () => {
            setLoading(true);
            try {
                const data = await getMeterReadings(selectedMeter);
                setReadings(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchReadings();
    }, [selectedMeter]);

    return (
        <div className="rounded-xl border bg-card shadow-sm p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="font-semibold text-lg">Storico Letture</h3>
                <div className="w-full sm:w-[250px]">
                    <Select value={selectedMeter} onValueChange={setSelectedMeter}>
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
            </div>

            <div className="relative min-h-[200px]">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : readings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                        <Calendar className="h-8 w-8 mb-2 opacity-20" />
                        Nessuna lettura trovata per questo contatore.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 font-medium">
                                <tr>
                                    <th className="px-4 py-3 text-left rounded-l-lg">Data</th>
                                    <th className="px-4 py-3 text-left">Matricola</th>
                                    <th className="px-4 py-3 text-left">Posizione</th>
                                    <th className="px-4 py-3 text-left">Tipo</th>
                                    <th className="px-4 py-3 text-right">Valore</th>
                                    <th className="px-4 py-3 text-left rounded-r-lg">Analisi AI</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {readings.map((r) => {
                                    const meter = meters.find(m => m.id === r.meterId) || meters.find(m => m.id === selectedMeter);
                                    const type = meter?.type || 'ELEC';
                                    const unit = meter?.unit || '';

                                    return (
                                        <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-4 py-3 font-medium">{new Date(r.date).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{meter?.serialNumber || '-'}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{meter?.location || '-'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {type === 'ELEC' && <Zap className="h-4 w-4 text-yellow-600" />}
                                                    {type === 'WATER' && <Droplets className="h-4 w-4 text-blue-600" />}
                                                    {type === 'GAS' && <Flame className="h-4 w-4 text-orange-600" />}
                                                    <span className="text-muted-foreground capitalize">{type === 'ELEC' ? 'Elettricità' : type === 'WATER' ? 'Acqua' : 'Gas'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-base">
                                                {r.value} <span className="text-xs text-muted-foreground ml-1">{unit}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {r.isAnomaly ? (
                                                    <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-2 rounded-md border border-amber-100">
                                                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                                        <span className="text-xs font-medium leading-tight">{r.aiAnalysis}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs italic">Regolare</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
