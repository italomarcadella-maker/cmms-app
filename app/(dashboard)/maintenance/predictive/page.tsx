import { getPredictiveInsights } from "@/lib/ai-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, TrendingUp, Activity, Timer } from "lucide-react";
import Link from "next/link";
import { PredictiveRiskPie } from "@/components/dashboard/predictive-risk-pie";
import { getT } from "@/lib/i18n/server";

export default async function PredictiveMaintenancePage() {
    const { t, format: fmt } = await getT();
    const ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];
    const assets = [...(await getPredictiveInsights())].sort((a, b) => ORDER.indexOf(a.riskLevel) - ORDER.indexOf(b.riskLevel));

    const criticalCount = assets.filter(a => a.riskLevel === 'CRITICAL').length;
    const highCount = assets.filter(a => a.riskLevel === 'HIGH').length;
    const safeCount = assets.filter(a => a.riskLevel === 'LOW' || a.riskLevel === 'MEDIUM').length;
    const unknownCount = assets.filter(a => a.riskLevel === 'UNKNOWN').length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col md:flex-row justify-between gap-8">
                <div className="flex-1 space-y-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">{t("Manutenzione predittiva")}</h1>
                        <p className="text-muted-foreground mt-1">
                            {t("Stima del prossimo guasto dall'intervallo medio (MTBF) tra i guasti già chiusi di ogni asset. Servono almeno due guasti per poter stimare.")}
                        </p>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <Card className="bg-gradient-to-br from-red-50 to-white border-red-100 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" /> {t("Rischio Critico")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-red-700">{criticalCount}</div>
                                <p className="text-xs text-red-500 mt-1">{t("Asset richiedono ispezione immediata")}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                                    <Activity className="h-4 w-4" /> {t("Rischio Elevato")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-amber-700">{highCount}</div>
                                <p className="text-xs text-amber-500 mt-1">{t("Manutenzione consigliata a breve")}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" /> {t("Operativi")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold text-emerald-700">{safeCount}</div>
                                <p className="text-xs text-emerald-500 mt-1">{t("Asset stabili secondo lo storico")}</p>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Timer className="h-4 w-4" /> {t("Dati insufficienti")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold">{unknownCount}</div>
                                <p className="text-xs text-muted-foreground mt-1">{t("Asset con meno di due guasti: nessuna stima")}</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Chart Section */}
                <div className="w-full md:w-[350px]">
                    <PredictiveRiskPie data={assets} />
                </div>
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
                                    {asset.riskLevel === 'CRITICAL' ? t("Critico").toUpperCase() :
                                        asset.riskLevel === 'HIGH' ? t("Attenzione").toUpperCase() :
                                            asset.riskLevel === 'MEDIUM' ? t("Moderato").toUpperCase() : asset.riskLevel === 'UNKNOWN' ? t("Non valutabile").toUpperCase() : t("Ottimale").toUpperCase()}
                                </Badge>
                            </div>

                            <h3 className="font-semibold text-lg pr-20 truncate mb-1 group-hover:text-primary transition-colors">
                                {asset.name}
                            </h3>
                            <div className="text-sm text-muted-foreground mb-4">
                                {t("Health Score:")} <span className={
                                    asset.healthScore < 50 ? 'text-red-500 font-bold' :
                                        asset.healthScore < 80 ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'
                                }>{asset.healthScore}%</span>
                            </div>

                            {!asset.mtbf ? (
                                <div className="p-4 bg-muted/40 rounded-lg text-center text-sm text-muted-foreground italic">
                                    {t("Dati storici insufficienti per previsione.")}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="bg-background/50 p-2 rounded border">
                                            <span className="block text-muted-foreground text-xs uppercase mb-1">{t("MTBF Stimato")}</span>
                                            <span className="font-mono font-medium flex items-center gap-1">
                                                <Activity className="h-3 w-3" /> {t("{n} gg", { n: asset.mtbf })}
                                            </span>
                                        </div>
                                        <div className="bg-background/50 p-2 rounded border">
                                            <span className="block text-muted-foreground text-xs uppercase mb-1">{t("Prossimo Guasto")}</span>
                                            <span className={`font-mono font-medium flex items-center gap-1 ${asset.riskLevel === 'CRITICAL' ? 'text-red-600' : ''
                                                }`}>
                                                <Timer className="h-3 w-3" />
                                                {fmt.date(asset.nextFailureDate)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Risk Progress Bar */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>{t("Ciclo di Vita Stimato")}</span>
                                            <span>
                                                {asset.riskLevel === 'CRITICAL' ? t("Scaduto!") :
                                                    asset.riskLevel === 'HIGH' ? t("In Esaurimento") : t("Ok")}
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

