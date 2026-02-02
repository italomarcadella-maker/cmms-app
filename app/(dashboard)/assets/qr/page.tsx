"use client";

import { useAssets } from "@/lib/assets-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QRCodeSVG } from "qrcode.react"; // Need to install this or use an image API
import { useState } from "react";
import { Printer } from "lucide-react";

export default function QRGeneratorPage() {
    const { assets } = useAssets();
    const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Generatore QR Code Asset</h1>
                <Button onClick={handlePrint} variant="outline">
                    <Printer className="mr-2 h-4 w-4" /> Stampa
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2">
                {assets.map((asset) => (
                    <Card key={asset.id} className="break-inside-avoid">
                        <CardHeader>
                            <CardTitle className="text-lg">{asset.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center space-y-4">
                            <QRCodeSVG
                                value={`${baseUrl}/requests/new?assetId=${asset.id}`}
                                size={150}
                            />
                            <div className="text-center text-sm text-muted-foreground">
                                <p className="font-mono">{asset.id}</p>
                                <p>{asset.model}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
