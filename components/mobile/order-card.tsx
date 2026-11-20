import Link from "next/link";
import { CalendarClock, MapPin, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PriorityPill, WorkOrderStatusPill } from "@/components/ui/status-badge";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import type { MobileOrderCard } from "@/lib/mobile-data";

/**
 * Scheda di un ordine nella home mobile. Tutta la scheda e' un collegamento alla scheda mobile dell'ordine
 * (area di tocco ben oltre 44 px); `children` (es. "Prendi in carico") sta sotto, fuori dal collegamento.
 */
export async function OrderCard({ order, children }: { order: MobileOrderCard; children?: React.ReactNode }) {
    const { t, format: fmt } = await getT();
    const overdue = order.overdue;
    const dueDay = order.dueDate ? fmt.date(order.dueDate, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Rome" }) : "";
    return (
        <li className={cn("overflow-hidden rounded-xl border bg-card", order.isNew && "border-primary ring-1 ring-primary")}>
            <Link
                href={`/mobile/orders/${order.id}`}
                className="block min-h-[44px] space-y-2 p-4 transition-colors active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <div className="flex flex-wrap items-center gap-2">
                    {order.isNew && <Badge>{t("Nuovo")}</Badge>}
                    <PriorityPill priority={order.priority} />
                    <WorkOrderStatusPill status={order.status} />
                </div>
                <h3 className="text-base font-semibold leading-snug">{order.title}</h3>
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{order.assetName}{order.location ? ` · ${order.location}` : ""}</span>
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className={cn("flex items-center gap-1.5", overdue ? "font-medium text-critical-strong" : "text-muted-foreground")}>
                        <CalendarClock className="h-4 w-4" aria-hidden />
                        {order.dueDate ? (overdue ? t("Scaduto il {date}", { date: dueDay }) : t("Scadenza {date}", { date: dueDay })) : t("Nessuna scadenza")}
                    </span>
                    {order.assignee && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <User className="h-4 w-4" aria-hidden />{order.assignee}
                        </span>
                    )}
                </div>
            </Link>
            {children && <div className="border-t p-3">{children}</div>}
        </li>
    );
}
