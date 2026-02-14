
import Link from "next/link";
import { Zap, ClipboardList } from "lucide-react";

export function QuickActions() {
    return (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">Azioni Rapide</h3>
            <div className="space-y-2">
                <Link href="/requests/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-input">
                    <div className="bg-primary/10 p-2 rounded-md text-primary">
                        <Zap className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                        <div className="font-medium text-sm">Nuova Segnalazione</div>
                        <div className="text-xs text-muted-foreground">Segnala un guasto urgente</div>
                    </div>
                </Link>
                <Link href="/work-orders/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-input">
                    <div className="bg-blue-500/10 p-2 rounded-md text-blue-500">
                        <ClipboardList className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                        <div className="font-medium text-sm">Crea Ordine</div>
                        <div className="text-xs text-muted-foreground">Pianifica manutenzione</div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
