"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintLayoutProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export function PrintLayout({ title, subtitle, children }: PrintLayoutProps) {
    return (
        <div className="bg-white min-h-screen text-black relative">
            {/* Screen Actions - Hidden on Print */}
            <div className="print:hidden fixed top-20 right-8 z-50">
                <Button onClick={() => window.print()} className="shadow-lg">
                    <Printer className="mr-2 h-4 w-4" />
                    Stampa / PDF
                </Button>
            </div>

            {/* Print Content */}
            <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">
                <header className="mb-8 border-b pb-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>
                        {subtitle && <p className="text-gray-500 font-medium">{subtitle}</p>}
                    </div>
                    <div className="text-right text-xs text-gray-400">
                        <p>Generato da CMMS 2.0</p>
                        <p>{new Date().toLocaleDateString('it-IT')} {new Date().toLocaleTimeString('it-IT')}</p>
                    </div>
                </header>

                <main>
                    {children}
                </main>

                <footer className="mt-12 pt-4 border-t text-center text-xs text-gray-400 print:fixed print:bottom-4 print:w-full print:border-t-0">
                    <p>Documento generato automaticamente. Firma per approvazione: __________________________</p>
                </footer>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 1.5cm;
                    }
                    body {
                        background: white;
                        color: black;
                    }
                    /* Ensure tables capture full width */
                    table {
                        width: 100%;
                    }
                    /* Hide Dashboard UI Elements if leaked */
                    nav, aside, header.sticky {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
