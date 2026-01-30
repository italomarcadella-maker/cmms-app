"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = {
    CRITICAL: '#ef4444', // red-500
    HIGH: '#f59e0b',     // amber-500
    MEDIUM: '#eab308',   // yellow-500
    LOW: '#10b981',      // emerald-500
};

interface DataPoint {
    name: string;
    value: number;
    type: string;
}

export function PredictiveRiskPie({ data }: { data: { riskLevel: string }[] }) {

    const chartData: DataPoint[] = [
        { name: 'Critico', value: data.filter(d => d.riskLevel === 'CRITICAL').length, type: 'CRITICAL' },
        { name: 'Alto', value: data.filter(d => d.riskLevel === 'HIGH').length, type: 'HIGH' },
        { name: 'Medio', value: data.filter(d => d.riskLevel === 'MEDIUM').length, type: 'MEDIUM' },
        { name: 'Basso', value: data.filter(d => d.riskLevel === 'LOW').length, type: 'LOW' }
    ].filter(d => d.value > 0);

    if (chartData.length === 0) return <div className="h-[300px] flex items-center justify-center text-muted-foreground">Dati insufficienti</div>;

    return (
        <div className="h-[300px] w-full bg-card rounded-xl border p-4 shadow-sm">
            <h3 className="font-semibold mb-4 text-center">Distribuzione Rischio Impianto</h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.type as keyof typeof COLORS]} stroke="none" />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
