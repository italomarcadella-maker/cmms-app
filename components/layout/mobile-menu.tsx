"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export function MobileMenu() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden mr-2">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
                <div className="flex items-center gap-2 p-4 border-b bg-sidebar text-sidebar-foreground">
                    <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
                        <Menu className="h-5 w-5" />
                    </div>
                    <span className="font-bold tracking-tight">Menu Navigazione</span>
                </div>
                <Sidebar className="w-full border-none" onNavigate={() => setOpen(false)} mobile={true} />
            </SheetContent>
        </Sheet>
    );
}
