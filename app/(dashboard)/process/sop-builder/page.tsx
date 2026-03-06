"use client";

import React, { useState, useRef, useEffect } from "react";
import { getAssets } from "@/lib/actions";
import { createSopDocument } from "@/lib/process-actions";
import { parseHmiImageToSop } from "@/lib/ai-service";
import { Camera, Upload, ScanLine, FileCheck2, AlertTriangle, ArrowRight, Save, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SOPBuilder() {
    const [assets, setAssets] = useState<any[]>([]);
    const [selectedAsset, setSelectedAsset] = useState("");

    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanComplete, setScanComplete] = useState(false);

    // Extracted Data
    const [sopTitle, setSopTitle] = useState("");
    const [parameters, setParameters] = useState<any[]>([]);
    const [anomalies, setAnomalies] = useState<any[]>([]);

    // Context Data
    const [line, setLine] = useState("");
    const [product, setProduct] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getAssets().then(setAssets);
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset state
        setScanComplete(false);
        setParameters([]);
        setAnomalies([]);

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX_WIDTH = 1200;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");

                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                    setImagePreview(dataUrl);
                } else {
                    setImagePreview(event.target?.result as string);
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleScan = async () => {
        if (!imagePreview || !selectedAsset) return;

        setIsScanning(true);

        try {
            const result = await parseHmiImageToSop(imagePreview, selectedAsset);

            setSopTitle(result.detectedTitle);
            setParameters(result.parameters);
            setAnomalies(result.anomalies || []);
            setScanComplete(true);
        } catch (e) {
            console.error(e);
            alert("Errore durante l'analisi dell'immagine. Riprova.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleParameterChange = (index: number, field: string, value: any) => {
        const newParams = [...parameters];
        newParams[index][field] = value;
        setParameters(newParams);
    };

    const handleSaveSOP = async () => {
        if (!selectedAsset || parameters.length === 0) return;

        const res = await createSopDocument({
            assetId: selectedAsset,
            title: sopTitle || `SOP_${new Date().getTime()}`,
            imageUrl: imagePreview || "",
            aiExtractedParameters: JSON.stringify(parameters),
            line,
            product
        });

        if (res.success) {
            alert("SOP salvato con successo! Questa ricetta diventerà il nuovo standard approvato.");
            window.location.href = "/process";
        } else {
            alert(res.message);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <Link href="/process" className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-2">
                        ← Torna a Dashboard Processo
                    </Link>
                    <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
                        <ScanLine className="h-8 w-8 text-fuchsia-600" />
                        AI Vision Wizard SOP
                    </h1>
                    <p className="text-slate-500 mt-1">Carica la foto di un pannello HMI, estrai i parametri e rileva le derive in automatico.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Column: Input and Scanner */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">

                        <div className="mb-4 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Macchinario / Asset</label>
                                <select
                                    className="w-full border-slate-200 rounded-lg p-2.5 focus:border-fuchsia-500 focus:ring-fuchsia-500 bg-white"
                                    value={selectedAsset}
                                    onChange={e => setSelectedAsset(e.target.value)}
                                >
                                    <option value="">Seleziona l'impianto inquadrato...</option>
                                    {assets.map(a => (
                                        <option key={a.id} value={a.id}>{a.name} ({a.model})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Linea (Opzionale)</label>
                                    <input
                                        type="text"
                                        value={line}
                                        onChange={e => setLine(e.target.value)}
                                        placeholder="es. Linea A"
                                        className="w-full border-slate-200 rounded-lg p-2.5 focus:border-fuchsia-500 focus:ring-fuchsia-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Prodotto (Opzionale)</label>
                                    <input
                                        type="text"
                                        value={product}
                                        onChange={e => setProduct(e.target.value)}
                                        placeholder="es. Tubo PVC 50mm"
                                        className="w-full border-slate-200 rounded-lg p-2.5 focus:border-fuchsia-500 focus:ring-fuchsia-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Immagine HMI</label>

                            {!imagePreview ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-300 rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition-all group"
                                >
                                    <div className="bg-white p-4 rounded-full shadow-sm group-hover:shadow-md mb-4 transition-all">
                                        <Camera className="h-8 w-8 text-slate-400 group-hover:text-fuchsia-500 transition-colors" />
                                    </div>
                                    <p className="font-medium text-slate-600">Scatta o trascina la foto</p>
                                    <p className="text-xs text-slate-400 mt-1">PNG, JPG fino a 10MB</p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment" // Good for mobile 
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                    />
                                </div>
                            ) : (
                                <div className="relative group rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-black">
                                    <img src={imagePreview} alt="HMI Preview" className={cn("w-full h-auto max-h-80 object-contain transition-all duration-700", isScanning && "opacity-80 scale-105 blur-[2px]")} />

                                    {/* Artificial Scanner Laser Effect */}
                                    {isScanning && (
                                        <div className="absolute inset-x-0 w-full h-[3px] bg-fuchsia-500 shadow-[0_0_15px_3px_rgba(217,70,239,0.8)] animate-scan-laser top-0 z-10" />
                                    )}

                                    {/* Artificial Boxes overlay (mock UI) */}
                                    {isScanning && (
                                        <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none" />
                                    )}

                                    {!isScanning && !scanComplete && (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-black/80 transition-colors"
                                        >
                                            Cambia Foto
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleScan}
                            disabled={!imagePreview || !selectedAsset || isScanning}
                            className={cn(
                                "w-full mt-6 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all",
                                !imagePreview || !selectedAsset || isScanning
                                    ? "bg-slate-300 cursor-not-allowed shadow-none"
                                    : "bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:shadow-fuchsia-200 hover:-translate-y-0.5"
                            )}
                        >
                            {isScanning ? (
                                <>
                                    <ScanLine className="h-5 w-5 animate-spin" /> Elaborazione AI Vision...
                                </>
                            ) : scanComplete ? (
                                <>
                                    <ScanLine className="h-5 w-5" /> Scansiona Nuovamente
                                </>
                            ) : (
                                <>
                                    <Camera className="h-5 w-5" /> Analizza Pannello
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right Column: Results & Annotations */}
                <div className="space-y-6">
                    {/* Placeholder before scanning */}
                    {!scanComplete && !isScanning && (
                        <div className="h-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 bg-slate-50/50">
                            <LayoutGrid className="h-16 w-16 text-slate-200 mb-4" />
                            <p className="text-slate-400 font-medium text-center">
                                Carica una foto e clicca su "Analizza" per estrarre la ricetta automaticamente.
                            </p>
                        </div>
                    )}

                    {/* Scanning Skeleton */}
                    {isScanning && (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-pulse space-y-4">
                            <div className="h-8 bg-slate-100 rounded-lg w-3/4"></div>
                            <div className="space-y-2 mt-8">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="flex gap-4">
                                        <div className="h-12 bg-slate-100 rounded-lg w-1/2"></div>
                                        <div className="h-12 bg-slate-100 rounded-lg w-1/4"></div>
                                        <div className="h-12 bg-slate-100 rounded-lg w-1/4"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Results Panel */}
                    {scanComplete && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-right duration-500">
                            {/* Derive / Anomalies Alert Section */}
                            {anomalies.length > 0 && (
                                <div className="bg-orange-50 p-5 border-b border-orange-200">
                                    <h3 className="flex items-center gap-2 font-bold text-orange-900 mb-3">
                                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                                        ⚠️ Derive Rilevate rispetto alla SOP Standard
                                    </h3>
                                    <div className="space-y-3">
                                        {anomalies.map((anom, idx) => (
                                            <div key={idx} className="bg-white p-3 rounded-lg border border-orange-100 text-sm shadow-sm">
                                                <p className="font-semibold text-slate-800">{anom.label}</p>
                                                <p className="text-orange-700 mt-1">{anom.description}</p>
                                                <div className="flex gap-4 mt-2 font-mono text-xs">
                                                    <span className="text-emerald-600">Standard: {anom.expected}</span>
                                                    <span className="text-red-600">Rilevato: {anom.actual}</span>
                                                </div>
                                                <p className="text-slate-500 mt-2 text-xs flex items-center gap-1 border-t pt-2">
                                                    <span>💡 AI:</span> {anom.recommendation}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {anomalies.length === 0 && (
                                <div className="bg-emerald-50 p-4 border-b border-emerald-200 flex items-center gap-3">
                                    <div className="bg-emerald-100 p-2 rounded-full">
                                        <FileCheck2 className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-emerald-900">Nessuna Deriva Rilevata</h3>
                                        <p className="text-sm text-emerald-700">I parametri estratti sono perfettamente in linea o è la prima SOP assoluta.</p>
                                    </div>
                                </div>
                            )}

                            <div className="p-6">
                                <input
                                    type="text"
                                    value={sopTitle}
                                    onChange={e => setSopTitle(e.target.value)}
                                    className="text-xl font-bold text-slate-800 border-none outline-none focus:ring-0 p-0 w-full mb-6 bg-transparent"
                                    placeholder="Nome SOP / Ricetta"
                                />

                                <div className="space-y-3">
                                    <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
                                        <div className="col-span-6">Parametro</div>
                                        <div className="col-span-3 text-center">Valore ({parameters[0]?.unit || '-'})</div>
                                        <div className="col-span-3 text-center">Toll. (±)</div>
                                    </div>

                                    {parameters.map((param, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-2 items-center bg-slate-50 hover:bg-slate-100 transition-colors p-2 rounded-xl border border-slate-100">
                                            <div className="col-span-6 font-medium text-slate-700">{param.label}</div>
                                            <div className="col-span-3">
                                                <input
                                                    type="number"
                                                    value={param.value}
                                                    onChange={e => handleParameterChange(index, "value", Number(e.target.value))}
                                                    className="w-full text-center border-slate-200 rounded-lg p-2 focus:ring-fuchsia-500 font-mono text-sm shadow-inner"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="number"
                                                    value={param.tolerance}
                                                    onChange={e => handleParameterChange(index, "tolerance", Number(e.target.value))}
                                                    className="w-full text-center border-slate-200 rounded-lg p-2 focus:ring-fuchsia-500 font-mono text-sm bg-white"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={handleSaveSOP}
                                    className="w-full mt-8 bg-slate-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg"
                                >
                                    <Save className="h-5 w-5" /> Salva come Standard SOP
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Added styling for the laser animation */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scan-laser {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan-laser {
                    animation: scan-laser 2s ease-in-out infinite;
                }
            `}} />
        </div>
    );
}
