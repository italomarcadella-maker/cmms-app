"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlant } from "@/lib/plant-context";
import { useT } from "@/lib/i18n/client";
import { SkillMatrixView } from "@/components/technicians/skill-matrix";
import { getSkillMatrix, type SkillMatrix } from "@/modules/maintenance/adapters/actions/skill-matrix-actions";

export default function SkillMatrixPage() {
    const t = useT();
    const { selected } = usePlant();
    const [version, setVersion] = useState(0);
    const [data, setData] = useState<SkillMatrix | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let alive = true;
        getSkillMatrix()
            .then(d => { if (alive) { setData(d); setFailed(false); } })
            .catch(e => { console.error(e); if (alive) setFailed(true); });
        return () => { alive = false; };
    }, [version, selected]);

    return (
        <div className="mx-auto max-w-7xl space-y-2">
            <PageHeader
                title={t("Matrice competenze")}
                description={t("Abilitazioni con scadenza e livelli di competenza di ogni tecnico, in un'unica griglia.")}
                breadcrumb={[{ label: t("Team tecnico"), href: "/technicians" }, { label: t("Matrice competenze") }]}
                className="mb-4"
            />
            {failed ? (
                <p role="alert" className="rounded-lg border border-transparent bg-critical-soft p-3 text-sm text-critical-strong">
                    {t("Impossibile caricare la matrice. Riprova tra qualche istante.")}
                </p>
            ) : data === null ? (
                <div className="space-y-3" aria-busy="true">
                    <Skeleton className="h-10 w-full max-w-xl" />
                    <Skeleton className="h-72 w-full" />
                </div>
            ) : (
                <SkillMatrixView initial={data} onReload={() => setVersion(v => v + 1)} />
            )}
        </div>
    );
}
