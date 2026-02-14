
import { getMaintenanceMetrics } from "@/lib/dashboard-actions";
import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";

export async function AnalyticsWrapper() {
    const metrics = await getMaintenanceMetrics();
    return <AnalyticsCharts data={metrics} />;
}
