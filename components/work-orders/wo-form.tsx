"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useWorkOrders } from "@/lib/work-orders-context";
import { useAssets } from "@/lib/assets-context";
import { useReference } from "@/lib/reference-context";
import { WorkOrder } from "@/lib/types";
import { CreatableSelect } from "@/components/ui/creatable-select";
import { MultiSelect } from "@/components/ui/multi-select";
import { VoiceInput } from "@/components/ui/voice-input";
import { useT } from "@/lib/i18n/client";

export function WorkOrderForm() {
    const t = useT();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { addWorkOrder } = useWorkOrders();
    const { assets } = useAssets();
    const { activities, technicians, addActivity, addTechnician } = useReference();
    const [loading, setLoading] = useState(false);
    const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

    // Pre-fill values from URL if available
    const initialAssetId = searchParams.get("assetId") || "";
    const initialTitle = searchParams.get("title") || "";
    // Note: handling description pre-fill with multi-select is complex for this demo, keeping simple for now
    const initialPriority = searchParams.get("priority") || "WORKING";


    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        const assetId = formData.get("assetId") as string;
        const selectedAsset = assets.find(a => a.id === assetId);

        // Generate checklist from selected activities
        const checklist = selectedActivities.map((actId, idx) => {
            const activity = activities.find(a => a.id === actId);
            return {
                id: `CHK-${Math.floor(Math.random() * 10000)}`,
                label: activity ? activity.label : "Unknown Task",
                completed: false
            };
        });

        // Use selected Activity names as description if not empty, otherwise default
        const desc = checklist.map(c => c.label).join(", ") || (formData.get("description") as string);

        const techId = formData.get("assignedTechnicianId") as string;
        const selectedTech = technicians.find(tc => tc.id === techId);

        const newWO: WorkOrder = {
            id: `WO-${Math.floor(Math.random() * 10000)}`,
            title: formData.get("title") as string,
            description: desc || "Maintenance Task",
            assetId: assetId,
            assetName: selectedAsset ? selectedAsset.name : "Unknown Asset",
            priority: formData.get("priority") as "STOPPED" | "MALFUNCTIONING" | "WORKING" | "NOT_PRODUCTION",
            status: "OPEN",
            assignedTo: selectedTech ? selectedTech.name : "Unassigned",
            assignedTechnicianId: techId || undefined,
            dueDate: formData.get("dueDate") as string,
            createdAt: new Date().toISOString().split('T')[0],
            checklist: checklist,
            category: formData.get("category") as any || "OTHER",
            partsUsed: [],
            laborLogs: []
        };

        addWorkOrder(newWO);
        setLoading(false);
        router.push("/work-orders");
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
            <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-medium">{t("Dettagli Task")}</h3>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="title" className="text-sm font-medium">{t("Titolo")}</label>
                        <input required id="title" name="title" defaultValue={initialTitle} className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder={t("es. Guarnizione rotta")} />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="category" className="text-sm font-medium">{t("Categoria")}</label>
                        <select required id="category" name="category" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                            <option value="MECHANICAL">{t("Meccanica")}</option>
                            <option value="ELECTRICAL">{t("Elettrica")}</option>
                            <option value="HYDRAULIC">{t("Idraulica")}</option>
                            <option value="PNEUMATIC">{t("Pneumatica")}</option>
                            <option value="OTHER">{t("Altro")}</option>
                        </select>
                    </div>

                    <MultiSelect
                        label={t("Attività di Manutenzione (Checklist)")}
                        options={activities.map(a => ({ id: a.id, label: a.label }))}
                        value={selectedActivities}
                        onChange={setSelectedActivities}
                        onCreate={addActivity}
                        placeholder={t("Seleziona task...")}
                    />
                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium">{t("Descrizione / Note Aggiuntive")}</label>
                        <div className="flex gap-2">
                            <textarea
                                id="description"
                                name="description"
                                className="flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                placeholder={t("Dettagli aggiuntivi...")}
                            />
                            <div className="mt-1">
                                <VoiceInput onTranscript={(text) => {
                                    const el = document.getElementById('description') as HTMLTextAreaElement;
                                    if (el) el.value = (el.value ? el.value + " " : "") + text;
                                }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-medium">{t("Pianificazione")}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <label htmlFor="assetId" className="text-sm font-medium">{t("Asset")}</label>
                        <select required id="assetId" name="assetId" defaultValue={initialAssetId} className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                            <option value="">{t("Seleziona un asset...")}</option>
                            {assets.map(asset => (
                                <option key={asset.id} value={asset.id}>{asset.name} ({asset.serialNumber})</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="priority" className="text-sm font-medium">{t("Priorità")}</label>
                        <select required id="priority" name="priority" defaultValue={initialPriority} className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none">
                            <option value="STOPPED">{t("Ferma (Urgentissimo)")}</option>
                            <option value="MALFUNCTIONING">{t("Malfunzionante")}</option>
                            <option value="WORKING">{t("In Lavoro")}</option>
                            <option value="NOT_PRODUCTION">{t("Non in Produzione")}</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="assignedTechnicianId" className="text-sm font-medium">{t("Tecnico Assegnato")}</label>
                        <select
                            id="assignedTechnicianId"
                            name="assignedTechnicianId"
                            required
                            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                        >
                            <option value="">{t("Seleziona tecnico...")}</option>
                            {technicians.map(tc => (
                                <option key={tc.id} value={tc.id}>{tc.name} ({tc.specialty})</option>
                            ))}
                        </select>
                        <input type="hidden" name="assignedTo" /> {/* Legacy support filled by JS/State if needed, or handled in submit */}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="dueDate" className="text-sm font-medium">{t("Scadenza")}</label>
                        <input required type="date" id="dueDate" name="dueDate" className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Link href="/work-orders" className="inline-flex items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
                    {t("Annulla")}
                </Link>
                <button disabled={loading} type="submit" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("Crea Ordine")}
                </button>
            </div>
        </form>
    );
}
