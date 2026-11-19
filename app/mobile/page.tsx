import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, ClipboardList, ScanLine, Sparkles, TriangleAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ClaimButton } from "@/components/mobile/claim-button";
import { OrderCard } from "@/components/mobile/order-card";
import { loadMobileHome } from "@/lib/mobile-data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Counter({ label, value, tone }: { label: string; value: number; tone?: "critical" | "info" }) {
    return (
        <div className="flex-1 rounded-lg border bg-card p-3 text-center">
            <div className={cn("text-2xl font-bold tabular-nums", tone === "critical" && value > 0 && "text-critical-strong", tone === "info" && value > 0 && "text-info-strong")}>{value}</div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        </div>
    );
}

export default async function MobileHomePage() {
    const home = await loadMobileHome();
    if (!home) redirect("/login");

    const firstName = home.userName.trim().split(/\s+/)[0] || "";
    const mineTitle = home.isMaintainer ? "Le mie attività" : "Attività in corso";

    return (
        <div className="space-y-6">
            {/* Saluto e contatori */}
            <section aria-label="Riepilogo" className="space-y-3">
                <div>
                    <h1 className="text-2xl font-bold">{firstName ? `Ciao, ${firstName}` : "Ciao"}</h1>
                    <p className="text-sm text-muted-foreground">
                        {home.isMaintainer ? "Ecco le attività assegnate a te." : "Ecco le attività in corso nel tuo stabilimento."}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Counter label="Da fare" value={home.counts.todo} />
                    <Counter label="Urgenti" value={home.counts.urgent} tone="critical" />
                    <Counter label="Nuove" value={home.counts.fresh} tone="info" />
                </div>
            </section>

            {home.missingTechnician && (
                <Card className="flex items-start gap-3 border-warning p-4" role="alert">
                    <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning-strong" aria-hidden />
                    <p className="text-sm">
                        Il tuo profilo di tecnico non è ancora configurato: non puoi ricevere né prendere in carico ordini. Chiedi al supervisore di completarlo.
                    </p>
                </Card>
            )}

            {/* Azioni rapide */}
            <section aria-label="Azioni rapide" className="grid grid-cols-2 gap-3">
                <Link
                    href="/mobile/scan"
                    className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border bg-card p-3 text-center text-sm font-medium transition-colors active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><ScanLine className="h-6 w-6" aria-hidden /></span>
                    Scansiona QR
                </Link>
                <Link
                    href="/work-orders/new?mobile=true"
                    className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border bg-card p-3 text-center text-sm font-medium transition-colors active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-critical-soft text-critical-strong"><AlertTriangle className="h-6 w-6" aria-hidden /></span>
                    Segnala guasto
                </Link>
            </section>

            {/* Le mie attività */}
            <section aria-label={mineTitle} className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                    {mineTitle}
                    {home.counts.fresh > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                            <Sparkles className="h-3 w-3" aria-hidden />{home.counts.fresh} {home.counts.fresh === 1 ? "nuova" : "nuove"}
                        </span>
                    )}
                </h2>
                {home.mine.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={<CheckCircle2 />}
                            title={home.isMaintainer ? "Nessuna attività assegnata" : "Nessuna attività in corso"}
                            description={home.claimable.length > 0 ? "Puoi prendere in carico uno degli ordini qui sotto." : "Quando te ne verrà assegnata una, la trovi qui."}
                            className="py-8"
                        />
                    </Card>
                ) : (
                    <ul className="space-y-3">
                        {home.mine.map(order => <OrderCard key={order.id} order={order} />)}
                    </ul>
                )}
            </section>

            {/* Da prendere in carico */}
            <section aria-label="Da prendere in carico" className="space-y-3 pb-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" aria-hidden /> Da prendere in carico
                    {home.claimable.length > 0 && <span className="text-sm font-normal text-muted-foreground">({home.claimable.length})</span>}
                </h2>
                {home.claimable.length === 0 ? (
                    <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">Nessun ordine libero al momento.</p>
                ) : (
                    <ul className="space-y-3">
                        {home.claimable.map(order => (
                            <OrderCard key={order.id} order={order}>
                                <ClaimButton orderId={order.id} disabled={home.missingTechnician} />
                            </OrderCard>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
