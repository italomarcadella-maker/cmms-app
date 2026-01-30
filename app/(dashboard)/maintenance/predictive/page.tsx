import { getPredictiveInsights } from "@/lib/ai-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, TrendingUp, Activity, Timer } from "lucide-react";
import Link from "next/link";

export default async function PredictiveMaintenancePage() {
    const assets = await getPredictiveInsights();

    const criticalCount = assets.filter(a => a.riskLevel === 'CRITICAL').length;
    const highCount = assets.filter(a => a.riskLevel === 'HIGH').length;
    const safeCount = assets.filter(a => a.riskLevel === 'LOW' || a.riskLevel === 'MEDIUM').length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Predictive Maintenance AI
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Analisi predittiva dei guasti basata su MTBF e storico interventi.
                    </p>
                </div>
                {/* Legend or Actions */}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-red-50 to-white border-red-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" /> Rischio Critico
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-red-700">{criticalCount}</div>
                        <p className="text-xs text-red-500 mt-1">Asset richiedono ispezione immediata</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Rischio Elevato
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-amber-700">{highCount}</div>
                        <p className="text-xs text-amber-500 mt-1">Manutenzione consigliata a breve</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" /> Operativi
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-emerald-700">{safeCount}</div>
                        <p className="text-xs text-emerald-500 mt-1">Asset stabili secondo le proiezioni</p>
                    </CardContent>
                </Card>
            </div>

            {/* Assets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assets.map((asset) => (
                    <Link href={`/assets/${asset.id}`} key={asset.id} className="group block">
                        <div className={`
                            relative h-full rounded-xl border p-6 transition-all hover:shadow-lg
                            ${asset.riskLevel === 'CRITICAL' ? 'border-red-200 bg-red-50/10 hover:border-red-300' :
                                asset.riskLevel === 'HIGH' ? 'border-amber-200 bg-amber-50/10 hover:border-amber-300' :
                                    'bg-card hover:border-primary/50'}
                        `}>
                            {/* Risk Badge */}
                            <div className="absolute top-4 right-4">
                                <Badge variant={
                                    asset.riskLevel === 'CRITICAL' ? 'destructive' :
                                        asset.riskLevel === 'HIGH' ? 'secondary' : // 'secondary' is usually gray/amber vs destructive
                                            'outline'
                                } className={
                                    asset.riskLevel === 'HIGH' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' :
                                        asset.riskLevel === 'LOW' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none' : ''
                                }>
                                    {asset.riskLevel === 'CRITICAL' ? 'CRITICO' :
                                        asset.riskLevel === 'HIGH' ? 'ATTENZIONE' :
                                            asset.riskLevel === 'MEDIUM' ? 'MODERATO' : 'OTTIMALE'}
                                </Badge>
                            </div>

                            <h3 className="font-semibold text-lg pr-20 truncate mb-1 group-hover:text-primary transition-colors">
                                {asset.name}
                            </h3>
                            <div className="text-sm text-muted-foreground mb-4">
                                Health Score: <span className={
                                    asset.healthScore < 50 ? 'text-red-500 font-bold' :
                                        asset.healthScore < 80 ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'
                                }>{asset.healthScore}%</span>
                            </div>

                            {!asset.mtbf ? (
                                <div className="p-4 bg-muted/40 rounded-lg text-center text-sm text-muted-foreground italic">
                                    Dati storici insufficienti per previsione.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="bg-background/50 p-2 rounded border">
                                            <span className="block text-muted-foreground text-xs uppercase mb-1">MTBF Stimato</span>
                                            <span className="font-mono font-medium flex items-center gap-1">
                                                <Activity className="h-3 w-3" /> {asset.mtbf} gg
                                            </span>
                                        </div>
                                        <div className="bg-background/50 p-2 rounded border">
                                            <span className="block text-muted-foreground text-xs uppercase mb-1">Prossimo Guasto</span>
                                            <span className={`font-mono font-medium flex items-center gap-1 ${asset.riskLevel === 'CRITICAL' ? 'text-red-600' : ''
                                                }`}>
                                                <Timer className="h-3 w-3" />
                                                {asset.nextFailureDate?.toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Risk Progress Bar */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Ciclo di Vita Stimato</span>
                                            <span>
                                                {asset.riskLevel === 'CRITICAL' ? 'Scaduto!' :
                                                    asset.riskLevel === 'HIGH' ? 'In Esaurimento' : 'Ok'}
                                            </span>
                                        </div>
                                        <Progress value={
                                            asset.riskLevel === 'CRITICAL' ? 100 :
                                                asset.riskLevel === 'HIGH' ? 85 :
                                                    asset.riskLevel === 'MEDIUM' ? 60 : 25
                                        } className={
                                            asset.riskLevel === 'CRITICAL' ? '[&>div]:bg-red-500' :
                                                asset.riskLevel === 'HIGH' ? '[&>div]:bg-amber-500' :
                                                    '[&>div]:bg-emerald-500'
                                        } />
                                    </div>
                                </div>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
