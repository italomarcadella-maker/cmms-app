import { getMeters, getEnergyStats } from "@/lib/actions";
import { EnergyDashboard } from "@/components/energy/energy-dashboard";

export default async function EnergyPage() {
    const meters = await getMeters();
    const stats = await getEnergyStats();

    return <EnergyDashboard stats={stats} meters={meters} />;
}
