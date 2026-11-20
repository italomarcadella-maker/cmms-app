"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "@/lib/i18n/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePlant } from "@/lib/plant-context";
import { useT } from "@/lib/i18n/client";
import { getTechnicians } from "@/lib/actions";
import { FREQUENCY_CHOICES, OUTCOMES, frequencyText } from "@/modules/maintenance/domain/contractors";
import {
    createActivity, createContract, createContractor, recordExecution, updateContract, updateContractor,
    type ActivityRow, type ContractRow, type ContractorSummary,
} from "@/modules/maintenance/adapters/actions/contractor-actions";

const todayKey = () => new Date().toISOString().slice(0, 10);
const dateKey = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const num = (v: string): number | null => {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? n : null;
};

/** Finestra di dialogo il cui contenuto si monta solo quando e' aperta: ogni apertura riparte da un modulo pulito. */
function FormDialog({ trigger, title, description, children }: {
    trigger: ReactNode;
    title: string;
    description?: string;
    children: (close: () => void) => ReactNode;
}) {
    const [open, setOpen] = useState(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                {open && children(() => setOpen(false))}
            </DialogContent>
        </Dialog>
    );
}

function Field({ id, label, children, hint }: { id?: string; label: string; children: ReactNode; hint?: string }) {
    return (
        <div className="grid gap-1.5">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

// --- Ditta ---

export function ContractorFormDialog({ contractor, trigger, onSaved }: { contractor?: ContractorSummary; trigger: ReactNode; onSaved: (id?: string) => void }) {
    const t = useT();
    return (
        <FormDialog
            trigger={trigger}
            title={contractor ? t("Modifica la ditta") : t("Nuova ditta esterna")}
            description={t("L'anagrafica è di gruppo: i contratti si creano poi per ogni stabilimento. Inserisci solo contatti di lavoro.")}
        >
            {(close) => <ContractorForm contractor={contractor} onDone={(id) => { close(); onSaved(id); }} />}
        </FormDialog>
    );
}

function ContractorForm({ contractor, onDone }: { contractor?: ContractorSummary; onDone: (id?: string) => void }) {
    const t = useT();
    const [name, setName] = useState(contractor?.name ?? "");
    const [vat, setVat] = useState(contractor?.vatNumber ?? "");
    const [contact, setContact] = useState(contractor?.contactName ?? "");
    const [phone, setPhone] = useState(contractor?.contactPhone ?? "");
    const [email, setEmail] = useState(contractor?.contactEmail ?? "");
    const [notes, setNotes] = useState(contractor?.notes ?? "");
    const [active, setActive] = useState(contractor?.isActive ?? true);
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const input = { name, vatNumber: vat, contactName: contact, contactPhone: phone, contactEmail: email, notes, isActive: active };
        const res = contractor ? await updateContractor(contractor.id, input) : await createContractor(input);
        setBusy(false);
        if (res.success) { toast.success(res.message); onDone(res.id); } else toast.error(res.message);
    };

    return (
        <form onSubmit={submit} className="grid gap-3">
            <Field id="c-name" label={t("Ragione sociale")}><Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
            <Field id="c-vat" label={t("Partita IVA")}><Input id="c-vat" value={vat} onChange={(e) => setVat(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
                <Field id="c-contact" label={t("Referente")}><Input id="c-contact" value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
                <Field id="c-phone" label={t("Telefono")}><Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            </div>
            <Field id="c-email" label={t("Email di lavoro")}><Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field id="c-notes" label={t("Note")}><Textarea id="c-notes" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            {contractor && (
                <label className="flex items-center gap-2 text-sm"><Switch checked={active} onCheckedChange={setActive} /> {t("Ditta attiva")}</label>
            )}
            <DialogFooter><Button type="submit" disabled={busy}>{busy ? t("Salvataggio...") : t("Salva")}</Button></DialogFooter>
        </form>
    );
}

// --- Contratto ---

export function ContractFormDialog({ contractorId, contract, trigger, onSaved }: {
    contractorId: string;
    contract?: ContractRow;
    trigger: ReactNode;
    onSaved: () => void;
}) {
    const t = useT();
    return (
        <FormDialog trigger={trigger} title={contract ? t("Modifica il contratto") : t("Nuovo contratto")} description={t("Il contratto vale per un solo stabilimento.")}>
            {(close) => <ContractForm contractorId={contractorId} contract={contract} onDone={() => { close(); onSaved(); }} />}
        </FormDialog>
    );
}

/** Nuovo contratto creato dall'elenco generale: prima si sceglie la ditta, poi si compila il contratto. */
export function NewContractDialog({ contractors, trigger, onSaved }: {
    contractors: { id: string; name: string }[];
    trigger: ReactNode;
    onSaved: () => void;
}) {
    const t = useT();
    return (
        <FormDialog trigger={trigger} title={t("Nuovo contratto")} description={t("Il contratto vale per un solo stabilimento.")}>
            {(close) => <PickContractor contractors={contractors} onDone={() => { close(); onSaved(); }} />}
        </FormDialog>
    );
}

function PickContractor({ contractors, onDone }: { contractors: { id: string; name: string }[]; onDone: () => void }) {
    const t = useT();
    const [contractorId, setContractorId] = useState(contractors.length === 1 ? contractors[0].id : "");
    if (contractors.length === 0) {
        return <p className="text-sm text-muted-foreground">{t("Prima registra almeno una ditta con «Nuova ditta», poi potrai creare il suo contratto.")}</p>;
    }
    return (
        <div className="grid gap-3">
            <Field label={t("Ditta")}>
                <Select value={contractorId} onValueChange={setContractorId}>
                    <SelectTrigger><SelectValue placeholder={t("Scegli la ditta")} /></SelectTrigger>
                    <SelectContent>{contractors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
            </Field>
            {contractorId && <ContractForm key={contractorId} contractorId={contractorId} onDone={onDone} />}
        </div>
    );
}

function ContractForm({ contractorId, contract, onDone }: { contractorId: string; contract?: ContractRow; onDone: () => void }) {
    const t = useT();
    const { plants, activePlant } = usePlant();
    const [plantId, setPlantId] = useState(contract?.plantId ?? activePlant?.id ?? plants[0]?.id ?? "");
    const [title, setTitle] = useState(contract?.title ?? "");
    const [scope, setScope] = useState(contract?.scope ?? "");
    const [start, setStart] = useState(dateKey(contract?.startDate ?? null) || todayKey());
    const [end, setEnd] = useState(dateKey(contract?.endDate ?? null));
    const [notice, setNotice] = useState(String(contract?.renewalNoticeDays ?? 60));
    const [value, setValue] = useState(contract?.annualValue != null ? String(contract.annualValue).replace(".", ",") : "");
    const [notes, setNotes] = useState(contract?.notes ?? "");
    const [terminated, setTerminated] = useState(contract?.state === "TERMINATED");
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const common = { title, scope, startDate: start, endDate: end || undefined, renewalNoticeDays: Number(notice) || 0, annualValue: num(value), notes };
        const res = contract
            ? await updateContract(contract.id, { ...common, terminated })
            : await createContract({ ...common, contractorId, plantId: plantId || undefined });
        setBusy(false);
        if (res.success) { toast.success(res.message); onDone(); } else toast.error(res.message);
    };

    return (
        <form onSubmit={submit} className="grid gap-3">
            {!contract && plants.length > 1 && (
                <Field label={t("Stabilimento")}>
                    <Select value={plantId} onValueChange={setPlantId}>
                        <SelectTrigger><SelectValue placeholder={t("Scegli lo stabilimento")} /></SelectTrigger>
                        <SelectContent>{plants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                </Field>
            )}
            <Field id="k-title" label={t("Titolo")}><Input id="k-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("Es. Manutenzione compressori 2026")} required /></Field>
            <Field id="k-scope" label={t("Cosa copre")}><Textarea id="k-scope" rows={2} maxLength={500} value={scope} onChange={(e) => setScope(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
                <Field id="k-start" label={t("Inizio")}><Input id="k-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} required /></Field>
                <Field id="k-end" label={t("Scadenza")} hint={t("Vuota = senza scadenza")}><Input id="k-end" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Field id="k-notice" label={t("Preavviso di rinnovo (giorni)")}><Input id="k-notice" type="number" min={0} max={365} value={notice} onChange={(e) => setNotice(e.target.value)} /></Field>
                <Field id="k-value" label={t("Valore annuo (€)")}><Input id="k-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
            </div>
            <Field id="k-notes" label={t("Note")}><Textarea id="k-notes" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            {contract && <label className="flex items-center gap-2 text-sm"><Switch checked={terminated} onCheckedChange={setTerminated} /> {t("Contratto disdetto")}</label>}
            <DialogFooter><Button type="submit" disabled={busy}>{busy ? t("Salvataggio...") : t("Salva")}</Button></DialogFooter>
        </form>
    );
}

// --- Attivita' ---

export function ActivityFormDialog({ contract, assets, trigger, onSaved }: {
    contract: ContractRow;
    assets: { id: string; name: string; plantId: string | null }[];
    trigger: ReactNode;
    onSaved: () => void;
}) {
    const t = useT();
    return (
        <FormDialog trigger={trigger} title={t("Nuova attività periodica")} description={`${contract.title} · ${contract.plantName}`}>
            {(close) => <ActivityForm contract={contract} assets={assets} onDone={() => { close(); onSaved(); }} />}
        </FormDialog>
    );
}

const NO_VALUE = "none";

function ActivityForm({ contract, assets, onDone }: { contract: ContractRow; assets: { id: string; name: string; plantId: string | null }[]; onDone: () => void }) {
    const t = useT();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [frequency, setFrequency] = useState("90");
    const [asset, setAsset] = useState(NO_VALUE);
    const [firstDue, setFirstDue] = useState(todayKey());
    const [assignee, setAssignee] = useState(NO_VALUE);
    const [people, setPeople] = useState<{ userId: string; name: string }[]>([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let alive = true;
        getTechnicians().then(list => {
            if (alive) setPeople((list as { userId?: string | null; name: string }[]).filter(x => x.userId).map(x => ({ userId: x.userId as string, name: x.name })));
        });
        return () => { alive = false; };
    }, []);

    const plantAssets = assets.filter(a => a.plantId === contract.plantId);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const res = await createActivity({
            contractId: contract.id, title, description, frequencyDays: Number(frequency), firstDue,
            assetId: asset === NO_VALUE ? null : asset, assigneeId: assignee === NO_VALUE ? null : assignee,
        });
        setBusy(false);
        if (res.success) { toast.success(res.message); onDone(); } else toast.error(res.message);
    };

    return (
        <form onSubmit={submit} className="grid gap-3">
            <Field id="a-title" label={t("Attività")}><Input id="a-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("Es. Verifica trimestrale compressore")} required /></Field>
            <Field id="a-desc" label={t("Dettaglio")}><Textarea id="a-desc" rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label={t("Frequenza")}>
                    <Select value={frequency} onValueChange={setFrequency}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{FREQUENCY_CHOICES.map(d => <SelectItem key={d} value={String(d)}>{t(frequencyText(d))}</SelectItem>)}</SelectContent>
                    </Select>
                </Field>
                <Field id="a-due" label={t("Prima scadenza")}><Input id="a-due" type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} required /></Field>
            </div>
            <Field label={t("Macchina (facoltativa)")}>
                <Select value={asset} onValueChange={setAsset}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NO_VALUE}>{t("Nessuna macchina in particolare")}</SelectItem>
                        {plantAssets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </Field>
            <Field label={t("Referente interno (facoltativo)")}>
                <Select value={assignee} onValueChange={setAssignee}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NO_VALUE}>{t("Nessuno")}</SelectItem>
                        {people.map(p => <SelectItem key={p.userId} value={p.userId}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </Field>
            <DialogFooter><Button type="submit" disabled={busy}>{busy ? t("Salvataggio...") : t("Aggiungi")}</Button></DialogFooter>
        </form>
    );
}

// --- Esecuzione ---

export function ExecutionDialog({ activity, trigger, onSaved }: { activity: Pick<ActivityRow, "id" | "title" | "contractorName">; trigger: ReactNode; onSaved: () => void }) {
    const t = useT();
    return (
        <FormDialog trigger={trigger} title={t("Registra intervento")} description={`${activity.contractorName} · ${activity.title}`}>
            {(close) => <ExecutionForm activityId={activity.id} onDone={() => { close(); onSaved(); }} />}
        </FormDialog>
    );
}

function ExecutionForm({ activityId, onDone }: { activityId: string; onDone: () => void }) {
    const t = useT();
    const [doneAt, setDoneAt] = useState(todayKey());
    const [outcome, setOutcome] = useState<"OK" | "ISSUES">("OK");
    const [notes, setNotes] = useState("");
    const [url, setUrl] = useState("");
    const [cost, setCost] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const res = await recordExecution({ activityId, doneAt, outcome, notes, reportUrl: url, cost: num(cost) });
        setBusy(false);
        if (res.success) { toast.success(res.message); onDone(); } else toast.error(res.message);
    };

    return (
        <form onSubmit={submit} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
                <Field id="e-date" label={t("Data dell'intervento")}><Input id="e-date" type="date" value={doneAt} max={todayKey()} onChange={(e) => setDoneAt(e.target.value)} required /></Field>
                <Field id="e-cost" label={t("Costo (€, facoltativo)")}><Input id="e-cost" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
            </div>
            <Field label={t("Esito")}>
                <Select value={outcome} onValueChange={(v) => setOutcome(v as "OK" | "ISSUES")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{OUTCOMES.map(o => <SelectItem key={o.id} value={o.id}>{t(o.label)}</SelectItem>)}</SelectContent>
                </Select>
            </Field>
            <Field id="e-notes" label={t("Note")} hint={outcome === "ISSUES" ? t("Descrivi la criticità: il responsabile dello stabilimento riceve una notifica.") : undefined}>
                <Textarea id="e-notes" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Field id="e-url" label={t("Collegamento al rapporto (facoltativo)")} hint={t("Indirizzo del documento, per esempio su SharePoint o sul sito della ditta.")}>
                <Input id="e-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </Field>
            <DialogFooter><Button type="submit" disabled={busy}>{busy ? t("Registrazione...") : t("Registra")}</Button></DialogFooter>
        </form>
    );
}
