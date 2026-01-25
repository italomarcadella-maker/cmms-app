import { WorkOrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
    status: WorkOrderStatus;
    className?: string;
}

export function WOStatusBadge({ status, className }: StatusBadgeProps) {
    return (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
            status === 'OPEN' && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
            status === 'IN_PROGRESS' && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
            status === 'COMPLETED' && "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
            status === 'ON_HOLD' && "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
            status === 'PENDING_APPROVAL' && "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
            className
        )}>
            {status === 'OPEN' ? 'APERTO' :
                status === 'IN_PROGRESS' ? 'IN CORSO' :
                    status === 'PENDING_APPROVAL' ? 'DA APPROVARE' :
                        status === 'COMPLETED' ? 'COMPLETATO' :
                            status === 'ON_HOLD' ? 'IN ATTESA' : 'ANNULLATO'}
        </span>
    );
}
