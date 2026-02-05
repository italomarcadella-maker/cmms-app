"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight, Box, AlertTriangle, CheckCircle, XCircle, Activity } from "lucide-react";

interface Asset {
    id: string;
    name: string;
    status: string; // 'RUNNING' | 'STOPPED' | 'MAINTENANCE' | 'OFFLINE'
    location?: string;
    model?: string;
}

interface FactoryMapProps {
    assets: Asset[];
}

export function FactoryMap({ assets }: FactoryMapProps) {
    // Group assets by location or just display in a grid for now
    // Simulating a layout where "Line 1" has specific assets, etc.
    // Since we lack structured location data, we'll just map them to a grid.

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'RUNNING': return "bg-emerald-500 hover:bg-emerald-600";
            case 'STOPPED': return "bg-red-500 hover:bg-red-600 animate-pulse";
            case 'MAINTENANCE': return "bg-amber-500 hover:bg-amber-600";
            case 'OFFLINE': return "bg-gray-400 hover:bg-gray-500";
            default: return "bg-blue-500 hover:bg-blue-600";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'RUNNING': return <CheckCircle className="h-4 w-4 text-white" />;
            case 'STOPPED': return <AlertTriangle className="h-4 w-4 text-white" />;
            case 'MAINTENANCE': return <Activity className="h-4 w-4 text-white" />;
            default: return <Box className="h-4 w-4 text-white" />;
        }
    };

    return (
        <Card className="col-span-full">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Box className="h-5 w-5 text-muted-foreground" />
                        Mappa Impianto
                    </CardTitle>
                    <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> In Produzione</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Fermo / Errore</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Manutenzione</div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 bg-muted/20 rounded-xl border-2 border-dashed border-muted">
                    {assets.length === 0 ? (
                        <div className="col-span-full text-center py-10 text-muted-foreground">
                            Nessun asset configurato nella mappa.
                        </div>
                    ) : (
                        assets.map((asset) => (
                            <Tooltip key={asset.id}>
                                <TooltipTrigger asChild>
                                    <Link href={`/assets/${asset.id}`} className={cn(
                                        "aspect-square rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all shadow-sm hover:scale-105 active:scale-95 group relative overflow-hidden",
                                        getStatusColor(asset.status)
                                    )}>
                                        {/* Background Pattern */}
                                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white_0%,_transparent_100%)]" />

                                        <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                                            {getStatusIcon(asset.status)}
                                        </div>
                                        <span className="font-bold text-white text-sm text-center line-clamp-2 px-1">
                                            {asset.name}
                                        </span>
                                        <span className="text-[10px] text-white/80 uppercase tracking-widest font-medium">
                                            {asset.location || "Area A"}
                                        </span>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <div className="text-xs">
                                        <p className="font-bold">{asset.name}</p>
                                        <p className="text-muted-foreground">{asset.model}</p>
                                        <p className="mt-1 flex items-center gap-1 text-[10px] uppercase">
                                            {asset.status === 'RUNNING' && <CheckCircle className="h-3 w-3 text-emerald-500" />}
                                            {asset.status}
                                        </p>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        ))
                    )}

                    {/* Placeholder for layout visualization */}
                    <div className="aspect-square rounded-xl md:flex hidden items-center justify-center border-2 border-dashed border-muted-foreground/20 text-muted-foreground/40 text-xs font-mono">
                        AREA CARICO
                    </div>
                    <div className="aspect-square rounded-xl md:flex hidden items-center justify-center border-2 border-dashed border-muted-foreground/20 text-muted-foreground/40 text-xs font-mono">
                        MAGAZZINO
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
