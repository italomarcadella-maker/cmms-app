
import { getHighPrioritySafetyRequests } from "@/lib/dashboard-actions";
import { SafetyWidget } from "@/components/dashboard/safety-widget";
// Note: SafetyWidget likely needs technicians passed to it?
// Checking dashboard-ui.tsx: <SafetyWidget requests={safetyRequests || []} technicians={technicians || []} />
// So we need to fetch technicians too.

import { getTechnicians as getAllTechnicians } from "@/lib/actions";

export async function SafetyStatus() {
    const [requests, technicians] = await Promise.all([
        getHighPrioritySafetyRequests(5),
        getAllTechnicians()
    ]);

    return <SafetyWidget requests={requests} technicians={technicians} />;
}
