import Image from "next/image";
import Link from "next/link";

import { NotificationCenter } from "@/components/layout/notification-center";
import { CommandMenu } from "@/components/command-menu";
import { LivePresence } from "@/components/layout/live-presence";
import { SectionTitle } from "@/components/layout/section-title";
import { UserMenu } from "@/components/layout/user-menu";

export function Header() {
    return (
        <header className="sticky top-0 z-40 border-b bg-background">
            {/* FITT Rainbow: thin brand accent, never on text */}
            <div className="fitt-rainbow-rule" aria-hidden />
            <div className="flex h-14 items-center gap-3 px-4 md:px-6">
                {/* On mobile the sidebar is hidden: show the brand here and open the menu from the bottom bar */}
                <Link href="/" className="shrink-0 md:hidden" aria-label="FITT CMMS">
                    <Image src="/brand/FITT-logo-colore.svg" alt="FITT" width={46} height={28} unoptimized priority />
                </Link>

                <div className="hidden min-w-0 shrink-0 md:block md:w-40 lg:w-56">
                    <SectionTitle />
                </div>

                <div className="flex min-w-0 flex-1 justify-center">
                    <CommandMenu />
                </div>

                <div className="flex shrink-0 items-center gap-1 md:gap-2">
                    <div className="hidden lg:block">
                        <LivePresence />
                    </div>
                    <NotificationCenter />
                    <UserMenu />
                </div>
            </div>
        </header>
    );
}
