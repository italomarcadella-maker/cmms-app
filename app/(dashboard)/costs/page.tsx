"use client";

import { useWorkOrders } from "@/lib/work-orders-context";
import { useAssets } from "@/lib/assets-context";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Euro, TrendingUp, TrendingDown, Hammer, Component } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subMonths, isSameMonth } from "date-fns";
import { it } from "date-fns/locale";

export default function CostsPage() {
    const { workOrders } = useWorkOrders();
    const { assets } = useAssets();

    // Mock constants for calculation (in real app these would be in DB)
    const HOURLY_RATE = 45; // €/hr
    const AVG_PARTS_COST = 120; // € per intervention (mock)

    // Calculate Costs
    const totalLaborHours = workOrders.reduce((acc, wo) => acc + (wo.laborLogs || []).reduce((sum, log) => sum + log.hours, 0), 0);
    const totalLaborCost = totalLaborHours * HOURLY_RATE;

    // Mock parts cost (randomly assigned to closed WOs for demo)
    const completedWOs = workOrders.filter(wo => wo.status === 'COMPLETED');
    const totalPartsCost = completedWOs.length * AVG_PARTS_COST;

    const totalMaintenanceCost = totalLaborCost + totalPartsCost;

    // Charts Data Preparation

    // 1. Costs by Asset (Top 5)
    // Map WO -> Asset -> Cost
    const assetCosts = assets.map(asset => {
        const assetWOs = workOrders.filter(wo => wo.assetId === asset.id);
        const hours = assetWOs.reduce((acc, wo) => acc + (wo.laborLogs || []).reduce((sum, log) => sum + log.hours, 0), 0);
        const parts = assetWOs.filter(wo => wo.status === 'COMPLETED').length * AVG_PARTS_COST;
        const total = (hours * HOURLY_RATE) + parts;
        return {
            name: asset.name,
            total,
            labor: hours * HOURLY_RATE,
            parts
        };
    }).sort((a, b) => b.total - a.total).slice(0, 5);

    // 2. Costs Trend (Last 6 Months)
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
        const date = subMonths(new Date(), 5 - i);
        const monthName = format(date, "MMM", { locale: it });

        // Mocking trend data slightly randomized around base values
        // ideally filtering WOs by date
        const wosInMonth = workOrders.filter(wo => isSameMonth(new Date(wo.createdAt), date));
        const monthHours = wosInMonth.reduce((acc, wo) => acc + (wo.laborLogs || []).reduce((sum, log) => sum + log.hours, 0), 0) + (Math.random() * 20); // add noise
        const monthParts = wosInMonth.length * AVG_PARTS_COST + (Math.random() * 500);

        return {
            name: monthName,
            cost: Math.round((monthHours * HOURLY_RATE) + monthParts)
        };
    });


    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Analisi Costi
                </h1>
                <p className="text-muted-foreground mt-1">Monitoraggio spese di manutenzione, manodopera e ricambi.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Costo Totale"
                    value={`€ ${totalMaintenanceCost.toLocaleString()}`}
                    icon={Euro}
                    trend="+5% vs mese scorso"
                    color="text-emerald-600"
                />
                <KPICard
                    title="Manodopera"
                    value={`€ ${totalLaborCost.toLocaleString()}`}
                    icon={Hammer}
                    sub={`${totalLaborHours} ore totali`}
                    color="text-blue-600"
                />
                <KPICard
                    title="Ricambi"
                    value={`€ ${totalPartsCost.toLocaleString()}`}
                    icon={Component}
                    sub="Stima su interventi chiusi"
                    color="text-amber-600"
                />
                <KPICard
                    title="Costo Medio / Asset"
                    value={`€ ${Math.round(totalMaintenanceCost / (assets.length || 1)).toLocaleString()}`}
                    icon={TrendingUp}
                    color="text-purple-600"
                />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Cost by Asset Chart */}
                <div className="bg-card border rounded-xl shadow-sm p-6">
                    <h3 className="font-semibold mb-6">Top 5 Asset per Costo Manutenzione</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={assetCosts} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" unit="€" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value) => `€ ${value}`} cursor={{ fill: 'transparent' }} />
                                <Legend />
                                <Bar dataKey="labor" name="Manodopera" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                <Bar dataKey="parts" name="Ricambi" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Trend Chart */}
                <div className="bg-card border rounded-xl shadow-sm p-6">
                    <h3 className="font-semibold mb-6">Andamento Spese (Semestrale)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={last6Months}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value) => `€ ${value}`} />
                                <Line type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, icon: Icon, sub, trend, color }: any) {
    return (
        <div className="p-4 rounded-xl border bg-card shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <h3 className="text-2xl font-bold mt-1">{value}</h3>
                </div>
                <div className={cn("p-2 rounded-lg bg-muted/50", color)}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            {(sub || trend) && (
                <div className="mt-2 text-xs text-muted-foreground flex gap-2">
                    {trend && <span className="text-emerald-600 font-medium">{trend}</span>}
                    {sub && <span>{sub}</span>}
                </div>
            )}
        </div>
    );
}
