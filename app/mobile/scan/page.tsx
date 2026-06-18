import { prisma } from "@/lib/prisma";
import { ScannerClient } from "@/components/mobile/scanner-client";

export const dynamic = "force-dynamic";

export default async function MobileScannerPage() {
    // Fetch all active assets from the database to supply the scanner simulation list
    const assets = await prisma.asset.findMany({
        select: {
            id: true,
            name: true,
            model: true,
            serialNumber: true,
            location: true,
            status: true,
        },
        orderBy: {
            name: "asc",
        },
    });

    return (
        <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-500">
            <div>
                <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">Scanner Impianti QR</h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Scansiona il tag industriale di un macchinario o carica una foto per accedere ai comandi rapidi di manutenzione.
                </p>
            </div>

            <ScannerClient assets={assets} />
        </div>
    );
}
