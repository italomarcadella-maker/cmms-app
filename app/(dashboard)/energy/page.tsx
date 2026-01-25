import { getMeters, getMeterReadings } from "@/lib/actions";
import { Zap, Droplets, Flame, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ReadingFormDialog } from "@/components/energy/reading-form-dialog";
import { ConsumptionChart } from "@/components/energy/consumption-chart";
import { ReadingsHistory } from "@/components/energy/readings-history";

export default async function EnergyPage() {
    const meters = await getMeters();

    // Group meters by type
    const elecMeters = meters.filter((m: any) => m.type === 'ELEC');
    const waterMeters = meters.filter((m: any) => m.type === 'WATER');
    const gasMeters = meters.filter((m: any) => m.type === 'GAS');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                        Monitoraggio Consumi
                    </h1>
                    <p className="text-muted-foreground mt-1">Gestione energetica e rilevamento anomalie.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/energy/meters">
                        <Button variant="outline">
                            Gestione Contatori
                        </Button>
                    </Link>
                    <ReadingFormDialog meters={meters} />
                </div>
            </div>

            {/* AI / Anomalies Section - Placeholder or Real Check */}
            {/* Ideally we fetch recent anomalies here. For now, static layout readiness. */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Electricity Card */}
                <div className="p-6 rounded-xl border bg-card shadow-sm relative overflow-hidden group hover:border-primary/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap className="h-24 w-24" />
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500">
                            <Zap className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Elettricità</h3>
                            <p className="text-sm text-muted-foreground">{elecMeters.length} Contatori</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-2xl font-bold font-mono">-- kWh</div>
                        <p className="text-xs text-muted-foreground">Totale Mese Corrente</p>
                    </div>
                </div>

                {/* Water Card */}
                <div className="p-6 rounded-xl border bg-card shadow-sm relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Droplets className="h-24 w-24" />
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-500">
                            <Droplets className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Acqua</h3>
                            <p className="text-sm text-muted-foreground">{waterMeters.length} Contatori</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-2xl font-bold font-mono">-- m³</div>
                        <p className="text-xs text-muted-foreground">Totale Mese Corrente</p>
                    </div>
                </div>

                {/* Gas Card */}
                <div className="p-6 rounded-xl border bg-card shadow-sm relative overflow-hidden group hover:border-orange-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Flame className="h-24 w-24" />
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-500">
                            <Flame className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Gas</h3>
                            <p className="text-sm text-muted-foreground">{gasMeters.length} Contatori</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="text-2xl font-bold font-mono">-- m³</div>
                        <p className="text-xs text-muted-foreground">Totale Mese Corrente</p>
                    </div>
                </div>
            </div>

            {/* History Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReadingsHistory meters={meters} />

                {/* Trends Chart */}
                <div className="rounded-xl border bg-card shadow-sm p-6">
                    <h3 className="font-semibold text-lg mb-6">Trend Consumi (Ultimi 30 Giorni)</h3>
                    <div className="h-[300px] w-full bg-muted/20 rounded-lg flex items-center justify-center border border-dashed">
                        <ConsumptionChart />
                    </div>
                </div>
            </div>
        </div>
    );
}
