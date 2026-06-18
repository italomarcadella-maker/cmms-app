"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, RefreshCw, Sparkles, Upload, Search, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetProp {
    id: string;
    name: string;
    model: string;
    serialNumber: string;
    location: string;
    status: string;
}

export function ScannerClient({ assets }: { assets: AssetProp[] }) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [scanningProgress, setScanningProgress] = useState<string | null>(null);
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
    const [selectedMockAsset, setSelectedMockAsset] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Audio beep synthesis for a realistic barcode scan sound
    const playBeep = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.value = 1200; // high pitched beep
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15); // 150ms beep
        } catch (e) {
            console.log("AudioContext is blocked or not supported on this browser.");
        }
    };

    // Filtered assets for scan simulation
    const filteredAssets = assets.filter(
        (asset) =>
            asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Function to handle simulated scan
    const handleSimulateScan = (assetId: string) => {
        playBeep();
        setSelectedMockAsset(assetId);
        setShowSuccessOverlay(true);
        
        setTimeout(() => {
            router.push(`/mobile/assets/${assetId}`);
        }, 1200);
    };

    // Handle QR image file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        setIsScanning(true);
        setScanningProgress("Caricamento immagine...");

        // Simulate analysis of the image uploaded
        setTimeout(() => {
            setScanningProgress("Rilevamento QR code in corso...");
            setTimeout(() => {
                setScanningProgress("Analisi metadati impianto...");
                setTimeout(() => {
                    setIsScanning(false);
                    setScanningProgress(null);
                    
                    // Decode to a random asset or the first match
                    if (assets.length > 0) {
                        const randomAsset = assets[Math.floor(Math.random() * assets.length)];
                        handleSimulateScan(randomAsset.id);
                    } else {
                        alert("Nessun asset disponibile nel database per la scansione.");
                    }
                }, 800);
            }, 800);
        }, 700);
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <div className="relative min-h-[calc(100vh-10rem)] pb-12">
            {/* Visual scan HUD overlay when scanning/saving */}
            {showSuccessOverlay && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/95 text-white animate-in fade-in duration-300">
                    <div className="relative flex items-center justify-center p-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-bounce mb-6">
                        <CheckCircle2 className="h-16 w-16 text-emerald-400" />
                        <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-30" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight mb-1">Asset Rilevato!</h3>
                    <p className="text-sm text-zinc-400 font-mono mb-4">
                        SN: {selectedMockAsset?.toUpperCase().substring(0, 16)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-emerald-400 animate-pulse font-semibold">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Caricamento console tecnica...</span>
                    </div>
                </div>
            )}

            {/* Immersive HUD Scanning Area */}
            <div className="relative bg-zinc-950 rounded-3xl p-6 text-white overflow-hidden shadow-2xl border border-zinc-900 mb-6">
                {/* Background futuristic grids */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(18,18,18,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-600/20 rounded-full blur-[100px]" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px]" />

                {/* HUD Header */}
                <div className="relative flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] tracking-[0.2em] font-black uppercase text-emerald-400 font-mono">
                            CMMS SCANNER HUD
                        </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                        Ver. 2.0
                    </span>
                </div>

                {/* Scanning Screen Container */}
                <div className="relative aspect-square w-full max-w-[280px] mx-auto bg-zinc-900/60 border border-zinc-800 rounded-2xl flex items-center justify-center group overflow-hidden mb-6">
                    {/* Glowing HUD Target corners */}
                    <div className="absolute top-4 left-4 h-6 w-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm transition-all duration-300 group-hover:scale-105" />
                    <div className="absolute top-4 right-4 h-6 w-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm transition-all duration-300 group-hover:scale-105" />
                    <div className="absolute bottom-4 left-4 h-6 w-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm transition-all duration-300 group-hover:scale-105" />
                    <div className="absolute bottom-4 right-4 h-6 w-6 border-b-4 border-r-4 border-emerald-400 rounded-br-sm transition-all duration-300 group-hover:scale-105" />

                    {/* QR Icon placeholder inside HUD */}
                    {scanningProgress ? (
                        <div className="flex flex-col items-center gap-3 px-6 text-center animate-pulse">
                            <RefreshCw className="h-10 w-10 text-emerald-400 animate-spin" />
                            <p className="text-xs font-mono text-zinc-300">{scanningProgress}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 select-none pointer-events-none text-zinc-500">
                            <div className="relative p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-inner">
                                <Camera className="h-10 w-10 text-zinc-400" />
                            </div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mt-2">
                                Pronto per Scansione
                            </p>
                        </div>
                    )}

                    {/* Futuristic Scanning Laser Line */}
                    <div 
                        className="absolute left-4 right-4 h-[2px] bg-emerald-400 shadow-[0_0_15px_#34d399,0_0_8px_#34d399] z-10 opacity-75"
                        style={{
                            top: "10%",
                            animation: "laser-sweep 3s ease-in-out infinite"
                        }}
                    />
                </div>

                {/* Laser animation style injector */}
                <style jsx global>{`
                    @keyframes laser-sweep {
                        0%, 100% { top: 12%; }
                        50% { top: 88%; }
                    }
                `}</style>

                {/* Main Action Buttons */}
                <div className="relative flex flex-col gap-3">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                    />
                    
                    <button 
                        onClick={triggerFileInput}
                        disabled={isScanning}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-zinc-950 font-bold py-3.5 px-6 rounded-2xl transition-all duration-300 shadow-[0_4px_20px_rgba(16,185,129,0.35)] active:scale-98 disabled:opacity-50"
                    >
                        <Camera className="h-5 w-5" />
                        <span>Fai Foto / Acquisisci QR</span>
                    </button>

                    <button 
                        onClick={triggerFileInput}
                        disabled={isScanning}
                        className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100 font-semibold py-3 px-6 rounded-2xl transition-all duration-300 active:scale-98 disabled:opacity-50"
                    >
                        <Upload className="h-4.5 w-4.5 text-zinc-400" />
                        <span>Carica Foto Etichetta</span>
                    </button>
                </div>
            </div>

            {/* Simulated Live Scan section for testing in Desktop/Dev environments */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-violet-500" />
                            Simulatore di Scansione
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Ambiente di sviluppo/preview: seleziona un impianto reale per simulare.
                        </p>
                    </div>
                </div>

                {/* Search box to filter simulated assets */}
                <div className="relative mb-4">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Cerca per nome, modello o location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:text-zinc-100"
                    />
                </div>

                {/* Simulated Assets List */}
                <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                    {filteredAssets.length === 0 ? (
                        <div className="text-center py-6 text-zinc-400 text-xs">
                            Nessun asset corrispondente trovato.
                        </div>
                    ) : (
                        filteredAssets.map((asset) => (
                            <button
                                key={asset.id}
                                onClick={() => handleSimulateScan(asset.id)}
                                className="w-full text-left p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/20 hover:bg-violet-500/5 dark:hover:bg-violet-500/10 hover:border-violet-500/30 transition-all duration-300 flex items-center justify-between group"
                            >
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                        {asset.name}
                                    </h4>
                                    <div className="flex gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                                        <span>Modello: {asset.model}</span>
                                        <span>•</span>
                                        <span>Location: {asset.location}</span>
                                    </div>
                                </div>
                                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-violet-500 group-hover:text-white px-2 py-0.5 rounded-full font-bold transition-all uppercase">
                                    Simula
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
