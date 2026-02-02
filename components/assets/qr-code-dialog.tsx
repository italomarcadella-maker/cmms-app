"use client";

import { useAssets } from "@/lib/assets-context";
import { Printer, X } from "lucide-react";
import Image from "next/image"; // Not using next/image for external mainly to avoid config issues, standard img is fine for print
import { useRef } from "react";

interface QRCodeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    asset: any;
}

export function QRCodeDialog({ isOpen, onClose, asset }: QRCodeDialogProps) {
    if (!isOpen || !asset) return null;

    // Use a public API for QR Code generation (simple, no backend lib needed)
    // In a real private app, we might bundle a QR lib, but this is efficient for prototypes.
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`https://cmms-app.com/assets/${asset.id}`)}`;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden print-area">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b no-print">
                    <h3 className="font-semibold text-lg">QR Code Asset</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col items-center text-center space-y-6">
                    <div className="border-4 border-black p-4 rounded-xl bg-white">
                        <img
                            src={qrUrl}
                            alt={`QR Code for ${asset.name}`}
                            className="w-48 h-48 object-contain"
                        />
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold uppercase tracking-wider text-black">{asset.name}</h2>
                        <p className="text-sm font-mono text-slate-500 mt-1">{asset.id}</p>
                        <p className="font-medium text-slate-700 mt-2">{asset.location || 'Unknown Location'}</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 w-full no-print">
                        <p>Scansiona per accedere allo storico manutenzioni o aprire un nuovo ticket.</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t flex justify-end gap-3 no-print">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium hover:underline"
                    >
                        Chiudi
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-bold shadow-sm hover:bg-blue-700 transition-all"
                    >
                        <Printer className="h-4 w-4" /> Stampa Etichetta
                    </button>
                </div>
            </div>
        </div>
    );
}
