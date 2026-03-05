"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanFailure?: (error: any) => void;
    onClose?: () => void;
}

export function QRScanner({ onScanSuccess, onScanFailure, onClose }: QRScannerProps) {
    const scannerRegionId = 'qr-reader';
    const [scanError, setScanError] = useState<string | null>(null);

    useEffect(() => {
        const createConfig = () => {
            return {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1,
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
            };
        };

        const html5QrcodeScanner = new Html5QrcodeScanner(
            scannerRegionId,
            createConfig(),
            false
        );

        html5QrcodeScanner.render(
            (decodedText) => {
                // Keep trying to pause/clear internally, but we'll clear it when closing.
                // We shouldn't clear immediately because if onScanSuccess forces a re-render it can crash.
                setTimeout(() => {
                    html5QrcodeScanner.clear().catch(console.error);
                }, 200);
                onScanSuccess(decodedText);
            },
            (errorMessage) => {
                if (onScanFailure) {
                    onScanFailure(errorMessage);
                } else {
                    // Set error state silently if no handler
                    // setScanError(errorMessage); // It fires constantly, so don't show it usually
                }
            }
        );

        return () => {
            html5QrcodeScanner.clear().catch(console.error);
        };
    }, [onScanSuccess, onScanFailure]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                        <Camera className="h-5 w-5 text-indigo-600" />
                        Scansione QR Code
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-200 text-slate-600 rounded-full hover:bg-slate-300 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4 bg-black relative min-h-[300px] flex items-center justify-center">
                    <div id={scannerRegionId} className="w-full h-full text-white [&>div]:border-none"></div>
                </div>

                <div className="p-4 bg-slate-50 border-t text-sm text-center text-slate-500">
                    Inquadra il QR Code dell'Asset o del componente. La scansione partirà in automatico.
                </div>
            </div>
        </div>
    );
}
