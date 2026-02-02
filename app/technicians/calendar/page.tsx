import { Suspense } from "react";
import { TechnicianCalendar } from "@/components/calendar/technician-calendar";
import { MetricCardSkeleton } from "@/components/ui/skeleton";
import { BackToDashboardButton } from "@/components/ui/back-button";

export default function TechnicianCalendarPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <BackToDashboardButton />
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Calendario Presenze</h1>
                <p className="text-muted-foreground">Gestione turni, ferie e malattie del personale tecnico.</p>
            </div>

            <Suspense fallback={<div className="p-12 text-center">Caricamento calendario...</div>}>
                <TechnicianCalendar />
            </Suspense>
        </div>
    );
}
