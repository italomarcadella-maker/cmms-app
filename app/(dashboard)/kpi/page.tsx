"use client";

import { useEffect, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { AlertOctagon, Euro, Timer, TrendingUp } from "lucide-react";

import { useWorkOrders } from "@/lib/work-orders-context";
import { useAssets } from "@/lib/assets-context";
import { getAdvancedKPIs } from "@/lib/actions";
import { categoryColor, chartColors } from "@/lib/chart-colors";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

const tooltipStyle = { borderRadius: 8, border: `1px solid ${chartColors.grid}`, fontSize: 12 };

const CATEGORY_LABELS: Record<string, string> = {
    MECHANICAL: "Meccanica",
    ELECTRICAL: "Elettrica",
    HYDRAULIC: "Idraulica",
    PNEUMATIC: "Pneumatica",
    PLANT: "Impianti",
    SAFETY: "Sicurezza",
    IMPROVEMENT: "Miglioramento",
    OTHER: "Altro",
};

export default function KPIPage() {
    const { workOrders } = useWorkOrders();
    const { assets } = useAssets();
    const [advancedStats, setAdvancedStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAdvancedKPIs().then((data) => {
            setAdvancedStats(data);
            setLoading(false);
        });
    }, []);

    // 1. Opened vs closed work orders by department
    const departmentStats = new Map<string, { opened: number; closed: number }>();
    workOrders.forEach((wo) => {
        const asset = assets.find((a) => a.id === wo.assetId);
        const dept = asset?.department || "Non assegnato";
        const stats = departmentStats.get(dept) ?? { opened: 0, closed: 0 };
        stats.opened += 1;
        if (wo.status === "COMPLETED") stats.closed += 1;
        departmentStats.set(dept, stats);
    });
    const barChartData = Array.from(departmentStats.entries()).map(([name, s]) => ({ name, Richiesti: s.opened, Completati: s.closed }));

    // 2. Overall status
    const totalClosed = workOrders.filter((wo) => wo.status === "COMPLETED").length;
    const totalOpen = workOrders.length - totalClosed;
    const overallData = [
        { name: "Completati", value: totalClosed, color: chartColors.success },
        { name: "Aperti o in corso", value: totalOpen, color: chartColors.warning },
    ];

    // 3. Work orders by category
    const categoryStats = new Map<string, number>();
    workOrders.forEach((wo) => {
        const cat = wo.category || "OTHER";
        categoryStats.set(cat, (categoryStats.get(cat) || 0) + 1);
    });
    const pieChartData = Array.from(categoryStats.entries()).map(([key, value]) => ({
        name: CATEGORY_LABELS[key] ?? key,
        value,
        color: categoryColor(key),
    }));

    const efficiency = advancedStats?.resolutionEfficiency;
    const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

    return (
        <div className="space-y-6 pb-10">
            <PageHeader
                title="KPI e analisi delle prestazioni"
                description="Fermi macchina, tempi di riparazione, costi e carico di lavoro."
                breadcrumb={[{ label: "Amministrazione" }, { label: "KPI e report" }]}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="MTTR (tempo medio di riparazione)"
                    value={
                        <>
                            {advancedStats?.mttr || 0}
                            <span className="ml-1 text-base font-normal text-muted-foreground">min</span>
                        </>
                    }
                    hint={`Media su ${advancedStats?.totalEWOs || 0} EWO`}
                    icon={<Timer />}
                    tone="info"
                    loading={loading}
                />
                <StatCard
                    label="Costo stimato dei fermi"
                    value={currency.format(advancedStats?.estimatedCost || 0)}
                    hint={`${advancedStats?.downtimeCostPerMinute ?? 100} €/min di mancata produzione (configurabile in Impostazioni)`}
                    icon={<Euro />}
                    tone="critical"
                    loading={loading}
                />
                <StatCard
                    label="Efficienza di risoluzione"
                    value={efficiency === null || efficiency === undefined ? "N/D" : `${efficiency}%`}
                    hint="EWO risolti senza un ulteriore intervento"
                    icon={<TrendingUp />}
                    tone="success"
                    loading={loading}
                />
                <StatCard
                    label="Asset più critico"
                    value={<span className="text-xl">{advancedStats?.topAssets?.[0]?.name || "Nessun dato"}</span>}
                    hint="Maggiore causa di fermo"
                    icon={<AlertOctagon />}
                    tone="warning"
                    loading={loading}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Top 5 asset per fermo macchina</CardTitle>
                        <CardDescription>Macchinari con più minuti di inattività</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            {loading ? (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Caricamento dati...</div>
                            ) : advancedStats?.topAssets?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={advancedStats.topAssets} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartColors.grid} />
                                        <XAxis type="number" stroke={chartColors.axis} fontSize={12} />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} stroke={chartColors.axis} />
                                        <Tooltip cursor={{ fill: chartColors.grid, opacity: 0.4 }} contentStyle={tooltipStyle} />
                                        <Bar dataKey="minutes" fill={chartColors.critical} radius={[0, 4, 4, 0]} name="Minuti di fermo" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState title="Nessun fermo registrato" description="I fermi compaiono quando vengono compilati gli EWO." className="h-full" />
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Stato degli ordini di lavoro</CardTitle>
                        <CardDescription>Distribuzione per stato attuale</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={overallData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value">
                                        {overallData.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Tipologia degli interventi</CardTitle>
                        <CardDescription>Ripartizione per categoria</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value">
                                        {pieChartData.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Attività per reparto</CardTitle>
                    <CardDescription>Volume di lavoro per area: ordini richiesti e completati</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                <XAxis dataKey="name" stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke={chartColors.axis} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip cursor={{ fill: chartColors.grid, opacity: 0.4 }} contentStyle={tooltipStyle} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="Richiesti" fill={chartColors.primary} radius={[4, 4, 0, 0]} maxBarSize={48} />
                                <Bar dataKey="Completati" fill={chartColors.success} radius={[4, 4, 0, 0]} maxBarSize={48} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
