import { getSafetyCounter } from "@/modules/maintenance/adapters/actions/safety-actions";
import { InjuryCounter } from "@/components/dashboard/injury-counter";

export async function SafetyCounterWidget() {
    const data = await getSafetyCounter();
    return <InjuryCounter data={data} />;
}
