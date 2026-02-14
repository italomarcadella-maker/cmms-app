
import { getDailyInsights } from "@/lib/ai-service";
import { AIDailyBrief } from "@/components/dashboard/ai-daily-brief";

export async function AIInsightsWrapper() {
    const insights = await getDailyInsights();
    return <AIDailyBrief initialInsights={insights} />;
}
