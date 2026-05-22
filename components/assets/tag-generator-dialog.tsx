"use client";

import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";
import { Printer } from "lucide-react";

interface TagGeneratorDialogProps {
    assets?: { id: string; name: string }[];
    onClose: () => void;
    assetId?: string;
    assetName?: string;
}

export function TagGeneratorDialog({ assets, onClose, assetId, assetName }: TagGeneratorDialogProps) {
    // Backward compatibility for single props
    const items = assets || (assetId && assetName ? [{ id: assetId, name: assetName }] : []);
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '', 'height=700,width=850');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Stampa Tag Asset - Smart Plant</title>');
            printWindow.document.write(`
                <style>
                    body { 
                        font-family: 'Courier New', Courier, monospace, sans-serif; 
                        text-align: center; 
                        background-color: #fff; 
                        color: #111; 
                        margin: 0; 
                        padding: 10px; 
                    } 
                    .tag-container { 
                        page-break-after: always; 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        height: 100vh; 
                        box-sizing: border-box;
                    }
                    .tag { 
                        border: 3px double #111; 
                        padding: 24px; 
                        display: inline-block; 
                        border-radius: 12px; 
                        background: #fff; 
                        max-width: 320px; 
                        width: 300px;
                        box-sizing: border-box;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.02);
                        text-align: center;
                    } 
                    .tag-header {
                        border-bottom: 2px solid #111;
                        padding-bottom: 8px;
                        margin-bottom: 12px;
                        text-transform: uppercase;
                        font-size: 11px;
                        letter-spacing: 0.15em;
                        font-weight: bold;
                    }
                    .asset-name {
                        font-size: 18px;
                        font-weight: 800;
                        margin: 8px 0;
                        letter-spacing: -0.02em;
                        font-family: sans-serif;
                    }
                    .barcode {
                        height: 25px;
                        background: repeating-linear-gradient(90deg, #000, #000 2px, transparent 2px, transparent 5px, #000 5px, #000 6px, transparent 6px, transparent 9px);
                        margin: 12px auto;
                        width: 80%;
                        opacity: 0.9;
                    }
                    .qr { 
                        margin: 16px auto; 
                        display: flex;
                        justify-content: center;
                        background: white;
                        padding: 8px;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        width: 140px;
                        height: 140px;
                    }
                    .serial {
                        font-family: monospace;
                        font-size: 9px;
                        background-color: #f1f5f9;
                        padding: 4px 8px;
                        border-radius: 4px;
                        display: inline-block;
                        border: 1px solid #cbd5e1;
                        color: #1e293b;
                        font-weight: bold;
                        text-transform: uppercase;
                    }
                    .footer-text {
                        font-size: 9px;
                        color: #475569;
                        margin-top: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        font-weight: bold;
                    }
                    @media print {
                        body { padding: 0; margin: 0; }
                        .tag-container { height: 100vh; }
                    }
                </style>
            `);
            printWindow.document.write('</head><body>');
            // Write only the tag content specifically
            items.forEach((item) => {
                const qrUrl = typeof window !== 'undefined' 
                    ? `${window.location.origin}/mobile/assets/${item.id}` 
                    : `/mobile/assets/${item.id}`;
                
                printWindow.document.write(`
                    <div class="tag-container">
                        <div class="tag">
                            <div class="tag-header">⚙️ Smart Plant - CMMS</div>
                            <div class="asset-name">${item.name}</div>
                            <div class="barcode"></div>
                            <div class="qr">
                                <!-- Place a placeholder SVG for printing to render perfectly -->
                                <svg width="140" height="140" viewBox="0 0 29 29" style="width: 100%; height: 100%;">
                                    <path d="M0 0h9v9H0zm1 1v7h7V1zm12 0h9v9h-9zm1 1v7h7V1zM0 12h9v9H0zm1 1v7h7v-7zm15-3v1h1v-1zm1 0h1v1h-1zm1 0v1h1v-1zm2 0h1v1h-1zm-6 2h1v1h-1zm3 0h1v1h-1zm1 0h2v1h-2zm-3 2h2v1h-2zm4 0h1v1h-1zm2 0h1v1h-1zm-6 2h1v1h-1zm1 0h1v1h-1zm2 0h2v1h-2zm2 0h1v1h-1zm-6 2h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm1 0v1h1v-1zm1 0h1v1h-1z" fill="#000"/>
                                </svg>
                            </div>
                            <div class="serial">SN: ${item.id.toUpperCase().substring(0, 16)}</div>
                            <div class="footer-text">SCANSIONA PER SEGNALAZIONE RAPIDA</div>
                        </div>
                    </div>
                `);
            });
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            
            setTimeout(() => {
                printWindow.print();
            }, 600);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Genera Tag Industriali ({items.length})
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-6 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl max-h-[420px] overflow-y-auto border border-zinc-100 dark:border-zinc-800/40">
                    {/* Printable Preview Pane */}
                    <div ref={printRef} className="flex flex-col gap-8 w-full items-center">
                        {items.map((item) => {
                            const qrUrl = typeof window !== 'undefined' 
                                ? `${window.location.origin}/mobile/assets/${item.id}` 
                                : `/mobile/assets/${item.id}`;

                            return (
                                <div 
                                    key={item.id} 
                                    className="tag border-3 border-double border-zinc-950 dark:border-zinc-300 p-6 inline-block rounded-xl bg-white text-zinc-950 max-w-[280px] w-full shadow-md text-center transition-all duration-300 hover:shadow-lg"
                                >
                                    <div className="border-b-2 border-zinc-950 pb-2 mb-3 uppercase text-[10px] tracking-[0.15em] font-black text-center text-zinc-850 flex items-center justify-center gap-1.5">
                                        <span>⚙️</span> Smart Plant - CMMS
                                    </div>
                                    <div className="text-md font-extrabold tracking-tight mb-2 text-zinc-900 leading-snug">
                                        {item.name}
                                    </div>
                                    {/* Barcode styling */}
                                    <div 
                                        className="h-6 w-44 bg-zinc-950 mx-auto my-2.5 opacity-90 rounded-xs" 
                                        style={{ 
                                            background: 'repeating-linear-gradient(90deg, #09090b, #09090b 2px, transparent 2px, transparent 6px, #09090b 6px, #09090b 7px, transparent 7px, transparent 10px)' 
                                        }} 
                                    />
                                    <div className="qr bg-white p-2 border border-zinc-200/80 rounded-lg shadow-inner inline-block my-3">
                                        <QRCode 
                                            value={qrUrl} 
                                            size={120} 
                                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                        />
                                    </div>
                                    <div className="mt-1">
                                        <span className="font-mono text-[9px] font-extrabold bg-zinc-100 text-zinc-800 px-2.5 py-1 rounded border border-zinc-200 uppercase">
                                            SN: {item.id.toUpperCase().substring(0, 16)}
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-3">
                                        Scansione Rapida Manutenzione
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <DialogFooter className="sm:justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-4">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-900">
                        Chiudi
                    </Button>
                    <Button onClick={handlePrint} className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl shadow-md font-semibold px-5">
                        <Printer className="h-4 w-4" /> Stampa Tag
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

