"use client";

import { useState } from "react";
import { generateCorporateBrainSuggestions, BrainSuggestion } from "@/lib/ai-service";
import { Lightbulb, Loader2, Sparkles, BookOpen, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AISuggestionsProps {
    assetId: string;
    description: string;
}

export function AISuggestions({ assetId, description }: AISuggestionsProps) {
    const [suggestions, setSuggestions] = useState<BrainSuggestion[] | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGetSuggestions = async () => {
        setLoading(true);
        try {
            const data = await generateCorporateBrainSuggestions(description, assetId);
            setSuggestions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (suggestions) {
        return (
            <Alert className="bg-slate-900 border-slate-800 text-slate-100 animate-in fade-in slide-in-from-top-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <AlertTitle className="text-amber-400 font-semibold mb-3 flex items-center justify-between">
                    <span>Corporate Brain - Knowledge RAG</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-slate-400 hover:text-white"
                        onClick={() => setSuggestions(null)}
                    >
                        Chiudi
                    </Button>
                </AlertTitle>
                <AlertDescription>
                    {suggestions.length === 0 ? (
                        <p className="text-slate-400 text-sm">Nessuna informazione rilevante trovata nel sistema aziendale.</p>
                    ) : (
                        <div className="space-y-3 mt-2">
                            {suggestions.map((s, idx) => (
                                <div key={idx} className="bg-slate-800/80 rounded border border-slate-700/50 p-3">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        {s.source === 'SOP' && <BookOpen className="h-3.5 w-3.5 text-blue-400" />}
                                        {s.source === 'KB' && <Zap className="h-3.5 w-3.5 text-amber-400" />}
                                        {s.source === 'STORICO_WO' && <Clock className="h-3.5 w-3.5 text-emerald-400" />}
                                        <span className="text-xs font-medium uppercase tracking-wider text-slate-300">
                                            {s.source}
                                        </span>
                                    </div>
                                    <h4 className="font-medium text-sm text-slate-100 mb-1">{s.title}</h4>
                                    <p className="text-sm text-slate-300 leading-relaxed">{s.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
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
            className="w-full border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm"
        >
            {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-amber-500" />
            ) : (
                <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
            )}
            {loading ? "Interrogazione Corporate Brain in corso..." : "Aiuto dal Corporate Brain (RAG)"}
        </Button>
    );
}
