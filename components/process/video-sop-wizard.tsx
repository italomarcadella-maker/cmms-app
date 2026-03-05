"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Video, Image as ImageIcon, Sparkles, Loader2, PlaySquare } from "lucide-react";

export function VideoToSopWizard() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [extractedFrames, setExtractedFrames] = useState<{ id: number, url: string, description: string, time: string }[]>([]);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setVideoFile(e.target.files[0]);
        }
    };

    const handleAnalyze = () => {
        if (!videoFile) return;
        setIsAnalyzing(true);
        setProgress(0);

        // Simulate AI extraction progress
        const interval = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    clearInterval(interval);
                    setIsAnalyzing(false);
                    // Set mock result
                    setExtractedFrames([
                        { id: 1, url: "https://images.unsplash.com/photo-1565514158740-064f34bd6cfd?q=80&w=200&auto=format&fit=crop", description: "L'operatore preme il pulsante Avvio Ciclo sul pannello.", time: "00:04" },
                        { id: 2, url: "https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?q=80&w=200&auto=format&fit=crop", description: "Impostazione temperatura estrusore a 180°C tramite tastierino.", time: "00:12" },
                        { id: 3, url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=200&auto=format&fit=crop", description: "Verifica visiva del corretto allineamento del materiale TPE.", time: "00:25" }
                    ]);
                    return 100;
                }
                return p + 10;
            });
        }, 400);
    };

    return (
        <Card className="border-indigo-100 dark:border-indigo-900 shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-indigo-500" />
                    Generazione SOP da Video
                </CardTitle>
                <CardDescription>
                    Carica un video dell&apos;operazione. L&apos;AI Visione estrarrà automaticamente i frame chiave e scriverà la procedura passo-passo.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!extractedFrames.length ? (
                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center hover:bg-muted/50 transition-colors flex flex-col items-center justify-center cursor-pointer">
                            <input type="file" accept="video/*" className="hidden" id="video-upload" onChange={handleUpload} />
                            <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center">
                                <PlaySquare className="h-10 w-10 text-muted-foreground mb-4" />
                                <p className="text-sm font-medium mb-1">
                                    {videoFile ? videoFile.name : "Trascina qui il tuo video MP4 o clicca per cercare"}
                                </p>
                                <p className="text-xs text-muted-foreground">Max 50MB. Video raccomandato: 30-60 secondi.</p>
                            </label>
                        </div>

                        <Button
                            onClick={handleAnalyze}
                            disabled={!videoFile || isAnalyzing}
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analisi AI in corso... {progress}%
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Analizza Video e Genera SOP
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 p-3 rounded-lg flex items-center gap-2 text-sm border border-emerald-200 dark:border-emerald-800">
                            <Sparkles className="h-4 w-4" /> SOP creata con successo! L'AI ha estratto 3 step chiave della procedura.
                        </div>

                        <div className="space-y-3">
                            {extractedFrames.map((frame, index) => (
                                <div key={frame.id} className="flex flex-col sm:flex-row gap-4 p-3 border rounded-lg bg-card shadow-sm">
                                    <div className="relative w-full sm:w-32 h-20 bg-muted rounded overflow-hidden shrink-0 group">
                                        <img src={frame.url} className="object-cover w-full h-full" alt="frame" />
                                        <Badge variant="secondary" className="absolute bottom-1 right-1 text-[10px] px-1 bg-black/70 text-white border-0 py-0 h-4">
                                            {frame.time}
                                        </Badge>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">Step {index + 1}</Badge>
                                        </div>
                                        <Input defaultValue={frame.description} className="h-8 text-sm w-full" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setExtractedFrames([])}>Ricarica Video</Button>
                            <Button>Salva nella Libreria SOP</Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
