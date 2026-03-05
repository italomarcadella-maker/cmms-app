"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, AlertTriangle, Activity, Wrench, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DailyMeetingPrintReport({ params }: { params: { id: string } }) {
    const [dateString, setDateString] = useState("");

    useEffect(() => {
        setDateString(new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }, []);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 bg-white text-black min-h-screen print:py-0 print:px-0">
            {/* Action Bar (hidden in print) */}
            <div className="flex justify-end mb-8 print:hidden">
                <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
                    <Printer className="mr-2 h-4 w-4" /> Stampa / Esporta in PDF
                </Button>
            </div>

            {/* Header */}
            <div className="border-b-2 border-black pb-6 mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">Verbale Daily Meeting</h1>
                    <h2 className="text-xl font-medium text-gray-600 mt-1">Reparto: Retinato (Demo)</h2>
                    <p className="text-sm mt-3 text-gray-500">Documento ID: {params.id}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg">{dateString}</p>
                    <p className="text-sm text-gray-500">Supervisore Corrente</p>
                </div>
            </div>

            {/* Body Sections */}
            <div className="space-y-8">

                {/* Safety */}
                <section className="border border-gray-200 rounded-xl overflow-hidden print:border-black">
                    <div className="bg-gray-100 p-3 border-b border-gray-200 flex items-center print:bg-white print:border-black">
                        <ShieldCheck className="h-5 w-5 mr-2 stroke-2" />
                        <h3 className="font-bold text-lg uppercase tracking-wide">1. Salute, Sicurezza e Ambiente</h3>
                    </div>
                    <div className="p-4">
                        <p className="italic text-gray-700">"Nessun incidente segnalato. Tutto regolare."</p>
                        <div className="mt-4 pt-4 border-t border-dashed">
                            <p className="text-sm font-semibold">Action Items & EWO:</p>
                            <ul className="list-disc pl-5 mt-2 text-sm">
                                <li>Controllare l'estintore n°12 (Assegnato: Manutenzione)</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Quality */}
                <section className="border border-gray-200 rounded-xl overflow-hidden print:border-black">
                    <div className="bg-gray-100 p-3 border-b border-gray-200 flex items-center print:bg-white print:border-black">
                        <AlertTriangle className="h-5 w-5 mr-2 stroke-2" />
                        <h3 className="font-bold text-lg uppercase tracking-wide">2. Qualità e Non Conformità</h3>
                    </div>
                    <div className="p-4 flex gap-8">
                        <div className="w-1/3 space-y-3">
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Scarti Totali</p>
                                <p className="text-xl font-black">120 kg</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Non Conformità (NC) Aperte</p>
                                <p className="text-xl font-black">2</p>
                            </div>
                        </div>
                        <div className="w-2/3 border-l pl-8">
                            <p className="text-sm font-bold mb-2">Note della discussione:</p>
                            <p className="text-sm italic text-gray-700">Discussione sulle tolleranze del lotto 482B. La deriva termica potrebbe aver causato le variazioni di spessore.</p>
                        </div>
                    </div>
                </section>

                {/* Production */}
                <section className="border border-gray-200 rounded-xl overflow-hidden print:border-black">
                    <div className="bg-gray-100 p-3 border-b border-gray-200 flex items-center print:bg-white print:border-black">
                        <Activity className="h-5 w-5 mr-2 stroke-2" />
                        <h3 className="font-bold text-lg uppercase tracking-wide">3. Avanzamento Produzione</h3>
                    </div>
                    <div className="p-4 flex gap-8">
                        <div className="w-1/3 space-y-3">
                            <div>
                                <p className="text-xs text-gray-500 uppercase">OEE Globale Linea</p>
                                <p className="text-3xl text-indigo-600 font-black print:text-black">88%</p>
                            </div>
                        </div>
                        <div className="w-2/3 border-l pl-8">
                            <p className="text-sm italic text-gray-700">Cambio formato prolungato di 15 minuti oltre lo standard sulla Linea 2 dovuto a mancanza di setup attrezzi preliminare.</p>
                        </div>
                    </div>
                </section>

                {/* Maintenance */}
                <section className="border border-gray-200 rounded-xl overflow-hidden print:border-black">
                    <div className="bg-gray-100 p-3 border-b border-gray-200 flex items-center print:bg-white print:border-black">
                        <Wrench className="h-5 w-5 mr-2 stroke-2" />
                        <h3 className="font-bold text-lg uppercase tracking-wide">4. Interventi di Manutenzione Richiesti</h3>
                    </div>
                    <div className="p-4">
                        <ul className="space-y-3">
                            <li className="flex items-start gap-2 text-sm">
                                <span className="w-4 h-4 rounded border border-black mt-0.5" />
                                <div>
                                    <p className="font-bold">Sostituire cuscinetto sensore di traino</p>
                                    <p className="text-gray-500 text-xs">Richiesto originariamente da: Capoturno. Assegnato a: Officina Elettrica.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-2 text-sm">
                                <span className="w-4 h-4 rounded border border-black mt-0.5" />
                                <div>
                                    <p className="font-bold">Ispezione perdita olio sotto Estrusore B</p>
                                    <p className="text-gray-500 text-xs">Richiesto originariamente da: Qualità. Assegnato a: Meccanici.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </section>
            </div>

            {/* Footer Signatures */}
            <div className="mt-24 pt-8 border-t-2 border-dashed flex justify-between px-12 print:block">
                <div className="text-center print:float-left">
                    <div className="w-48 border-b border-black mb-2" />
                    <p className="text-sm">Firma del Conduttore</p>
                </div>
                <div className="text-center print:float-right">
                    <div className="w-48 border-b border-black mb-2" />
                    <p className="text-sm">Visto Reparto Manutenzione</p>
                </div>
            </div>

            <style jsx global>{`
              @media print {
                  @page { size: A4 portrait; margin: 1cm; }
                  body { background: white !important; font-size: 12pt; }
                  .lucide { width: 1.2rem; height: 1.2rem; stroke-width: 2.5; }
              }
            `}</style>
        </div>
    );
}
