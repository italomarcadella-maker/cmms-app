"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Printer } from "lucide-react";
import QRCode from "react-qr-code";

interface QRCodeDialogProps {
    part: {
        id: string;
        name: string;
        warehouse?: string;
        location?: string;
    };
}

export function QRCodeDialog({ part }: QRCodeDialogProps) {
    const qrValue = JSON.stringify({
        id: part.id,
        type: "part",
        name: part.name
    });
    // Alternatively, use a URL: 
    // const qrValue = `${typeof window !== 'undefined' ? window.location.origin : ''}/inventory/${part.id}`;

    const handlePrint = () => {
        const printContent = document.getElementById("qr-content");
        const windowUrl = 'about:blank';
        const uniqueName = new Date();
        const windowName = 'Print' + uniqueName.getTime();
        const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

        if (printWindow && printContent) {
            printWindow.document.write(`
        <html>
          <head>
            <style>
              body { font-family: sans-serif; text-align: center; padding: 20px; }
              .label { border: 1px solid #000; padding: 10px; display: inline-block; }
              h2 { margin: 0 0 10px 0; font-size: 16px; }
              p { margin: 5px 0; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="label">
              <h2>${part.name}</h2>
              ${printContent.innerHTML}
              <p>ID: ${part.id}</p>
              <p>${part.warehouse || ''} - ${part.location || ''}</p>
            </div>
          </body>
        </html>
      `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    className="text-primary hover:bg-primary/10 transition-colors p-2 rounded-md"
                    title="Genera QR Code"
                >
                    <QrCode className="h-4 w-4" />
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>QR Code: {part.name}</DialogTitle>
                    <DialogDescription>
                        Scansiona questo codice per identificare rapidamente l'articolo.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-6 space-y-4" id="qr-to-print">
                    <div className="bg-white p-4 rounded-lg border shadow-sm" id="qr-content">
                        <QRCode
                            value={qrValue}
                            size={150}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                            viewBox={`0 0 256 256`}
                        />
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                        <p className="font-mono text-xs">{part.id}</p>
                        <p>{part.warehouse}</p>
                    </div>
                </div>
                <div className="flex justify-end sm:justify-between items-center">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                        Etichetta pronta per la stampa
                    </span>
                    <Button onClick={handlePrint} variant="outline" className="gap-2">
                        <Printer className="h-4 w-4" />
                        Stampa Etichetta
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
