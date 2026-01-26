"use client";

import { useState } from "react";
import { AssetSelector } from "@/components/assets/asset-selector";
import { RequestForm } from "@/components/requests/request-form";
import { useAssets } from "@/lib/assets-context";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Asset } from "@/lib/types";

type Step = 'SELECT_ASSET' | 'FILL_FORM';

export function RequestWizard() {
    const { assets } = useAssets(); // Fetch assets here to pass down
    const [step, setStep] = useState<Step>('SELECT_ASSET');
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    const handleAssetSelect = (asset: Asset) => {
        setSelectedAsset(asset);
        setStep('FILL_FORM');
    };

    const handleBack = () => {
        // If in form, go back to selection. If in selection, let page handle back (or do nothing)
        setStep('SELECT_ASSET');
        setSelectedAsset(null);
    };

    return (
        <div className="space-y-6">
            {step === 'SELECT_ASSET' && (
                <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold mb-1">Passo 1: Seleziona il Macchinario</h2>
                        <p className="text-sm text-muted-foreground">Cerca o naviga per trovare l'asset su cui richiedere intervento.</p>
                    </div>
                    <AssetSelector assets={assets} onSelect={handleAssetSelect} />
                </div>
            )}

            {step === 'FILL_FORM' && selectedAsset && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <button
                        onClick={handleBack}
                        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Cambia Asset
                    </button>

                    <div className="mb-6 p-4 bg-muted/30 border rounded-lg flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded text-primary">
                            {/* Icon placeholder */}
                            <div className="h-5 w-5 font-bold text-center">A</div>
                        </div>
                        <div>
                            <p className="font-semibold text-sm">Asset Selezionato: {selectedAsset.name}</p>
                            <p className="text-xs text-muted-foreground">{selectedAsset.serialNumber} • {selectedAsset.location}</p>
                        </div>
                    </div>

                    <RequestForm
                        initialAssetId={selectedAsset.id}
                        onCancel={handleBack}
                    />
                </div>
            )}
        </div>
    );
}
