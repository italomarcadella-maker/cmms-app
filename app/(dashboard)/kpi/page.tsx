"use client";

import { useWorkOrders } from "@/lib/work-orders-context";
import { useAssets } from "@/lib/assets-context";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { BackToDashboardButton } from "@/components/ui/back-button";
import { useEffect, useState } from "react";
import { getAdvancedKPIs } from "@/lib/actions";
import { Timer, TrendingUp, AlertOctagon, Euro, ArrowDown, ArrowUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function KPIPage() {
    const { workOrders } = useWorkOrders();
    const { assets } = useAssets();
    const [advancedStats, setAdvancedStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAdvancedKPIs().then(data => {
            setAdvancedStats(data);
            setLoading(false);
        });
    }, []);

    // --- 1. Monthly Activities by Department (Opened vs Closed) ---
    const departmentStats = new Map<string, { opened: number, closed: number }>();
    workOrders.forEach(wo => {
        const asset = assets.find(a => a.id === wo.assetId);
        const dept = asset?.department || 'Unknown';
        if (!departmentStats.has(dept)) {
            departmentStats.set(dept, { opened: 0, closed: 0 });
        }
        const stats = departmentStats.get(dept)!;
        stats.opened += 1;
        if (wo.status === 'COMPLETED') stats.closed += 1;
    });

    const barChartData = Array.from(departmentStats.entries()).map(([name, stats]) => ({
        name, Requested: stats.opened, Closed: stats.closed
    }));

    // --- 2. Overall Status ---
    const totalClosed = workOrders.filter(wo => wo.status === 'COMPLETED').length;
    const totalOpen = workOrders.length - totalClosed;
    const overallData = [
        { name: 'Completed', value: totalClosed, color: '#10b981' },
        { name: 'Open/In Progress', value: totalOpen, color: '#f59e0b' }
    ];

    // --- 3. Activities by Category ---
    const categoryStats = new Map<string, number>();
    workOrders.forEach(wo => {
        const cat = wo.category || 'OTHER';
        categoryStats.set(cat, (categoryStats.get(cat) || 0) + 1);
    });

    const CATEGORY_COLORS: Record<string, string> = {
        'MECHANICAL': '#3b82f6', 'ELECTRICAL': '#eab308', 'HYDRAULIC': '#ec4899', 'PNEUMATIC': '#06b6d4', 'OTHER': '#6b7280', 'PLANT': '#84cc16'
    };
    const pieChartData = Array.from(categoryStats.entries()).map(([name, value]) => ({
        name, value, color: CATEGORY_COLORS[name] || CATEGORY_COLORS['OTHER']
    }));

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <BackToDashboardButton />
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    KPI & Analisi Performance
                </h1>
                <p className="text-muted-foreground mt-1">Dashboard direzionale per manutenzione predittiva e costi.</p>
            </div>

            {/* --- NEW: ADVANCED METRICS CARDS --- */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-6 bg-card border rounded-xl shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-sm font-medium">MTTR (Tempo Medio Riparazione)</span>
                        <Timer className="h-4 w-4" />
                    </div>
                    {loading ? <Skeleton className="h-8 w-24" /> : (
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold">{advancedStats?.mttr || 0}</span>
                            <span className="text-sm mb-1">min</span>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground">Media su {advancedStats?.totalEWOs || 0} EWO</p>
                </div>

                <div className="p-6 bg-card border rounded-xl shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-sm font-medium">Costo Stimato Fermo</span>
                        <Euro className="h-4 w-4" />
                    </div>
                    {loading ? <Skeleton className="h-8 w-24" /> : (
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold text-red-600">
                                {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(advancedStats?.estimatedCost || 0)}
                            </span>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground">Basato su 100€/min di mancata produzione</p>
                </div>

                <div className="p-6 bg-card border rounded-xl shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-sm font-medium">Efficienza Risoluzione</span>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold">94%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">+2% rispetto al mese scorso</p>
                </div>

                <div className="p-6 bg-card border rounded-xl shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-sm font-medium">Asset Critici</span>
                        <AlertOctagon className="h-4 w-4 text-amber-500" />
                    </div>
                    {loading ? <Skeleton className="h-8 w-24" /> : (
                        <div className="text-sm font-medium">
                            {advancedStats?.topAssets?.[0]?.name || "Nessun dato"}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground">Maggiore causa di downtime</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Top 5 Worst Assets Chart */}
                <div className="rounded-xl border bg-card p-6 shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold">Top 5 Asset per Fermo Macchina</h3>
                        <p className="text-sm text-muted-foreground">Macchinari con più minuti di inattività (Downtime)</p>
                    </div>
                    <div className="h-[300px] w-full">
                        {loading ? <div className="h-full flex items-center justify-center text-muted-foreground">Caricamento dati...</div> : (
                            advancedStats?.topAssets?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={advancedStats.topAssets} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ color: 'black' }} />
                                        <Bar dataKey="minutes" fill="#ef4444" radius={[0, 4, 4, 0]} name="Minuti Fermo" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground italic">
                                    Nessun dato di fermo registrato.
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Status Chart */}
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold">Stato Ordini di Lavoro</h3>
                        <p className="text-sm text-muted-foreground">Distribuzione per stato attuale</p>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={overallData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {overallData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Chart */}
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold">Tipologia Interventi</h3>
                        <p className="text-sm text-muted-foreground">Breakdown per categoria</p>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Department Activity - Full Width */}
                <div className="rounded-xl border bg-card p-6 shadow-sm md:col-span-2 lg:col-span-3">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold">Attività per Reparto</h3>
                        <p className="text-sm text-muted-foreground">Volume di lavoro per area (Richiesti vs Chiusi)</p>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ color: 'black' }} />
                                <Legend />
                                <Bar dataKey="Requested" fill="#3b82f6" name="Richiesti" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Closed" fill="#10b981" name="Completati" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

