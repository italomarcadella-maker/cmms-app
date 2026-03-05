"use client";

import React, { useState, useEffect } from "react";
import { getProjects, createProject, deleteProject } from "@/lib/process-actions";
import { Plus, BarChart3, TrendingUp, GitPullRequest, Settings, ArrowRight, Trash2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function ProcessDashboard() {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        const data = await getProjects();
        setProjects(data);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Eliminare definitivamente questo progetto e tutti i task associati?")) {
            await deleteProject(id);
            loadData();
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
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/40 p-6 rounded-2xl border shadow-sm backdrop-blur-xl">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                        <Settings className="h-8 w-8 text-indigo-600" />
                        Ingegneria di Processo
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Gestione progetti, standardizzazione SOP e derive di processo intelligenti.</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href="/process/sop-builder"
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                        <ShieldAlert className="h-4 w-4" /> SOP AI Scanner
                    </Link>
                    <button
                        className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-slate-200 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                        onClick={() => {
                            // Demo Create Project
                            const title = prompt("Nome del nuovo Progetto?");
                            if (title) {
                                createProject({
                                    title,
                                    description: "Nuovo progetto di processo",
                                    startDate: new Date(),
                                    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
                                    roi: Math.floor(Math.random() * 50000)
                                }).then(loadData);
                            }
                        }}
                    >
                        <Plus className="h-4 w-4" /> Nuovo Progetto
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/60 backdrop-blur-md p-5 rounded-2xl border shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                        <BarChart3 className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Progetti Attivi</p>
                        <p className="text-3xl font-bold text-slate-800">{projects.filter(p => p.status === 'ACTIVE').length}</p>
                    </div>
                </div>
                <div className="bg-white/60 backdrop-blur-md p-5 rounded-2xl border shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">ROI Stimato (YTD)</p>
                        <p className="text-3xl font-bold text-emerald-600">
                            € {projects.reduce((sum, p) => sum + (p.roi || 0), 0).toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="md:col-span-2 bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <GitPullRequest className="w-24 h-24" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="font-bold text-amber-900 flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5" /> Derive Segnalate (Live)
                        </h3>
                        <p className="text-sm text-amber-700 mt-1">2 anomalie di processo rilevate dall'ultima scansione HMI. Revisione necessaria sulla linea di Estrusione B.</p>
                        <Link href="/process/sop-builder" className="mt-3 inline-block text-sm font-semibold text-amber-800 underline decoration-amber-300 underline-offset-4 hover:text-amber-950">
                            Verifica scostamenti &rarr;
                        </Link>
                    </div>
                </div>
            </div>

            {/* Project List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-slate-400 font-medium animate-pulse">
                        Caricamento Hub Progetti...
                    </div>
                ) : projects.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-slate-400 font-medium bg-white/40 rounded-2xl border border-dashed border-slate-300">
                        Nessun progetto trovato. Inizia creandone uno nuovo.
                    </div>
                ) : (
                    projects.map(project => (
                        <Link
                            key={project.id}
                            href={`/process/projects/${project.id}`}
                            className="group bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[220px]"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${getStatusColor(project.status)}`}>
                                        {project.status === 'PLANNING' ? 'IN PIANIFICAZIONE' : project.status}
                                    </span>
                                    <button
                                        onClick={(e) => handleDelete(project.id, e)}
                                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors line-clamp-2">
                                    {project.title}
                                </h3>
                                <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                                    {project.description || "Nessuna descrizione."}
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100">
                                <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                                    <span>{project.tasks?.length || 0} Task Pianificati</span>
                                    <span className="font-semibold text-slate-700">Scadenza: {format(new Date(project.endDate), 'd MMM yyyy', { fallbackLocale: it })}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-indigo-500 h-2 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${project.progress || 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
