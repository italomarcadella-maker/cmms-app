import { PriorityPill } from "@/components/ui/status-badge";

interface PriorityBadgeProps {
    priority: string;
    className?: string;
}

/** Kept for existing imports; the look lives in components/ui/status-badge.tsx. */
export function WOPriorityBadge({ priority, className }: PriorityBadgeProps) {
    return <PriorityPill priority={priority} className={className} />;
}
