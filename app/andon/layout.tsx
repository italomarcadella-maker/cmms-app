export default function AndonLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Force dark mode style for Andon
    return (
        <div className="min-h-screen bg-black text-white selection:bg-yellow-500 selection:text-black">
            <header className="border-b border-gray-800 p-6 flex justify-between items-center bg-zinc-900">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase text-yellow-500">Andon Live</h1>
                    <p className="text-gray-400 text-lg">Reparto Produzione A</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-mono font-bold" id="clock">
                        {/* Client clock would go here, server time for now */}
                        --:--
                    </div>
                </div>
            </header>
            <main className="p-6 h-[calc(100vh-100px)]">
                {children}
            </main>
        </div>
    );
}
