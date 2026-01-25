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
// Note: We'll style simple cards inline if reusable components aren't perfectly fit, 
// but let's try to simulate a clean structure.

export default function KPIPage() {
    const { workOrders } = useWorkOrders();
    const { assets } = useAssets();

    // --- 1. Monthly Activities by Department (Opened vs Closed) ---
    // In a real app, we'd filter by selected month. Here we assume "last month" or just all data for demo.
    // We need to join WorkOrders -> Assets -> Department.

    const departmentStats = new Map<string, { opened: number, closed: number }>();

    workOrders.forEach(wo => {
        const asset = assets.find(a => a.id === wo.assetId);
        const dept = asset?.department || 'Unknown';

        if (!departmentStats.has(dept)) {
            departmentStats.set(dept, { opened: 0, closed: 0 });
        }

        const stats = departmentStats.get(dept)!;
        stats.opened += 1; // Count all as "requested/opened" at some point
        if (wo.status === 'COMPLETED') {
            stats.closed += 1;
        }
    });

    const barChartData = Array.from(departmentStats.entries()).map(([name, stats]) => ({
        name,
        Requested: stats.opened,
        Closed: stats.closed
    }));

    // --- 2. Overall Status (Total Open vs Closed) ---
    const totalClosed = workOrders.filter(wo => wo.status === 'COMPLETED').length;
    const totalOpen = workOrders.length - totalClosed;
    const overallData = [
        { name: 'Completed', value: totalClosed, color: '#10b981' }, // emerald-500
        { name: 'Open/In Progress', value: totalOpen, color: '#f59e0b' } // amber-500
    ];

    // --- 3. Activities by Category (Pie Chart) ---
    const categoryStats = new Map<string, number>();
    workOrders.forEach(wo => {
        const cat = wo.category || 'OTHER';
        categoryStats.set(cat, (categoryStats.get(cat) || 0) + 1);
    });

    const CATEGORY_COLORS: Record<string, string> = {
        'MECHANICAL': '#3b82f6', // blue-500
        'ELECTRICAL': '#eab308', // yellow-500
        'HYDRAULIC': '#ec4899',  // pink-500
        'PNEUMATIC': '#06b6d4',  // cyan-500
        'OTHER': '#6b7280',      // gray-500
        'PLANT': '#84cc16'       // lime-500
    };

    const pieChartData = Array.from(categoryStats.entries()).map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name] || CATEGORY_COLORS['OTHER']
    }));


    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    KPI & Analisi Performance
                </h1>
                <p className="text-muted-foreground mt-1">Panoramica dello stato di manutenzione e metriche chiave.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Status Chart */}
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold">Stato Ordini di Lavoro</h3>
                        <p className="text-sm text-muted-foreground">Distribuzione per stato attuale</p>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={overallData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {overallData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Chart */}
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold">Tipologia Interventi</h3>
                        <p className="text-sm text-muted-foreground">Breakdown per categoria di lavoro</p>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Department Activity */}
                <div className="rounded-xl border bg-card p-6 shadow-sm md:col-span-2 lg:col-span-1">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold">Attività per Reparto</h3>
                        <p className="text-sm text-muted-foreground">Volume di lavoro per area</p>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={80} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Ordini" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>
    );
}

