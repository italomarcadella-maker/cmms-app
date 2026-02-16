
import { getUpcomingSchedule } from "@/lib/dashboard-actions";
import { format, isSameDay, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarDays, Clock, Wrench, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export async function UpcomingSchedule() {
    const schedule = await getUpcomingSchedule(3);

    // Group by day labels
    const grouped = schedule.reduce((acc, item) => {
        const key = item.formattedDate;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {} as Record<string, typeof schedule>);

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-muted/20 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Programmazione Prossimi 3 Giorni</h3>
            </div>

            <div className="p-0">
                {Object.keys(grouped).length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        Nessuna attività programmata per i prossimi giorni.
                    </div>
                ) : (
                    <div className="divide-y">
                        {Object.entries(grouped).map(([day, items]) => (
                            <div key={day} className="flex flex-col md:flex-row hover:bg-muted/10 transition-colors">
                                {/* Date Column */}
                                <div className="p-4 w-full md:w-32 md:border-r bg-muted/5 flex items-center md:items-start md:justify-center font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                    {day}
                                </div>

                                {/* Items Column */}
                                <div className="flex-1 p-2 space-y-2">
                                    {items.map((item) => (
                                        <div key={item.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-accent/40 transition-colors group">
                                            <div className="p-2 rounded-full bg-background border shadow-sm shrink-0">
                                                {item.type === 'WO' ? (
                                                    <Wrench className="h-4 w-4 text-blue-500" />
                                                ) : (
                                                    <CalendarCheck className="h-4 w-4 text-purple-500" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-semibold text-sm truncate pr-2 group-hover:text-primary transition-colors">
                                                        {item.title}
                                                    </span>
                                                    <Badge variant={
                                                        item.priority === 'HIGH' || item.priority === 'STOPPED' ? 'destructive' :
                                                            item.priority === 'MEDIUM' ? 'default' : 'secondary'
                                                    } className="text-[10px] h-5">
                                                        {item.priority}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {format(parseISO(item.date), 'HH:mm')}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="font-medium text-foreground/80">{item.asset}</span>
                                                    <span>•</span>
                                                    <span className="uppercase">{item.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
