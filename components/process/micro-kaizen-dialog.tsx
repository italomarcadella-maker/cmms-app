"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/text-area";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Lightbulb, Send, CheckCircle2, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function MicroKaizenFeedback({ sopId, userId }: { sopId: string; userId: string }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await fetch('/api/sops/kaizen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sopId, userId, title, description })
            });
            setSubmitted(true);
            setTimeout(() => setOpen(false), 2000);
        } catch {
            // ignore
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) setSubmitted(false);
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-400 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 shadow-sm">
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Suggerisci Miglioramento (Kaizen)
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                {!submitted ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                <Lightbulb className="h-5 w-5" />
                                Micro-Kaizen
                            </DialogTitle>
                            <DialogDescription>
                                Hai trovato un modo più veloce o sicuro per eseguire questo step? Condividilo. I migliori suggerimenti vengono incorporati nella Procedura Ufficiale (SOP v2).
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label htmlFor="title" className="text-sm font-medium">Titolo Rapido</label>
                                <Input
                                    id="title"
                                    placeholder="es: Uso pinza diversa nello Step 3"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="desc" className="text-sm font-medium">Spiega come migliorare</label>
                                <Textarea
                                    id="desc"
                                    placeholder="Se usiamo la pinza inclinata si risparmiano 5 secondi a ciclo senza sbavature."
                                    className="min-h-[100px]"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annulla</Button>
                            <Button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={!title || !description || submitting}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                <Send className="mr-2 h-4 w-4" /> Invia Suggerimento
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in fade-in duration-300">
                        <div className="h-16 w-16 bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400 rounded-full flex items-center justify-center mb-2">
                            <ThumbsUp className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold">Ottimo suggerimento!</h3>
                        <p className="text-muted-foreground text-sm max-w-[280px]">
                            L'Ingegneria di Processo ha ricevuto la notifica.
                            Riceverai +50 KPI se il tuo consiglio diventerà lo standard.
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
