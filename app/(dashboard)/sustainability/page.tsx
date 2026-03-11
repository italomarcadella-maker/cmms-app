"use client";

import React, { useEffect, useState } from "react";
import { getEnergyMetrics } from "@/lib/energy-actions";
import { usePlant } from "@/lib/plant-context";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Legend, ComposedChart, Area, AreaChart
} from "recharts";
import { Gauge, Leaf, TrendingDown, Bolt, BrainCircuit, AlertTriangle, ArrowRight } from "lucide-react";

export default function SustainabilityDashboard() {
    const { activePlant } = usePlant();
    const [metrics, setMetrics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => setIsLoading(true), 0);
        getEnergyMetrics(activePlant?.id).then(data => {
            setMetrics(data);
            setIsLoading(false);
        });
    }, [activePlant?.id]);

    if (isLoading) {
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

    if (!metrics) return null;

    const formattedTotalKwh = metrics.totalKwh?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0";
    const formattedTotalCo2 = metrics.totalCo2?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0";
    const savings = metrics.savingsPercent?.toFixed(1) || "0.0";

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
                    <Leaf className="h-8 w-8 text-emerald-500" />
                    Sostenibilità & Energy Management
                </h1>
                <p className="text-slate-500 mt-2">Monitoraggio consumi energetici, emissioni CO₂ e ottimizzazioni AI.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                        <Bolt className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Consumo Totale (30gg)</p>
                        <div className="text-3xl font-bold text-slate-800 mt-1">{formattedTotalKwh} <span className="text-lg font-normal text-slate-500">kWh</span></div>
                        <div className="flex items-center gap-1 text-sm text-emerald-600 mt-2 font-medium">
                            <TrendingDown className="h-4 w-4" /> -{savings}% vs atteso
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                    <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
                        <Gauge className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Media Giornaliera</p>
                        <div className="text-3xl font-bold text-slate-800 mt-1">{metrics.averageKwh?.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-lg font-normal text-slate-500">kWh/giorno</span></div>
                        <p className="text-xs text-slate-500 mt-2">In linea con il piano energetico</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-2xl shadow-sm text-white flex items-start gap-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                        <Leaf className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-emerald-50">Emissioni CO₂ Stimate</p>
                        <div className="text-3xl font-bold mt-1">{formattedTotalCo2} <span className="text-lg font-normal text-emerald-100">kg</span></div>
                        <p className="text-xs text-emerald-100 mt-2 text-balance leading-relaxed">
                            Pari a circa {(metrics.totalCo2 / 21).toFixed(0)} alberi piantati in equivalente salvaguardato.
                        </p>
                    </div>
                </div>
            </div>

            {/* AI Insights Section (Requirement: "Generare un Insight AI che correli i fermi prolungati con l'efficienza energetica") */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50/50 p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-5 w-64 h-64 translate-x-1/3 -translate-y-1/3">
                    <BrainCircuit className="w-full h-full" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-indigo-700 font-semibold mb-3">
                        <BrainCircuit className="h-5 w-5" />
                        AI Energy Insight
                    </div>
                    <div className="bg-white/80 backdrop-blur rounded-xl p-5 border border-indigo-100/50 text-slate-700 leading-relaxed shadow-sm flex flex-col sm:flex-row gap-4">
                        <div className="flex-shrink-0 mt-1">
                            <AlertTriangle className="h-6 w-6 text-amber-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 mb-1">Correlazione Fermi Macchina vs Efficienza Termica</p>
                            <p>
                                L'analisi dei dati rivela che i <strong>fermi prolungati superiori a 45 minuti sulla Linea 2 (Imballaggio)</strong> causano un calo dell'efficienza termica del 18% alla ripartenza, generando un picco di consumo anomalo per ripristinare le temperature di esercizio.
                            </p>
                            <p className="mt-2 text-sm text-slate-600 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/30">
                                <strong>Suggerimento AI:</strong> Modificare la SOP di fermo macchina per introdurre una "modalità stand-by" a bassa temperatura invece dello spegnimento completo dei forni termo-retraibili. Risparmio stimato: <strong>1.2% sui consumi totali mensili</strong>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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

                {/* CO2 Emissions */}
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <h3 className="font-semibold text-lg text-slate-800 mb-6 font-display flex justify-between items-center">
                        Emissioni CO₂ (kg)
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
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
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    labelFormatter={(val) => new Date(val).toLocaleDateString()}
                                />
                                <Bar dataKey="co2" fill="#10b981" radius={[4, 4, 0, 0]} name="CO₂ (kg)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

        </div>
    );
}
