"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { ENGINEERING, SUPERVISION, hasRole } from "@/lib/roles";
import { PermitsOverview } from "@/components/work-permits/permits-overview";
import { useT } from "@/lib/i18n/client";

export default function PermitsPage() {
    const t = useT();
    const { user, isLoading } = useAuth();
    const role = user?.role;
    const allowed = hasRole(role, ENGINEERING);

    return (
        <div className="mx-auto max-w-5xl space-y-2">
            <PageHeader
                title={t("Permessi di lavoro")}
                description={hasRole(role, SUPERVISION)
                    ? t("Richieste da approvare, permessi in corso e storico. Qui si gestiscono anche i tipi di permesso, se ne hai il ruolo.")
                    : t("Richieste da approvare, permessi in corso e storico, in sola lettura.")}
                className="mb-4"
            />
            {isLoading ? (
                <Skeleton className="h-40 w-full" />
            ) : !allowed ? (
                <p role="alert" className="rounded-lg border border-transparent bg-warning-soft p-3 text-sm text-warning-strong">
                    {t("Questa pagina è riservata a amministratori, responsabili di plant, supervisor e ingegneri di processo.")}
                </p>
            ) : (
                <PermitsOverview role={role} />
            )}
        </div>
    );
}
