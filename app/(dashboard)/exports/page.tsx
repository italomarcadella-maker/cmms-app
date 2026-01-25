"use client";

import { useWorkOrders } from "@/lib/work-orders-context";
import { useAssets } from "@/lib/assets-context";
import { useInventory } from "@/lib/inventory-context";
import { useComponents } from "@/lib/components-context";
import { FileDown, FileSpreadsheet, History, PackageCheck, AlertCircle, Upload, Zap } from "lucide-react";
import { importAssets, importWorkOrders, getAllMeterReadings } from "@/lib/actions";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function ExportsPage() {
    const { workOrders } = useWorkOrders();
    const { assets } = useAssets();
    const { parts, addPart } = useInventory();
    const { addComponent } = useComponents();
    const router = useRouter();

    const [importing, setImporting] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Helpers
    const downloadCSV = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const textToSaveAsURL = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.download = filename;
        downloadLink.href = textToSaveAsURL;
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const obj: any = {};
            headers.forEach((header, index) => {
                obj[header] = values[index];
            });
            return obj;
        });
    };

    // --- TEMPLATES ---
    const downloadTemplate = (type: 'wo' | 'inventory' | 'assets' | 'screws') => {
        let headers = "";
        let filename = "";

        switch (type) {
            case 'wo':
                headers = "title,assetName,priority,status,category,description,dueDate,assignedTo";
                filename = "template_interventi.csv";
                break;
            case 'inventory':
                headers = "name,category,warehouse,quantity,minQuantity,location,cost";
                filename = "template_magazzino.csv";
                break;
            case 'assets':
                headers = "name,model,serialNumber,location,status,healthScore,category,purchaseDate";
                filename = "template_asset.csv";
                break;
            case 'screws':
                headers = "code,model,type,warehouse,location,status,nominalDiameter,manufacturer,usageType";
                filename = "template_viti_cilindri.csv";
                break;
        }
        downloadCSV(headers, filename);
    };

    // --- IMPORTS ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'wo' | 'inventory' | 'assets' | 'screws') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(type);
        setMessage(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const data = parseCSV(text);
                let result;

                switch (type) {
                    case 'wo':
                        result = await importWorkOrders(data);
                        if (result.success) {
                            setMessage({ type: 'success', text: `Importati ${result.count} interventi.` });
                            if (result.errors.length > 0) alert("Alcuni errori:\n" + result.errors.join("\n"));
                        }
                        break;
                    case 'assets':
                        result = await importAssets(data);
                        if (result.success) {
                            setMessage({ type: 'success', text: `Importati ${result.count} asset.` });
                            if (result.errors.length > 0) alert("Alcuni errori:\n" + result.errors.join("\n"));
                        }
                        break;
                    case 'inventory':
                        // Client-side import
                        let invCount = 0;
                        data.forEach((row: any) => {
                            if (row.name) {
                                addPart({
                                    name: row.name,
                                    category: row.category || 'General',
                                    warehouse: row.warehouse || 'MAGLIATO',
                                    quantity: parseInt(row.quantity) || 0,
                                    minQuantity: parseInt(row.minQuantity) || 0,
                                    location: row.location || 'Unknown',
                                    unitCost: parseFloat(row.cost) || 0
                                });
                                invCount++;
                            }
                        });
                        setMessage({ type: 'success', text: `Aggiunti ${invCount} articoli al magazzino.` });
                        break;
                    case 'screws':
                        // Client-side import
                        let screwCount = 0;
                        data.forEach((row: any) => {
                            if (row.code && row.model) {
                                addComponent({
                                    code: row.code,
                                    model: row.model,
                                    type: (row.type === 'VITE' || row.type === 'SCREW') ? 'SCREW' : 'BARREL',
                                    warehouse: (row.warehouse === 'RETINATO') ? 'RETINATO' : 'MAGLIATO',
                                    location: row.location || 'Unknown',
                                    status: row.status || 'OPTIMAL',
                                    nominalDiameter: parseFloat(row.nominalDiameter) || 0,
                                    manufacturer: row.manufacturer || 'Unknown',
                                    usageType: row.usageType || 'JOLLY',
                                    purchaseDate: new Date().toISOString(),
                                    measurements: []
                                });
                                screwCount++;
                            }
                        });
                        setMessage({ type: 'success', text: `Aggiunti ${screwCount} componenti al database viti.` });
                        break;
                }
                router.refresh();
            } catch (err) {
                console.error(err);
                setMessage({ type: 'error', text: "Errore durante l'importazione. Verifica il formato CSV." });
            } finally {
                setImporting(null);
                // Reset file input
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    // --- EXPORTS (Existing Logic) ---
    const exportWorkOrders = () => {
        const headers = ["ID", "Titolo", "Asset", "Priorita", "Stato", "Tecnico", "Data Scadenza", "Costo Parti (€)", "Costo Manodopera (€)", "Totale (€)"];
        const rows = workOrders.map(wo => {
            const partsCost = wo.partsUsed?.reduce((sum, p) => sum + (p.unitCost * p.quantity), 0) || 0;
            const laborCost = wo.laborLogs?.reduce((sum, l) => sum + (l.hours * 50), 0) || 0;
            return [
                wo.id,
                `"${wo.title.replace(/"/g, '""')}"`,
                `"${wo.assetName}"`,
                wo.priority,
                wo.status,
                wo.assignedTo || "Unassigned",
                new Date(wo.dueDate).toLocaleDateString(),
                partsCost.toFixed(2),
                laborCost.toFixed(2),
                (partsCost + laborCost).toFixed(2)
            ].join(",");
        });
        downloadCSV([headers.join(","), ...rows].join("\n"), `Interventi_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const exportMaterialUsage = () => {
        const headers = ["Data", "Ricambio", "Quantita", "Costo Unitario", "Intervento ID", "Asset"];
        const rows: string[] = [];
        workOrders.forEach(wo => {
            if (wo.partsUsed) {
                wo.partsUsed.forEach(part => {
                    rows.push([
                        new Date(part.dateAdded || wo.createdAt).toLocaleDateString(),
                        `"${part.partName}"`,
                        part.quantity.toString(),
                        part.unitCost.toString(),
                        wo.id,
                        `"${wo.assetName}"`
                    ].join(","));
                });
            }
        });
        downloadCSV([headers.join(","), ...rows].join("\n"), `Consumi_Materiali_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const exportInventory = () => {
        const headers = ["Codice", "Nome", "Categoria", "Giacenza", "Giacenza Min", "Locazione", "Valore Unitario"];
        const rows = parts.map(part => [
            part.id, `"${part.name}"`, part.category, part.quantity, part.minQuantity, `"${part.location}"`, part.unitCost || 0
        ].join(","));
        downloadCSV([headers.join(","), ...rows].join("\n"), `Inventario_Magazzino_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const exportAssets = () => {
        const headers = ["ID", "Nome", "Modello", "Seriale", "Stato", "Health Score", "Ubicazione", "Reparto"];
        const rows = assets.map(asset => [
            asset.id, `"${asset.name}"`, `"${asset.model}"`, `"${asset.serialNumber}"`, asset.status, asset.healthScore, `"${asset.location}"`, `"${asset.department}"`
        ].join(","));
        downloadCSV([headers.join(","), ...rows].join("\n"), `Parco_Asset_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const exportEnergy = async () => {
        try {
            const readings = await getAllMeterReadings();
            const headers = ["Data", "Contatore", "Tipo", "Matricola", "Posizione", "Valore", "Unita", "Anomalia", "Analisi AI"];
            const rows = readings.map((r: any) => [
                r.date,
                `"${r.meterName}"`,
                r.meterType,
                `"${r.meterSerial}"`,
                `"${r.meterLocation}"`,
                r.value,
                r.unit,
                r.isAnomaly ? "SI" : "NO",
                `"${(r.aiAnalysis || '').replace(/"/g, '""')}"`
            ].join(","));

            downloadCSV([headers.join(","), ...rows].join("\n"), `Consumi_Energetici_${new Date().toISOString().split('T')[0]}.csv`);
            setMessage({ type: 'success', text: "Export energia completato con successo." });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: "Errore durante l'export dei consumi." });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Estrazioni & Importazioni Dati
                </h1>
                <p className="text-muted-foreground mt-1">Gestisci l'esportazione dei report e l'importazione massiva dei dati.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.type === 'success' ? <PackageCheck className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    {message.text}
                </div>
            )}

            <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <FileDown className="h-5 w-5 text-blue-500" /> Esportazione Dati
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ExportCard
                        icon={<History className="h-6 w-6 text-blue-600" />}
                        color="bg-blue-100 dark:bg-blue-900/30"
                        title="Registro Interventi"
                        desc="Storico completo Ordini di Lavoro, costi e assegnazioni."
                        count={`${workOrders.length} Records`}
                        label="Esporta Interventi"
                        onClick={exportWorkOrders}
                    />
                    <ExportCard
                        icon={<PackageCheck className="h-6 w-6 text-amber-600" />}
                        color="bg-amber-100 dark:bg-amber-900/30"
                        title="Consumi Materiali"
                        desc="Analisi ricambi utilizzati e costi associati."
                        count="Report"
                        label="Esporta Consumi"
                        onClick={exportMaterialUsage}
                    />
                    <ExportCard
                        icon={<AlertCircle className="h-6 w-6 text-emerald-600" />}
                        color="bg-emerald-100 dark:bg-emerald-900/30"
                        title="Giacenze Magazzino"
                        desc="Inventario attuale con quantità e valori."
                        count={`${parts?.length || 0} Articoli`}
                        label="Esporta Magazzino"
                        onClick={exportInventory}
                    />
                    <ExportCard
                        icon={<FileSpreadsheet className="h-6 w-6 text-purple-600" />}
                        color="bg-purple-100 dark:bg-purple-900/30"
                        title="Parco Asset"
                        desc="Lista macchinari, stato e ubicazione."
                        count={`${assets.length} Asset`}
                        label="Esporta Asset"
                        onClick={exportAssets}
                    />
                    <ExportCard
                        icon={<Zap className="h-6 w-6 text-yellow-600" />}
                        color="bg-yellow-100 dark:bg-yellow-900/30"
                        title="Consumi Energetici"
                        desc="Storico letture contatori con analisi anomalie."
                        count="Report"
                        label="Esporta Energia"
                        onClick={exportEnergy}
                    />
                </div>
            </div>

            <div className="space-y-4 pt-6 border-t">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Upload className="h-5 w-5 text-orange-500" /> Importazione Dati (CSV)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ImportCard
                        title="Importa Asset"
                        desc="Carica nuovi macchinari o aggiorna esistenti."
                        onTemplate={() => downloadTemplate('assets')}
                        onUpload={(e) => handleFileUpload(e, 'assets')}
                        loading={importing === 'assets'}
                    />
                    <ImportCard
                        title="Importa Interventi"
                        desc="Carica storico interventi manutentivi."
                        onTemplate={() => downloadTemplate('wo')}
                        onUpload={(e) => handleFileUpload(e, 'wo')}
                        loading={importing === 'wo'}
                    />
                    <ImportCard
                        title="Importa Magazzino"
                        desc="Carica articoli e giacenze iniziali."
                        onTemplate={() => downloadTemplate('inventory')}
                        onUpload={(e) => handleFileUpload(e, 'inventory')}
                        loading={importing === 'inventory'}
                    />
                    <ImportCard
                        title="Importa Viti & Cilindri"
                        desc="Carica database componenti specifici."
                        onTemplate={() => downloadTemplate('screws')}
                        onUpload={(e) => handleFileUpload(e, 'screws')}
                        loading={importing === 'screws'}
                    />
                </div>
            </div>
        </div>
    );
}

function ExportCard({ icon, color, title, desc, count, label, onClick }: any) {
    return (
        <div className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${color}`}>
                    {icon}
                </div>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                    {count}
                </span>
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground mb-6 h-10">{desc}</p>
            <button onClick={onClick} className="w-full flex items-center justify-center gap-2 bg-background border hover:bg-muted text-foreground px-4 py-2.5 rounded-lg font-medium transition-colors">
                <FileDown className="h-4 w-4" /> {label}
            </button>
        </div>
    );
}

function ImportCard({ title, desc, onTemplate, onUpload, loading }: any) {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-orange-400">
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">{title}</h3>
                {loading && <span className="animate-spin text-orange-500">⏳</span>}
            </div>
            <p className="text-sm text-muted-foreground mb-4 h-10">{desc}</p>

            <div className="flex gap-2">
                <button
                    onClick={onTemplate}
                    className="flex-1 text-xs border border-dashed border-gray-300 hover:border-gray-400 text-muted-foreground hover:text-foreground py-2 rounded flex items-center justify-center gap-1"
                >
                    <FileSpreadsheet className="h-3 w-3" /> Scarica Template
                </button>
                <div className="flex-1 relative">
                    <input
                        type="file"
                        accept=".csv"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={onUpload}
                        disabled={loading}
                        ref={inputRef}
                    />
                    <button className="w-full h-full bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-medium py-2 rounded flex items-center justify-center gap-1 transition-colors">
                        <Upload className="h-3 w-3" /> {loading ? 'Caricamento...' : 'Carica CSV'}
                    </button>
                </div>
            </div>
        </div>
    );
}
