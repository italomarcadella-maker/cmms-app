import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Home, Monitor, ScanLine } from "lucide-react";

import { auth } from "@/auth";
import { LanguageSelect } from "@/components/i18n/language-switcher";
import { MobileNotifications } from "@/components/mobile/mobile-notifications";
import { PushToggle } from "@/components/notifications/push-toggle";
import { getT } from "@/lib/i18n/server";
import { tk } from "@/lib/i18n/translate";

// Il collegamento "Versione completa" porta alla versione desktop e, con ?desktop=1, il middleware ricorda la scelta per 30 giorni:
// senza questo parametro un manutentore da smartphone verrebbe riportato qui. `prefetch={false}` e' obbligatorio: la richiesta
// anticipata passerebbe dal middleware e scriverebbe il cookie senza che l'utente abbia toccato il collegamento.
const navItems = [
    { href: "/mobile", label: tk("Home"), icon: Home, prefetch: true },
    { href: "/mobile/scan", label: tk("Scansiona"), icon: ScanLine, prefetch: true },
    { href: "/?desktop=1", label: tk("Versione completa"), icon: Monitor, prefetch: false },
];

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    if (!session?.user) redirect("/login");
    const { t } = await getT();

    const initial = session.user.name?.charAt(0) || "U";

    return (
        <div className="min-h-screen bg-canvas pb-24">
            <header className="sticky top-0 z-30 border-b bg-background">
                <div className="fitt-rainbow-rule" aria-hidden />
                <div className="flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <Image src="/brand/FITT-logo-colore.svg" alt="FITT" width={46} height={28} unoptimized priority />
                        <span className="border-l pl-3 text-sm font-semibold">CMMS Mobile</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <LanguageSelect />
                        <MobileNotifications />
                        <div
                            aria-label={session.user.name ?? t("Utente")}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold uppercase text-primary-foreground"
                        >
                            {initial}
                        </div>
                    </div>
                </div>
            </header>

            <main className="p-4">
                <PushToggle variant="banner" />
                {children}
            </main>

            <nav
                aria-label={t("Navigazione mobile")}
                className="bottom-nav fixed inset-x-0 bottom-0 z-40 flex min-h-16 items-center justify-around border-t bg-background text-xs text-muted-foreground"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
                {navItems.map(({ href, label, icon: Icon, prefetch }) => (
                    <Link
                        key={href}
                        href={href}
                        prefetch={prefetch}
                        className="flex min-h-[48px] min-w-16 flex-col items-center justify-center gap-1 rounded-lg p-2 text-center font-medium transition-colors hover:text-primary active:bg-accent"
                    >
                        <Icon className="h-6 w-6" aria-hidden />
                        {t(label)}
                    </Link>
                ))}
            </nav>
        </div>
    );
}
