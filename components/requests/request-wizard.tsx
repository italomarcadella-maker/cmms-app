"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Lightbulb, Wrench, Package, Factory, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { RequestForm } from "./request-form";
import { Button } from "@/components/ui/button";

// Categories Configuration
const CATEGORIES = [
    {
        id: 'safety',
        label: 'Sicurezza',
        description: 'Segnala un pericolo o un problema di sicurezza.',
        icon: ShieldAlert,
        color: 'text-red-500',
        virtualAssetId: 'SYS-SAFETY',
        categoryType: 'SAFETY'
    },
    {
        id: 'kaizen',
        label: 'Quick Kaizen',
        description: 'Proponi un miglioramento rapido.',
        icon: Lightbulb,
        color: 'text-yellow-500',
        virtualAssetId: 'SYS-KAIZEN',
        categoryType: 'KAIZEN'
    },
    {
        id: 'plant',
        label: 'Impianti',
        description: 'Manutenzione generale stabilimento (Luce, Acqua, Aria).',
        icon: Factory,
        color: 'text-green-600',
        virtualAssetId: 'SYS-PLANT',
        categoryType: 'PLANT'
    },
    {
        id: 'workshop',
        label: 'Officina',
        description: 'Richiesta di lavorazione meccanica.',
        icon: Wrench,
        color: 'text-blue-500',
        virtualAssetId: 'SYS-WORKSHOP',
        categoryType: 'WORKSHOP'
    },
    {
        id: 'other',
        label: 'Altro',
        description: 'Altre richieste generiche.',
        icon: Package,
        color: 'text-gray-500',
        virtualAssetId: 'SYS-OTHER',
        categoryType: 'OTHER'
    },
    {
        id: 'production',
        label: 'Linee Produttive',
        description: 'Guasto su un macchinario specifico.',
        icon: Factory,
        color: 'text-purple-500',
        virtualAssetId: null, // Requires selection
        categoryType: 'MAINTENANCE'
    }
];

export function RequestWizard() {
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[0] | null>(null);

    const handleCategorySelect = (category: typeof CATEGORIES[0]) => {
        setSelectedCategory(category);
        setStep(2);
    };

    const handleBack = () => {
        setStep(1);
        setSelectedCategory(null);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 transition-all">
            {step === 1 ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center space-y-2 mb-8">
                        <h1 className="text-3xl font-bold tracking-tight">Nuova Richiesta</h1>
                        <p className="text-muted-foreground">Seleziona la tipologia di richiesta per procedere</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {CATEGORIES.map((cat) => (
                            <Card
                                key={cat.id}
                                className={cn(
                                    "cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 border-2 border-transparent hover:border-primary/20",
                                )}
                                onClick={() => handleCategorySelect(cat)}
                            >
                                <CardHeader className="space-y-1">
                                    <div className={cn("p-2 w-fit rounded-lg bg-muted mb-2", cat.color.replace('text-', 'bg-') + '/10')}>
                                        <cat.icon className={cn("h-6 w-6", cat.color)} />
                                    </div>
                                    <CardTitle className="text-xl">{cat.label}</CardTitle>
                                    <CardDescription>{cat.description}</CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="mb-6 flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1 pl-0 text-muted-foreground hover:text-foreground">
                            <ChevronLeft className="h-4 w-4" /> Indietro
                        </Button>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-semibold">{selectedCategory?.label}</span>
                    </div>

                    <RequestForm
                        initialCategory={selectedCategory?.categoryType}
                        initialAssetId={selectedCategory?.virtualAssetId || undefined}
                        forceAssetSelection={selectedCategory?.id === 'production'}
                        onCancel={handleBack}
                    />
                </div>
            )}
        </div>
    );
}
