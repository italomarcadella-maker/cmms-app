"use client";

import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";
import { Printer } from "lucide-react";

interface TagGeneratorDialogProps {
    assetId: string;
    assetName: string;
    onClose: () => void;
}

export function TagGeneratorDialog({ assets, onClose, assetId, assetName }: { assets?: { id: string, name: string }[], onClose: () => void, assetId?: string, assetName?: string }) {
    // Backward compatibility for single props
    const items = assets || (assetId && assetName ? [{ id: assetId, name: assetName }] : []);

    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Stampa Tag Asset</title>');
            printWindow.document.write(`
                <style>
                    body { font-family: sans-serif; text-align: center; padding: 20px; } 
                    .tag-container { page-break-after: always; display: flex; justify-content: center; align-items: center; height: 100vh; }
                    .tag { border: 2px solid black; padding: 20px; display: inline-block; border-radius: 10px; } 
                    h2 { margin: 10px 0; } 
                    .qr { margin: 20px; }
                    @media print {
                        .tag-container { height: 100vh; }
                    }
                </style>
            `);
            printWindow.document.write('</head><body>');
            printWindow.document.write(content.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            // Wait for resources to load if any images (not here but good practice)
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Genera Tag Asset ({items.length})</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-6 bg-muted/20 rounded-lg max-h-[400px] overflow-y-auto">
                    {/* Printable Area Wrapper for Reference */}
                    <div ref={printRef} className="bg-white p-6 rounded-xl border border-dashed border-gray-300 shadow-sm text-center w-full">
                        {items.map((item, index) => (
                            <div key={item.id} className={index < items.length - 1 ? "tag-container" : "tag-container pb-0 mb-0"}>
                                <div className="tag">
                                    <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-1">Asset Tag</h3>
                                    <h2 className="text-xl font-bold mb-4">{item.name}</h2>
                                    <div className="qr bg-white p-2">
                                        <QRCode value={typeof window !== 'undefined' ? `${window.location.origin}/assets/${item.id}` : `/assets/${item.id}`} size={150} />
                                    </div>
                                    <p className="text-xs text-mono mt-2">{item.id}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">Scansiona per segnalare guasti</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className="sm:justify-between">
                    <Button variant="ghost" onClick={onClose}>
                        Chiudi
                    </Button>
                    <Button onClick={handlePrint} className="gap-2">
                        <Printer className="h-4 w-4" /> Stampa
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
