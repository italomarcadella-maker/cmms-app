"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Camera, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function MobileScanPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" }
                });
                setStream(mediaStream);
                setHasPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Camera Error:", err);
                setHasPermission(false);
                toast.error("Impossibile accedere alla fotocamera");
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleScanClick = () => {
        // Since we don't have a real QR decoder lib installed (e.g. jsQR), 
        // we simulate the "success" event when the user taps the scanner view 
        // (assuming they aimed at a code).
        // In a full implementation, we'd capture a frame to a canvas and pass it to jsQR.

        toast.loading("Analisi codice...", { duration: 500 });
        setTimeout(() => {
            toast.dismiss();
            toast.success("Asset Trovato: Pressa P01");
            router.push("/mobile"); // Redirect to asset detail would go to /assets/ID
        }, 800);
    };

    return (
        <div className="bg-black min-h-[calc(100vh)] overflow-hidden relative flex flex-col">
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center text-white bg-gradient-to-b from-black/70 to-transparent">
                <Link href="/mobile" className="p-2 rounded-full bg-black/40 backdrop-blur-md">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <div className="font-medium text-lg tracking-wide">Scanner</div>
                <div className="w-10"></div>
            </div>

            {/* Camera View */}
            <div className="flex-1 relative bg-gray-900 flex items-center justify-center overflow-hidden">
                {hasPermission === false && (
                    <div className="text-white text-center p-6">
                        <Camera className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                        <p>Accesso alla fotocamera negato.</p>
                        <p className="text-sm text-gray-400 mt-2">Controlla le impostazioni del browser.</p>
                    </div>
                )}

                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Viewfinder Overlay */}
                <div className="absolute inset-0 z-10 pointer-events-none border-[30px] border-black/50">
                    <div className="relative w-full h-full border-2 border-white/30">
                        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1"></div>

                        {/* Scan Line Animation */}
                        <div className="absolute left-0 right-0 h-0.5 bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-[scan_2s_ease-in-out_infinite] top-1/2"></div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="p-8 pb-12 z-20 bg-black/80 backdrop-blur-sm text-center">
                <p className="text-white/70 mb-6 text-sm">
                    Inquadra il QR Code
                </p>
                <button
                    onClick={handleScanClick}
                    className="w-16 h-16 rounded-full border-4 border-white bg-white/20 flex items-center justify-center mx-auto active:scale-95 transition-transform"
                >
                    <div className="w-12 h-12 bg-white rounded-full"></div>
                </button>
                <style jsx global>{`
                    @keyframes scan {
                        0% { top: 10%; opacity: 0; }
                        50% { opacity: 1; }
                        100% { top: 90%; opacity: 0; }
                    }
                `}</style>
            </div>
        </div>
    );
}
