"use client";

import { useState, useMemo, useEffect } from "react";
import { differenceInDays } from "date-fns";

import { usePlant } from "@/lib/plant-context";
import { cn } from "@/lib/utils";
import { getEnergyMetrics } from "@/lib/energy-actions";
import { getMeters, getEnergyStats } from "@/lib/actions";
import { EnergyDashboard } from "@/components/energy/energy-dashboard";
import { MetersList } from "@/components/energy/meters-list";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Legend, ComposedChart, Area, AreaChart,
    PieChart, Pie, Cell
} from "recharts";
import { Gauge, Leaf, TrendingDown, Bolt, BrainCircuit, AlertTriangle, ArrowRight, Wallet, Info, Calendar, Zap, Droplets, Wind, Flame } from "lucide-react";

import { BackToDashboardButton } from "@/components/ui/back-button";
import { format, subDays, parseISO } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";



export default function SustainabilityDashboard() {
    const { activePlant } = usePlant();
    const [metrics, setMetrics] = useState<any>(null);
    const [meters, setMeters] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [activeInsight, setActiveInsight] = useState(0);
    const [chartType, setChartType] = useState<'kwh' | 'water' | 'co2' | 'gas'>('kwh');
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
        start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });


    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        setIsLoading(true);
        
        const days = differenceInDays(parseISO(dateRange.end), parseISO(dateRange.start));

        Promise.all([
            getEnergyMetrics(activePlant?.id, dateRange.start, dateRange.end),
            getMeters(),
            getEnergyStats(days > 0 ? days : 30) // Fallback to days for stats 
        ]).then(([metricsData, metersData, statsData]) => {
            setMetrics(metricsData);
            setMeters(metersData);
            setStats(statsData);
            setIsLoading(false);
        }).catch(err => {
            console.error("Dashboard data load error:", err);
            setIsLoading(false);
        });
    }, [activePlant?.id, dateRange.start, dateRange.end]);


    const insights = metrics?.aiInsights || [];

    useEffect(() => {
        if (!insights || insights.length <= 1) return;
        const interval = setInterval(() => {
            setActiveInsight((prev: number) => (prev + 1) % insights.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [insights?.length]);


    // Only show full-page skeleton on INITIAL load (metrics null)
    if (!isMounted || (isLoading && !metrics)) {
        return (
            <div className="space-y-6 animate-pulse p-8">
                <div className="h-8 w-64 bg-slate-200 rounded"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                    {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-200 rounded-[2rem]"></div>)}
                </div>
                <div className="h-[400px] bg-slate-200 rounded-[2.5rem] mt-10"></div>
            </div>
        );
    }


    const hasNoDataAtAll = !metrics || !metrics.hasReadingsHistory;
    const hasNoDataInPeriod = metrics && metrics.totalKwh === 0 && metrics.totalWater === 0 && (!metrics.chartData || metrics.chartData.length === 0);
    const rangeDays = differenceInDays(parseISO(dateRange.end), parseISO(dateRange.start));

    if (hasNoDataAtAll || (hasNoDataInPeriod && rangeDays <= 30)) {


        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
                            <Leaf className="h-8 w-8 text-emerald-500" />
                            Sostenibilità & Energy Management
                        </h1>
                        <p className="text-slate-500 mt-2">Monitoraggio consumi energetici, emissioni CO₂ e ottimizzazioni AI.</p>
                    </div>
                    <BackToDashboardButton />
                </div>
                
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center">
                    <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Zap className="h-10 w-10 text-indigo-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">
                        {hasNoDataAtAll ? "Nessun dato disponibile" : "Nessuna lettura negli ultimi 30 giorni"}
                    </h2>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto">
                        {hasNoDataAtAll 
                            ? "Inizia inserendo le letture dei contatori o collegando i log energetici della pianta per visualizzare analisi e trend."
                            : "Esistono letture nel passato, ma non nel periodo attuale. Prova ad espandere la visualizzazione per vedere i trend storici."
                        }
                    </p>
                    <div className="mt-8 flex justify-center gap-4">
                        <button 
                            onClick={() => setDateRange({
                                start: format(subDays(new Date(), 365), 'yyyy-MM-dd'),
                                end: format(new Date(), 'yyyy-MM-dd')
                            })} 
                            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
                        >
                            Visualizza l'ultimo anno
                        </button>
                    </div>

                </div>
            </div>
        );
    }


    if (!metrics) return null;

    const formattedCosts = metrics?.estimatedCosts?.total?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0";
    const formattedTotalCo2 = metrics?.totalCo2?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0";
    const savings = metrics?.savingsPercent?.toFixed(1) || "0.0";

    const scoreValue = metrics?.sustainabilityScore || 0;
    const scoreData = [
        { name: 'Score', value: scoreValue, fill: (scoreValue > 80 ? '#10b981' : scoreValue > 60 ? '#f59e0b' : '#ef4444') },
        { name: 'Remaining', value: 100 - scoreValue, fill: '#f1f5f9' }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <Leaf className="h-10 w-10 text-emerald-500" />
                            Sostenibilità & AI
                        </h1>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full animate-in fade-in slide-in-from-left-4 duration-1000">
                             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Sistema Online</span>
                        </div>
                    </div>
                    <p className="text-slate-500 mt-2 font-medium">Monitoraggio consumi reali e analisi d'impatto ambientale dai log di macchina.</p>

                <BackToDashboardButton />
            </div>

            {/* Premium Header: Score Card & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col md:flex-row">
                    <div className="p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/30">
                        <div className="flex items-center justify-between mb-1">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-1 cursor-help underline decoration-dotted decoration-slate-300">
                                            Eco Score <Info className="h-4 w-4 text-slate-400" />
                                        </h3>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[300px] p-4 bg-white shadow-2xl border-slate-200">
                                        <p className="font-medium text-slate-800 mb-1">Criterio di Calcolo</p>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            L'Eco Score valuta l'efficienza energetica confrontando i consumi attuali con i benchmark storici. 
                                            Un punteggio elevato indica un utilizzo ottimale delle risorse e ridotti picchi di carico.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <p className="text-sm text-slate-500 mb-8 font-medium italic">Basato su efficienza reale</p>


                        
                        <div className="relative h-48 w-48 mx-auto">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={scoreData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={90}
                                        startAngle={225}
                                        endAngle={-45}
                                        paddingAngle={0}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={10}
                                    >
                                        {scoreData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-5xl font-black text-slate-900 tracking-tighter">{metrics.sustainabilityScore}</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Sostenibilità</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-10 flex-1 flex items-center justify-center">
                        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 w-full">
                            <h4 className="text-emerald-900 font-bold mb-2 flex items-center gap-2">
                                <Leaf className="h-5 w-5 text-emerald-500" />
                                Monitoraggio Ottimizzato
                            </h4>
                            <p className="text-emerald-700 text-sm font-medium">
                                Le analisi correnti sono calcolate esclusivamente sulla base delle letture reali dei contatori per la massima precisione.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 p-10 rounded-[2rem] shadow-2xl text-white flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-[-2rem] right-[-2rem] p-4 opacity-5 group-hover:opacity-10 transition-all duration-700 group-hover:scale-125 rotate-12">
                        <Leaf className="h-64 w-64" />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <p className="text-emerald-400 font-black text-xs uppercase tracking-[0.3em] flex items-center gap-2 cursor-help border-b border-white/10 pb-1">
                                            <Leaf className="h-4 w-4" /> Impatto Carbonico
                                        </p>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[350px] p-4 bg-slate-900 text-white border-slate-700">
                                        <div className="space-y-3">
                                            <div>
                                                <p className="font-bold text-emerald-400 text-xs uppercase mb-1">Alberi Piantati</p>
                                                <p className="text-xs text-slate-300">1 albero assorbe mediamente 20kg di CO2 all'anno. Questo dato visualizza l'equivalente boschivo necessario per compensare le emissioni.</p>
                                            </div>
                                            <div>
                                                <p className="font-bold text-emerald-400 text-xs uppercase mb-1">KG di CO2</p>
                                                <p className="text-xs text-slate-300">Il calcolo si basa sul mix energetico nazionale: ogni kWh consumato produce circa 0.44kg di CO2.</p>
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <div className="text-6xl font-black mb-3 tracking-tighter">{formattedTotalCo2} <span className="text-2xl font-light opacity-50">kg</span></div>
                        <p className="text-lg font-medium text-slate-300 leading-tight">Emissioni stimate nel periodo selezionato</p>
                    </div>


                    
                    <div className="relative z-10 mt-10 pt-8 border-t border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
                                <Leaf className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Equivalenza Green</p>
                                <p className="text-sm font-medium">Circa <strong>{((metrics?.totalCo2 || 0) / 21).toFixed(0)} alberi</strong> piantati.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>            {/* Main Stats Cluster */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-all group">
                    <div className="p-3 bg-slate-100 text-slate-900 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Gauge className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Media Giornaliera ({rangeDays}d)</p>
                        <div className="flex items-baseline gap-2">
                            <div className="text-3xl font-black text-slate-900 tracking-tighter">{metrics.averageKwh?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            <span className="text-[10px] font-bold text-slate-400">kWh/d</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-all group">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Bolt className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Energia Totale</p>
                        <div className="flex items-baseline gap-2">
                            <div className="text-3xl font-black text-slate-900 tracking-tighter">{(metrics.totalKwh || 0).toLocaleString()}</div>
                            <span className="text-[10px] font-bold text-slate-400 font-mono">kWh</span>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Dati in tempo reale</span>
                        </div>
                    </div>

                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-all group">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl group-hover:bg-orange-600 group-hover:text-white transition-colors">
                        <Flame className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gas Totale</p>
                        <div className="flex items-baseline gap-2">
                            <div className="text-3xl font-black text-slate-900 tracking-tighter">{(metrics.totalGas || 0).toLocaleString()}</div>
                            <span className="text-[10px] font-bold text-slate-400 font-mono">m³</span>
                        </div>
                    </div>
                </div>
            </div>


            {/* AI Contextual Insights */}
            {insights.length > 0 && (
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                                <BrainCircuit className="h-6 w-6" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Analisi Dinamiche AI</h3>
                        </div>

                        <div className="flex gap-2 bg-slate-200/50 p-1.5 rounded-full">
                            {insights.map((_: any, i: number) => (
                                <button 
                                    key={i} 
                                    onClick={() => setActiveInsight(i)}
                                    className={cn(
                                        "h-2 rounded-full transition-all duration-500",
                                        activeInsight === i ? "w-10 bg-indigo-600 shadow-sm" : "w-2 bg-slate-400/30 hover:bg-slate-400"
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/40 min-h-[220px] transition-all" key={activeInsight}>
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className={cn(
                                "p-6 rounded-2xl h-fit border shrink-0",
                                insights[activeInsight]?.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-600' : 
                                insights[activeInsight]?.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600'
                            )}>
                                {insights[activeInsight]?.type === 'warning' ? <AlertTriangle className="h-10 w-10" /> : <BrainCircuit className="h-10 w-10" />}
                            </div>
                            
                            <div className="flex-1 space-y-6">
                                <div>
                                    <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{insights[activeInsight]?.title}</h4>
                                    <p className="text-slate-600 text-lg leading-relaxed font-medium">{insights[activeInsight]?.content}</p>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Azione Analizzata</p>
                                        <p className="text-lg font-bold text-indigo-700">{insights[activeInsight]?.suggestion}</p>
                                    </div>
                                    <div className="space-y-1 sm:text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Impatto Economico</p>
                                        <div className="text-2xl font-black text-emerald-600 flex items-center gap-2 sm:justify-end">
                                            <TrendingDown className="h-6 w-6" /> {insights[activeInsight]?.savings}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Interactive Chart */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12">
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Monitoraggio Analitico</h3>
                        <p className="text-slate-500 font-medium mt-1 italic">Analisi dettagliata prelievi da contatore</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 bg-slate-50 p-2 rounded-[1.5rem] border border-slate-100">
                        <div className="flex gap-1 p-1 bg-white rounded-xl shadow-sm">
                            {[
                                { id: 'kwh', label: 'Energia', icon: Zap, color: 'text-amber-500' },
                                { id: 'water', label: 'Acqua', icon: Droplets, color: 'text-blue-500' },
                                { id: 'gas', label: 'Gas', icon: Flame, color: 'text-orange-500' }
                            ].map(type => (

                                <button
                                    key={type.id}
                                    onClick={() => setChartType(type.id as any)}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-black transition-all",
                                        chartType === type.id 
                                            ? "bg-slate-900 text-white shadow-lg" 
                                            : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <type.icon className={cn("h-4 w-4", chartType === type.id ? "text-white" : type.color)} />
                                    {type.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex items-center gap-2 p-1 bg-white rounded-xl shadow-sm border border-slate-100 min-h-[46px]">
                            <div className="flex items-center gap-1 px-3 border-r border-slate-100">
                                <Calendar className="h-4 w-4 text-indigo-500" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Periodo</span>
                            </div>
                            <div className="flex items-center px-2">
                                <Input 
                                    type="date" 
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    className="h-8 w-[140px] border-none bg-transparent text-sm font-bold text-slate-700 focus-visible:ring-0"
                                />
                                <span className="text-slate-300 mx-1">—</span>
                                <Input 
                                    type="date" 
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    className="h-8 w-[140px] border-none bg-transparent text-sm font-bold text-slate-700 focus-visible:ring-0"
                                />
                            </div>
                        </div>


                    </div>
                </div>

                <div className="h-[450px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(val) => new Date(val).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                axisLine={false}
                                tickLine={false}
                                dy={15}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                axisLine={false}
                                tickLine={false}
                                dx={-15}
                            />
                            <RechartsTooltip
                                contentStyle={{ 
                                    borderRadius: '24px', 
                                    border: 'none', 
                                    padding: '20px',
                                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                                    background: '#0f172a',
                                    color: '#f8fafc'
                                }}
                                itemStyle={{ color: '#f8fafc', fontWeight: 800, fontSize: '14px' }}
                                labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}
                                labelFormatter={(val) => new Date(val).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            />
                            <Line 
                                type="monotone" 
                                dataKey={chartType} 
                                stroke={chartType === 'kwh' ? '#f59e0b' : chartType === 'water' ? '#3b82f6' : '#f97316'} 
                                strokeWidth={4} 
                                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                                name={chartType === 'kwh' ? 'Consumo (kWh)' : chartType === 'water' ? 'Acqua (m³)' : 'Gas (m³)'} 
                                animationDuration={1000}
                                strokeLinecap="round"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Injected Detailed Energy Monitor */}
            {stats && meters && (
                <div className="mt-12 space-y-12">
                     <div className="pt-8 border-t border-slate-200">
                        <div className="mb-6 flex items-center gap-2">
                            <Gauge className="h-6 w-6 text-indigo-600" />
                            <h2 className="text-2xl font-bold tracking-tight text-slate-800">Gestione Contatori (Meters)</h2>
                        </div>
                        <MetersList initialMeters={meters} />
                    </div>

                    <div className="pt-8 border-t border-slate-200">
                        <div className="mb-6 flex items-center gap-2">
                            <Gauge className="h-6 w-6 text-indigo-600" />
                            <h2 className="text-2xl font-bold tracking-tight text-slate-800">Dettaglio Monitoraggio Energetico</h2>
                        </div>
                        <EnergyDashboard 
                            stats={stats} 
                            meters={meters} 
                            externalDateRange={dateRange}
                        />
                    </div>
                </div>
            )}

        </div>
    );
}
