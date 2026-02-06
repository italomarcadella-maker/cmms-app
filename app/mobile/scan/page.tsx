"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useRouter } from "next/navigation";
import { BackToDashboardButton } from "@/components/ui/back-button";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function MobileScanPage() {
    const [isScanning, setIsScanning] = useState(false);
    const [scannedResult, setScannedResult] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (scannerRef.current && isScanning) {
                scannerRef.current.stop().catch(err => console.error(err));
            }
        };
    }, [isScanning]);

    const startScanning = async () => {
        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length) {
                const cameraId = devices[0].id; // Use back camera if possible, usually the last one or filtered
                // Better logic: prefer 'environment' facing mode

                if (!scannerRef.current) {
                    scannerRef.current = new Html5Qrcode("reader");
                }

                setIsScanning(true);
                setScannedResult(null);

                await scannerRef.current.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
                    },
                    (decodedText, decodedResult) => {
                        handleScanSuccess(decodedText);
                    },
                    (errorMessage) => {
                        // ignore errors for each frame
                    }
                );
            } else {
                toast.error("Nessuna fotocamera trovata.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Errore avvio fotocamera. Verifica i permessi.");
            setIsScanning(false);
        }
    };

    const stopScanning = async () => {
        if (scannerRef.current && isScanning) {
            try {
                await scannerRef.current.stop();
                setIsScanning(false);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleScanSuccess = (text: string) => {
        stopScanning();
        setScannedResult(text);

        try {
            // Try parsing JSON first
            const data = JSON.parse(text);
            if (data.id && data.type) {
                toast.success(`Codice rilevato: ${data.name || data.id}`);
                // Redirect logic
                if (data.type === 'part') {
                    router.push(`/inventory?search=${data.name || data.id}`); // Or direct link if we had a detail page
                } else if (data.type === 'asset') {
                    router.push(`/assets/${data.id}`);
                } else {
                    toast.info("Tipo oggetto sconosciuto: " + data.type);
                }
            } else {
                // Fallback for simple text
                toast.info(`Testo scansionato: ${text}`);
            }
        } catch (e) {
            // Not JSON, maybe a URL or ID
            toast.info(`Scansionato: ${text}`);
            // Simple search fallback
            // router.push(`/global-search?q=${text}`); 
        }
    };

    return (
        <div className="p-4 max-w-md mx-auto space-y-6">
            <BackToDashboardButton />

            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Scanner QR Code</h1>
                <p className="text-muted-foreground">Inquadra il codice di un articolo o asset.</p>
            </div>

            <Card className="p-4 overflow-hidden bg-black/5 border-2 border-dashed relative min-h-[300px] flex flex-col items-center justify-center">
                <div id="reader" className="w-full h-full rounded-lg overflow-hidden"></div>
                {!isScanning && !scannedResult && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                        <Camera className="h-12 w-12 opacity-50" />
                        <p>Fotocamera spenta</p>
                        <Button onClick={startScanning}>Avvia Scansione</Button>
                    </div>
                )}
                {scannedResult && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background z-10 p-4 text-center">
                        <p className="font-mono bg-muted p-2 rounded break-all">{scannedResult}</p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setScannedResult(null)}>Chiudi</Button>
                            <Button onClick={startScanning}>Scansiona Ancora</Button>
                        </div>
                    </div>
                )}
            </Card>

            {isScanning && (
                <Button variant="destructive" className="w-full" onClick={stopScanning}>
                    Ferma Fotocamera
                </Button>
            )}

            <div className="text-xs text-center text-muted-foreground mt-8">
                Assicurati di aver concesso i permessi per la fotocamera al browser.
            </div>
        </div>
    );
}
