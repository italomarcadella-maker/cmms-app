"use client";

import { useState } from "react";
import { useComponents, ComponentItem, ComponentLifecycle } from "@/lib/components-context";
import { X, Save, Calendar, FileText, Activity, AlertTriangle, Trash2, Upload, File } from "lucide-react";
import { cn } from "@/lib/utils";

export function ComponentDetailsDialog({ component, children }: { component: ComponentItem, children: React.ReactNode }) {
    const { updateComponent } = useComponents();
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'INFO' | 'LIFECYCLE' | 'HISTORY'>('INFO');

    // Form State
    const [referenceDrawing, setReferenceDrawing] = useState(component.referenceDrawing || "");
    const [nominalDiameter, setNominalDiameter] = useState(component.nominalDiameter || 0);
    const [drawingUrl, setDrawingUrl] = useState(component.drawingUrl || "");
    const [isScrapped, setIsScrapped] = useState(component.isScrapped || false);
    const [lifecycle, setLifecycle] = useState<ComponentLifecycle>(component.lifecycle || {});

    const handleSave = () => {
        updateComponent(component.id, {
            referenceDrawing,
            nominalDiameter,
            drawingUrl,
            isScrapped,
            lifecycle
        });
        setOpen(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Simulate upload
            setDrawingUrl(URL.createObjectURL(file));
            // In a real app, this would upload to server and return a URL
            // specific for the file name for display:
            // setDrawingUrl(file.name); 
        }
    };

    const handleLifecycleChange = (field: keyof ComponentLifecycle, value: string) => {
        setLifecycle(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <>
            <div onClick={() => setOpen(true)} className="cursor-pointer">{children}</div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <div>
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    {component.code}
                                    {isScrapped && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200">ROTTAMATA</span>}
                                </h3>
                                <p className="text-sm text-muted-foreground">{component.model} • {component.manufacturer}</p>
                            </div>
                            <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded text-muted-foreground">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b px-4">
                            <button
                                onClick={() => setActiveTab('INFO')}
                                className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'INFO' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                            >
                                Dati Generali
                            </button>
                            <button
                                onClick={() => setActiveTab('LIFECYCLE')}
                                className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'LIFECYCLE' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                            >
                                Ciclo di Vita
                            </button>
                            <button
                                onClick={() => setActiveTab('HISTORY')}
                                className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'HISTORY' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                            >
                                Cronologia Misure
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {activeTab === 'INFO' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-muted-foreground">Disegno di Riferimento</label>
                                            <div className="relative">
                                                <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <input
                                                    className="w-full pl-9 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                                    placeholder="Codice Disegno..."
                                                    value={referenceDrawing}
                                                    onChange={(e) => setReferenceDrawing(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-muted-foreground">Costruttore</label>
                                            <div className="px-3 py-2 text-sm border rounded-md bg-muted/50">
                                                {component.manufacturer}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-muted-foreground">Diametro Nominale (mm)</label>
                                            <div className="relative">
                                                <Activity className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <input
                                                    type="number"
                                                    className="w-full pl-9 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                                    placeholder="0.00"
                                                    value={nominalDiameter || ''}
                                                    onChange={(e) => setNominalDiameter(parseFloat(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-muted-foreground">Data Acquisto</label>
                                            <div className="px-3 py-2 text-sm border rounded-md bg-muted/50">
                                                {component.purchaseDate}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-muted-foreground">Disegno PDF</label>
                                            <div className="flex items-center gap-2">
                                                {drawingUrl ? (
                                                    <div className="flex-1 flex items-center justify-between p-2 border rounded-md bg-green-50 border-green-200">
                                                        <div className="flex items-center gap-2 text-green-700 overflow-hidden">
                                                            <File className="h-4 w-4 shrink-0" />
                                                            <a href={drawingUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline truncate max-w-[150px]">
                                                                Apri Disegno
                                                            </a>
                                                        </div>
                                                        <button
                                                            onClick={() => setDrawingUrl("")}
                                                            className="p-1 hover:bg-green-100 rounded text-green-700"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1">
                                                        <label className="flex items-center justify-center w-full p-2 border-2 border-dashed rounded-md cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors group">
                                                            <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary">
                                                                <Upload className="h-4 w-4" />
                                                                <span className="text-xs font-medium">Carica PDF</span>
                                                            </div>
                                                            <input
                                                                type="file"
                                                                accept=".pdf"
                                                                className="hidden"
                                                                onChange={handleFileUpload}
                                                            />
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="scrapped"
                                                checked={isScrapped}
                                                onChange={(e) => setIsScrapped(e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <label htmlFor="scrapped" className="text-sm font-medium text-red-600 flex items-center gap-2 cursor-pointer select-none">
                                                <Trash2 className="h-4 w-4" />
                                                Segna come ROTTAMATA
                                            </label>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 ml-6">
                                            Il componente verrà contrassegnato come non più utilizzabile.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'LIFECYCLE' && (
                                <div className="space-y-6">
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Registra le date degli interventi di manutenzione straordinaria.
                                    </p>

                                    <div className="grid grid-cols-2 gap-8">
                                        {/* Nitriding Column */}
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm flex items-center gap-2 text-amber-600">
                                                <Activity className="h-4 w-4" /> Nitrurazioni
                                            </h4>

                                            <div className="space-y-2">
                                                <label className="text-xs font-medium">1° Nitrurazione</label>
                                                <input
                                                    type="date"
                                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                                    value={lifecycle.nitriding1 || ""}
                                                    onChange={(e) => handleLifecycleChange('nitriding1', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium">2° Nitrurazione</label>
                                                <input
                                                    type="date"
                                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                                    value={lifecycle.nitriding2 || ""}
                                                    onChange={(e) => handleLifecycleChange('nitriding2', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium">3° Nitrurazione</label>
                                                <input
                                                    type="date"
                                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                                    value={lifecycle.nitriding3 || ""}
                                                    onChange={(e) => handleLifecycleChange('nitriding3', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Regeneration Column */}
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-sm flex items-center gap-2 text-blue-600">
                                                <Activity className="h-4 w-4" /> Rigenerazioni
                                            </h4>

                                            <div className="space-y-2">
                                                <label className="text-xs font-medium">1° Rigenerazione</label>
                                                <input
                                                    type="date"
                                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                                    value={lifecycle.regeneration1 || ""}
                                                    onChange={(e) => handleLifecycleChange('regeneration1', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium">2° Rigenerazione</label>
                                                <input
                                                    type="date"
                                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                                    value={lifecycle.regeneration2 || ""}
                                                    onChange={(e) => handleLifecycleChange('regeneration2', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium">3° Rigenerazione</label>
                                                <input
                                                    type="date"
                                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                                    value={lifecycle.regeneration3 || ""}
                                                    onChange={(e) => handleLifecycleChange('regeneration3', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'HISTORY' && (
                                <div className="space-y-4">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted text-muted-foreground font-medium">
                                            <tr>
                                                <th className="px-3 py-2">Data</th>
                                                <th className="px-3 py-2">Valore</th>
                                                <th className="px-3 py-2">Operatore</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {component.measurements.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground italic">
                                                        Nessuna misurazione registrata.
                                                    </td>
                                                </tr>
                                            ) : (
                                                [...component.measurements].reverse().map((m, i) => (
                                                    <tr key={i}>
                                                        <td className="px-3 py-2">{m.date}</td>
                                                        <td className="px-3 py-2 font-mono">{m.value1}</td>
                                                        <td className="px-3 py-2 text-muted-foreground">{m.operator}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t bg-muted/40 flex justify-end gap-2">
                            <button
                                onClick={() => setOpen(false)}
                                className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md"
                            >
                                Chiudi
                            </button>
                            {(activeTab === 'INFO' || activeTab === 'LIFECYCLE') && (
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
                                >
                                    <Save className="h-4 w-4" /> Salva Modifiche
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
