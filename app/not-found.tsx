import Link from "next/link";

import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
    const { t } = await getT();
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
            <h2 className="text-xl font-semibold">{t("Pagina non trovata")}</h2>
            <p className="max-w-md text-sm text-muted-foreground">{t("L'indirizzo non esiste oppure non hai i permessi per vederlo.")}</p>
            <Link href="/" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                {t("Torna alla dashboard")}
            </Link>
        </div>
    );
}
