
import { getAssets } from "@/lib/actions";
import { FactoryMap } from "@/components/dashboard/factory-map";

export async function FactoryMapWrapper() {
    const assets = await getAssets();
    return <FactoryMap assets={assets} />;
}
