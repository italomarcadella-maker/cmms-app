"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, RefreshCw, Search, CheckCircle2, ScanLine, AlertTriangle } from "lucide-react";
import { QRScanner } from "@/components/ui/qr-scanner";
import { useT } from "@/lib/i18n/client";

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
    const t = useT();
    const [searchQuery, setSearchQuery] = useState("");
    const [cameraOpen, setCameraOpen] = useState(false);
    const [isDecodingFile, setIsDecodingFile] = useState(false);
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
    const [matchedAssetId, setMatchedAssetId] = useState<string | null>(null);
    const [unrecognizedCode, setUnrecognizedCode] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Audio beep on a real match, kept purely as UI feedback (not tied to any fake data)
    const playBeep = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.value = 1200;
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {
            console.log("AudioContext is blocked or not supported on this browser.");
        }
    };

    const filteredAssets = assets.filter(
        (asset) =>
            asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const goToAsset = (assetId: string) => {
        playBeep();
        setUnrecognizedCode(null);
        setMatchedAssetId(assetId);
        setShowSuccessOverlay(true);

        setTimeout(() => {
            router.push(`/mobile/assets/${assetId}`);
        }, 1200);
    };

    // Resolve a real decoded QR/barcode payload (from camera or an uploaded image) to a real asset.
    const resolveAndNavigate = (decodedText: string) => {
        try {
            if (decodedText.startsWith("http")) {
                const url = new URL(decodedText);
                const match = url.pathname.match(/\/assets\/([^/]+)/);
                if (match) {
                    const byId = assets.find((a) => a.id === match[1]);
                    if (byId) { goToAsset(byId.id); return; }
                }
            }
        } catch {
            // not a URL, fall through to direct matching below
        }

        const byId = assets.find((a) => a.id === decodedText);
        if (byId) { goToAsset(byId.id); return; }

        const bySerial = assets.find((a) => a.serialNumber === decodedText);
        if (bySerial) { goToAsset(bySerial.id); return; }

        setUnrecognizedCode(decodedText);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsDecodingFile(true);
        setUnrecognizedCode(null);
        try {
            const { Html5Qrcode } = await import("html5-qrcode");
            const reader = new Html5Qrcode("qr-file-reader");
            const decodedText = await reader.scanFile(file, false);
            resolveAndNavigate(decodedText);
        } catch (err) {
            setUnrecognizedCode(""); // "" = decoding failed, no code found in the image
        } finally {
            setIsDecodingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Il codice sta dentro la frase: si traduce la frase intera con un segnaposto e lo si sostituisce con il codice
    const [unrecognizedBefore, unrecognizedAfter] = t("Codice {code} non corrisponde a nessun asset registrato.", { code: "{code}" }).split("{code}");

    const triggerFileInput = () => fileInputRef.current?.click();

    return (
        <div className="relative min-h-[calc(100vh-10rem)] pb-12">
            {/* Hidden container required by html5-qrcode to decode an uploaded image file */}
            <div id="qr-file-reader" className="hidden" />

            {showSuccessOverlay && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/95 text-white animate-in fade-in duration-300">
                    <div className="relative flex items-center justify-center p-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-bounce mb-6">
                        <CheckCircle2 className="h-16 w-16 text-emerald-400" />
                        <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-30" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight mb-1">{t("Asset Rilevato!")}</h3>
                    <p className="text-sm text-zinc-400 font-mono mb-4">
                        ID: {matchedAssetId?.toUpperCase().substring(0, 16)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-emerald-400 animate-pulse font-semibold">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>{t("Caricamento console tecnica...")}</span>
                    </div>
                </div>
            )}

            {cameraOpen && (
                <QRScanner
                    onScanSuccess={(text) => { setCameraOpen(false); resolveAndNavigate(text); }}
                    onClose={() => setCameraOpen(false)}
                />
            )}

            <div className="relative bg-zinc-950 rounded-3xl p-6 text-white overflow-hidden shadow-2xl border border-zinc-900 mb-6">
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(18,18,18,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-600/20 rounded-full blur-[100px]" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px]" />

                <div className="relative flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] tracking-[0.2em] font-black uppercase text-emerald-400 font-mono">
                            CMMS SCANNER
                        </span>
                    </div>
                </div>

                <div className="relative aspect-square w-full max-w-[280px] mx-auto bg-zinc-900/60 border border-zinc-800 rounded-2xl flex items-center justify-center group overflow-hidden mb-6">
                    <div className="absolute top-4 left-4 h-6 w-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm" />
                    <div className="absolute top-4 right-4 h-6 w-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm" />
                    <div className="absolute bottom-4 left-4 h-6 w-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm" />
                    <div className="absolute bottom-4 right-4 h-6 w-6 border-b-4 border-r-4 border-emerald-400 rounded-br-sm" />

                    {isDecodingFile ? (
                        <div className="flex flex-col items-center gap-3 px-6 text-center animate-pulse">
                            <RefreshCw className="h-10 w-10 text-emerald-400 animate-spin" />
                            <p className="text-xs font-mono text-zinc-300">{t("Decodifica immagine in corso...")}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 select-none pointer-events-none text-zinc-500">
                            <div className="relative p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-inner">
                                <Camera className="h-10 w-10 text-zinc-400" />
                            </div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mt-2">
                                {t("Pronto per Scansione")}
                            </p>
                        </div>
                    )}
                </div>

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
                        onClick={() => setCameraOpen(true)}
                        disabled={isDecodingFile}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-zinc-950 font-bold py-3.5 px-6 rounded-2xl transition-all duration-300 shadow-[0_4px_20px_rgba(16,185,129,0.35)] active:scale-98 disabled:opacity-50"
                    >
                        <ScanLine className="h-5 w-5" />
                        <span>{t("Scansiona con Fotocamera")}</span>
                    </button>

                    <button
                        onClick={triggerFileInput}
                        disabled={isDecodingFile}
                        className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100 font-semibold py-3 px-6 rounded-2xl transition-all duration-300 active:scale-98 disabled:opacity-50"
                    >
                        <Camera className="h-4.5 w-4.5 text-zinc-400" />
                        <span>{t("Carica Foto Etichetta")}</span>
                    </button>
                </div>

                {unrecognizedCode !== null && (
                    <div className="relative mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                        <div className="text-xs text-amber-200">
                            {unrecognizedCode
                                ? <>{unrecognizedBefore}<span className="font-mono">{unrecognizedCode}</span>{unrecognizedAfter}</>
                                : t("Nessun QR/barcode leggibile in questa immagine.")} {t("Prova la ricerca manuale qui sotto.")}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-50">
                            {t("Ricerca Manuale")}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {t("Il codice non si legge bene? Cerca l'impianto direttamente nell'elenco.")}
                        </p>
                    </div>
                </div>

                <div className="relative mb-4">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder={t("Cerca per nome, modello o location...")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:text-zinc-100"
                    />
                </div>

                <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                    {filteredAssets.length === 0 ? (
                        <div className="text-center py-6 text-zinc-400 text-xs">
                            {t("Nessun asset corrispondente trovato.")}
                        </div>
                    ) : (
                        filteredAssets.map((asset) => (
                            <button
                                key={asset.id}
                                onClick={() => goToAsset(asset.id)}
                                className="w-full text-left p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/20 hover:bg-violet-500/5 dark:hover:bg-violet-500/10 hover:border-violet-500/30 transition-all duration-300 flex items-center justify-between group"
                            >
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                        {asset.name}
                                    </h4>
                                    <div className="flex gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                                        <span>{t("Modello: {model}", { model: asset.model })}</span>
                                        <span>•</span>
                                        <span>{t("Location: {location}", { location: asset.location })}</span>
                                    </div>
                                </div>
                                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-violet-500 group-hover:text-white px-2 py-0.5 rounded-full font-bold transition-all uppercase">
                                    {t("Apri")}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
