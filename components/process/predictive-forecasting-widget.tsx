"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Forecast {
    id: string;
    assetId: string;
    assetName: string;
    metric: string;
    currentValue: number;
    predictedValue: number;
    threshold: number;
    timeToViolationHours: number;
    confidence: number;
    recommendation: string;
}

export function PredictiveForecastingWidget() {
    const [forecasts, setForecasts] = useState<Forecast[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/anomalies/predict")
            .then(res => res.json())
            .then(data => {
                setForecasts(data);
                setLoading(false);
            });
    }, []);

    return (
        <Card className="col-span-1 border-orange-200 dark:border-orange-900 bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/20 dark:to-background">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-500">
                        <Activity className="h-5 w-5" />
                        Previsioni Deriva Parametri
                    </CardTitle>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200">
                        AI Forecasting
                    </Badge>
                </div>
                <CardDescription>
                    Il Machine Learning rileva tendenze anomale prima che superino i limiti della SOP.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-4">
                        <div className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                        <div className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                    </div>
                ) : forecasts.length === 0 ? (
                    <div className="text-center p-6 text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nessun trend anomalo rilevato a breve termine.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {forecasts.map(forecast => (
                            <div key={forecast.id} className="p-4 rounded-lg bg-white dark:bg-black/40 border shadow-sm flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-semibold text-sm">{forecast.assetName}</h4>
                                        <span className="text-xs text-muted-foreground">Parametro: {forecast.metric}</span>
                                    </div>
                                    <Badge variant="destructive" className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        +{forecast.timeToViolationHours}h
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                    <div className="bg-muted p-2 rounded">
                                        <div className="text-xs text-muted-foreground">Attuale</div>
                                        <div className="font-mono">{forecast.currentValue}</div>
                                    </div>
                                    <div className="flex items-center justify-center text-muted-foreground">
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                    <div className="bg-orange-100 dark:bg-orange-950 p-2 rounded text-orange-700 dark:text-orange-400">
                                        <div className="text-xs">Previsto</div>
                                        <div className="font-mono font-bold">{forecast.predictedValue}</div>
                                    </div>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded text-sm mt-1 border border-blue-100 dark:border-blue-900">
                                    <p className="flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 text-blue-500 mt-0.5" />
                                        <span className="text-blue-800 dark:text-blue-300">
                                            <strong>Azione consigliata:</strong> {forecast.recommendation}
                                        </span>
                                    </p>
                                </div>

                                <Button size="sm" variant="outline" className="w-full mt-2">
                                    Genera EWO Preventivo (Auto-RCA)
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
