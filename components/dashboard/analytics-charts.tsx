"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from "recharts";
import { Activity, Clock } from "lucide-react";

interface AnalyticsChartsProps {
    data: {
        mttr: number;
        mtbf: number;
        trend: any[];
    };
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
    if (!data || data.trend.length === 0) return null;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-6">
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-500" />
                        Efficienza Manutenzione (Trend)
                    </CardTitle>
                    <CardDescription>
                        Andamento MTTR (Tempo Medio Riparazione) vs MTBF (Tempo Medio tra Guasti)
                    </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={data.trend}>
                            <defs>
                                <linearGradient id="colorMtbf" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorMttr" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}h`}
                            />
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                itemStyle={{ color: 'var(--foreground)' }}
                            />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey="mtbf"
                                name="MTBF (Tempo tra Guasti)"
                                stroke="#10b981"
                                fillOpacity={1}
                                fill="url(#colorMtbf)"
                            />
                            <Area
                                type="monotone"
                                dataKey="mttr"
                                name="MTTR (Tempo Riparazione)"
                                stroke="#f43f5e"
                                fillOpacity={1}
                                fill="url(#colorMttr)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                        Metriche Chiave
                    </CardTitle>
                    <CardDescription>
                        Ultimi 6 mesi
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="flex items-center">
                        <div className="space-y-1 flex-1">
                            <p className="text-sm font-medium leading-none text-muted-foreground">
                                MTTR Medio
                            </p>
                            <p className="text-3xl font-bold">{data.mttr} <span className="text-sm font-normal text-muted-foreground">ore</span></p>
                            <p className="text-xs text-muted-foreground">
                                Obiettivo: &lt; 4 ore
                            </p>
                        </div>
                        <div className={`h-2 w-20 rounded-full ${data.mttr < 4 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>

                    <div className="flex items-center">
                        <div className="space-y-1 flex-1">
                            <p className="text-sm font-medium leading-none text-muted-foreground">
                                MTBF Medio
                            </p>
                            <p className="text-3xl font-bold">{data.mtbf} <span className="text-sm font-normal text-muted-foreground">ore</span></p>
                            <p className="text-xs text-muted-foreground">
                                Obiettivo: &gt; 720 ore (1 mese)
                            </p>
                        </div>
                        <div className={`h-2 w-20 rounded-full ${data.mtbf > 720 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    </div>

                    <div className="rounded-lg border p-4 bg-muted/50">
                        <h4 className="font-semibold mb-2 text-sm">Approfondimento AI</h4>
                        <p className="text-xs text-muted-foreground">
                            {data.mttr > 5
                                ? "L'MTTR è superiore alla media. Considerare formazione aggiuntiva o verifica disponibilità ricambi."
                                : "L'efficienza di riparazione è ottimale. Mantenere le procedure attuali."
                            }
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
