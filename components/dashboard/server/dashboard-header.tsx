import { PageHeader } from "@/components/ui/page-header";
import { HeaderClock } from "@/components/dashboard/header-clock";

export function DashboardHeader() {
    return (
        <PageHeader
            title="Control Room"
            description="Lo stato dello stabilimento, in tempo reale."
            actions={<HeaderClock />}
        />
    );
}
