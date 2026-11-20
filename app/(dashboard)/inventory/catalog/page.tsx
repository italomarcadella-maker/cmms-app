"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/i18n/toast";
import { useT } from "@/lib/i18n/client";
import { Layers } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PlantBadge } from "@/components/ui/plant-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { similarity } from "@/modules/inventory/domain/catalog-matching";
import {
    getCatalogOverview, mergeCatalogEntries, type CatalogEntryOverview,
} from "@/modules/inventory/adapters/actions/availability-actions";

export default function CatalogPage() {
    const t = useT();
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";
    const { confirm, dialog } = useConfirm();
    const [entries, setEntries] = useState<CatalogEntryOverview[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [picked, setPicked] = useState<string | null>(null);

    const load = useCallback(async () => {
        setEntries(await getCatalogOverview());
        setLoading(false);
    }, []);
    useEffect(() => {
        let alive = true;
        getCatalogOverview().then(r => { if (alive) { setEntries(r); setLoading(false); } });
        return () => { alive = false; };
    }, []);

    const filtered = useMemo(
        () => entries.filter(e => e.name.toLowerCase().includes(search.toLowerCase())),
        [entries, search],
    );

    // Voci molto simili: probabili doppioni da unire
    const suggestions = useMemo(() => {
        const out: { a: CatalogEntryOverview; b: CatalogEntryOverview; score: number }[] = [];
        for (let i = 0; i < entries.length; i++) {
            for (let j = i + 1; j < entries.length; j++) {
                const score = similarity(entries[i].name, entries[j].name);
                if (score >= 0.6) out.push({ a: entries[i], b: entries[j], score });
            }
        }
        return out.sort((x, y) => y.score - x.score).slice(0, 5);
    }, [entries]);

    const merge = async (keep: CatalogEntryOverview, remove: CatalogEntryOverview) => {
        const ok = await confirm({
            title: t("Unire le due voci?"),
            description: t("\"{remove}\" verrà unita a \"{keep}\": le giacenze di tutti gli stabilimenti passano sotto un unico articolo.", { remove: remove.name, keep: keep.name }),
            confirmLabel: t("Unisci"),
        });
        if (!ok) return;
        const res = await mergeCatalogEntries(keep.id, remove.id);
        if (res.success) { toast.success(res.message); setPicked(null); load(); } else toast.error(res.message);
    };

    return (
        <div className="mx-auto max-w-6xl space-y-4">
            <PageHeader
                title={t("Catalogo ricambi di gruppo")}
                description={t("Gli stabilimenti non hanno un codice articolo comune: lo stesso ricambio viene riconosciuto dalla descrizione. Qui puoi controllare le voci e unire i doppioni.")}
            />

            {isAdmin && suggestions.length > 0 && (
                <Card>
                    <CardContent className="space-y-2 p-4">
                        <p className="text-sm font-medium">{t("Possibili doppioni")}</p>
                        {suggestions.map(s => (
                            <div key={s.a.id + s.b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                                <span>{s.a.name} <span className="text-muted-foreground">{t("e")}</span> {s.b.name} <span className="text-xs text-muted-foreground">({Math.round(s.score * 100)}%)</span></span>
                                <span className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => merge(s.a, s.b)}>{t("Tieni la prima")}</Button>
                                    <Button size="sm" variant="outline" onClick={() => merge(s.b, s.a)}>{t("Tieni la seconda")}</Button>
                                </span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Input placeholder={t("Filtra il catalogo...")} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <p className="p-6 text-sm text-muted-foreground">{t("Caricamento...")}</p>
                    ) : filtered.length === 0 ? (
                        <EmptyState icon={<Layers />} title={t("Nessuna voce")} description={t("Il catalogo si popola da solo quando si inseriscono ricambi a magazzino.")} />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("Articolo")}</TableHead>
                                    <TableHead>{t("Categoria")}</TableHead>
                                    <TableHead>{t("Giacenza per stabilimento")}</TableHead>
                                    {isAdmin && <TableHead className="w-[1%]" />}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(e => (
                                    <TableRow key={e.id}>
                                        <TableCell className="font-medium">{e.name}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{e.category ?? "-"}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-2">
                                                {e.plants.length === 0 && <span className="text-xs text-muted-foreground">{t("a magazzino in nessun plant")}</span>}
                                                {e.plants.map(p => (
                                                    <span key={p.plantId} className="inline-flex items-center gap-1 text-sm">
                                                        <PlantBadge force name={p.plantName} /> {p.quantity}
                                                    </span>
                                                ))}
                                            </div>
                                        </TableCell>
                                        {isAdmin && (
                                            <TableCell>
                                                {picked === null ? (
                                                    <Button size="sm" variant="ghost" onClick={() => setPicked(e.id)}>{t("Unisci...")}</Button>
                                                ) : picked === e.id ? (
                                                    <Button size="sm" variant="ghost" onClick={() => setPicked(null)}>{t("Annulla")}</Button>
                                                ) : (
                                                    <Button size="sm" variant="outline" onClick={() => {
                                                        const from = entries.find(x => x.id === picked);
                                                        if (from) merge(e, from);
                                                    }}>{t("Unisci qui")}</Button>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            {dialog}
        </div>
    );
}
