import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

import { NotificationBell } from "@/components/notifications/notification-bell";

export async function Header() {
    const session = await auth();

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
            <div className="flex flex-1 items-center justify-between">
                <h1 className="text-lg font-semibold md:text-xl">Dashboard</h1>
                <div className="flex items-center gap-4">
                    <NotificationBell />
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {session?.user?.name || session?.user?.email || 'Utente'}
                    </div>
                    <form
                        action={async () => {
                            "use server";
                            await signOut({ redirectTo: '/login' });
                        }}
                    >
                        <Button variant="ghost" size="icon" title="Logout">
                            <LogOut className="h-4 w-4" />
                            <span className="sr-only">Logout</span>
                        </Button>
                    </form>
                </div>
            </div>
        </header>
    );
}
