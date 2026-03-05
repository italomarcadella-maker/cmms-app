"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { InteractiveDigitalTwin } from "@/components/process/digital-twin-heatmap";
import { PredictiveForecastingWidget } from "@/components/process/predictive-forecasting-widget";
import { EsgSustainabilityDashboard } from "@/components/process/esg-dashboard";
import { VideoToSopWizard } from "@/components/process/video-sop-wizard";
import { GanttSandboxControls } from "@/components/process/gantt-sandbox-controls";
import { SopVersionHistory } from "@/components/process/sop-version-history";
import { Sparkles, Calendar, Settings, Video as VideoIcon, GitBranch, Map } from "lucide-react";

export default function ProcessEngineeringDashboard() {
    const [roiImpact, setRoiImpact] = useState<number>(0);
    const [projectedEndDate, setProjectedEndDate] = useState("15 Nov 2026");

    const handleSimulate = () => {
        // Mock simulation
        setRoiImpact(-4500);
        setProjectedEndDate("18 Nov 2026");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Ingegneria di Processo</h1>
                <p className="text-muted-foreground max-w-3xl">
                    Modulo avanzato per l'ottimizzazione dell'impianto. Monitora le deviazioni reattivamente e predittivamente, calcola il ROI ecologico ed economico, e sfrutta l'Intelligenza Artificiale per generare Standard Operating Procedures (SOP).
                </p>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="bg-background border">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-muted">
                        <Map className="h-4 w-4 mr-2" /> Panoramica Impianto
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
                        <Sparkles className="h-4 w-4 mr-2" /> AI & Predittivo
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="data-[state=active]:bg-muted">
                        <Calendar className="h-4 w-4 mr-2" /> Gestione Progetti
                    </TabsTrigger>
                    <TabsTrigger value="sops" className="data-[state=active]:bg-muted">
                        <VideoIcon className="h-4 w-4 mr-2" /> Gestione SOP
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="col-span-1 md:col-span-2">
                            <InteractiveDigitalTwin />
                        </div>
                        <div className="col-span-1 border rounded-xl overflow-hidden shadow-sm bg-card p-4">
                            <h3 className="font-semibold mb-4">Metriche di Ottimizzazione</h3>
                            <EsgSustainabilityDashboard ecologicalRoi={22.4} energySavings={850} />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="ai" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="md:col-span-2">
                            <PredictiveForecastingWidget />
                        </div>

                        {/* Note: Golden Batch Insights is usually inside a specific SOP View, but shown here for demo */}
                        <Card className="border-indigo-100 dark:border-indigo-900 bg-gradient-to-br from-indigo-50/30 to-white dark:from-indigo-950/20 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-indigo-700 dark:text-indigo-400">Suggerimenti AI Recenti</CardTitle>
                                <CardDescription>Dal modulo Golden Batch</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="p-3 bg-white/60 dark:bg-black/20 rounded border border-indigo-100/50">
                                    <p className="font-medium">SOP: Cambio Formato Estrusore</p>
                                    <p className="text-muted-foreground mt-1">L'IA suggerisce di ridurre la temperatura di 5°C in zona 2 per risparmiare 12% di energia, basandosi sullo storico di Febbraio.</p>
                                    <Button variant="link" className="px-0 h-auto mt-2 text-indigo-600">Applica come Variante (v1.1)</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="projects" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Progetto Corrente: Revamping Linea 1</CardTitle>
                            <CardDescription>Ottimizzazione efficienza energetica e installazione nuovi sensori IoT.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <GanttSandboxControls
                                onSimulate={handleSimulate}
                                originalEndDate="15 Nov 2026"
                                projectedEndDate={projectedEndDate}
                                roiImpact={roiImpact}
                            />

                            <div className="mt-4 p-8 border-2 border-dashed rounded-xl bg-muted/20 flex items-center justify-center text-muted-foreground">
                                [ Componente Gantt Chart Renderizzato Qui ]
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sops" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <VideoToSopWizard />

                        <Card>
                            <CardContent className="pt-6">
                                <SopVersionHistory currentSopName="Avvio Linea Estrusione" />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

            </Tabs>
        </div>
    );
}
