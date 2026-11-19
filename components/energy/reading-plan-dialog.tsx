"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { setReadingPlan, type ReadingPlan } from "@/modules/energy/adapters/actions/reading-plan-actions";
import { FREQUENCY_OPTIONS, frequencyLabel } from "@/modules/energy/domain/reading-plan";

export interface PlanAssignee { userId: string; name: string }

interface Props {
    meterId: string;
    meterName: string;
    plan: ReadingPlan | undefined;
    assignees: PlanAssignee[];
    onSaved: () => void;
}

const NONE = "none";
const todayKey = () => new Date().toISOString().slice(0, 10);

/** Pianifica la lettura di un contatore: ogni quanto, da quando e chi la esegue. La lettura compare nel calendario. */
export function ReadingPlanDialog({ meterId, meterName, plan, assignees, onSaved }: Props) {
    const [open, setOpen] = useState(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="mt-3 w-full">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {plan?.frequencyDays ? "Modifica la pianificazione" : "Pianifica la lettura"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>Lettura pianificata</DialogTitle>
                    <DialogDescription>{meterName}: la lettura compare nel calendario della dashboard, dove si inserisce il valore.</DialogDescription>
                </DialogHeader>
                {open && (
                    <PlanForm
                        meterId={meterId}
                        plan={plan}
                        assignees={assignees}
                        onDone={() => { setOpen(false); onSaved(); }}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function PlanForm({ meterId, plan, assignees, onDone }: { meterId: string; plan: ReadingPlan | undefined; assignees: PlanAssignee[]; onDone: () => void }) {
    const [frequency, setFrequency] = useState(String(plan?.frequencyDays ?? 7));
    const [firstDue, setFirstDue] = useState(plan?.nextDue ? plan.nextDue.slice(0, 10) : todayKey());
    const [assignee, setAssignee] = useState(plan?.assigneeId ?? NONE);
    const [busy, setBusy] = useState(false);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const res = await setReadingPlan(meterId, { frequencyDays: Number(frequency), firstDue, assigneeId: assignee === NONE ? null : assignee });
        setBusy(false);
        if (res.success) { toast.success(res.message); onDone(); } else toast.error(res.message);
    };

    const remove = async () => {
        setBusy(true);
        const res = await setReadingPlan(meterId, { frequencyDays: null });
        setBusy(false);
        if (res.success) { toast.success(res.message); onDone(); } else toast.error(res.message);
    };

    return (
        <form onSubmit={save} className="grid gap-4">
            <div className="grid gap-1.5">
                <Label>Frequenza</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {FREQUENCY_OPTIONS.map(f => <SelectItem key={f.days} value={String(f.days)}>{f.label}</SelectItem>)}
                        {!FREQUENCY_OPTIONS.some(f => String(f.days) === frequency) && <SelectItem value={frequency}>{frequencyLabel(Number(frequency))}</SelectItem>}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="rp-first">Prossima lettura</Label>
                <Input id="rp-first" type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
                <Label>Chi la esegue</Label>
                <Select value={assignee} onValueChange={setAssignee}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NONE}>Da assegnare dal calendario</SelectItem>
                        {assignees.map(a => <SelectItem key={a.userId} value={a.userId}>{a.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
                {plan?.frequencyDays ? (
                    <Button type="button" variant="ghost" disabled={busy} onClick={remove}>Togli la pianificazione</Button>
                ) : <span />}
                <Button type="submit" disabled={busy}>{busy ? "Salvataggio..." : "Salva"}</Button>
            </DialogFooter>
        </form>
    );
}
