"use client";

import React, { useState } from "react";
import { updatePurchaseRequestStatus, fulfillPurchaseRequest } from "@/lib/inventory-actions";
import { format } from "date-fns";
import { it } from 'date-fns/locale';
import { PackageSearch, CheckCircle2, Truck, FileText, AlertCircle } from "lucide-react";

export function PurchaseRequestsList({ initialRequests }: { initialRequests: any[] }) {
    const [requests, setRequests] = useState(initialRequests);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleStatusChange = async (id: string, newStatus: string) => {
        setLoadingId(id);
        const res = await updatePurchaseRequestStatus(id, newStatus);
        if (res.success) {
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        } else {
            alert(res.message);
        }
        setLoadingId(null);
    };

    const handleFulfill = async (id: string) => {
        if (!confirm("Confermi la ricezione della merce? La giacenza verrà aggiornata automaticamente.")) return;
        setLoadingId(id);
        const res = await fulfillPurchaseRequest(id);
        if (res.success) {
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "RECEIVED", receivedAt: new Date() } : r));
            alert("Giacenza aggiornata!");
        } else {
            alert(res.message);
        }
        setLoadingId(null);
    };

    if (requests.length === 0) {
        return (
            <div className="bg-white border rounded-xl p-12 text-center text-slate-500 flex flex-col items-center">
                <PackageSearch className="h-12 w-12 mb-4 text-slate-300" />
                <p>Nessuna richiesta d'acquisto presente al momento.</p>
            </div>
        );
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "DRAFT": return <FileText className="h-4 w-4" />;
            case "SUBMITTED": return <AlertCircle className="h-4 w-4" />;
            case "APPROVED": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case "ORDERED": return <Truck className="h-4 w-4 text-amber-500" />;
            case "RECEIVED": return <Box className="h-4 w-4 text-indigo-500" />;
            default: return null;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "DRAFT": return "Bozza (Auto)";
            case "SUBMITTED": return "Inviata per appr.";
            case "APPROVED": return "Approvata";
            case "ORDERED": return "Ordinata";
            case "RECEIVED": return "Merce Ricevuta";
            default: return status;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                        <tr>
                            <th className="px-6 py-4">Data Richiesta</th>
                            <th className="px-6 py-4">Ricambio</th>
                            <th className="px-6 py-4 text-center">Qtà Riordino</th>
                            <th className="px-6 py-4">Stato</th>
                            <th className="px-6 py-4">Motivo</th>
                            <th className="px-6 py-4 text-right">Costo Stimato</th>
                            <th className="px-6 py-4 text-right">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {requests.map((req) => (
                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                                    {format(new Date(req.requestedAt), "dd MMM yyyy", { locale: it })}
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-800">
                                    {req.part.name}
                                    <div className="text-xs font-mono text-slate-400 font-normal">{req.part.id}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="font-bold bg-slate-100 py-1 px-3 rounded-md border border-slate-200">
                                        {req.quantity}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${req.status === 'DRAFT' ? 'bg-slate-100 text-slate-700' :
                                            req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                req.status === 'ORDERED' ? 'bg-amber-100 text-amber-700' :
                                                    req.status === 'RECEIVED' ? 'bg-indigo-100 text-indigo-700' :
                                                        'bg-blue-100 text-blue-700'
                                        }`}>
                                        {getStatusIcon(req.status)}
                                        {getStatusText(req.status)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={req.reason}>
                                    {req.reason}
                                </td>
                                <td className="px-6 py-4 text-right font-medium">
                                    {req.expectedCost ? `€${req.expectedCost.toFixed(2)}` : '-'}
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    {req.status === "DRAFT" && (
                                        <button
                                            disabled={loadingId === req.id}
                                            onClick={() => handleStatusChange(req.id, "APPROVED")}
                                            className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline text-xs"
                                        >
                                            Approva
                                        </button>
                                    )}
                                    {req.status === "APPROVED" && (
                                        <button
                                            disabled={loadingId === req.id}
                                            onClick={() => handleStatusChange(req.id, "ORDERED")}
                                            className="text-amber-600 hover:text-amber-700 font-medium hover:underline text-xs"
                                        >
                                            Segna Ordinato
                                        </button>
                                    )}
                                    {req.status === "ORDERED" && (
                                        <button
                                            disabled={loadingId === req.id}
                                            onClick={() => handleFulfill(req.id)}
                                            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
                                        >
                                            Ricevi Merce
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div >
    );
}
// Placeholder Box icon
function Box(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>
}
