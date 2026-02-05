import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit, Lightbulb, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = 'force-dynamic';

async function getKnowledgeBase() {
    return await prisma.maintenanceKnowledge.findMany({
        orderBy: { successCount: 'desc' },
        take: 50
    });
}

export default async function KnowledgeBasePage() {
    const methods = await getKnowledgeBase();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <BrainCircuit className="h-8 w-8 text-indigo-500" />
                    Knowledge Base AI
                </h1>
                <p className="text-muted-foreground">
                    Soluzioni e pattern appresi automaticamente dal sistema durante gli interventi.
                </p>
            </div>

            {/* Simulated Search - In a real App this would be client side or server filtered via params */}
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cerca soluzione..." className="pl-10 max-w-md" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {methods.map((item) => (
                    <Card key={item.id} className="group hover:border-indigo-500/50 transition-colors">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium flex gap-2 flex-wrap">
                                {item.problemTags.split(',').slice(0, 3).map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                        <Tag className="h-3 w-3 mr-1" />
                                        {tag.trim()}
                                    </Badge>
                                ))}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-start gap-3">
                                <Lightbulb className="h-5 w-5 text-amber-500 mt-1 shrink-0" />
                                <p className="text-sm text-foreground/90 font-medium">
                                    {item.solution}
                                </p>
                            </div>
                            <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground">
                                <span>Categoria: {item.assetCategory || 'Generale'}</span>
                                <span className="flex items-center gap-1">
                                    Applicato <strong>{item.successCount}</strong> volte
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {methods.length === 0 && (
                <div className="text-center p-12 border-2 border-dashed rounded-lg bg-muted/20">
                    <BrainCircuit className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Nessuna conoscenza acquisita</h3>
                    <p className="text-muted-foreground">
                        Il sistema imparerà automaticamente man mano che chiuderai ordini di lavoro con descrizioni dettagliate.
                    </p>
                </div>
            )}
        </div>
    );
}
