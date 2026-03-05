"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, AlertTriangle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Mock data of anomalies mapped to SVG X/Y coordinates on a floor plan/P&ID
interface MapPoint {
    id: string;
    x: number;
    y: number;
    assetName: string;
    status: "CRITICAL" | "WARNING" | "OK";
    description?: string;
}

export function InteractiveDigitalTwin() {
    const [points] = useState<MapPoint[]>([
        { id: "1", x: 30, y: 40, assetName: "Estrusore Principale", status: "WARNING", description: "Pressione +15% sopra SOP" },
        { id: "2", x: 70, y: 20, assetName: "Raffreddamento L1", status: "CRITICAL", description: "Allarme Temperatura Acqua" },
        { id: "3", x: 50, y: 80, assetName: "Avvolgitore", status: "OK" }
    ]);

    return (
        <Card className="col-span-full border border-indigo-100 dark:border-indigo-900 overflow-hidden shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-950/20">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Map className="h-5 w-5 text-indigo-500" />
                        Digital Twin Plant View
                    </CardTitle>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="border-green-500 text-green-600">3 Online</Badge>
                        <Badge variant="outline" className="border-amber-500 text-amber-600">1 Deriva</Badge>
                        <Badge variant="outline" className="border-red-500 text-red-600">1 Critico</Badge>
                    </div>
                </div>
                <CardDescription>
                    Mappatura interattiva in tempo reale delle macchine e deviazioni dalle SOP.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0 relative bg-[url('https://upload.wikimedia.org/wikipedia/commons/4/4c/Types_of_floor_plans.svg')] bg-cover bg-center h-[400px] opacity-90 dark:opacity-70 grayscale">

                {/* Overlay Overlay for aesthetics */}
                <div className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-[2px]" />

                {/* Scaled Container for Points */}
                <div className="absolute inset-0 relative w-full h-full">
                    <TooltipProvider>
                        {points.map((point) => (
                            <Tooltip key={point.id}>
                                <TooltipTrigger asChild>
                                    <div
                                        className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
                                        style={{ left: `${point.x}%`, top: `${point.y}%` }}
                                    >
                                        {/* Pulsing ring animation */}
                                        {point.status !== "OK" && (
                                            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping
                          ${point.status === "CRITICAL" ? "bg-red-400" : "bg-amber-400"}
                       `}></span>
                                        )}

                                        {/* Center Core dot */}
                                        <span className={`relative inline-flex rounded-full h-5 w-5 border-2 border-white dark:border-zinc-900 shadow-md flex items-center justify-center
                      ${point.status === "CRITICAL" ? "bg-red-500" : point.status === "WARNING" ? "bg-amber-500" : "bg-emerald-500"}
                    `}>
                                        </span>

                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-card text-foreground border-border shadow-xl">
                                    <div className="p-1">
                                        <p className="font-bold border-b pb-1 mb-1">{point.assetName}</p>
                                        <div className="flex items-start gap-2 text-sm mt-2">
                                            {point.status === "CRITICAL" ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <Info className="h-4 w-4 text-amber-500" />}
                                            <span className={point.status === "CRITICAL" ? "text-red-600 dark:text-red-400 font-medium" : "text-amber-600 dark:text-amber-400"}>
                                                {point.description || "Tutti i parametri OK"}
                                            </span>
                                        </div>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </TooltipProvider>
                </div>
            </CardContent>
        </Card>
    );
}
