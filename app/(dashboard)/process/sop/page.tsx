"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getSopDocuments } from "@/lib/process-actions";
import { FileCheck2, Filter, Search, Factory, ScanLine, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function SOPArchivePage() {
    const [sops, setSops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLine, setSelectedLine] = useState("ALL");
    const [selectedProduct, setSelectedProduct] = useState("ALL");

    useEffect(() => {
        getSopDocuments().then(data => {
            setSops(data);
            setLoading(false);
        });
    }, []);

    // Extract unique lines and products for dropdowns
    const uniqueLines = useMemo(() => {
        const lines = sops.map(s => s.line).filter(Boolean);
        return [...new Set(lines)];
    }, [sops]);

    const uniqueProducts = useMemo(() => {
        const products = sops.map(s => s.product).filter(Boolean);
        return [...new Set(products)];
    }, [sops]);

    // Apply filters
    const filteredSops = useMemo(() => {
        return sops.filter(sop => {
            const matchesSearch = sop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                sop.asset?.name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLine = selectedLine === "ALL" || sop.line === selectedLine;
            const matchesProduct = selectedProduct === "ALL" || sop.product === selectedProduct;
            return matchesSearch && matchesLine && matchesProduct;
        });
    }, [sops, searchTerm, selectedLine, selectedProduct]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <Link href="/process" className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-2 group">
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Torna a Dashboard Processo
                    </Link>
                    <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
                        <FileCheck2 className="h-8 w-8 text-indigo-600" />
                        Archivio SOP & Ricette
                    </h1>
                    <p className="text-slate-500 mt-1">Consulta e filtra i parametri standard di processo per Linea, Prodotto o Macchinario.</p>
                </div>
                <Link
                    href="/process/sop-builder"
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                    <ScanLine className="h-4 w-4" /> Nuova SOP
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cerca</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cerca per nome o asset..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="w-full md:w-64">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Linea</label>
                    <div className="relative">
                        <Factory className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select
                            value={selectedLine}
                            onChange={e => setSelectedLine(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none"
                        >
                            <option value="ALL">Tutte le Linee</option>
                            {uniqueLines.map(line => (
                                <option key={line} value={line}>{line}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="w-full md:w-64">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Prodotto</label>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <select
                            value={selectedProduct}
                            onChange={e => setSelectedProduct(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none"
                        >
                            <option value="ALL">Tutti i Prodotti</option>
                            {uniqueProducts.map(prod => (
                                <option key={prod} value={prod}>{prod}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white border rounded-2xl h-48 animate-pulse p-6">
                            <div className="h-6 bg-slate-100 rounded w-1/2 mb-4"></div>
                            <div className="h-4 bg-slate-100 rounded w-1/3 mb-2"></div>
                            <div className="h-4 bg-slate-100 rounded w-1/4"></div>
                        </div>
                    ))}
                </div>
            ) : filteredSops.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed text-slate-500">
                    <FileCheck2 className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p className="font-medium text-lg text-slate-600">Nessuna SOP trovata</p>
                    <p className="text-sm">Prova a modificare i filtri di ricerca.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSops.map(sop => {
                        let paramsCount = 0;
                        try {
                            paramsCount = JSON.parse(sop.aiExtractedParameters || "[]").length;
                        } catch (e) { }

                        return (
                            <Link
                                href={`/assets/${sop.assetId}`}
                                key={sop.id}
                                className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-wrap gap-2">
                                            {sop.line && (
                                                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-md border border-indigo-100">
                                                    Linea: {sop.line}
                                                </span>
                                            )}
                                            {sop.product && (
                                                <span className="px-2.5 py-1 bg-fuchsia-50 text-fuchsia-700 text-xs font-bold uppercase tracking-wider rounded-md border border-fuchsia-100">
                                                    Prod: {sop.product}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`h-2.5 w-2.5 rounded-full ${sop.isApproved ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                    </div>
                                    <h3 className="font-bold text-xl text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                        {sop.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-2 font-medium">
                                        Asset: {sop.asset?.name || "Modello Sconosciuto"}
                                    </p>
                                </div>
                                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <FileCheck2 className="h-4 w-4" /> {paramsCount} Parametri
                                    </span>
                                    <span>
                                        {format(new Date(sop.createdAt), "d MMM yyyy", { locale: it })}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
