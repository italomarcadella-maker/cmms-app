import { AssetStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertOctagon, PowerOff, Ban, Box } from "lucide-react";

interface AssetStatusBadgeProps {
    status: AssetStatus;
    className?: string;
}

export function AssetStatusBadge({ status, className }: AssetStatusBadgeProps) {
    return (
        <div className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium border",
            status === 'OPERATIONAL' && "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
            status === 'MAINTENANCE' && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
            status === 'OFFLINE' && "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
            status === 'DECOMMISSIONED' && "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
            status === 'STORAGE' && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800", // Blue for Storage
            className
        )}>
            {status === 'OPERATIONAL' && <CheckCircle2 className="h-3 w-3" />}
            {status === 'MAINTENANCE' && <AlertOctagon className="h-3 w-3" />}
            {status === 'OFFLINE' && <PowerOff className="h-3 w-3" />}
            {status === 'DECOMMISSIONED' && <Ban className="h-3 w-3" />}
            {status === 'STORAGE' && <Box className="h-3 w-3" />}

            {status === 'OPERATIONAL' && "In Uso"}
            {status === 'MAINTENANCE' && "In Manutenzione"}
            {status === 'OFFLINE' && "Offline"}
            {status === 'DECOMMISSIONED' && "Rottamato"}
            {status === 'STORAGE' && "Accantonato"}
            {!['OPERATIONAL', 'MAINTENANCE', 'OFFLINE', 'DECOMMISSIONED', 'STORAGE'].includes(status) && status}
        </div>
    );
}
