"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, ClipboardList, Home, Menu, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { tk } from "@/lib/i18n/translate";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";

const tabs = [
    { href: "/", label: tk("Home"), icon: Home },
    { href: "/work-orders", label: tk("Ordini"), icon: ClipboardList },
    { href: "/assets", label: tk("Asset"), icon: Box },
] as const;

/** Mobile bottom bar. The only entry point to the full menu on small screens. */
export function BottomNav() {
    const t = useT();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(path + "/"));

    const tabClass = (active: boolean) =>
        cn(
            "flex min-w-14 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors",
            active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        );

    return (
        <nav
            aria-label={t("Navigazione rapida")}
            className="bottom-nav fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t bg-background px-2 md:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            {tabs.slice(0, 2).map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={tabClass(isActive(href))} aria-current={isActive(href) ? "page" : undefined}>
                    <Icon className="h-5 w-5" />
                    {t(label)}
                </Link>
            ))}

            <Link href="/requests/new" className="-mt-5 flex flex-col items-center gap-1" aria-label={t("Nuova richiesta")}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-md">
                    <Plus className="h-6 w-6" />
                </span>
                <span className="text-[11px] font-medium text-primary">{t("Nuova")}</span>
            </Link>

            {tabs.slice(2).map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={tabClass(isActive(href))} aria-current={isActive(href) ? "page" : undefined}>
                    <Icon className="h-5 w-5" />
                    {t(label)}
                </Link>
            ))}

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                    <button type="button" className={tabClass(false)}>
                        <Menu className="h-5 w-5" />
                        {t("Menu")}
                    </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 border-none bg-sidebar p-0 [&>button]:text-sidebar-foreground">
                    <SheetTitle className="sr-only">{t("Menu di navigazione")}</SheetTitle>
                    <Sidebar mobile onNavigate={() => setMenuOpen(false)} />
                </SheetContent>
            </Sheet>
        </nav>
    );
}
