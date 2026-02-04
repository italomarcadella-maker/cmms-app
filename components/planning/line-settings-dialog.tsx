"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProductionLine } from "@/lib/actions";
import { toast } from "sonner";
import { Loader2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LineSettingsDialogProps {
    line: string;
    currentSettings?: any;
    onClose: () => void;
    onSuccess: () => void;
}

export function LineSettingsDialog({ line, currentSettings, onClose, onSuccess }: LineSettingsDialogProps) {
    const [loading, setLoading] = useState(false);

    // Stats State
    const [view, setView] = useState<'CONFIG' | 'STATS'>('CONFIG');
    const [stats, setStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Load Stats
    useEffect(() => {
        if (view === 'STATS' && !stats) {
            setLoadingStats(true);
            import("@/lib/actions").then(mod => {
                mod.getLineStats(line).then(res => {
                    if (res?.success) setStats(res.data);
                    setLoadingStats(false);
                });
            });
        }
    }, [view, line, stats]);

    // Initial State from Props
    const def = currentSettings || {};
    const [prodStartDay, setProdStartDay] = useState<number>(def.prodStartDay ?? 1);
    const [prodStartTime, setProdStartTime] = useState<string>(def.prodStartTime ?? "06:00");
    const [prodEndDay, setProdEndDay] = useState<number>(def.prodEndDay ?? 5);
    const [prodEndTime, setProdEndTime] = useState<string>(def.prodEndTime ?? "22:00");
    const [maintStart, setMaintStart] = useState<string>(def.maintStart ?? "08:00");
    const [maintEnd, setMaintEnd] = useState<string>(def.maintEnd ?? "17:00");

    // Weekend State
    // Check if weekend fields are present/non-empty to enable them
    const [satEnabled, setSatEnabled] = useState(!!def.maintSatStart);
    const [satStart, setSatStart] = useState(def.maintSatStart || "08:00");
    const [satEnd, setSatEnd] = useState(def.maintSatEnd || "12:00");

    const [sunEnabled, setSunEnabled] = useState(!!def.maintSunStart);
    const [sunStart, setSunStart] = useState(def.maintSunStart || "08:00");
    const [sunEnd, setSunEnd] = useState(def.maintSunEnd || "12:00");


    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        const result = await updateProductionLine({
            line,
            prodStartDay, prodStartTime,
            prodEndDay, prodEndTime,
            maintStart, maintEnd,
            maintStartDay: 1, // Fixed Mon
            maintEndDay: 5,   // Fixed Fri
            maintSatStart: satEnabled ? satStart : undefined,
            maintSatEnd: satEnabled ? satEnd : undefined,
            maintSunStart: sunEnabled ? sunStart : undefined,
            maintSunEnd: sunEnabled ? sunEnd : undefined
        });

        if (result.success) {
            toast.success("Impostazioni linea aggiornate");
            onSuccess();
            onClose();
        } else {
            toast.error(result.message || "Errore");
        }
        setLoading(false);
    }

    const [selectedPreset, setSelectedPreset] = useState<'3_SHIFTS' | '2_SHIFTS' | null>(null);

    const applyPreset = (type: '3_SHIFTS' | '2_SHIFTS') => {
        setSelectedPreset(type);
        if (type === '3_SHIFTS') {
            setProdStartDay(1); setProdStartTime("00:00");
            setProdEndDay(5); setProdEndTime("23:59");
        } else if (type === '2_SHIFTS') {
            setProdStartDay(1); setProdStartTime("06:00");
            setProdEndDay(5); setProdEndTime("22:00");
        }
    };

    const days = [
        { id: 1, label: "Lunedì" },
        { id: 2, label: "Martedì" },
        { id: 3, label: "Mercoledì" },
        { id: 4, label: "Giovedì" },
        { id: 5, label: "Venerdì" },
        { id: 6, label: "Sabato" },
        { id: 0, label: "Domenica" },
    ];

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" /> Impostazioni Orari - {line}
                    </DialogTitle>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex gap-2 border-b mb-4">
                    <button
                        onClick={() => setView('CONFIG')}
                        className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", view === 'CONFIG' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                    >
                        Configurazione
                    </button>
                    <button
                        onClick={() => setView('STATS')}
                        className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", view === 'STATS' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                    >
                        Statistiche (30gg)
                    </button>
                </div>

                {view === 'CONFIG' && (
                    <>
                        <div className="flex flex-col gap-2 mb-4 bg-slate-50 p-3 rounded-lg border">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configurazione Rapida</span>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={selectedPreset === '3_SHIFTS' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => applyPreset('3_SHIFTS')}
                                    className={cn("flex-1 transition-all", selectedPreset === '3_SHIFTS' && "ring-2 ring-primary ring-offset-1")}
                                >
                                    3 Turni (24h)
                                </Button>
                                <Button
                                    type="button"
                                    variant={selectedPreset === '2_SHIFTS' ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => applyPreset('2_SHIFTS')}
                                    className={cn("flex-1 transition-all", selectedPreset === '2_SHIFTS' && "ring-2 ring-primary ring-offset-1")}
                                >
                                    2 Turni (06-22)
                                </Button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Production Block */}
                            <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                                <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-700">
                                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                                    Blocco Produzione (Rosso)
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Inizio (Giorno)</Label>
                                        <Select value={String(prodStartDay)} onValueChange={v => setProdStartDay(Number(v))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {days.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Ora Inizio</Label>
                                        <Input value={prodStartTime} onChange={e => setProdStartTime(e.target.value)} type="time" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Fine (Giorno)</Label>
                                        <Select value={String(prodEndDay)} onValueChange={v => setProdEndDay(Number(v))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {days.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Ora Fine</Label>
                                        <Input value={prodEndTime} onChange={e => setProdEndTime(e.target.value)} type="time" />
                                    </div>
                                </div>
                            </div>

                            {/* Maintenance Shift */}
                            <div className="space-y-4 border p-4 rounded-lg bg-green-50">
                                <h3 className="font-semibold text-sm flex items-center gap-2 text-green-700">
                                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                    Presidio Manutenzione (Verde se libero da prod)
                                </h3>
                                <p className="text-xs text-muted-foreground">Orari di presidio manutenzione.</p>

                                <div className="space-y-4">
                                    {/* Mon-Fri */}
                                    <div className="bg-white p-3 rounded border shadow-sm">
                                        <div className="text-sm font-medium mb-2 flex items-center gap-2">
                                            <span className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Standard</span>
                                            Lunedì - Venerdì
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Inizio</Label>
                                                <Input value={maintStart} onChange={e => setMaintStart(e.target.value)} type="time" className="h-8" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Fine</Label>
                                                <Input value={maintEnd} onChange={e => setMaintEnd(e.target.value)} type="time" className="h-8" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Saturday */}
                                    <div className="bg-white p-3 rounded border shadow-sm transition-all">
                                        <div className="flex items-center gap-2 mb-2">
                                            <input
                                                type="checkbox"
                                                id="satCheck"
                                                checked={satEnabled}
                                                onChange={e => setSatEnabled(e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
                                            />
                                            <Label htmlFor="satCheck" className="text-sm font-medium cursor-pointer">Sabato (Straordinario)</Label>
                                        </div>
                                        {satEnabled && (
                                            <div className="grid grid-cols-2 gap-2 pl-6 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Inizio</Label>
                                                    <Input value={satStart} onChange={e => setSatStart(e.target.value)} type="time" className="h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Fine</Label>
                                                    <Input value={satEnd} onChange={e => setSatEnd(e.target.value)} type="time" className="h-8" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sunday */}
                                    <div className="bg-white p-3 rounded border shadow-sm transition-all">
                                        <div className="flex items-center gap-2 mb-2">
                                            <input
                                                type="checkbox"
                                                id="sunCheck"
                                                checked={sunEnabled}
                                                onChange={e => setSunEnabled(e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
                                            />
                                            <Label htmlFor="sunCheck" className="text-sm font-medium cursor-pointer">Domenica (Straordinario)</Label>
                                        </div>
                                        {sunEnabled && (
                                            <div className="grid grid-cols-2 gap-2 pl-6 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Inizio</Label>
                                                    <Input value={sunStart} onChange={e => setSunStart(e.target.value)} type="time" className="h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Fine</Label>
                                                    <Input value={sunEnd} onChange={e => setSunEnd(e.target.value)} type="time" className="h-8" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>


                            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
                                <div className="flex-1 flex justify-start">
                                    {/* Delete button wrapper to keep layout clean */}
                                </div>
                                <Button type="button" variant="ghost" onClick={onClose}>Annulla</Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={async () => {
                                        if (!confirm("Sei sicuro di voler eliminare questa linea dalla pianificazione?")) return;
                                        setLoading(true);
                                        const { deleteProductionLine } = await import("@/lib/actions");
                                        const res = await deleteProductionLine(line);
                                        if (res.success) {
                                            toast.success("Linea eliminata");
                                            onSuccess();
                                            onClose();
                                        } else {
                                            toast.error(res.message);
                                        }
                                        setLoading(false);
                                    }}
                                    className="mr-auto"
                                >
                                    Elimina Linea
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Salva Regole
                                </Button>
                            </DialogFooter>
                        </form>
                    </>
                )}

                {view === 'STATS' && (
                    <div className="space-y-6 animate-in fade-in">
                        {loadingStats ? (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                Calcolo indici in corso...
                            </div>
                        ) : !stats ? (
                            <div className="text-center py-10 text-muted-foreground">Nessun dato disponibile</div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                        <div className="text-xs text-blue-600 font-semibold uppercase">MTBF</div>
                                        <div className="text-2xl font-bold text-blue-900">{stats.mtbf}h</div>
                                        <div className="text-[10px] text-blue-400">Mean Time Between Failures</div>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                                        <div className="text-xs text-amber-600 font-semibold uppercase">MTTR</div>
                                        <div className="text-2xl font-bold text-amber-900">{stats.mttr}h</div>
                                        <div className="text-[10px] text-amber-400">Mean Time To Repair</div>
                                    </div>
                                    <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                                        <div className="text-xs text-emerald-600 font-semibold uppercase">Availability</div>
                                        <div className="text-2xl font-bold text-emerald-900">{stats.availability}%</div>
                                        <div className="text-[10px] text-emerald-400">Operatività Reale</div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-semibold text-sm border-b pb-2">Dettaglio Calcolo (Ultimi 30gg)</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                            <span className="text-muted-foreground">Tempo Programmato (TPT):</span>
                                            <span className="font-mono font-medium">{(stats.totalScheduledTimeMinutes / 60).toFixed(1)}h</span>
                                        </div>
                                        <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                            <span className="text-muted-foreground">Fermi Totali (Guasti):</span>
                                            <span className="font-mono font-medium text-red-600">{(stats.totalDowntimeMinutes / 60).toFixed(1)}h</span>
                                        </div>
                                        <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                            <span className="text-muted-foreground">Tempo Operativo (ROT):</span>
                                            <span className="font-mono font-bold text-green-700">{(stats.realOperatingTimeMinutes / 60).toFixed(1)}h</span>
                                        </div>
                                        <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                            <span className="text-muted-foreground">Numero Guasti:</span>
                                            <span className="font-mono font-medium">{stats.numberOfFailures}</span>
                                        </div>
                                    </div>

                                    <div className="text-xs text-slate-500 bg-slate-100 p-3 rounded">
                                        Il calcolo considera <strong>esclusivamente</strong> gli orari di produzione configurati nella tab "Configurazione".
                                        Se la linea è ferma per turno (es. Notte), il tempo non viene contato nel TPT e quindi non diluisce l'MTBF.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog >
    );
}
