"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { QRScanner } from "@/components/ui/qr-scanner";
import { ScanLine, Box, Link as LinkIcon, AlertCircle } from "lucide-react";
import { BackToDashboardButton } from "@/components/ui/back-button";

export default function MobileScanPage() {
    const router = useRouter();
    const [isScanning, setIsScanning] = useState(false);
    const [lastScanned, setLastScanned] = useState<string | null>(null);

    const handleScanSuccess = (decodedText: string) => {
        setIsScanning(false);
        setLastScanned(decodedText);

        // If it looks like a valid URL on our origin, try to parse it
        try {
            if (decodedText.startsWith("http")) {
                const url = new URL(decodedText);
                if (url.pathname.startsWith('/assets/')) {
                    router.push(url.pathname);
                    return;
                }
                if (url.pathname.startsWith('/inventory')) {
                    router.push(url.pathname);
                    return;
                }
            }
        } catch (e) {
            // Not a URL
        }

        // If it's just an ID format (e.g. ASSET-001)
        if (decodedText.startsWith("ASSET-") || decodedText.length === 36) { // assuming UUID or specific prefix
            // Route to asset if plausible
            router.push(`/assets/${decodedText}`);
            return;
        }

        // For demo/fallback, let's keep it on screen
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
            <BackToDashboardButton />
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
                    <ScanLine className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800">Scanner QR & Barcode</h1>
                    <p className="text-slate-500 mt-1">Inquadra codici per accedere rapidamente ai dettagli di Asset o Ricambi.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
                {!isScanning && (
                    <div className="space-y-6 max-w-sm mx-auto">
                        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-500 mb-6">
                            <ScanLine className="h-10 w-10" />
                        </div>
                        <h2 className="text-xl font-semibold">Pronto per la scansione</h2>
                        <p className="text-slate-500 text-sm">
                            Assicurati di dare i permessi alla fotocamera.
                        </p>
                        <button
                            onClick={() => setIsScanning(true)}
                            className="w-full bg-indigo-600 text-white rounded-xl py-4 font-semibold text-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
                        >
                            <ScanLine className="h-5 w-5" />
                            Avvia Fotocamera
                        </button>

                        {lastScanned && (
                            <div className="mt-8 p-4 bg-slate-50 border rounded-xl text-left">
                                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                                    <AlertCircle className="h-4 w-4" /> Ultimo Codice Scansionato
                                </h3>
                                <p className="font-mono text-sm bg-white border p-2 rounded break-all">
                                    {lastScanned}
                                </p>
                                <p className="text-xs text-slate-500 mt-2">
                                    Formato non riconosciuto per reindirizzamento automatico.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isScanning && (
                <QRScanner
                    onScanSuccess={handleScanSuccess}
                    onClose={() => setIsScanning(false)}
                />
            )}
        </div>
    );
}
