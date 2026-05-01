"use client";

import React, { useState, useEffect } from "react";
import { getProjects, createProject, deleteProject, getUnresolvedAnomalies, archiveProject } from "@/lib/process-actions";
import { Plus, BarChart3, TrendingUp, GitPullRequest, Settings, ArrowRight, Trash2, ShieldAlert, FileCheck2, Archive, ListFilter, Network, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function ProcessDashboard() {
    const [projects, setProjects] = useState<any[]>([]);
    const [anomalies, setAnomalies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);
    
    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newProjTitle, setNewProjTitle] = useState("");
    const [newProjDesc, setNewProjDesc] = useState("");
    const [newProjRoi, setNewProjRoi] = useState("0");

    const loadData = async () => {
        setLoading(true);
        const [projectsData, anomaliesData] = await Promise.all([
            getProjects(showArchived),
            getUnresolvedAnomalies()
        ]);
        setProjects(projectsData);
        setAnomalies(anomaliesData);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [showArchived]);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjTitle) return;
        
        await createProject({
            title: newProjTitle,
            description: newProjDesc || "Progetto di miglioramento di processo",
            startDate: new Date(),
            endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // +30 days
            roi: parseFloat(newProjRoi || "0")
        });
        
        setIsCreateModalOpen(false);
        setNewProjTitle("");
        setNewProjDesc("");
        setNewProjRoi("0");
        loadData();
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Eliminare definitivamente questo progetto e tutti i task associati?")) {
            const res = await deleteProject(id);
            if (res.success) loadData();
            else alert(res.message);
        }
    };

    const handleArchive = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Archiviare questo progetto?")) {
            const res = await archiveProject(id);
            if (res.success) loadData();
            else alert(res.message);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'ON_HOLD': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'COMPLETED': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                        <Settings className="h-8 w-8 text-blue-600" />
                        Ingegneria di Processo
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium max-w-2xl">
                        Hub centrale per l'ottimizzazione degli asset. Configura layout di linea, gestisci le derive di processo (Muri/Muda) e standardizza le operazioni con intelligenza artificiale.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 hover:bg-blue-700 transition-all"
                >
                    <Plus className="h-4 w-4" /> Nuovo Progetto
                </button>
            </div>

            {/* Le Nostre Suite - Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/process/fpes" className="group block bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl overflow-hidden relative hover:-translate-y-1 transition-transform duration-300">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Network className="w-32 h-32 text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md border border-white/20">
                            <Network className="h-6 w-6 text-cyan-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">FPES Suite 2.0</h3>
                        <p className="text-slate-300 text-sm leading-relaxed mb-6 line-clamp-3">
                            FITT Process Engineering Suite. Motore vettoriale per Line Design, bilanciamento dinamico Yamazumi, Ergonomia (Golden Zone) e Kaizen Board integrata.
                        </p>
                        <div className="flex items-center text-cyan-400 font-semibold text-sm group-hover:text-cyan-300">
                            Apri Suite <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                    </div>
                </Link>

                <Link href="/process/sop-mes" className="group block bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 overflow-hidden relative hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <FileCheck2 className="w-32 h-32 text-indigo-600" />
                    </div>
                    <div className="relative z-10">
                        <div className="bg-indigo-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 border border-indigo-100">
                            <FileCheck2 className="h-6 w-6 text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">SOP MES & AI Vision</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-3">
                            Standardizzazione documentale automatizzata. Acquisisci foto dall'HMI e lascia che Cortex AI estragga automaticamente temperature, pressioni e setpoint per generare la SOP.
                        </p>
                        <div className="flex items-center text-indigo-600 font-semibold text-sm group-hover:text-indigo-700">
                            Gestione SOP <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                    </div>
                </Link>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                {/* Anomalie Sidebar */}
                <div className="lg:col-span-1 bg-gradient-to-b from-amber-50 to-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-amber-800 font-bold">
                        <Activity className="h-5 w-5" /> Derive di Processo
                    </div>
                    {anomalies.length > 0 ? (
                        <div className="space-y-3">
                            {anomalies.map((a: any) => (
                                <div key={a.id} className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm flex flex-col gap-1">
                                    <span className="text-xs font-bold text-slate-800">{a.asset?.name || "Asset Sconosciuto"}</span>
                                    <span className="text-xs text-slate-600">{a.description}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <ShieldAlert className="h-10 w-10 text-emerald-200 mx-auto mb-2" />
                            <p className="text-sm font-medium text-emerald-600">Nessuna deriva segnalata.</p>
                            <p className="text-xs text-slate-400 mt-1">Parametri di processo entro le tolleranze.</p>
                        </div>
                    )}
                </div>

                {/* Lista Progetti */}
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            {showArchived ? 'Archivio Progetti' : 'Progetti di Miglioramento'}
                        </h2>
                        <button 
                            onClick={() => setShowArchived(!showArchived)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                                showArchived 
                                    ? "bg-slate-800 text-white border-slate-900 shadow-md" 
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            <ListFilter className="h-4 w-4" />
                            {showArchived ? 'Mostra Attivi' : 'Mostra Archiviati'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loading ? (
                            <div className="col-span-full py-12 text-center text-slate-400 font-medium animate-pulse">
                                Caricamento Progetti...
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-slate-400 font-medium bg-white rounded-2xl border border-dashed border-slate-300">
                                Nessun progetto trovato. Clicca su "Nuovo Progetto" in alto a destra.
                            </div>
                        ) : (
                            projects.map(project => (
                                <Link
                                    key={project.id}
                                    href={`/process/projects/${project.id}`}
                                    className="group bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:border-blue-200 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[180px]"
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${getStatusColor(project.status)}`}>
                                                {project.status === 'PLANNING' ? 'IN PIANIFICAZIONE' : project.status}
                                            </span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => handleArchive(project.id, e)}
                                                    className="text-slate-300 hover:text-amber-500 hover:bg-amber-50 p-1 rounded transition-colors"
                                                    title="Archivia"
                                                >
                                                    <Archive className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(project.id, e)}
                                                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                                    title="Elimina"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-1">
                                            {project.title}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                            {project.description || "Nessuna descrizione fornita."}
                                        </p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-100">
                                        <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                                            <span>{project.tasks?.length || 0} Task</span>
                                            <span className="font-semibold text-emerald-600">ROI: €{project.roi || 0}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000"
                                                style={{ width: `${project.progress || 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modale Nuovo Progetto */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Crea Nuovo Progetto</h2>
                            <p className="text-xs text-slate-500 mt-1">Inizializza un progetto di miglioramento processo.</p>
                        </div>
                        <form onSubmit={handleCreateProject} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Titolo Progetto</label>
                                <input 
                                    type="text" required
                                    value={newProjTitle} onChange={e => setNewProjTitle(e.target.value)}
                                    className="w-full border-slate-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" 
                                    placeholder="Es. Ottimizzazione Linea 3"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Descrizione</label>
                                <textarea 
                                    value={newProjDesc} onChange={e => setNewProjDesc(e.target.value)}
                                    className="w-full border-slate-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 min-h-[80px]" 
                                    placeholder="Obiettivi del progetto..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">ROI Stimato (€)</label>
                                <input 
                                    type="number" min="0" step="1000"
                                    value={newProjRoi} onChange={e => setNewProjRoi(e.target.value)}
                                    className="w-full border-slate-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" 
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annulla</button>
                                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Crea Progetto</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
