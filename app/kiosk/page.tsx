"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Wrench, CheckCircle2, Siren, ArrowLeft } from "lucide-react";
import { createWorkOrder } from "@/lib/actions"; // We'll assume a wrapper or direct call
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function KioskPage() {
    const [step, setStep] = useState<'HOME' | 'REPORT_FAULT' | 'SUCCESS'>('HOME');
    const [faultData, setFaultData] = useState({ title: '', description: '', priority: 'MEDIUM' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // Simplified hardcoded values for Kiosk (e.g., Generic Asset if not selected)
            // In real app, we might ask for Asset Code
            const result = await createWorkOrder({
                ...faultData,
                type: 'FAULT',
                assetId: 'KIOSK-GENERIC', // Placeholder, needs handling or simple asset selection
                priority: faultData.priority
            });

            if (result.success) {
                setStep('SUCCESS');
                setTimeout(() => {
                    setStep('HOME');
                    setFaultData({ title: '', description: '', priority: 'MEDIUM' });
                }, 5000);
            } else {
                toast.error("Errore invio richiesta");
            }
        } catch (e) {
            toast.error("Errore di connessione");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 'SUCCESS') {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-8 animate-in zoom-in">
                <div className="bg-green-100 p-8 rounded-full">
                    <CheckCircle2 className="h-32 w-32 text-green-600" />
                </div>
                <h2 className="text-4xl font-bold text-green-800">Richiesta Inviata!</h2>
                <p className="text-xl text-muted-foreground">Un tecnico prenderà in carico la segnalazione.</p>
                <Button size="lg" onClick={() => setStep('HOME')} variant="outline" className="mt-8 text-xl h-16 px-12">
                    Nuova Segnalazione
                </Button>
            </div>
        );
    }

    if (step === 'REPORT_FAULT') {
        return (
            <div className="max-w-2xl mx-auto space-y-8">
                <Button onClick={() => setStep('HOME')} variant="ghost" className="mb-4">
                    <ArrowLeft className="mr-2 h-6 w-6" /> Indietro
                </Button>

                <h2 className="text-3xl font-bold mb-8">Nuova Segnalazione Guasto</h2>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-lg font-medium">Titolo Problema</label>
                        <Input
                            className="text-lg p-6"
                            placeholder="Es. Motore fermo..."
                            value={faultData.title}
                            onChange={e => setFaultData({ ...faultData, title: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-lg font-medium">Descrizione</label>
                        <Textarea
                            className="text-lg p-6 min-h-[150px]"
                            placeholder="Descrivi cosa è successo..."
                            value={faultData.description}
                            onChange={e => setFaultData({ ...faultData, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            type="button"
                            variant={faultData.priority === 'MEDIUM' ? 'default' : 'outline'}
                            className="h-24 text-xl flex-col gap-2"
                            onClick={() => setFaultData({ ...faultData, priority: 'MEDIUM' })}
                        >
                            <Wrench className="h-8 w-8" />
                            Guasto Normale
                        </Button>
                        <Button
                            type="button"
                            variant={faultData.priority === 'STOPPED' ? 'destructive' : 'outline'}
                            className="h-24 text-xl flex-col gap-2"
                            onClick={() => setFaultData({ ...faultData, priority: 'STOPPED' })}
                        >
                            <Siren className="h-8 w-8" />
                            FERMO MACCHINA!
                        </Button>
                    </div>

                    <Button
                        size="lg"
                        className="w-full h-20 text-2xl mt-8 font-bold bg-blue-600 hover:bg-blue-700"
                        onClick={handleSubmit}
                        disabled={!faultData.title || isSubmitting}
                    >
                        {isSubmitting ? "Invio in corso..." : "INVIA SEGNALAZIONE"}
                    </Button>
                </div>
            </div>
        );
    }

    // HOME
    return (
        <div className="grid gap-8 md:grid-cols-2 h-full max-w-5xl mx-auto content-center">

            <button
                onClick={() => setStep('REPORT_FAULT')}
                className="group relative flex flex-col items-center justify-center gap-6 bg-white border-2 border-slate-200 hover:border-red-500 hover:bg-red-50 rounded-3xl p-12 shadow-sm transition-all hover:scale-[1.02] active:scale-95"
            >
                <div className="p-6 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
                    <AlertTriangle className="h-24 w-24 text-red-600" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold text-slate-800">Segnala Guasto</h2>
                    <p className="text-lg text-slate-500">Richiedi un intervento tecnico immediato</p>
                </div>
            </button>

            <button
                onClick={() => toast.info("Funzionalità in arrivo...")}
                className="group relative flex flex-col items-center justify-center gap-6 bg-white border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 rounded-3xl p-12 shadow-sm transition-all hover:scale-[1.02] active:scale-95"
            >
                <div className="p-6 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                    <CheckCircle2 className="h-24 w-24 text-blue-600" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold text-slate-800">Tutto OK</h2>
                    <p className="text-lg text-slate-500">Registra controllo di routine</p>
                </div>
            </button>

        </div>
    );
}
