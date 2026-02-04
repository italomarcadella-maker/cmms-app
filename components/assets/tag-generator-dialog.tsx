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

export function TagGeneratorDialog({ assetId, assetName, onClose }: TagGeneratorDialogProps) {
    // Determine the URL for the QR code
    // Assuming the app is deployed on a reachable domain or local network.
    // For now, we use a relative path that will resolve when scanned if on same network, 
    // or a placeholder base if we don't know the host.
    // Best practice: Use window.location.origin if available, or a configured ENV.

    const qrValue = typeof window !== 'undefined'
        ? `${window.location.origin}/assets/${assetId}`
        : `/assets/${assetId}`;

    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Stampa Tag Asset</title>');
            printWindow.document.write('<style>body { font-family: sans-serif; text-align: center; padding: 20px; } .tag { border: 2px solid black; padding: 20px; display: inline-block; border-radius: 10px; } h2 { margin: 10px 0; } .qr { margin: 20px; }</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(content.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Genera Tag Asset</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-6 bg-muted/20 rounded-lg">
                    {/* Printable Area Wrapper for Reference */}
                    <div ref={printRef} className="bg-white p-6 rounded-xl border border-dashed border-gray-300 shadow-sm text-center">
                        <div className="tag">
                            <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-1">Asset Tag</h3>
                            <h2 className="text-xl font-bold mb-4">{assetName}</h2>
                            <div className="qr bg-white p-2">
                                <QRCode value={qrValue} size={150} />
                            </div>
                            <p className="text-xs text-mono mt-2">{assetId}</p>
                            <p className="text-[10px] text-gray-400 mt-1">Scansiona per segnalare guasti</p>
                        </div>
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
