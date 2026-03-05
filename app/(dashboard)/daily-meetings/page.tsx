"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Calendar, Users, Briefcase, FileText, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { ActionItemsKanban } from "@/components/daily/action-items-kanban";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DailyMeetingHub() {
    const router = useRouter();
    const [loadingDep, setLoadingDep] = useState<string | null>(null);

    const startMeeting = async (department: "RETINATO" | "MAGLIATO") => {
        setLoadingDep(department);
        try {
            const res = await fetch("/api/daily-meetings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ department, conductedBy: "Supervisore Corrente" })
            });
            const data = await res.json();
            router.push(`/daily-meetings/${data.id}`);
        } catch {
            setLoadingDep(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Daily Meetings</h1>
                <p className="text-muted-foreground">
                    Gestione delle riunioni giornaliere dei reparti. Traccia i KPIs di Sicurezza, Qualità, Produzione e Manutenzione.
                </p>
            </div>

            <Tabs defaultValue="meetings" className="mt-8">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger value="meetings">Svolgimento Meetings</TabsTrigger>
                    <TabsTrigger value="kanban" className="gap-2"><LayoutDashboard className="h-4 w-4" /> Kanban Follow-Up</TabsTrigger>
                </TabsList>

                <TabsContent value="meetings" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Retinato */}
                        <Card className="hover:border-indigo-500 transition-colors border-2">
                            <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 pb-4">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 text-xl font-bold">
                                        <Briefcase className="h-5 w-5" /> Reparto Retinato
                                    </CardTitle>
                                </div>
                                <CardDescription>Avvia un nuovo Daily Meeting per il reparto Retinato.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <Button
                                    onClick={() => startMeeting("RETINATO")}
                                    disabled={!!loadingDep}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg"
                                >
                                    {loadingDep === "RETINATO" ? "Creazione in corso..." : (
                                        <><PlusCircle className="mr-2 h-5 w-5" /> Avvia Daily Meeting</>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Magliato */}
                        <Card className="hover:border-amber-500 transition-colors border-2">
                            <CardHeader className="bg-amber-50/50 dark:bg-amber-950/20 pb-4">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xl font-bold">
                                        <Users className="h-5 w-5" /> Reparto Magliato
                                    </CardTitle>
                                </div>
                                <CardDescription>Avvia un nuovo Daily Meeting per il reparto Magliato.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <Button
                                    onClick={() => startMeeting("MAGLIATO")}
                                    disabled={!!loadingDep}
                                    className="w-full bg-amber-600 hover:bg-amber-700 h-12 text-lg"
                                >
                                    {loadingDep === "MAGLIATO" ? "Creazione in corso..." : (
                                        <><PlusCircle className="mr-2 h-5 w-5" /> Avvia Daily Meeting</>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                    </div>

                    <div className="mt-8">
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-muted-foreground" /> Archivio Meeting (Bozza)
                        </h3>
                        <div className="text-center p-12 border border-dashed rounded-xl bg-muted/20 text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
                            <p>Usa la funzionalità di esportazione all'interno del meeting per vedere i verbali.</p>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="kanban" className="mt-6">
                    <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <LayoutDashboard className="h-5 w-5 text-muted-foreground" /> Task Emergenti dai Meeting
                    </h3>
                    <ActionItemsKanban />
                </TabsContent>
            </Tabs>
        </div>
    );
}
