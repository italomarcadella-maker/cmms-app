"use client";

import { useState } from "react";
import { useInventory } from "@/lib/inventory-context";
import { Plus, Box, AlertTriangle, Trash2 } from "lucide-react";


export default function InventoryPage() {
    const { parts, addPart, updateQuantity, removePart } = useInventory();
    const [isAdding, setIsAdding] = useState(false);

    // New part state
    const [newName, setNewName] = useState("");
    const [newCategory, setNewCategory] = useState("Consumables");
    const [newWarehouse, setNewWarehouse] = useState("Magazzino meccanico"); // Default
    const [newQty, setNewQty] = useState(0);
    const [newMinQty, setNewMinQty] = useState(5);
    const [newLocation, setNewLocation] = useState("Shelf A");

    const [search, setSearch] = useState("");

    const filteredParts = parts.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        (p.warehouse || "").toLowerCase().includes(search.toLowerCase())
    );

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addPart({
            name: newName,
            category: newCategory,
            warehouse: newWarehouse,
            quantity: Number(newQty),
            minQuantity: Number(newMinQty),
            location: newLocation
        });
        setIsAdding(false);
        setNewName("");
        setNewQty(0);
        setNewMinQty(5);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Box className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                            Magazzino Ricambi
                        </h1>
                        <p className="text-muted-foreground text-sm">Monitora scorte e posizioni dei materiali.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-sm transition-all hover:scale-105"
                    >
                        <Plus className={`h-4 w-4 transition-transform ${isAdding ? "rotate-45" : ""}`} />
                        {isAdding ? "Annulla" : "Aggiungi Ricambio"}
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            {!isAdding && (
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Cerca ricambi per nome, categoria o magazzino..."
                        className="pl-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground"
                    >
                        <path
                            fillRule="evenodd"
                            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
            )}

            {isAdding && (
                <div className="rounded-xl border bg-card p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Box className="h-4 w-4 text-primary" /> Nuovo Ricambio
                        </h3>
                    </div>

                    <form onSubmit={handleAdd} className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div className="lg:col-span-2 space-y-2">
                            <label className="text-sm font-medium">Nome Articolo</label>
                            <input required className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                                value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Cuscinetto SKF 6204" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Categoria</label>
                            <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                                <option value="Consumables">Consumabili</option>
                                <option value="Spares">Ricambi Critici</option>
                                <option value="Tools">Utensili</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Magazzino</label>
                            <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                value={newWarehouse} onChange={e => setNewWarehouse(e.target.value)}>
                                <option value="Magazzino motori">Magazzino motori</option>
                                <option value="Magazzino Elettrico">Magazzino Elettrico</option>
                                <option value="Magazzino meccanico">Magazzino meccanico</option>
                                <option value="Deposito magazzino dischi">Deposito magazzino dischi</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ubicazione</label>
                            <input required className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="e.g. Scaffale A" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Quantità Iniziale</label>
                            <input type="number" min="0" required className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                value={newQty} onChange={e => setNewQty(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Min. Scorta</label>
                            <input type="number" min="0" required className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                value={newMinQty} onChange={e => setNewMinQty(Number(e.target.value))} />
                        </div>
                        <div className="lg:col-span-5 flex justify-end gap-2 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                                Annulla
                            </button>
                            <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                                Salva Articolo
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 font-medium">
                            <tr>
                                <th className="px-4 py-3 text-left">Articolo</th>
                                <th className="px-4 py-3 text-left">Categoria</th>
                                <th className="px-4 py-3 text-left">Magazzino</th>
                                <th className="px-4 py-3 text-left">Ubicazione</th>
                                <th className="px-4 py-3 text-center">Disponibilità</th>
                                <th className="px-4 py-3 text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-left">
                            {filteredParts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                                        Nessun articolo trovato.
                                    </td>
                                </tr>
                            ) : (
                                filteredParts.map(part => (
                                    <tr key={part.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 font-medium">
                                            {part.name}
                                            <div className="text-xs text-muted-foreground font-mono">{part.id}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                                {part.category === 'Consumables' ? 'Consumabili' :
                                                    part.category === 'Spares' ? 'Ricambi Critici' :
                                                        part.category === 'Tools' ? 'Utensili' : part.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">{part.warehouse}</td>
                                        <td className="px-4 py-3">{part.location}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`font-mono font-medium text-lg ${part.quantity <= part.minQuantity ? "text-destructive" : ""}`}>
                                                {part.quantity}
                                            </span>
                                            {part.quantity <= part.minQuantity && (
                                                <div className="flex items-center justify-center gap-1 text-xs text-destructive mt-1 font-medium animate-pulse">
                                                    <AlertTriangle className="h-3 w-3" /> Scorta Bassa
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => {
                                                    const qtyToAdd = prompt(`Quanti pezzi di '${part.name}' vuoi caricare?`, "1");
                                                    if (qtyToAdd && !isNaN(Number(qtyToAdd))) {
                                                        const qty = Number(qtyToAdd);
                                                        if (qty <= 0) return;
                                                        updateQuantity(part.id, part.quantity + qty);
                                                    }
                                                }}
                                                className="text-emerald-600 hover:bg-emerald-50 transition-colors p-2 rounded-md mr-1"
                                                title="Carico Manuale"
                                            >
                                                <div className="relative">
                                                    <Box className="h-4 w-4" />
                                                    <span className="absolute -bottom-1 -right-1 text-[10px] font-bold bg-white rounded-full border border-emerald-600 w-3 h-3 flex items-center justify-center">+</span>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const qtyToRem = prompt(`Quanti pezzi di '${part.name}' vuoi scaricare?`, "1");
                                                    if (qtyToRem && !isNaN(Number(qtyToRem))) {
                                                        const qty = Number(qtyToRem);
                                                        if (qty > part.quantity) {
                                                            alert("Quantità insufficiente!");
                                                            return;
                                                        }
                                                        updateQuantity(part.id, part.quantity - qty);
                                                    }
                                                }}
                                                className="text-amber-600 hover:bg-amber-50 transition-colors p-2 rounded-md mr-1"
                                                title="Scarico Manuale"
                                            >
                                                <div className="relative">
                                                    <Box className="h-4 w-4" />
                                                    <span className="absolute -bottom-1 -right-1 text-[10px] font-bold bg-white rounded-full border border-amber-600 w-3 h-3 flex items-center justify-center">-</span>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => removePart(part.id)}
                                                className="text-muted-foreground hover:text-white hover:bg-destructive transition-colors p-2 rounded-md"
                                                title="Rimuovi"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
