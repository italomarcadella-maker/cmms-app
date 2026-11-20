import Image from "next/image";

import { LiveClock } from "@/components/andon/live-clock";
import { getT } from "@/lib/i18n/server";

export default async function AndonLayout({ children }: { children: React.ReactNode }) {
    const { t } = await getT();
    // Andon is a dark display by design (shop-floor screens, readable from a distance)
    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-white">
            <header className="border-b border-sidebar-border bg-sidebar">
                <div className="fitt-rainbow-rule" aria-hidden />
                <div className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-5">
                        <Image src="/brand/FITT-logo-bianco.svg" alt="FITT" width={78} height={48} unoptimized priority />
                        <div className="border-l border-sidebar-border pl-5">
                            <h1 className="text-3xl font-bold tracking-tight">Andon</h1>
                            <p className="text-base text-zinc-400">{t("Stato degli impianti in tempo reale")}</p>
                        </div>
                    </div>
                    <LiveClock />
                </div>
            </header>
            <main className="h-[calc(100vh-130px)] p-6">{children}</main>
        </div>
    );
}
