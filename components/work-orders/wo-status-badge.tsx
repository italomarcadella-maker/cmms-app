import { WorkOrderStatusPill } from "@/components/ui/status-badge";

interface StatusBadgeProps {
    status: string;
    className?: string;
}

/** Kept for existing imports; the look lives in components/ui/status-badge.tsx. */
export function WOStatusBadge({ status, className }: StatusBadgeProps) {
    return <WorkOrderStatusPill status={status} className={className} />;
}
