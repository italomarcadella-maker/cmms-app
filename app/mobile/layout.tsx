import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Home, Monitor, ScanLine } from "lucide-react";

import { auth } from "@/auth";

const navItems = [
    { href: "/mobile", label: "Home", icon: Home },
    { href: "/mobile/scan", label: "Scansiona", icon: ScanLine },
    // The desktop dashboard lives at "/" (the (dashboard) route group adds no URL segment)
    { href: "/", label: "Desktop", icon: Monitor },
];

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const initial = session.user.name?.charAt(0) || "U";

    return (
        <div className="min-h-screen bg-canvas pb-20">
            <header className="sticky top-0 z-30 border-b bg-background">
                <div className="fitt-rainbow-rule" aria-hidden />
                <div className="flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <Image src="/brand/FITT-logo-colore.svg" alt="FITT" width={46} height={28} unoptimized priority />
                        <span className="border-l pl-3 text-sm font-semibold">CMMS Mobile</span>
                    </div>
                    <div
                        aria-label={session.user.name ?? "Utente"}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold uppercase text-primary-foreground"
                    >
                        {initial}
                    </div>
                </div>
            </header>

            <main className="p-4">{children}</main>

            <nav
                aria-label="Navigazione mobile"
                className="bottom-nav fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t bg-background text-xs text-muted-foreground"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
                {navItems.map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href} className="flex min-w-16 flex-col items-center gap-1 rounded-lg p-2 font-medium transition-colors hover:text-primary">
                        <Icon className="h-6 w-6" />
                        {label}
                    </Link>
                ))}
            </nav>
        </div>
    );
}
