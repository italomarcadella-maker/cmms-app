"use client";

import React, { useState, useEffect } from "react";
import { getProjects, createProject, deleteProject, getUnresolvedAnomalies, archiveProject } from "@/lib/process-actions";
import { Plus, BarChart3, Settings, Trash2, ShieldAlert, Archive, ListFilter, Activity, Network, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
    const [selectedModules, setSelectedModules] = useState<string[]>(['GANTT']);

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

    const toggleModule = (mod: string) => {
        if (selectedModules.includes(mod)) {
            setSelectedModules(selectedModules.filter(m => m !== mod));
        } else {
            setSelectedModules([...selectedModules, mod]);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjTitle) return;
        
        const res = await createProject({
            title: newProjTitle,
            description: newProjDesc || "Progetto di miglioramento di processo",
            startDate: new Date(),
            endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // +30 days
            roi: parseFloat(newProjRoi || "0")
        });
        
        if (res.success && res.project) {
            // Save selected modules to local storage for the new project
            localStorage.setItem(`proj_modules_${res.project.id}`, JSON.stringify(selectedModules));
            
            setIsCreateModalOpen(false);
            setNewProjTitle("");
            setNewProjDesc("");
            setNewProjRoi("0");
            setSelectedModules(['GANTT']); // Reset
            loadData();
            // Option: Redirect to the new project immediately
            // window.location.href = `/process/projects/${res.project.id}`;
        } else {
            alert("Errore nella creazione del progetto");
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Eliminare definitivamente questo progetto e tutti i task associati?")) {
            const res = await deleteProject(id);
            if (res.success) {
                localStorage.removeItem(`proj_modules_${id}`);
                loadData();
            }
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
                        Hub centrale per la gestione dei progetti di miglioramento continuo. Crea un progetto e configura i moduli necessari per la tua analisi.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 hover:bg-blue-700 transition-all"
                >
                    <Plus className="h-4 w-4" /> Nuovo Progetto
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-4">
                {/* Anomalie Sidebar */}
                <div className="lg:col-span-1 bg-gradient-to-b from-amber-50 to-white p-5 rounded-2xl border border-amber-100 shadow-sm h-fit">
                    <div className="flex items-center gap-2 mb-4 text-amber-800 font-bold">
                        <Activity className="h-5 w-5" /> Derive Segnalate
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
                            <p className="text-xs text-slate-400 mt-1">Processo sotto controllo.</p>
                        </div>
                    )}
                </div>

                {/* Lista Progetti */}
                <div className="lg:col-span-3">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            {showArchived ? 'Archivio Progetti Storici' : 'Progetti Aperti'}
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800">Crea Nuovo Progetto</h2>
                            <p className="text-xs text-slate-500 mt-1">Inizializza il contenitore per le tue attività.</p>
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Descrizione</label>
                                    <textarea 
                                        value={newProjDesc} onChange={e => setNewProjDesc(e.target.value)}
                                        className="w-full border-slate-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 min-h-[80px]" 
                                        placeholder="Obiettivi..."
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
                            </div>
                            
                            {/* SELEZIONE MODULI */}
                            <div className="pt-2">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 border-b pb-1">Moduli Iniziali Attivi</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className={cn("flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all", selectedModules.includes('GANTT') ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50')}>
                                        <input type="checkbox" className="mt-1" checked={selectedModules.includes('GANTT')} onChange={() => toggleModule('GANTT')} />
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">Gantt & Task</p>
                                            <p className="text-[10px] text-slate-500 leading-tight">Timeline delle attività</p>
                                        </div>
                                    </label>
                                    <label className={cn("flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all", selectedModules.includes('FPES') ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50')}>
                                        <input type="checkbox" className="mt-1" checked={selectedModules.includes('FPES')} onChange={() => toggleModule('FPES')} />
                                        <div>
                                            <div className="flex gap-1 items-center">
                                                <Network className="h-3 w-3 text-blue-600"/>
                                                <p className="text-sm font-bold text-slate-800">FPES Suite</p>
                                            </div>
                                            <p className="text-[10px] text-slate-500 leading-tight">Line Design, Yamazumi, Ergo</p>
                                        </div>
                                    </label>
                                    <label className={cn("flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all", selectedModules.includes('LEAN') ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 hover:bg-slate-50')}>
                                        <input type="checkbox" className="mt-1" checked={selectedModules.includes('LEAN')} onChange={() => toggleModule('LEAN')} />
                                        <div>
                                            <div className="flex gap-1 items-center">
                                                <Lightbulb className="h-3 w-3 text-amber-600"/>
                                                <p className="text-sm font-bold text-slate-800">Kaizen & Lean</p>
                                            </div>
                                            <p className="text-[10px] text-slate-500 leading-tight">Miglioramento Continuo</p>
                                        </div>
                                    </label>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2">* Potrai aggiungere o rimuovere i moduli successivamente dal workspace.</p>
                            </div>

                            <div className="pt-4 flex justify-end gap-2 border-t mt-4">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annulla</button>
                                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md">Crea Progetto</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
