
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
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Filter } from "lucide-react";
import { format, subDays, isWithinInterval, parseISO } from "date-fns";

export function EnergyDashboard({
    stats,
    meters
}: {
    stats: {
        currentMonth: { ELEC: number, WATER: number, GAS: number },
        lastMonth: { ELEC: number, WATER: number, GAS: number },
        trends: any[],
        meterHistory?: Record<string, any[]>
    },
    meters: any[]
}) {
    const [selectedMeterId, setSelectedMeterId] = useState<string>("all");
    const [selectedType, setSelectedType] = useState<string>("ALL"); // ALL, ELEC, WATER, GAS
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>({
        start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });

    // Group meters
    const elecMeters = meters.filter((m: any) => m.type === 'ELEC');
    const waterMeters = meters.filter((m: any) => m.type === 'WATER');
    const gasMeters = meters.filter((m: any) => m.type === 'GAS');

    // Filter and aggregate data
    const filteredStats = useMemo(() => {
        const start = parseISO(dateRange.start);
        const end = parseISO(dateRange.end);

        let baseTrends = stats.trends;
        
        // If a specific meter is selected, use its history
        if (selectedMeterId !== "all" && stats.meterHistory?.[selectedMeterId]) {
            baseTrends = stats.meterHistory[selectedMeterId].map(h => ({
                date: h.date,
                [meters.find(m => m.id === selectedMeterId)?.type.toLowerCase()]: h.consumption
            }));
        }

        const filtered = baseTrends.filter(t => {
            const d = parseISO(t.date);
            return isWithinInterval(d, { start, end });
        });

        const totals = { ELEC: 0, WATER: 0, GAS: 0 };
        filtered.forEach(t => {
            if (t.elec) totals.ELEC += t.elec;
            if (t.water) totals.WATER += t.water;
            if (t.gas) totals.GAS += t.gas;
        });

        return {
            trends: filtered,
            totals
        };
    }, [dateRange, stats.trends, stats.meterHistory, selectedMeterId, meters]);

    const chartData = filteredStats.trends;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
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

            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" /> Inizio
                    </label>
                    <Input 
                        type="date" 
                        value={dateRange.start} 
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="bg-white"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" /> Fine
                    </label>
                    <Input 
                        type="date" 
                        value={dateRange.end} 
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="bg-white"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                        <Filter className="h-3 w-3" /> Tipo Consumo
                    </label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tutti i tipi</SelectItem>
                            <SelectItem value="ELEC">Elettricità</SelectItem>
                            <SelectItem value="WATER">Acqua</SelectItem>
                            <SelectItem value="GAS">Gas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 text-right">
                    <p className="text-[10px] text-slate-400 italic">Dati basati sulle letture dei contatori nel periodo selezionato.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card 
                    className={`transition-all cursor-pointer ${(selectedType === 'ALL' || selectedType === 'ELEC') && (selectedMeterId === 'all' || meters.find(m => m.id === selectedMeterId)?.type === 'ELEC') ? 'border-primary/50 shadow-md ring-1 ring-primary/20 bg-primary/5' : 'opacity-60 overflow-hidden'}`} 
                    onClick={() => {
                        setSelectedType('ELEC');
                        if (selectedMeterId !== 'all' && meters.find(m => m.id === selectedMeterId)?.type !== 'ELEC') {
                            setSelectedMeterId('all');
                        }
                    }}
                >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Elettricità</CardTitle>
                        <Zap className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredStats.totals.ELEC.toFixed(1)} kWh</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Nel periodo selezionato
                        </p>
                    </CardContent>
                </Card>

                <Card 
                    className={`transition-all cursor-pointer ${(selectedType === 'ALL' || selectedType === 'WATER') && (selectedMeterId === 'all' || meters.find(m => m.id === selectedMeterId)?.type === 'WATER') ? 'border-blue-500/50 shadow-md ring-1 ring-blue-500/20 bg-blue-500/5' : 'opacity-60'}`}
                    onClick={() => {
                        setSelectedType('WATER');
                        if (selectedMeterId !== 'all' && meters.find(m => m.id === selectedMeterId)?.type !== 'WATER') {
                            setSelectedMeterId('all');
                        }
                    }}
                >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Acqua</CardTitle>
                        <Droplets className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredStats.totals.WATER.toFixed(1)} m³</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Nel periodo selezionato
                        </p>
                    </CardContent>
                </Card>

                <Card 
                    className={`transition-all cursor-pointer ${(selectedType === 'ALL' || selectedType === 'GAS') && (selectedMeterId === 'all' || meters.find(m => m.id === selectedMeterId)?.type === 'GAS') ? 'border-orange-500/50 shadow-md ring-1 ring-orange-500/20 bg-orange-500/5' : 'opacity-60'}`}
                    onClick={() => {
                        setSelectedType('GAS');
                        if (selectedMeterId !== 'all' && meters.find(m => m.id === selectedMeterId)?.type !== 'GAS') {
                            setSelectedMeterId('all');
                        }
                    }}
                >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Gas</CardTitle>
                        <Flame className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredStats.totals.GAS.toFixed(1)} m³</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Nel periodo selezionato
                        </p>
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
                                ? `Andamento giornaliero ${selectedType !== 'ALL' ? selectedType : 'aggregato'} nel periodo selezionato`
                                : `Consumo calcolato per singola lettura (${meters.find(m => m.id === selectedMeterId)?.name})`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ConsumptionChart
                                data={selectedMeterId === 'all' && selectedType === 'ALL'
                                    ? chartData 
                                    : chartData.map(d => ({ 
                                        date: d.date, 
                                        consumption: selectedType !== 'ALL' ? (d as any)[selectedType.toLowerCase()] : (d.consumption || d.elec || d.water || d.gas)
                                      }))
                                }
                                mode={selectedMeterId === 'all' ? 'aggregate' : 'single'}
                                unit={selectedMeterId !== 'all' 
                                    ? meters.find((m: any) => m.id === selectedMeterId)?.unit 
                                    : (selectedType === 'ELEC' ? 'kWh' : (selectedType === 'WATER' || selectedType === 'GAS' ? 'm³' : 'Unità'))
                                }
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
