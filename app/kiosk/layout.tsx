export default function KioskLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Simple Header */}
            <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
                <h1 className="text-xl font-bold tracking-widest uppercase">CMMS Kiosk</h1>
                <div className="text-sm opacity-70">Terminale Linea 1</div>
            </header>
            <main className="flex-1 p-4 md:p-8">
                {children}
            </main>
        </div>
    );
}
