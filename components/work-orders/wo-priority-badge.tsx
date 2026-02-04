import { WorkOrderPriority } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertCircle, ArrowUp, ArrowDown } from "lucide-react";

interface PriorityBadgeProps {
    priority: WorkOrderPriority;
    className?: string;
}

export function WOPriorityBadge({ priority, className }: PriorityBadgeProps) {
    return (
        <div className={cn("inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide",
            priority === 'STOPPED' && "text-red-700 dark:text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800",
            priority === 'MALFUNCTIONING' && "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800",
            priority === 'WORKING' && "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800",
            priority === 'NOT_PRODUCTION' && "text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700",
            className
        )}>
            {priority === 'STOPPED' && <AlertCircle className="h-3 w-3" />}
            {priority === 'MALFUNCTIONING' && <AlertCircle className="h-3 w-3" />}
            {priority === 'WORKING' && <ArrowUp className="h-3 w-3 rotate-45" />}
            {priority === 'NOT_PRODUCTION' && <ArrowDown className="h-3 w-3" />}
            <span>
                {priority === 'STOPPED' ? 'FERMA' :
                    priority === 'MALFUNCTIONING' ? 'MALFUNZIONANTE' :
                        priority === 'WORKING' ? 'IN LAVORO' :
                            priority === 'NOT_PRODUCTION' ? 'NON IN PRODUZIONE' : priority}
            </span>
        </div>
    );
}
