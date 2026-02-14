
import { getDetailedDashboardStats } from "@/lib/dashboard-actions";
import { Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export async function DashboardHeader() {
    // Only fetch what we need if possible, but getDetailedDashboardStats is cached
    const stats = await getDetailedDashboardStats();

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 bg-background/50 backdrop-blur-lg -mx-6 px-6 py-4 border-b border-border/50">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Control Room
                </h1>
                <p className="text-muted-foreground mt-1">Monitoraggio in tempo reale delle operazioni.</p>
            </div>
            <div className="flex gap-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="bg-background/50 backdrop-blur border rounded-full px-3 py-1 text-xs font-medium flex items-center gap-2 shadow-sm cursor-help">
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </div>
                            Sistema Operativo
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Tutti i servizi sono attivi e funzionanti correttamente.</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="bg-background/50 backdrop-blur border rounded-full px-3 py-1 text-xs font-medium flex items-center gap-2 shadow-sm cursor-help">
                            <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                            Efficienza {stats.avgHealth}%
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Media salute globale degli asset monitorati.</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}
