"use client";

import { Home, PlusCircle, ClipboardList, Box, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MobileMenu } from "./mobile-menu"; // Re-use the sheet trigger? No, MobileMenu has its own trigger button.
// I will need to refactor MobileMenu to expose the Sheet content or just use a custom trigger here. 
// Actually simpler: MobileNav will have a "Menu" button that triggers the EXISTING MobileMenu if I can pass a prop or context.
// Or I can just replicate the SheetTrigger here.

// Let's first inspect MobileMenu imports again.
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";
import { useState } from "react";

export function BottomNav() {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    const isActive = (path: string) => pathname === path || (path !== '/' && pathname.startsWith(path));

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t h-16 flex items-center justify-around px-2 z-50 shadow-[0_-1px_3px_rgba(0,0,0,0.1)] pb-safe-area">
            <Link
                href="/"
                className={cn("flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors", isActive('/') ? "text-primary" : "text-muted-foreground hover:text-foreground")}
            >
                <Home className="h-5 w-5" />
                <span className="text-[10px] font-medium">Home</span>
            </Link>

            <Link
                href="/work-orders"
                className={cn("flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors", isActive('/work-orders') ? "text-primary" : "text-muted-foreground hover:text-foreground")}
            >
                <ClipboardList className="h-5 w-5" />
                <span className="text-[10px] font-medium">Ordini</span>
            </Link>

            <Link
                href="/requests/new"
                className="flex flex-col items-center justify-center -mt-6"
            >
                <div className="bg-primary text-primary-foreground h-12 w-12 rounded-full flex items-center justify-center shadow-lg border-4 border-background hover:scale-105 transition-transform">
                    <PlusCircle className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-medium mt-1 text-primary">Nuova</span>
            </Link>

            <Link
                href="/assets"
                className={cn("flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors", isActive('/assets') ? "text-primary" : "text-muted-foreground hover:text-foreground")}
            >
                <Box className="h-5 w-5" />
                <span className="text-[10px] font-medium">Asset</span>
            </Link>

            {/* Menu Trigger */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                    <button
                        className={cn("flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground")}
                    >
                        <Menu className="h-5 w-5" />
                        <span className="text-[10px] font-medium">Menu</span>
                    </button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                    <Sidebar className="w-full border-none" onNavigate={() => setMenuOpen(false)} />
                </SheetContent>
            </Sheet>
        </div>
    );
}
