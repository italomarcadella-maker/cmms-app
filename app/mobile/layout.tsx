import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button"; // Assuming available or I will create a simple button

export default async function MobileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Minimal Mobile Header */}
            <header className="bg-white border-b sticky top-0 z-30 px-4 h-16 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2 font-bold text-lg text-blue-600">
                    <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                        <Wrench className="h-5 w-5" />
                    </div>
                    CMMS Mobile
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700 uppercase">
                    {session.user.name?.charAt(0) || "U"}
                </div>
            </header>

            <main className="p-4">
                {children}
            </main>

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t h-16 z-40 flex justify-around items-center text-xs text-muted-foreground shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
                <Link href="/mobile" className="flex flex-col items-center gap-1 p-2 hover:text-blue-600 transition-colors">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Home
                </Link>
                <Link href="/mobile/scan" className="flex flex-col items-center gap-1 p-2 hover:text-blue-600 transition-colors">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    Scan
                </Link>
                <Link href="/dashboard" className="flex flex-col items-center gap-1 p-2 hover:text-blue-600 transition-colors">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Desktop
                </Link>
            </nav>
        </div>
    );
}
