import { AssetStatusPill } from "@/components/ui/status-badge";

interface AssetStatusBadgeProps {
    status: string;
    className?: string;
}

/** Kept for existing imports; the look lives in components/ui/status-badge.tsx. */
export function AssetStatusBadge({ status, className }: AssetStatusBadgeProps) {
    return <AssetStatusPill status={status} className={className} />;
}
