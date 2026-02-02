"use client";

import { useState } from "react";
import { ArrowLeft, Camera } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
// We don't have html5-qrcode installed, so we simulate scanner UI

export default function MobileScanPage() {
    const [scanning, setScanning] = useState(true);
    const router = useRouter();

    const simulateScan = () => {
        // Simulate finding an asset
        toast.loading("Analisi codice...", { duration: 1000 });
        setTimeout(() => {
            toast.success("Asset Trovato: Pressa P01");
            router.push("/mobile/asset/P01"); // In real app, /assets/ID
        }, 1500);
    };

    return (
        <div className="bg-black/90 min-h-[calc(100vh-64px)] overflow-hidden relative flex flex-col">
            <div className="p-4 z-10 flex justify-between items-center text-white">
                <Link href="/mobile" className="p-2 rounded-full bg-black/50 backdrop-blur-sm">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <div className="font-medium">Scannerizza Asset</div>
                <div className="w-10"></div>{/* Spacer */}
            </div>

            {/* Scanner Viewfinder Simulation */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
                <div className="w-64 h-64 border-2 border-white/50 rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl -mt-1 -ml-1 animate-pulse"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl -mt-1 -mr-1 animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl -mb-1 -ml-1 animate-pulse"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl -mb-1 -mr-1 animate-pulse"></div>

                    {/* Simulated Content Behind */}
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                        <Camera className="h-12 w-12 text-white" />
                    </div>
                </div>
                <p className="text-white/70 mt-8 text-sm text-center px-8">
                    Inquadra il QR Code presente sulla macchina.<br />La rilevazione è automatica.
                </p>
            </div>

            {/* Simulation trigger for dev */}
            <div className="p-8 pb-12 z-10">
                <button
                    onClick={simulateScan}
                    className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg ring-4 ring-blue-600/30 active:scale-95 transition-all"
                >
                    SIMULA SCANSIONE
                </button>
            </div>
        </div>
    );
}
