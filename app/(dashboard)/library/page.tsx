"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/i18n/toast";
import { tk } from "@/lib/i18n/translate";
import { useT } from "@/lib/i18n/client";
import { BookCopy, Download, Share2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PlantBadge } from "@/components/ui/plant-badge";
import { useAuth } from "@/lib/auth-context";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    listLibrary, listPublishable, publishToLibrary, adoptTemplate, deleteLibraryItem,
    type LibraryItem, type PublishableItem,
} from "@/modules/maintenance/adapters/actions/library-actions";

const KIND_LABEL = { PM: tk("Piano preventivo"), SOP: "SOP" } as const;

export default function LibraryPage() {
    const t = useT();
    const { user } = useAuth();
    const canAct = ["ADMIN", "PLANT_MANAGER", "SUPERVISOR"].includes(user?.role ?? "");
    const { confirm, dialog } = useConfirm();
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [adopting, setAdopting] = useState<LibraryItem | null>(null);
    const [publishing, setPublishing] = useState(false);

    const load = useCallback(async () => { setItems(await listLibrary()); setLoading(false); }, []);
    useEffect(() => {
        let alive = true;
        listLibrary().then(r => { if (alive) { setItems(r); setLoading(false); } });
        return () => { alive = false; };
    }, []);

    const filtered = items.filter(i => `${i.title} ${i.assetModel} ${i.assetVendor ?? ""}`.toLowerCase().includes(search.toLowerCase()));

    const remove = async (item: LibraryItem) => {
        const ok = await confirm({
            title: t("Ritirare dalla libreria?"),
            description: t("\"{title}\" non sarà più adottabile. Le copie già adottate dagli altri stabilimenti restano.", { title: item.title }),
            confirmLabel: t("Ritira"),
            variant: "destructive",
        });
        if (!ok) return;
        const res = await deleteLibraryItem(item.id);
        if (res.success) { toast.success(res.message); load(); } else toast.error(res.message);
    };

    return (
        <div className="mx-auto max-w-5xl space-y-4">
            <PageHeader
                title={t("Libreria di gruppo")}
                description={t("Piani di manutenzione preventiva e SOP condivisi per modello di macchina. Adottali sulle tue macchine e adattali al tuo stabilimento.")}
                actions={canAct && (
                    <Button onClick={() => setPublishing(true)}><Share2 className="h-4 w-4" /> {t("Pubblica un piano o una SOP")}</Button>
                )}
            />
            <Input className="max-w-sm" placeholder={t("Cerca per titolo o modello...")} value={search} onChange={(e) => setSearch(e.target.value)} />

            {loading ? (
                <p className="text-sm text-muted-foreground">{t("Caricamento...")}</p>
            ) : filtered.length === 0 ? (
                <Card><EmptyState icon={<BookCopy />} title={t("La libreria è vuota")} description={t("Pubblica un piano preventivo o una SOP del tuo stabilimento perché gli altri possano riusarlo sullo stesso modello di macchina.")} /></Card>
            ) : (
                filtered.map(item => (
                    <Card key={item.id}>
                        <CardContent className="space-y-2 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <p className="font-medium">{item.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t(KIND_LABEL[item.kind])} · {[item.assetVendor, item.assetModel].filter(Boolean).join(" ")}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <PlantBadge force name={item.originPlantName} />
                                    <Badge variant="neutral">{item.adoptions === 1 ? t("1 adozione") : t("{n} adozioni", { n: item.adoptions })}</Badge>
                                </div>
                            </div>
                            {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <p className="text-xs text-muted-foreground">
                                    {item.myMatchingAssets.length > 0
                                        ? (item.myMatchingAssets.length === 1 ? t("Adottabile su 1 tua macchina dello stesso modello") : t("Adottabile su {n} tue macchine dello stesso modello", { n: item.myMatchingAssets.length }))
                                        : t("Nessuna tua macchina di questo modello")}
                                </p>
                                <div className="flex gap-2">
                                    {canAct && item.myMatchingAssets.length > 0 && (
                                        <Button size="sm" onClick={() => setAdopting(item)}><Download className="h-3.5 w-3.5" /> {t("Adotta")}</Button>
                                    )}
                                    {item.canDelete && (
                                        <Button size="sm" variant="ghost" onClick={() => remove(item)} aria-label={t("Ritira dalla libreria")}><Trash2 className="h-4 w-4" /></Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}

            <Dialog open={!!adopting} onOpenChange={(o) => { if (!o) setAdopting(null); }}>
                {adopting && <AdoptForm key={adopting.id} item={adopting} onClose={() => setAdopting(null)} onDone={() => { setAdopting(null); load(); }} />}
            </Dialog>
            <PublishDialog open={publishing} onClose={() => setPublishing(false)} onDone={() => { setPublishing(false); load(); }} />
            {dialog}
        </div>
    );
}

function AdoptForm({ item, onClose, onDone }: { item: LibraryItem; onClose: () => void; onDone: () => void }) {
    const t = useT();
    const [assetId, setAssetId] = useState(item.myMatchingAssets[0]?.id ?? "");
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (!assetId) return;
        setBusy(true);
        const res = await adoptTemplate(item.id, assetId);
        setBusy(false);
        if (res.success) { toast.success(res.message); onDone(); } else toast.error(res.message);
    };

    return (
        <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
                <DialogTitle>{t("Adotta sulla tua macchina")}</DialogTitle>
                <DialogDescription>{item.kind === "PM" ? t("Verrà creato un piano preventivo sulla macchina scelta.") : t("Verrà creata una SOP in bozza, da rileggere e approvare.")}</DialogDescription>
            </DialogHeader>
            <Select value={assetId} onValueChange={setAssetId}>
                <SelectTrigger><SelectValue placeholder={t("Scegli la macchina")} /></SelectTrigger>
                <SelectContent>
                    {item.myMatchingAssets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <DialogFooter>
                <Button variant="outline" onClick={onClose}>{t("Annulla")}</Button>
                <Button onClick={submit} disabled={busy || !assetId}>{busy ? t("Adozione...") : t("Adotta")}</Button>
            </DialogFooter>
        </DialogContent>
    );
}

function PublishDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
    const t = useT();
    const [options, setOptions] = useState<PublishableItem[]>([]);
    const [value, setValue] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        listPublishable().then(o => { setOptions(o); setValue(o[0] ? `${o[0].kind}:${o[0].id}` : ""); });
    }, [open]);

    const submit = async () => {
        const [kind, id] = value.split(":");
        if (!kind || !id) return;
        setBusy(true);
        const res = await publishToLibrary(kind as "PM" | "SOP", id);
        setBusy(false);
        if (res.success) { toast.success(res.message); onDone(); } else toast.error(res.message);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{t("Pubblica nella libreria")}</DialogTitle>
                    <DialogDescription>{t("Scegli un piano o una SOP del tuo stabilimento. Sarà visibile a tutti gli stabilimenti, associato al modello della macchina.")}</DialogDescription>
                </DialogHeader>
                {options.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("Nel tuo stabilimento non ci sono ancora piani preventivi o SOP da pubblicare.")}</p>
                ) : (
                    <Select value={value} onValueChange={setValue}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {options.map(o => (
                                <SelectItem key={`${o.kind}:${o.id}`} value={`${o.kind}:${o.id}`}>
                                    {t(KIND_LABEL[o.kind])} · {o.title} ({o.assetModel})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t("Annulla")}</Button>
                    <Button onClick={submit} disabled={busy || !value}>{busy ? t("Pubblicazione...") : t("Pubblica")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
