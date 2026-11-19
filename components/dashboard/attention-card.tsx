import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AttentionItem, AttentionSeverity } from "@/modules/maintenance/adapters/actions/attention-actions";

const DOT: Record<AttentionSeverity, string> = {
    critical: "bg-critical",
    warning: "bg-warning",
    info: "bg-info",
};

/** Le poche cose da guardare subito, in ordine di gravità. */
export function AttentionCard({ items }: { items: AttentionItem[] }) {
    const urgent = items.filter(i => i.severity !== "info").length;

    return (
        <Card className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Richiede attenzione</h3>
                {urgent > 0 && <Badge variant="critical">{urgent}</Badge>}
            </div>

            {items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
                    <CheckCircle2 className="h-8 w-8 text-success-strong" aria-hidden />
                    <p className="text-sm font-medium">Tutto sotto controllo</p>
                    <p className="max-w-[220px] text-xs text-muted-foreground">Nessun fermo, ritardo o scadenza da seguire in questo momento.</p>
                </div>
            ) : (
                <ul className="-mx-2 divide-y">
                    {items.map(item => (
                        <li key={item.id}>
                            <Link href={item.href} className="group flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/50">
                                <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", DOT[item.severity])} aria-hidden />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium group-hover:text-primary">{item.title}</span>
                                    {item.detail && <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>}
                                </span>
                                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
