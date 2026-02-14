"use client";

import { BarChart3 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';

export function WeeklyTrendsChart({ data }: { data: any[] }) {
    return (
        <div className="rounded-xl border bg-card shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Andamento Settimanale
            </h3>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <defs>
                            <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.2} />
                            </linearGradient>
                            <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                        <XAxis
                            dataKey="date"
                            stroke="var(--muted-foreground)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="var(--muted-foreground)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            dx={-10}
                        />
                        <RechartsTooltip
                            cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-background/80 backdrop-blur-md border border-border/50 p-3 rounded-lg shadow-xl text-xs">
                                            <p className="font-semibold mb-2">{label}</p>
                                            <div className="space-y-1">
                                                {payload.map((entry: any, index: number) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <div
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: entry.color }}
                                                        />
                                                        <span className="text-muted-foreground capitalize">{entry.name}:</span>
                                                        <span className="font-bold">{entry.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar
                            dataKey="created"
                            name="Nuovi"
                            fill="url(#colorCreated)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={50}
                        />
                        <Bar
                            dataKey="completed"
                            name="Completati"
                            fill="url(#colorCompleted)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={50}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
