import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { NotificationCenter } from "@/components/layout/notification-center";


import { CommandMenu } from "@/components/command-menu";

import { MobileMenu } from "@/components/layout/mobile-menu";

export async function Header() {
    const session = await auth();

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
            <div className="flex flex-1 items-center justify-between">
                <div className="flex items-center gap-2 md:gap-4">
                    <MobileMenu />
                    <h1 className="text-lg font-semibold md:text-xl">Dashboard</h1>
                    <CommandMenu />
                </div>

                <div className="flex items-center gap-3">


                    <div className="h-6 w-px bg-muted mx-1" />

                    <NotificationCenter />

                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-2">
                        <span className="hidden sm:inline-block">
                            {session?.user?.name || 'Utente'}
                        </span>
                    </div>

                    <form
                        action={async () => {
                            "use server";
                            await signOut({ redirectTo: '/login' });
                        }}
                    >
                        <Button variant="ghost" size="icon" title="Logout" className="text-muted-foreground hover:text-red-600">
                            <LogOut className="h-4 w-4" />
                            <span className="sr-only">Logout</span>
                        </Button>
                    </form>
                </div>
            </div>
        </header>
    );
}
