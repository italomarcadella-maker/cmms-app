"use client";

import { useState, useMemo } from "react";
import { Zap, Droplets, Flame, LineChart as ChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ReadingFormDialog } from "@/components/energy/reading-form-dialog";
import { ConsumptionChart } from "@/components/energy/consumption-chart";
import { ReadingsHistory } from "@/components/energy/readings-history";
import { BackToDashboardButton } from "@/components/ui/back-button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function EnergyDashboard({
    stats,
    meters
}: {
    stats: { currentMonth: any, trends: any[], meterHistory?: Record<string, any[]> },
    meters: any[]
}) {
    const [selectedMeterId, setSelectedMeterId] = useState<string>("all");

    // Group meters
    const elecMeters = meters.filter((m: any) => m.type === 'ELEC');
    const waterMeters = meters.filter((m: any) => m.type === 'WATER');
    const gasMeters = meters.filter((m: any) => m.type === 'GAS');

    // Filter trends based on selection
    const chartData = useMemo(() => {
        if (selectedMeterId === "all") return stats.trends;

        // Return specific meter history if available
        if (stats.meterHistory && stats.meterHistory[selectedMeterId]) {
            return stats.meterHistory[selectedMeterId];
        }

        return [];
    }, [selectedMeterId, stats.trends, stats.meterHistory]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <BackToDashboardButton />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                        Monitoraggio Consumi
                    </h1>
                    <p className="text-muted-foreground mt-1">Gestione energetica e rilevamento anomalie.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={selectedMeterId} onValueChange={setSelectedMeterId}>
                        <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Tutti i contatori" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tutti i Contatori</SelectItem>
                            {elecMeters.length > 0 && (
                                <>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Elettricità</div>
                                    {elecMeters.map((m: any) => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                </>
                            )}
                            {waterMeters.length > 0 && (
                                <>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Acqua</div>
                                    {waterMeters.map((m: any) => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                </>
                            )}
                            {gasMeters.length > 0 && (
                                <>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Gas</div>
                                    {gasMeters.map((m: any) => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                </>
                            )}
                        </SelectContent>
                    </Select>
                    <Link href="/energy/meters">
                        <Button variant="outline">
                            Gestione Contatori
                        </Button>
                    </Link>
                    <ReadingFormDialog meters={meters} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className={`transition-all cursor-pointer ${selectedMeterId === 'all' || elecMeters.some((m: any) => m.id === selectedMeterId) ? 'border-primary/50 shadow-md' : 'opacity-60'}`} onClick={() => setSelectedMeterId('all')}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Elettricità</CardTitle>
                        <Zap className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.currentMonth.ELEC.toFixed(1)} kWh</div>
                        <p className="text-xs text-muted-foreground">Totale Mese Corrente</p>
                    </CardContent>
                </Card>

                <Card className={`transition-all cursor-pointer ${selectedMeterId === 'all' || waterMeters.some((m: any) => m.id === selectedMeterId) ? 'border-blue-500/50 shadow-md' : 'opacity-60'}`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Acqua</CardTitle>
                        <Droplets className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.currentMonth.WATER.toFixed(1)} m³</div>
                        <p className="text-xs text-muted-foreground">Totale Mese Corrente</p>
                    </CardContent>
                </Card>

                <Card className={`transition-all cursor-pointer ${selectedMeterId === 'all' || gasMeters.some((m: any) => m.id === selectedMeterId) ? 'border-orange-500/50 shadow-md' : 'opacity-60'}`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Gas</CardTitle>
                        <Flame className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.currentMonth.GAS.toFixed(1)} m³</div>
                        <p className="text-xs text-muted-foreground">Totale Mese Corrente</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReadingsHistory meters={meters} />

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Trend Consumi</CardTitle>
                        <CardDescription>
                            {selectedMeterId === 'all'
                                ? "Andamento giornaliero aggregato (ultimi 30 giorni)"
                                : "Consumo calcolato per singola lettura (ultimi 30 giorni)"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ConsumptionChart
                                data={chartData}
                                mode={selectedMeterId === 'all' ? 'aggregate' : 'single'}
                                unit={selectedMeterId !== 'all' ? meters.find((m: any) => m.id === selectedMeterId)?.unit : undefined}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
