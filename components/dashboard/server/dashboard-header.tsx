import { getDetailedDashboardStats } from "@/lib/dashboard-actions";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { healthTone } from "@/components/ui/status-badge";

export async function DashboardHeader() {
    // getDetailedDashboardStats is cached
    const stats = await getDetailedDashboardStats();
    const tone = healthTone(stats.avgHealth);

    return (
        <PageHeader
            title="Control Room"
            description="Monitoraggio in tempo reale delle operazioni."
            actions={
                <>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="success" className="cursor-help gap-1.5 px-3 py-1 text-xs font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                                Sistema operativo
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Tutti i servizi sono attivi e funzionanti.</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant={tone} className="cursor-help px-3 py-1 text-xs font-medium">
                                Salute impianti {stats.avgHealth}%
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Media della salute di tutti gli asset monitorati.</p>
                        </TooltipContent>
                    </Tooltip>
                </>
            }
        />
    );
}
