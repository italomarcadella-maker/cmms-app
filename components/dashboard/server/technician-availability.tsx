
import { getTechnicianPresence } from "@/lib/dashboard-actions";
import { Users, UserX, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export async function TechnicianAvailability() {
    const { presentCount, totalCount, percentage, absentees } = await getTechnicianPresence();

    const getStatusColor = (pct: number) => {
        if (pct >= 90) return "bg-emerald-500";
        if (pct >= 70) return "bg-amber-500";
        return "bg-red-500";
    };

    return (
        <div className="rounded-xl border bg-card shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Presenza Tecnici</h3>
                </div>
                <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-bold border",
                    percentage >= 90
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                )}>
                    {percentage}% Presenti
                </span>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{presentCount} su {totalCount} in servizio</span>
                </div>
                <Progress value={percentage} className="h-2" indicatorClassName={getStatusColor(percentage)} />
            </div>

            {absentees.length > 0 ? (
                <div className="mt-4 pt-4 border-t border-dashed">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                        <UserX className="h-3 w-3" /> Assenti Oggi
                    </h4>
                    <div className="space-y-2">
                        {absentees.map((tech, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm bg-muted/40 p-2 rounded-md">
                                <span className="font-medium">{tech.name}</span>
                                <span className="text-muted-foreground text-xs uppercase px-1.5 py-0.5 bg-background border rounded">
                                    {tech.reason}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="mt-4 pt-4 border-t border-dashed flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">Squadra al completo!</span>
                </div>
            )}
        </div>
    );
}
