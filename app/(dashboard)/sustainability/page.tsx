"use client";

import { useState, useMemo, useEffect } from "react";
import { usePlant } from "@/lib/plant-context";
import { cn } from "@/lib/utils";
import { getEnergyMetrics } from "@/lib/energy-actions";
import { getMeters, getEnergyStats } from "@/lib/actions";
import { EnergyDashboard } from "@/components/energy/energy-dashboard";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Legend, ComposedChart, Area, AreaChart,
    PieChart, Pie, Cell
} from "recharts";
import { Gauge, Leaf, TrendingDown, Bolt, BrainCircuit, AlertTriangle, ArrowRight, Wallet, Info, Calendar, Zap, Droplets, Wind } from "lucide-react";

import { BackToDashboardButton } from "@/components/ui/back-button";

export default function SustainabilityDashboard() {
    const { activePlant } = usePlant();
    const [metrics, setMetrics] = useState<any>(null);
    const [meters, setMeters] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [activeInsight, setActiveInsight] = useState(0);
    const [chartType, setChartType] = useState<'kwh' | 'water' | 'co2'>('kwh');
    const [period, setPeriod] = useState(30);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        setIsLoading(true);
        
        Promise.all([
            getEnergyMetrics(activePlant?.id, period),
            getMeters(),
            getEnergyStats()
        ]).then(([metricsData, metersData, statsData]) => {
            setMetrics(metricsData);
            setMeters(metersData);
            setStats(statsData);
            setIsLoading(false);
        }).catch(err => {
            console.error("Dashboard data load error:", err);
            setIsLoading(false);
        });
    }, [activePlant?.id, period]);

    const insights = metrics?.aiInsights || [];

    useEffect(() => {
        if (!insights || insights.length <= 1) return;
        const interval = setInterval(() => {
            setActiveInsight(prev => (prev + 1) % insights.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [insights?.length]);

    if (!isMounted || isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 w-64 bg-slate-200 rounded"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>)}
                </div>
                <div className="h-[400px] bg-slate-200 rounded-xl"></div>
            </div>
        );
    }

    const hasNoData = !metrics || (metrics.totalKwh === 0 && metrics.totalWater === 0 && (!metrics.chartData || metrics.chartData.length === 0));

    if (hasNoData) {
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
                    <h2 className="text-2xl font-bold text-slate-800">Nessun dato disponibile nel periodo</h2>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto">
                        Inizia inserendo le letture dei contatori o collegando i log energetici della pianta per visualizzare analisi e trend.
                    </p>
                    <div className="mt-8 flex justify-center gap-4">
                        <button onClick={() => setPeriod(90)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">
                            Prova un periodo più lungo
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

            {/* Premium Header: Score Card & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
                    <div className="p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Sustainability Score</h3>
                        <p className="text-sm text-slate-500 mb-6">Valutazione complessiva efficienza</p>
                        
                        <div className="relative h-40 w-40 mx-auto">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={scoreData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        startAngle={180}
                                        endAngle={-180}
                                        paddingAngle={0}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {scoreData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-extrabold text-slate-800">{metrics.sustainabilityScore}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Punteggio</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-8 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Costo Periodo Stimato ({period}g)</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-800">€{formattedCosts}</span>
                                <span className="text-indigo-600 text-sm font-bold flex items-center">
                                    <TrendingDown className="h-3 w-3 mr-0.5" /> {savings}%
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Dati basati sui consumi reali</p>
                        </div>
                        
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Consumo Idrico Periodo</p>
                            <div className="flex items-baseline gap-2 text-blue-600">
                                <span className="text-3xl font-black">{(metrics?.totalWater || 0).toLocaleString()} <span className="text-xl">m³</span></span>
                                <Droplets className="h-5 w-5 opacity-50" />
                            </div>
                            <p className="text-xs text-slate-500 mt-2 italic flex items-center gap-1">
                                <Info className="h-3 w-3" /> Letture ultimi {period} giorni
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 rounded-2xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Leaf className="h-32 w-32" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-emerald-100 font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                             <TrendingDown className="h-4 w-4" /> Impatto Ambientale
                        </p>
                        <div className="text-5xl font-black mb-2">{formattedTotalCo2} <span className="text-xl font-normal opacity-70">kg</span></div>
                        <p className="text-lg font-medium text-emerald-50 leading-tight">CO₂ evitata nel periodo</p>
                    </div>
                    
                    <div className="relative z-10 mt-8 pt-6 border-t border-white/20">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <Leaf className="h-5 w-5" />
                            </div>
                            <p className="text-sm">Equivale a <strong>{((metrics?.totalCo2 || 0) / 21).toFixed(0)} alberi</strong> salvati.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards Row (Stats Detail) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-indigo-300 transition-colors">
                    <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
                        <Gauge className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Media Giornaliera (Ultimi 30gg)</p>
                        <div className="flex items-baseline gap-2">
                            <div className="text-3xl font-bold text-slate-800 mt-1">{metrics.averageKwh?.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-lg font-normal text-slate-500">kWh/giorno</span></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full w-fit font-medium">In linea con il piano energetico</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-indigo-300 transition-colors">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Bolt className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Consumo Totale Periodo</p>
                        <div className="text-3xl font-bold text-slate-800 mt-1">{(metrics.totalKwh).toLocaleString()} <span className="text-lg font-normal text-slate-500">kWh</span></div>
                        <p className="text-xs text-slate-500 mt-2">Risparmio stimato del {savings}%</p>
                    </div>
                </div>
            </div>

            {/* AI Insights Carousel */}
            {insights.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50/50 p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden min-h-[220px]">
                    <div className="absolute right-0 top-0 opacity-5 w-64 h-64 translate-x-1/3 -translate-y-1/3 grayscale">
                        <BrainCircuit className="w-full h-full" />
                    </div>

                    <div className="relative z-10 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-indigo-700 font-bold uppercase tracking-wider text-xs">
                                <BrainCircuit className="h-5 w-5" />
                                AI Energy Insights
                            </div>
                            <div className="flex gap-1">
                                {insights.map((_: any, i: number) => (
                                    <button 
                                        key={i} 
                                        onClick={() => setActiveInsight(i)}
                                        className={cn(
                                            "h-1.5 rounded-full transition-all",
                                            activeInsight === i ? "w-6 bg-indigo-600" : "w-1.5 bg-indigo-200"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-white shadow-sm flex-1 animate-in fade-in slide-in-from-right-4 duration-700 ease-out" key={activeInsight}>
                            <div className="flex gap-4">
                                <div className={cn(
                                    "p-3 rounded-full h-fit",
                                    insights[activeInsight % insights.length]?.type === 'critical' ? 'bg-red-100 text-red-600' : 
                                    insights[activeInsight % insights.length]?.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                                )}>
                                    {insights[activeInsight % insights.length]?.type === 'critical' ? <AlertTriangle className="h-6 w-6" /> : <BrainCircuit className="h-6 w-6" />}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-900 mb-1">{(insights[activeInsight % insights.length] as any).title}</h4>
                                    <p className="text-sm text-slate-600 mb-4 leading-relaxed">{(insights[activeInsight % insights.length] as any).content}</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                        <div className="text-sm">
                                            <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Azione Suggerita</span>
                                            <p className="font-medium text-indigo-700">{(insights[activeInsight % insights.length] as any).suggestion}</p>
                                        </div>
                                        <div className="text-sm">
                                            <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">Risparmio Stimato</span>
                                            <p className="font-bold text-emerald-600 flex items-center gap-1">
                                                <TrendingDown className="h-4 w-4" /> {(insights[activeInsight % insights.length] as any).savings}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Section with Selectors */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Analisi Trend Consumi</h3>
                        <p className="text-sm text-slate-500 mt-1">Seleziona parametro e intervallo temporale.</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl">
                        {[
                            { id: 'kwh', label: 'Elettricità', icon: Zap, color: 'text-amber-500' },
                            { id: 'water', label: 'Acqua', icon: Droplets, color: 'text-blue-500' },
                            { id: 'co2', label: 'CO₂', icon: Leaf, color: 'text-emerald-500' }
                        ].map(type => (
                            <button
                                key={type.id}
                                onClick={() => setChartType(type.id as any)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                    chartType === type.id 
                                        ? "bg-white text-slate-800 shadow-sm" 
                                        : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <type.icon className={cn("h-4 w-4", type.color)} />
                                {type.label}
                            </button>
                        ))}
                        <div className="w-[1px] bg-slate-200 mx-2 h-6 self-center" />
                        {[
                            { id: 7, label: '7g' },
                            { id: 30, label: '30g' },
                            { id: 90, label: '90g' }
                        ].map(p => (
                            <button
                                key={p.id}
                                onClick={() => setPeriod(p.id)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                    period === p.id 
                                        ? "bg-indigo-600 text-white shadow-sm" 
                                        : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics.chartData}>
                            <defs>
                                <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={chartType === 'kwh' ? '#f59e0b' : chartType === 'water' ? '#3b82f6' : '#10b981'} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={chartType === 'kwh' ? '#f59e0b' : chartType === 'water' ? '#3b82f6' : '#10b981'} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(val) => new Date(val).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                dx={-10}
                            />
                            <RechartsTooltip
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                                labelFormatter={(val) => new Date(val).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                            />
                            <Area 
                                type="monotone" 
                                dataKey={chartType} 
                                stroke={chartType === 'kwh' ? '#f59e0b' : chartType === 'water' ? '#3b82f6' : '#10b981'} 
                                strokeWidth={4} 
                                fillOpacity={1} 
                                fill="url(#colorMain)" 
                                name={chartType === 'kwh' ? 'Elettricità (kWh)' : chartType === 'water' ? 'Acqua (m³)' : 'CO₂ (kg)'} 
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 hidden">

                {/* Consumo Trend */}
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <h3 className="font-semibold text-lg text-slate-800 mb-6 font-display flex justify-between items-center">
                        Andamento Consumi (kWh)
                        <span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded-md text-slate-500">Ultimi 30 giorni</span>
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={metrics.chartData}>
                                <defs>
                                    <linearGradient id="colorKwh" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    dx={-10}
                                />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    labelFormatter={(val) => new Date(val).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                                />
                                <Area type="monotone" dataKey="kwh" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorKwh)" name="Consumo (kWh)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* Injected Detailed Energy Monitor */}
            {stats && meters && (
                <div className="mt-12 pt-8 border-t border-slate-200">
                    <div className="mb-6 flex items-center gap-2">
                        <Gauge className="h-6 w-6 text-indigo-600" />
                        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Dettaglio Monitoraggio Energetico (Meters)</h2>
                    </div>
                    <EnergyDashboard stats={stats} meters={meters} />
                </div>
            )}
        </div>
    );
}
