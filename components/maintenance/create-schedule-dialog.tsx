"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RECURRENCE_OPTIONS, MaintenanceActivity, Asset } from "@/lib/types";
import { Calendar as CalendarIcon, CheckSquare, ArrowRight, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createPreventiveSchedule, getAssets, getActivities } from "@/lib/actions";
import { usePM } from "@/lib/pm-context";

export function CreateScheduleDialog({ onScheduleCreated }: { onScheduleCreated?: () => void }) {
    const { refreshSchedules } = usePM();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [activities, setActivities] = useState<MaintenanceActivity[]>([]);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [assetId, setAssetId] = useState("");
    const [frequency, setFrequency] = useState("MONTHLY");
    const [frequencyDays, setFrequencyDays] = useState(30); // Default to Monthly
    const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
    const [firstDate, setFirstDate] = useState<Date | undefined>(new Date());

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open]);

    const loadData = async () => {
        const [assetsData, activitiesData] = await Promise.all([
            getAssets(),
            getActivities()
        ]);
        setAssets(assetsData as Asset[]);
        setActivities(activitiesData.map(a => ({
            ...a,
            category: a.category || undefined
        })));
    };

    const handleFrequencyChange = (val: string) => {
        setFrequency(val);
        const option = RECURRENCE_OPTIONS.find(o => o.value === val);
        if (option) {
            setFrequencyDays(option.days);
        }
    };

    const toggleActivity = (id: string) => {
        setSelectedActivities(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = async () => {
        if (!title || !assetId || !firstDate) {
            toast.error("Compila i campi obbligatori");
            return;
        }

        const selectedActivityObjects = activities
            .filter(a => selectedActivities.includes(a.id))
            .map(a => ({ id: a.id, label: a.label }));

        const result = await createPreventiveSchedule({
            title,
            description,
            assetId,
            frequency,
            frequencyDays,
            activities: selectedActivityObjects,
            firstDate,
        });

        if (result.success) {
            toast.success("Piano di manutenzione creato");
            setOpen(false);
            resetForm();
            refreshSchedules();
            if (onScheduleCreated) onScheduleCreated();
        } else {
            toast.error(result.message);
        }
    };

    const resetForm = () => {
        setStep(1);
        setTitle("");
        setDescription("");
        setAssetId("");
        setFrequency("MONTHLY");
        setSelectedActivities([]);
        setFirstDate(new Date());
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Nuovo Piano
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Nuovo Piano di Manutenzione (Step {step}/3)</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-2">
                                <Label>Titolo Piano</Label>
                                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Es. Controllo Mensile Pressa" />
                            </div>
                            <div className="space-y-2">
                                <Label>Asset</Label>
                                <Select value={assetId} onValueChange={setAssetId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona Macchinario" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {assets.map(a => (
                                            <SelectItem key={a.id} value={a.id}>{a.name} ({a.serialNumber})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Descrizione</Label>
                                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Note aggiuntive..." />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-2">
                                <Label>Frequenza Ripetizione</Label>
                                <Select value={frequency} onValueChange={handleFrequencyChange}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {RECURRENCE_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Data Prima Esecuzione</Label>
                                <div className="block">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-[240px] justify-start text-left font-normal",
                                                    !firstDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {firstDate ? format(firstDate, "PPP") : <span>Seleziona data</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-white" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={firstDate}
                                                onSelect={setFirstDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Le esecuzioni successive verranno calcolate automaticamente in base alla frequenza scelta.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <Label>Checklist Attività</Label>
                            <div className="border rounded-lg p-2 max-h-[300px] overflow-y-auto space-y-2">
                                {activities.length === 0 ? (
                                    <p className="text-muted-foreground text-sm text-center py-4">Nessuna attività definita nelle impostazioni.</p>
                                ) : (
                                    activities.map(act => (
                                        <div
                                            key={act.id}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded cursor-pointer transition-colors border",
                                                selectedActivities.includes(act.id)
                                                    ? "bg-primary/10 border-primary"
                                                    : "hover:bg-muted border-transparent"
                                            )}
                                            onClick={() => toggleActivity(act.id)}
                                        >
                                            <div className={cn(
                                                "h-5 w-5 rounded-md border flex items-center justify-center transition-colors",
                                                selectedActivities.includes(act.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                                            )}>
                                                {selectedActivities.includes(act.id) && <CheckSquare className="h-3 w-3 text-white" />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{act.label}</p>
                                                {act.category && <p className="text-xs text-muted-foreground">{act.category}</p>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground text-right">
                                {selectedActivities.length} attività selezionate
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between sm:justify-between w-full">
                    {step > 1 ? (
                        <Button variant="outline" onClick={() => setStep(s => s - 1)}>
                            <ArrowLeft className="h-4 w-4 mr-2" /> Indietro
                        </Button>
                    ) : (
                        <div />
                    )}

                    {step < 3 ? (
                        <Button onClick={() => setStep(s => s + 1)}>
                            Avanti <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit}>
                            Crea Piano
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
