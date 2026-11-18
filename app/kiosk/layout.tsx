import Image from "next/image";

export default function KioskLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-canvas">
            <header className="bg-sidebar text-sidebar-accent-foreground shadow-md">
                <div className="fitt-rainbow-rule" aria-hidden />
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                        <Image src="/brand/FITT-logo-bianco.svg" alt="FITT" width={52} height={32} unoptimized priority />
                        <h1 className="border-l border-sidebar-border pl-4 text-lg font-semibold">CMMS Kiosk</h1>
                    </div>
                    <div className="text-sm text-sidebar-foreground/70">Terminale di reparto</div>
                </div>
            </header>
            <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
    );
}
