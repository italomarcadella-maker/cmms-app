import { getAttentionItems } from "@/modules/maintenance/adapters/actions/attention-actions";
import { AttentionCard } from "@/components/dashboard/attention-card";

export async function AttentionWidget() {
    const items = await getAttentionItems();
    return <AttentionCard items={items} />;
}
