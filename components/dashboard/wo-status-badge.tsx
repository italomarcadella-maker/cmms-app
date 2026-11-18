"use client";

import { WorkOrderStatusPill } from "@/components/ui/status-badge";

/** Kept for existing imports; the look lives in components/ui/status-badge.tsx. */
export const WOStatusBadge = ({ status }: { status: string }) => <WorkOrderStatusPill status={status} />;
