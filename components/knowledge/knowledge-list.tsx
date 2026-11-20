"use client";

import { useMemo, useState } from "react";
import { Lightbulb, Search, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/lib/i18n/client";

export interface KnowledgeItem {
    id: string;
    problemTags: string;
    solution: string;
    assetCategory: string | null;
    successCount: number;
}

/** Elenco delle soluzioni apprese, con ricerca vera su tag, soluzione e categoria. */
export function KnowledgeList({ items }: { items: KnowledgeItem[] }) {
    const t = useT();
    const [query, setQuery] = useState("");

    const shown = useMemo(() => {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        if (words.length === 0) return items;
        return items.filter(i => {
            const text = `${i.problemTags} ${i.solution} ${i.assetCategory ?? ""}`.toLowerCase();
            return words.every(w => text.includes(w));
        });
    }, [items, query]);

    return (
        <div className="space-y-4">
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Cerca per guasto, soluzione o categoria...")} className="pl-10" aria-label={t("Cerca nella base di conoscenza")} />
            </div>

            {items.length === 0 ? (
                <Card><EmptyState icon={<Lightbulb />} title={t("Nessuna conoscenza acquisita")} description={t("Il sistema impara dalle soluzioni registrate quando chiudi gli ordini di lavoro con una descrizione dettagliata.")} /></Card>
            ) : shown.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("Nessuna soluzione corrisponde a «{query}».", { query })}</p>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {shown.map(item => (
                        <Card key={item.id}>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex flex-wrap gap-2 text-base font-medium">
                                    {item.problemTags.split(",").slice(0, 3).map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-xs"><Tag className="mr-1 h-3 w-3" />{tag.trim()}</Badge>
                                    ))}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-start gap-3">
                                    <Lightbulb className="mt-1 h-5 w-5 shrink-0 text-warning-strong" aria-hidden />
                                    <p className="text-sm font-medium text-foreground/90">{item.solution}</p>
                                </div>
                                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{t("Categoria: {name}", { name: item.assetCategory || t("Generale") })}</span>
                                    <span>{t("Applicata")} <strong>{item.successCount}</strong> {item.successCount === 1 ? t("volta") : t("volte")}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
