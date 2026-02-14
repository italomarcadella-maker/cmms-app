
import { getRecentWorkOrders } from "@/lib/dashboard-actions";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";

export async function RecentActivity() {
    const recentWOs = await getRecentWorkOrders(5);
    return <RecentActivityList recentWOs={recentWOs} />;
}
