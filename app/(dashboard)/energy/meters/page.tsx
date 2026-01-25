import { getMeters } from "@/lib/actions";
import { MetersList } from "@/components/energy/meters-list";

export default async function Page() {
    const meters = await getMeters();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Anagrafica Contatori
                </h1>
                <p className="text-muted-foreground mt-1">Gestisci i dispositivi di misurazione.</p>
            </div>

            <MetersList initialMeters={meters} />
        </div>
    );
}
