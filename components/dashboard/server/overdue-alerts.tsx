
import { getOverdueWorkOrders } from "@/lib/dashboard-actions";
import { DeadlineAlerts } from "@/components/calendar/deadline-alerts";

export async function OverdueAlerts() {
    const overdueWOs = await getOverdueWorkOrders(10);
    return <DeadlineAlerts workOrders={overdueWOs} />;
}
