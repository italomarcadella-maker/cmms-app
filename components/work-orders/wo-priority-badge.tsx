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
            priority === 'HIGH' && "text-red-600 dark:text-red-400",
            priority === 'MEDIUM' && "text-amber-600 dark:text-amber-400",
            priority === 'LOW' && "text-blue-600 dark:text-blue-400",
            className
        )}>
            {priority === 'HIGH' && <AlertCircle className="h-3 w-3" />}
            {priority === 'MEDIUM' && <ArrowUp className="h-3 w-3 rotate-45" />}
            {priority === 'LOW' && <ArrowDown className="h-3 w-3" />}
            <span>
                {priority === 'HIGH' ? 'ALTA' :
                    priority === 'MEDIUM' ? 'MEDIA' :
                        priority === 'LOW' ? 'BASSA' : priority}
            </span>
        </div>
    );
}
