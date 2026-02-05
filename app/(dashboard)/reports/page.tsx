import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Factory, CalendarRange, ArrowRight, Euro } from "lucide-react";
import { getAssets } from "@/lib/actions";

export default async function ReportsPage() {
    const assets = await getAssets();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Reportistica</h1>
                <p className="text-muted-foreground">Genera ed esporta report in PDF per audit e analisi.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Asset History Report */}
                <Card className="hover:border-primary/50 transition-colors">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Factory className="h-5 w-5 text-blue-500" />
                            Storico Asset
                        </CardTitle>
                        <CardDescription>Cronologia interventi e costi per singolo macchinario.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Seleziona Asset</label>
                            <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 space-y-1">
                                {assets.map((asset: any) => (
                                    <Link
                                        key={asset.id}
                                        href={`/reports/asset-history/${asset.id}`}
                                        className="block p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex justify-between group"
                                    >
                                        <span>{asset.name}</span>
                                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-muted-foreground" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Coming Soon: Shift Report */}
                <Card className="opacity-60 border-dashed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarRange className="h-5 w-5 text-amber-500" />
                            Report Turni
                        </CardTitle>
                        <CardDescription>Attività svolte per turno o squadra (In arrivo).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Coming soon...</p>
                    </CardContent>
                </Card>

                {/* Cost Report */}
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                    <Link href="/reports/costs">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Euro className="h-5 w-5 text-emerald-500" />
                                Analisi Costi
                            </CardTitle>
                            <CardDescription>Report economico YTD e per reparto.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center text-sm font-medium text-emerald-600">
                                <span>Visualizza Dashboard</span>
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>
            </div>
        </div >
    );
}
