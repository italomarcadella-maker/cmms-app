"use client";

import React, { useState, useEffect } from "react";
import { getProjectById, createProjectTask, updateTaskDates, linkTaskToMaintenance } from "@/lib/process-actions";
import { getAssets } from "@/lib/actions";
import { Calendar, Plus, Link as LinkIcon, AlertCircle, Wrench, ArrowLeft, GripHorizontal } from "lucide-react";
import Link from "next/link";
import { format, addDays, getDaysInMonth, startOfMonth, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";

interface GanttTask {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
    status: string;
    linkedWorkOrderId: string | null;
}

export default function ProjectDetail({ params }: { params: { id: string } }) {
    const [project, setProject] = useState<any>(null);
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingTask, setIsAddingTask] = useState(false);

    // Quick Add Form
    const [newTaskTitle, setNewTaskTitle] = useState("");

    // Modal for Maintenance Link
    const [linkingTask, setLinkingTask] = useState<GanttTask | null>(null);
    const [selectedAsset, setSelectedAsset] = useState("");
    const [maintenanceDesc, setMaintenanceDesc] = useState("");

    const loadData = async () => {
        const [projData, assetsData] = await Promise.all([
            getProjectById(params.id),
            getAssets()
        ]);
        setProject(projData);
        setAssets(assetsData);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [params.id]);

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle) return;

        await createProjectTask({
            projectId: params.id,
            title: newTaskTitle,
            startDate: new Date(),
            endDate: addDays(new Date(), 3),
            status: "TODO"
        });

        setNewTaskTitle("");
        setIsAddingTask(false);
        loadData();
    };

    const handleLinkMaintenance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linkingTask || !selectedAsset) return;

        const res = await linkTaskToMaintenance(linkingTask.id, selectedAsset, maintenanceDesc, params.id);
        if (res.success) {
            setLinkingTask(null);
            setMaintenanceDesc("");
            setSelectedAsset("");
            loadData();
            alert("Work Order creato con successo e collegato al Task!");
        } else {
            alert(res.message);
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Caricamento Progetto...</div>;
    if (!project) return <div className="p-8 text-center">Progetto non trovato.</div>;

    // Gantt Logic (Simple Timeline View)
    // We visualize a 30-day window starting from the earliest task or today.
    const earliestDate = project.tasks?.length > 0
        ? new Date(Math.min(...project.tasks.map((t: any) => new Date(t.startDate).getTime())))
        : new Date();

    const timelineStart = new Date(earliestDate);
    timelineStart.setHours(0, 0, 0, 0);
    const daysWindow = 30; // Show 30 days
    const dayLabels = Array.from({ length: daysWindow }).map((_, i) => addDays(timelineStart, i));

    const getTaskStyle = (task: any) => {
        const taskStart = new Date(task.startDate);
        const taskEnd = new Date(task.endDate);

        const offsetDays = differenceInDays(taskStart, timelineStart);
        const durationDays = differenceInDays(taskEnd, taskStart) || 1; // min 1 day

        // Calculate percentages based on 30-day window
        const leftPercent = Math.max(0, (offsetDays / daysWindow) * 100);
        const widthPercent = Math.min(100 - leftPercent, (durationDays / daysWindow) * 100);

        return {
            left: `${leftPercent}%`,
            width: `${widthPercent}%`,
        };
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8 animate-in slide-in-from-bottom duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <Link href="/process" className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-2">
                        <ArrowLeft className="h-4 w-4" /> Torna a Progetti
                    </Link>
                    <h1 className="text-3xl font-extrabold text-slate-800">{project.title}</h1>
                    <p className="text-slate-500 mt-1">{project.description}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAddingTask(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md hover:bg-indigo-700 transition"
                    >
                        <Plus className="h-4 w-4" /> Aggiungi Task
                    </button>
                    {!project.linkedWorkOrderId && (
                        <button className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 transition">
                            Modifica Info
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Add Form */}
            {isAddingTask && (
                <form onSubmit={handleAddTask} className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm flex gap-3 items-center animate-in fade-in zoom-in-95">
                    <input
                        type="text"
                        placeholder="Titolo della nuova attività..."
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                    />
                    <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Salva</button>
                    <button type="button" onClick={() => setIsAddingTask(false)} className="text-slate-500 px-3 py-2 text-sm hover:bg-slate-100 rounded-lg">Annulla</button>
                </form>
            )}

            {/* Visual Gantt Chart Sandbox */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-indigo-500" />
                    <h3 className="font-bold text-slate-700">Timeline di Progetto (Gantt Interattivo)</h3>
                </div>

                <div className="p-6 overflow-x-auto">
                    <div className="min-w-[800px]">
                        {/* Timeline Header (Days) */}
                        <div className="flex relative border-b border-slate-200 pb-2 mb-4 ml-48">
                            {dayLabels.map((date, i) => (
                                <div key={i} className="flex-1 text-center min-w-[30px] border-l border-slate-100 first:border-l-0">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">{format(date, 'E', { locale: it })}</div>
                                    <div className="text-xs font-semibold text-slate-700">{format(date, 'd')}</div>
                                </div>
                            ))}
                        </div>

                        {/* Tasks Rows */}
                        <div className="space-y-4">
                            {project.tasks?.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 italic">Nessun task in timeline.</div>
                            ) : (
                                project.tasks?.map((task: any) => (
                                    <div key={task.id} className="relative flex items-center group">
                                        {/* Row Label */}
                                        <div className="w-48 pr-4 py-1 shrink-0 flex items-center justify-between z-10 bg-white">
                                            <div className="truncate text-sm font-medium text-slate-700 flex items-center gap-2">
                                                <GripHorizontal className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab" />
                                                {task.title}
                                            </div>
                                            {task.linkedWorkOrderId ? (
                                                <Link href={`/work-orders/${task.linkedWorkOrderId}?tab=details`} className="text-amber-600 hover:bg-amber-50 p-1 rounded" title="WO di Manutenzione collegato">
                                                    <Wrench className="h-3.5 w-3.5" />
                                                </Link>
                                            ) : (
                                                <button
                                                    onClick={() => setLinkingTask(task)}
                                                    className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Collega a Manutenzione"
                                                >
                                                    <LinkIcon className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Row Track */}
                                        <div className="flex-1 relative h-10 border-b border-slate-50 border-dashed rounded bg-slate-50/50">
                                            {/* The Task Bar */}
                                            <div
                                                className={`absolute top-1 bottom-1 rounded-md shadow-sm border flex items-center px-3 cursor-pointer hover:brightness-95 transition-all
                                                    ${task.status === 'DONE' ? 'bg-emerald-500 border-emerald-600 text-white' :
                                                        task.linkedWorkOrderId ? 'bg-amber-400 border-amber-500 text-amber-950' :
                                                            'bg-indigo-500 border-indigo-600 text-white'}
                                                `}
                                                style={getTaskStyle(task)}
                                                onClick={() => {
                                                    // In a real app, this would open a side panel. For MVP, we alert.
                                                    alert(`Dettaglio Task: ${task.title}\nStatus: ${task.status}\nInizio: ${format(new Date(task.startDate), 'PP', { locale: it })}\nFine: ${format(new Date(task.endDate), 'PP', { locale: it })}`);
                                                }}
                                            >
                                                <span className="text-[10px] font-bold truncate">{task.title}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-3 text-xs text-slate-500 flex justify-between items-center border-t border-slate-100">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-indigo-500"></div> Task Standard</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-400"></div> Task Manutentivo (WO)</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500"></div> Completato</span>
                    </div>
                    <span>* Trascina le barre per cambiare le date (Frontend mock: richiede refactor completo per vero drag&drop)</span>
                </div>
            </div>

            {/* Modal for Linking Maintenance */}
            {linkingTask && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                            <div>
                                <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                    <Wrench className="h-5 w-5" /> Collega Manutenzione
                                </h3>
                                <p className="text-sm text-indigo-700/70 mt-1">
                                    Invia una richiesta formale di Work Order per il task <strong>"{linkingTask.title}"</strong>.
                                </p>
                            </div>
                        </div>
                        <form onSubmit={handleLinkMaintenance} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Asset/Macchinario Interessato</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                                    value={selectedAsset}
                                    onChange={e => setSelectedAsset(e.target.value)}
                                    required
                                >
                                    <option value="">Seleziona asset...</option>
                                    {assets.map(a => (
                                        <option key={a.id} value={a.id}>{a.name} ({a.model})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Dettagli per i Tecnici</label>
                                <textarea
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                                    rows={4}
                                    value={maintenanceDesc}
                                    onChange={e => setMaintenanceDesc(e.target.value)}
                                    placeholder="Es. Eseguire foratura sul basamento per il nuovo supporto come da disegno IN-001."
                                    required
                                />
                            </div>

                            <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm flex gap-2 items-start border border-amber-200">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <p>Un Ordine di Lavoro verrà creato e indirizzato al team di manutenzione. Potrai tracciarne lo stato direttamente da questa timeline.</p>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                <button type="button" onClick={() => setLinkingTask(null)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">Annulla</button>
                                <button type="submit" className="px-5 py-2 font-medium bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition">Richiedi Intervento</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
