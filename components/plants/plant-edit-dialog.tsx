"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { updatePlant } from "@/lib/actions";

export interface PlantRecord {
    id: string;
    name: string;
    location: string | null;
    country: string | null;
    timezone: string;
    electricityPricePerKwh: number | null;
    waterPricePerM3: number | null;
    co2FactorPerKwh: number | null;
    downtimeCostPerMinute: number | null;
    defaultLaborHourlyRate: number | null;
}

interface Props {
    plant: PlantRecord;
    /** Solo l'admin modifica nome, ubicazione e fuso orario; il responsabile di plant modifica tariffe e costi. */
    canEditRegistry: boolean;
    onSaved: () => void;
}

const toField = (v: number | null) => (v === null || v === undefined ? "" : String(v).replace(".", ","));
const fromField = (v: string): number | null => {
    const t = v.trim();
    if (t === "") return null;
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? n : null;
};

function MoneyField({ id, label, value, set, hint }: { id: string; label: string; value: string; set: (v: string) => void; hint: string }) {
    return (
        <div className="grid gap-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} placeholder="valore globale" />
            <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
    );
}

/** Impostazioni proprie del plant: i campi vuoti usano il valore globale delle Impostazioni. */
export function PlantEditDialog({ plant, canEditRegistry, onSaved }: Props) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [name, setName] = useState(plant.name);
    const [location, setLocation] = useState(plant.location ?? "");
    const [country, setCountry] = useState(plant.country ?? "");
    const [timezone, setTimezone] = useState(plant.timezone);
    const [electricity, setElectricity] = useState(toField(plant.electricityPricePerKwh));
    const [water, setWater] = useState(toField(plant.waterPricePerM3));
    const [co2, setCo2] = useState(toField(plant.co2FactorPerKwh));
    const [downtime, setDowntime] = useState(toField(plant.downtimeCostPerMinute));
    const [labor, setLabor] = useState(toField(plant.defaultLaborHourlyRate));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const res = await updatePlant(plant.id, {
            ...(canEditRegistry ? { name, location: location || null, country: country || null, timezone } : {}),
            electricityPricePerKwh: fromField(electricity),
            waterPricePerM3: fromField(water),
            co2FactorPerKwh: fromField(co2),
            downtimeCostPerMinute: fromField(downtime),
            defaultLaborHourlyRate: fromField(labor),
        });
        setBusy(false);
        if (res.success) {
            toast.success("Stabilimento aggiornato");
            setOpen(false);
            onSaved();
        } else toast.error(res.message ?? "Errore");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Settings2 className="h-4 w-4" /> Impostazioni</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>{plant.name}</DialogTitle>
                    <DialogDescription>
                        Tariffe e costi di questo stabilimento. Un campo lasciato vuoto usa il valore globale delle Impostazioni.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="grid gap-4">
                    {canEditRegistry && (
                        <div className="grid gap-3 rounded-md border p-3">
                            <div className="grid gap-1.5">
                                <Label htmlFor="pname">Nome</Label>
                                <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="ploc">Ubicazione</Label>
                                    <Input id="ploc" value={location} onChange={(e) => setLocation(e.target.value)} />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="pcountry">Paese</Label>
                                    <Input id="pcountry" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="IT" />
                                </div>
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="ptz">Fuso orario</Label>
                                <Input id="ptz" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Europe/Rome" />
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <MoneyField id="el" label="Energia (€/kWh)" value={electricity} set={setElectricity} hint="Costo dell'energia elettrica" />
                        <MoneyField id="wa" label="Acqua (€/m³)" value={water} set={setWater} hint="Costo dell'acqua" />
                        <MoneyField id="co2" label="Fattore CO2 (kg/kWh)" value={co2} set={setCo2} hint="Emissioni della rete locale" />
                        <MoneyField id="dt" label="Costo fermo (€/min)" value={downtime} set={setDowntime} hint="Per stimare il costo dei fermi" />
                        <MoneyField id="lab" label="Costo orario manodopera (€/h)" value={labor} set={setLabor} hint="Se il tecnico non ha una tariffa" />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={busy}>{busy ? "Salvataggio..." : "Salva"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
