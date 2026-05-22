"use client";

import { useState, useEffect, useCallback } from "react";
import { getSOPsByAsset, updateSopDocument } from "@/lib/process-actions";
import { FileCheck2, Edit2, Save, X } from "lucide-react";

export function AssetSOPList({ assetId }: { assetId: string }) {
    const [sops, setSops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingSopId, setEditingSopId] = useState<string | null>(null);
    const [editParams, setEditParams] = useState<any[]>([]);
    const [editTitle, setEditTitle] = useState("");

    const loadSOPs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSOPsByAsset(assetId);
            setSops(data || []);
        } catch (e) {
            console.error("Error loading SOPs", e);
        } finally {
            setLoading(false);
        }
    }, [assetId]);

    useEffect(() => {
        loadSOPs();
    }, [loadSOPs]);

    const startEditing = (sop: typeof sops[0]) => {
        setEditingSopId(sop.id);
        setEditTitle(sop.title);
        try {
            setEditParams(JSON.parse(sop.aiExtractedParameters));
        } catch {
            setEditParams([]);
        }
    };

    const cancelEditing = () => {
        setEditingSopId(null);
        setEditParams([]);
    };

    const handleParamChange = (index: number, field: string, value: any) => {
        const newParams = [...editParams];
        newParams[index][field] = value;
        setEditParams(newParams);
    };

    const saveSOP = async (id: string) => {
        const res = await updateSopDocument(id, {
            title: editTitle,
            aiExtractedParameters: JSON.stringify(editParams)
        });
        if (res.success) {
            cancelEditing();
            loadSOPs();
        } else {
            alert(res.message);
        }
    };

    if (loading) return <div className="animate-pulse h-20 bg-muted/20 rounded-lg"></div>;

    if (sops.length === 0) {
        return (
            <div className="text-center py-6 text-sm text-muted-foreground italic">
                Nessuna SOP approvata per questo asset.<br />
                <a href="/process/sop-builder" className="text-primary hover:underline mt-2 inline-block">Scannerizza nuova ricetta</a>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {sops.map(sop => {
                const isEditing = editingSopId === sop.id;
                let parsedParams: any[] = [];
                if (!isEditing) {
                    try {
                        parsedParams = JSON.parse(sop.aiExtractedParameters);
                    } catch {
                        parsedParams = [];
                    }
                }

                return (
                    <div key={sop.id} className="border rounded-xl p-4 bg-white shadow-sm transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <FileCheck2 className="h-5 w-5 text-indigo-500" />
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="font-semibold text-lg border-b border-indigo-200 focus:outline-none focus:border-indigo-500"
                                    />
                                ) : (
                                    <h4 className="font-semibold text-lg text-slate-800">{sop.title}</h4>
                                )}
                            </div>
                            <div>
                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <button onClick={cancelEditing} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100">
                                            <X className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => saveSOP(sop.id)} className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-md hover:bg-emerald-50">
                                            <Save className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => startEditing(sop)} className="text-xs flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-medium">
                                        <Edit2 className="h-3.5 w-3.5" /> Modifica
                                    </button>
                                )}
                            </div>
                        </div>

                        <p className="text-xs text-slate-400 mb-4 border-b pb-2">
                            Autore: {sop.author} • Inserita il: {new Date(sop.createdAt).toLocaleDateString()}
                        </p>

                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase px-2">
                                <div className="col-span-6">Parametro</div>
                                <div className="col-span-3 text-center">Valore</div>
                                <div className="col-span-3 text-center">Toll.</div>
                            </div>

                            {(isEditing ? editParams : parsedParams).map((param: any, idx: number) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg text-sm">
                                    <div className="col-span-6 font-medium text-slate-700 truncate" title={param.label}>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={param.label}
                                                onChange={(e) => handleParamChange(idx, "label", e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded px-1"
                                            />
                                        ) : param.label}
                                    </div>
                                    <div className="col-span-3 text-center">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={param.value}
                                                onChange={(e) => handleParamChange(idx, "value", Number(e.target.value))}
                                                className="w-full text-center bg-white border border-slate-200 rounded font-mono text-xs"
                                            />
                                        ) : (
                                            <span className="font-mono">{param.value} {param.unit}</span>
                                        )}
                                    </div>
                                    <div className="col-span-3 text-center">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={param.tolerance}
                                                onChange={(e) => handleParamChange(idx, "tolerance", Number(e.target.value))}
                                                className="w-full text-center bg-white border border-slate-200 rounded font-mono text-xs"
                                            />
                                        ) : (
                                            <span className="text-xs text-slate-500">±{param.tolerance}</span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isEditing && (
                                <button
                                    onClick={() => setEditParams([...editParams, { label: "Nuovo Parametro", value: 0, unit: "unità", tolerance: 1 }])}
                                    className="w-full mt-2 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100 border-dashed"
                                >
                                    + Aggiungi Parametro
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
