"use client";

import { useState } from "react";
import { AssetSelector } from "@/components/assets/asset-selector";
import { RequestForm } from "@/components/requests/request-form";
import { useAssets } from "@/lib/assets-context";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Asset } from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = 'SELECT_ASSET' | 'FILL_FORM';

export function RequestWizard() {
    const { assets } = useAssets();
    const [step, setStep] = useState<Step>('SELECT_ASSET');
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    const handleAssetSelect = (asset: Asset) => {
        setSelectedAsset(asset);
        setStep('FILL_FORM');
    };

    const handleBack = () => {
        setStep('SELECT_ASSET');
        setSelectedAsset(null);
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Progress Steps */}
            <div className="flex items-center justify-center w-full mb-8">
                <div className="flex items-center">
                    <div className={cn("flex items-center gap-2", step === 'SELECT_ASSET' ? "text-primary font-bold" : "text-primary/70")}>
                        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all", step === 'SELECT_ASSET' ? "border-primary bg-primary text-primary-foreground" : "border-primary bg-primary text-primary-foreground")}>
                            1
                        </div>
                        <span>Seleziona Asset</span>
                    </div>
                    <div className="w-16 h-[2px] bg-muted mx-4 relative overflow-hidden">
                        <div className={cn("absolute inset-y-0 left-0 bg-primary transition-all duration-500 ease-in-out", step === 'FILL_FORM' ? "w-full" : "w-0")} />
                    </div>
                    <div className={cn("flex items-center gap-2 transition-colors", step === 'FILL_FORM' ? "text-primary font-bold" : "text-muted-foreground")}>
                        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all", step === 'FILL_FORM' ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground")}>
                            2
                        </div>
                        <span>Dettagli Richiesta</span>
                    </div>
                </div>
            </div>

            <div className="relative min-h-[500px]">
                {step === 'SELECT_ASSET' && (
                    <div className="animate-in fade-in slide-in-from-left-8 duration-500 ease-out fill-mode-both">
                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-bold mb-2">Seleziona il Macchinario</h2>
                            <p className="text-muted-foreground">Cerca o naviga tra i reparti per trovare l'asset su cui richiedere intervento.</p>
                        </div>
                        <AssetSelector assets={assets} onSelect={handleAssetSelect} />
                    </div>
                )}

                {step === 'FILL_FORM' && selectedAsset && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500 ease-out fill-mode-both">
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            className="mb-6 hover:bg-muted/50"
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Torna alla selezione
                        </Button>

                        <div className="grid md:grid-cols-[300px_1fr] gap-8 items-start">
                            {/* Asset Summary Card */}
                            <div className="bg-muted/30 p-6 rounded-xl border space-y-4 sticky top-4">
                                <div>
                                    <h3 className="font-semibold text-lg text-foreground/80 mb-1">Asset Selezionato</h3>
                                    <div className="h-1 w-10 bg-primary rounded-full" />
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Nome Asset</p>
                                        <p className="font-medium text-lg">{selectedAsset.name}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Seriale</p>
                                            <p className="text-sm font-mono bg-background p-1 px-2 rounded border inline-block">{selectedAsset.serialNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Modello</p>
                                            <p className="text-sm">{selectedAsset.model}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Posizione</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {selectedAsset.plant && <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">{selectedAsset.plant}</span>}
                                            {selectedAsset.department && <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-xs px-2 py-0.5 rounded-full">{selectedAsset.department}</span>}
                                            <span className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">{selectedAsset.location}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Form Area */}
                            <div className="bg-card border rounded-xl shadow-sm p-6">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <span className="bg-primary/10 text-primary p-1.5 rounded-lg">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </span>
                                    Compila Dettagli Richiesta
                                </h2>
                                <RequestForm
                                    initialAssetId={selectedAsset.id}
                                    onCancel={handleBack}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
