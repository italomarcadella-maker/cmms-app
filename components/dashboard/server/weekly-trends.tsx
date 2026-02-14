
import { getWorkOrderTrends } from "@/lib/dashboard-actions";
import { WeeklyTrendsChart } from "@/components/dashboard/weekly-trends-chart";

export async function WeeklyTrends() {
    const trends = await getWorkOrderTrends(7);
    return <WeeklyTrendsChart data={trends} />;
}
