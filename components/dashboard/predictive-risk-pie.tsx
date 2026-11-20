"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useT } from '@/lib/i18n/client';

const COLORS = {
    CRITICAL: '#ef4444', // red-500
    HIGH: '#f59e0b',     // amber-500
    MEDIUM: '#eab308',   // yellow-500
    LOW: '#10b981',      // emerald-500
    UNKNOWN: '#a2a4a3',  // grigio FITT: dati insufficienti
};

interface DataPoint {
    name: string;
    value: number;
    type: string;
    [key: string]: any; // Fix for Recharts
}

export function PredictiveRiskPie({ data }: { data: { riskLevel: string }[] }) {
    const t = useT();

    const chartData: DataPoint[] = [
        { name: t('Critico'), value: data.filter(d => d.riskLevel === 'CRITICAL').length, type: 'CRITICAL' },
        { name: t('Alto'), value: data.filter(d => d.riskLevel === 'HIGH').length, type: 'HIGH' },
        { name: t('Medio'), value: data.filter(d => d.riskLevel === 'MEDIUM').length, type: 'MEDIUM' },
        { name: t('Basso'), value: data.filter(d => d.riskLevel === 'LOW').length, type: 'LOW' },
        { name: t('Dati insufficienti'), value: data.filter(d => d.riskLevel === 'UNKNOWN').length, type: 'UNKNOWN' }
    ].filter(d => d.value > 0);

    if (chartData.length === 0) return <div className="h-[300px] flex items-center justify-center text-muted-foreground">{t("Dati insufficienti")}</div>;

    return (
        <div className="h-[300px] w-full bg-card rounded-xl border p-4 shadow-sm">
            <h3 className="font-semibold mb-4 text-center">{t("Distribuzione del rischio")}</h3>
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
