"use client";

import { useState } from "react";
import { generateMaintenanceSuggestions } from "@/lib/ai-service";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AISuggestionsProps {
    assetId: string;
}

export function AISuggestions({ assetId }: AISuggestionsProps) {
    const [suggestions, setSuggestions] = useState<string[] | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGetSuggestions = async () => {
        setLoading(true);
        try {
            const data = await generateMaintenanceSuggestions(assetId);
            setSuggestions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (suggestions) {
        return (
            <Alert className="bg-indigo-50 border-indigo-200 animate-in fade-in slide-in-from-top-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <AlertTitle className="text-indigo-800 font-semibold mb-2">Suggerimenti dall'Analisi Storica</AlertTitle>
                <AlertDescription>
                    <ul className="list-disc pl-5 text-sm text-indigo-700 space-y-1">
                        {suggestions.map((tip, idx) => (
                            <li key={idx}>{tip}</li>
                        ))}
                    </ul>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-auto p-0 text-indigo-600 hover:text-indigo-800 text-xs"
                        onClick={() => setSuggestions(null)}
                    >
                        Chiudi
                    </Button>
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleGetSuggestions}
            disabled={loading}
            className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 transition-colors"
        >
            {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
                <Lightbulb className="h-4 w-4 mr-2" />
            )}
            {loading ? "Analisi in corso..." : "Suggerimenti da Storico AI"}
        </Button>
    );
}
