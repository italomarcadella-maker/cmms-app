import { useState, useEffect, useMemo } from "react";
import { Loader2, X } from "lucide-react";
import { getPlants } from "@/lib/actions";
import { useAssets } from "@/lib/assets-context";
import { useT, useLocale } from "@/lib/i18n/client";
import { candidateParents, getAssetPath } from "@/modules/maintenance/domain/asset-hierarchy";

interface AssetFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    asset: any;
    onSave: (asset: any) => void;
}

export function AssetFormDialog({ isOpen, onClose, asset, onSave }: AssetFormDialogProps) {
    const t = useT();
    const locale = useLocale();
    const [loading, setLoading] = useState(false);
    const [prevAsset, setPrevAsset] = useState(asset);
    const [formData, setFormData] = useState(() => ({
        ...asset,
        plant: asset?.plantId || asset?.plant
    }));
    const [plants, setPlants] = useState<any[]>([]);
    const { assets } = useAssets();

    // "Fa parte di": solo gli asset che possono davvero essere padre (stesso stabilimento, non se stesso ne' i suoi componenti)
    const editingId: string | null = asset?.id ?? null;
    const selectedPlant: string | null = formData.plant || null;
    const parentOptions = useMemo(() => {
        const items = assets.map((a) => ({ id: a.id, name: a.name, parentId: a.parentId ?? null, plantId: a.plantId ?? null }));
        const known = editingId !== null && items.some((i) => i.id === editingId);
        const candidates = candidateParents(items, known ? editingId : null, selectedPlant);
        return candidates
            .map((c) => ({ id: c.id, label: getAssetPath(items, c.id).map((i) => i.name).join(" > ") }))
            .sort((x, y) => x.label.localeCompare(y.label, locale));
    }, [assets, editingId, selectedPlant, locale]);
    const childCount = editingId ? assets.filter((a) => a.parentId === editingId).length : 0;
    const originalPlant: string | null = asset?.plantId ?? null;
    // Il padre scelto vale solo se e' ancora un candidato; quello attuale resta valido finche' lo stabilimento non cambia
    const currentParent: string | null = formData.parentId || null;
    const parentIsValid = currentParent !== null && (parentOptions.some((o) => o.id === currentParent) || (currentParent === (asset?.parentId ?? null) && selectedPlant === originalPlant));
    const parentValue = parentIsValid ? (currentParent as string) : "";

    if (asset !== prevAsset) {
        setPrevAsset(asset);
        setFormData({
            ...asset,
            plant: asset?.plantId || asset?.plant
        });
    }

    useEffect(() => {
        async function loadPlants() {
            const data = await getPlants();
            setPlants(data);
        }
        if (isOpen) {
            loadPlants();
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Ensure required fields like location are populated if missing
        const finalAsset = {
            ...formData,
            id: formData.id || `AST-${Math.floor(Math.random() * 10000)}`,
            // Map 'plant' from select to 'plantId' for the backend
            plant: formData.plant,
            parentId: parentValue || null,
            location: formData.location || "N/A"
        };

        onSave(finalAsset);
        setLoading(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl rounded-lg border bg-background p-6 shadow-lg animate-in zoom-in-95 duration-200">
                <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-4">
                    <h2 className="text-lg font-semibold leading-none tracking-tight">
                        {asset.id ? t("Modifica Asset") : t("Nuovo Asset")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {t("Inserisci i dettagli del macchinario qui sotto. Clicca salva quando hai finito.")}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">{t("Chiudi")}</span>
                </button>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 py-4">
                        {/* Row 0: Type */}
                        <div className="space-y-2">
                            <label htmlFor="type" className="text-sm font-medium">
                                {t("Tipo Asset")}
                            </label>
                            <select
                                id="type"
                                name="type"
                                value={formData.type || 'MACHINE'}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, type: e.target.value }))}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="MACHINE">{t("Macchinario / Attrezzatura")}</option>
                                <option value="FACILITY">{t("Impianto / Struttura")}</option>
                                <option value="SAFETY">{t("Sicurezza / DPI")}</option>
                                <option value="KAIZEN">{t("Quick Kaizen")}</option>
                                <option value="OTHER">{t("Altro / Generico")}</option>
                            </select>
                        </div>

                        {/* Row 1: Name & Model */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium">
                                    {t("Nome Asset")}
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    value={formData.name || ''}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                    placeholder={t("es. Pressa Idraulica")}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="model" className="text-sm font-medium">
                                    {t("Modello")}
                                </label>
                                <input
                                    id="model"
                                    name="model"
                                    value={formData.model || ''}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                    placeholder={t("es. X-2000")}
                                />
                            </div>
                        </div>

                        {/* Row 2: Serial & Vendor */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="serialNumber" className="text-sm font-medium">
                                    {t("Seriale")}
                                </label>
                                <input
                                    id="serialNumber"
                                    name="serialNumber"
                                    value={formData.serialNumber || ''}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                    placeholder={t("es. SN-123456")}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="vendor" className="text-sm font-medium">
                                    {t("Costruttore")}
                                </label>
                                <input
                                    id="vendor"
                                    name="vendor"
                                    value={formData.vendor || ''}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                    placeholder={t("es. Acme Corp")}
                                />
                            </div>
                        </div>

                        {/* Row 3: Plant & Department */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="plant" className="text-sm font-medium">
                                    {t("Stabilimento")}
                                </label>
                                <select
                                    id="plant"
                                    name="plant"
                                    value={formData.plant || ''}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    required
                                    disabled={childCount > 0}
                                    aria-describedby={childCount > 0 ? "plant-locked-hint" : undefined}
                                >
                                    <option value="">{t("Seleziona stabilimento...")}</option>
                                    {plants.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                                {childCount > 0 && (
                                    <p id="plant-locked-hint" className="text-xs text-muted-foreground">
                                        {t("Lo stabilimento non si cambia finché l'asset ha componenti collegati ({count}).", { count: childCount })}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="department" className="text-sm font-medium">
                                    {t("Reparto")}
                                </label>
                                <input
                                    id="department"
                                    name="department"
                                    value={formData.department || ''}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                    placeholder={t("es. Produzione")}
                                />
                            </div>
                        </div>

                        {/* Gerarchia: macchina -> gruppo -> componente */}
                        <div className="space-y-2">
                            <label htmlFor="parentId" className="text-sm font-medium">
                                {t("Fa parte di")} <span className="font-normal text-muted-foreground">{t("(facoltativo)")}</span>
                            </label>
                            <select
                                id="parentId"
                                name="parentId"
                                value={parentValue}
                                onChange={(e) => setFormData((prev: any) => ({ ...prev, parentId: e.target.value || null }))}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                aria-describedby="parent-hint"
                            >
                                <option value="">{t("Nessuno (macchina principale)")}</option>
                                {parentOptions.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                            <p id="parent-hint" className="text-xs text-muted-foreground">
                                {t("Per un gruppo o un componente: scegli la macchina o il gruppo di cui fa parte (stesso stabilimento, al massimo 6 livelli).")}
                            </p>
                        </div>

                        {/* Row 4: Line & Cespite */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="line" className="text-sm font-medium">
                                    {t("Linea")}
                                </label>
                                <input
                                    id="line"
                                    name="line"
                                    value={formData.line || ''}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder={t("es. Linea Assemblaggio 1")}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="cespite" className="text-sm font-medium">
                                    {t("Cespite")}
                                </label>
                                <input
                                    id="cespite"
                                    name="cespite"
                                    value={formData.cespite || ''}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder={t("es. CSP-2024-001")}
                                />
                            </div>
                        </div>

                        {/* Status & Health (Row 5) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="status" className="text-sm font-medium">
                                    {t("Stato")}
                                </label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status || 'OPERATIONAL'}
                                    onChange={(e) => setFormData((prev: any) => ({ ...prev, status: e.target.value }))}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="OPERATIONAL">{t("In Uso")}</option>
                                    <option value="MAINTENANCE">{t("In Manutenzione")}</option>
                                    <option value="STORAGE">{t("Accantonato")}</option>
                                    <option value="DECOMMISSIONED">{t("Rottamato")}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 mt-2 sm:mt-0"
                        >
                            {t("Annulla")}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("Salva")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
