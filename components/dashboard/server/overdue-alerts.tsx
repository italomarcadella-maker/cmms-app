
import { getOverdueWorkOrders } from "@/lib/dashboard-actions";
import { DeadlineAlerts } from "@/components/calendar/deadline-alerts";

export async function OverdueAlerts() {
    const overdueWOsRaw = await getOverdueWorkOrders(10);
    // map to match what DeadlineAlerts expects exactly
    const overdueWOs = overdueWOsRaw.map(wo => ({
        ...wo,
        assetName: wo.asset.name,
        checklist: [],
        partsUsed: [],
        laborLogs: []
    })) as any;

    return <DeadlineAlerts workOrders={overdueWOs} />;
}
