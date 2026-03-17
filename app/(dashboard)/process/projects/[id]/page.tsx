"use client";

import React, { useState, useEffect, use } from "react";
import { getProjectById, createProjectTask, updateTaskDates, linkTaskToMaintenance, addProjectTaskNote, updateProject } from "@/lib/process-actions";
import { getAssets } from "@/lib/actions";
import { Calendar, Plus, Link as LinkIcon, AlertCircle, Wrench, ArrowLeft, GripHorizontal, TrendingUp, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format, addDays, getDaysInMonth, startOfMonth, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { DndContext, useDraggable, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { X, Send, User, MessageSquare } from "lucide-react";

interface GanttTask {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
    status: string;
    linkedWorkOrderId: string | null;
}

function DraggableTaskBar({ task, timelineStart, daysWindow, getTaskStyle, onClick }: any) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: task.id,
        data: { task }
    });

    const style = {
        ...getTaskStyle(task),
        transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`absolute top-1 bottom-1 rounded-md shadow-sm border flex items-center px-3 cursor-grab active:cursor-grabbing hover:brightness-95 transition-all z-20
                ${task.status === 'DONE' ? 'bg-emerald-500 border-emerald-600 text-white' :
                    task.linkedWorkOrderId ? 'bg-amber-400 border-amber-500 text-amber-950' :
                        'bg-indigo-500 border-indigo-600 text-white'}
            `}
            style={style}
            onClick={onClick}
        >
            <span className="text-[10px] font-bold truncate pointer-events-none">{task.title}</span>
        </div>
    );
}

export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [project, setProject] = useState<any>(null);
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingTask, setIsAddingTask] = useState(false);

    // DND Sensors
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor)
    );

    // Quick Add Form
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskStart, setNewTaskStart] = useState("");
    const [newTaskEnd, setNewTaskEnd] = useState("");
    const [newTaskDependency, setNewTaskDependency] = useState("");

    // Modal for Maintenance Link
    const [linkingTask, setLinkingTask] = useState<GanttTask | null>(null);
    const [selectedAsset, setSelectedAsset] = useState("");
    const [maintenanceDesc, setMaintenanceDesc] = useState("");

    // Modal for Task Detail & Notes
    const [viewingTask, setViewingTask] = useState<any>(null);
    const [newNote, setNewNote] = useState("");
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);

    // Edit ROI
    const [isEditingRoi, setIsEditingRoi] = useState(false);
    const [tempRoi, setTempRoi] = useState("0");

    const loadData = async () => {
        setLoading(true);
        try {
            const [projData, assetsData] = await Promise.all([
                getProjectById(id),
                getAssets()
            ]);
            setProject(projData);
            setAssets(assetsData);
            if (projData) setTempRoi(projData.roi?.toString() || "0");
        } catch (error) {
            console.error("Error loading project data:", error);
            toast.error("Errore caricamento dati");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, [id]);

    useEffect(() => {
        if (isAddingTask && !newTaskStart) {
            setNewTaskStart(format(new Date(), 'yyyy-MM-dd'));
            setNewTaskEnd(format(addDays(new Date(), 3), 'yyyy-MM-dd'));
        }
    }, [isAddingTask, newTaskStart]);

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle) return;

        await createProjectTask({
            projectId: id,
            title: newTaskTitle,
            startDate: new Date(newTaskStart),
            endDate: new Date(newTaskEnd),
            status: "TODO",
            dependencies: newTaskDependency ? JSON.stringify([newTaskDependency]) : undefined
        });

        setNewTaskTitle("");
        setIsAddingTask(false);
        loadData();
    };

    const handleLinkMaintenance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linkingTask || !selectedAsset) return;

        const res = await linkTaskToMaintenance(linkingTask.id, selectedAsset, maintenanceDesc, id);
        if (res.success) {
            setLinkingTask(null);
            setMaintenanceDesc("");
            setSelectedAsset("");
            loadData();
            toast.success("Work Order creato con successo!");
        } else {
            toast.error(res.message);
        }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim() || !viewingTask) return;

        setIsSubmittingNote(true);
        const res = await addProjectTaskNote(viewingTask.id, newNote, id);
        if (res.success) {
            setNewNote("");
            toast.success("Nota aggiunta");
            // Refresh local data to show new note
            loadData().then(() => {
                // Update the viewingTask reference too so the UI refreshes
                setProject(prev => {
                    const updatedTask = prev.tasks.find((t: any) => t.id === viewingTask.id);
                    if (updatedTask) setViewingTask(updatedTask);
                    return prev;
                });
            });
        } else {
            toast.error(res.message);
        }
        setIsSubmittingNote(false);
    };

    const handleUpdateRoi = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await updateProject(id, { roi: parseFloat(tempRoi) });
        if (res.success) {
            toast.success("ROI aggiornato");
            setIsEditingRoi(false);
            loadData();
        } else {
            toast.error(res.message);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, delta } = event;
        if (!delta.x || !project) return;

        const task = active.data.current?.task;
        if (!task) return;

        const container = document.getElementById("gantt-container");
        if (!container) return;
        
        // ML-48 is 12rem. In Tailwind 1rem = 16px usually, but let's be safer with getBoundingClientRect if possible
        const innerContainer = container.querySelector(".min-w-\\[800px\\]");
        if (!innerContainer) return;
        
        const trackWidth = innerContainer.clientWidth - 192; 
        const pixelsPerDay = trackWidth / daysWindow;
        const daysShifted = Math.round(delta.x / pixelsPerDay);

        if (daysShifted === 0) return;

        const newStart = addDays(new Date(task.startDate), daysShifted);
        const newEnd = addDays(new Date(task.endDate), daysShifted);

        // Optimistic update
        setProject((prev: any) => {
            if (!prev) return prev;
            return {
                ...prev,
                tasks: prev.tasks.map((t: any) => 
                    t.id === task.id ? { ...t, startDate: newStart, endDate: newEnd } : t
                )
            };
        });

        try {
            await updateTaskDates(task.id, newStart, newEnd, id);
        } catch (error) {
            toast.error("Errore salvataggio date");
            loadData(); // Revert on failure
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <div className="text-slate-600 font-medium">Caricamento Progetto...</div>
                <div className="text-xs text-slate-400 mt-2">ID: {id}</div>
            </div>
        </div>
    );

    if (!project) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-sm border text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-slate-800">Progetto non trovato</h1>
                <p className="text-slate-500 mt-2">Non è stato possibile trovare il progetto specificato (ID: {id}).</p>
                <Link href="/process" className="mt-6 inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition">
                    <ArrowLeft className="h-4 w-4" /> Torna alla lista
                </Link>
            </div>
        </div>
    );

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
                    <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex items-center gap-3">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                        <div>
                            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">ROI Stimato</p>
                            <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-800">€ {project.roi?.toLocaleString() || "0"}</span>
                                <button onClick={() => setIsEditingRoi(true)} className="text-slate-400 hover:text-indigo-600">
                                    <Edit3 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsAddingTask(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md hover:bg-indigo-700 transition"
                    >
                        <Plus className="h-4 w-4" /> Aggiungi Task
                    </button>
                    {/* ... rest of buttons ... */}
                </div>
            </div>

            {/* Modal for Editing ROI */}
            {isEditingRoi && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
                            <h3 className="font-bold text-emerald-900">Aggiorna ROI Progetto</h3>
                            <button onClick={() => setIsEditingRoi(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateRoi} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">ROI Stimato (€)</label>
                                <input
                                    type="number"
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={tempRoi}
                                    onChange={e => setTempRoi(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsEditingRoi(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Annulla</button>
                                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-md hover:bg-emerald-700 transition">Salva</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Add Form */}
            {isAddingTask && (
                <form onSubmit={handleAddTask} className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm flex flex-col md:flex-row gap-3 md:items-center animate-in fade-in zoom-in-95">
                    <input
                        type="text"
                        placeholder="Titolo attività..."
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                    />
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
                        <input
                            type="date"
                            value={newTaskStart}
                            onChange={e => setNewTaskStart(e.target.value)}
                            className="border rounded-lg px-3 py-2 text-sm text-slate-700 w-full"
                            title="Data Inizio"
                        />
                        <input
                            type="date"
                            value={newTaskEnd}
                            onChange={e => setNewTaskEnd(e.target.value)}
                            className="border rounded-lg px-3 py-2 text-sm text-slate-700 w-full"
                            title="Data Fine"
                        />
                        <select 
                            value={newTaskDependency} 
                            onChange={e => setNewTaskDependency(e.target.value)}
                            className="border rounded-lg px-3 py-2 text-sm text-slate-700 w-full bg-slate-50"
                        >
                            <option value="">Nessuna dipendenza</option>
                            {project?.tasks?.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2 self-end md:self-auto shrink-0">
                        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 whitespace-nowrap">Salva</button>
                        <button type="button" onClick={() => setIsAddingTask(false)} className="text-slate-500 px-3 py-2 text-sm hover:bg-slate-100 rounded-lg">Annulla</button>
                    </div>
                </form>
            )}

            {/* Visual Gantt Chart Sandbox */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="gantt-container">
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
                        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
                                                {/* The Draggable Task Bar */}
                                                <DraggableTaskBar
                                                    task={task}
                                                    timelineStart={timelineStart}
                                                    daysWindow={daysWindow}
                                                    getTaskStyle={getTaskStyle}
                                                    onClick={() => setViewingTask(task)}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </DndContext>
                    </div>
                </div>

                <div className="bg-slate-50 p-3 text-xs text-slate-500 flex justify-between items-center border-t border-slate-100">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-indigo-500"></div> Task Standard</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-400"></div> Task Manutentivo (WO)</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500"></div> Completato</span>
                    </div>
                    <span>* Trascina le barre per cambiare le date in tempo reale</span>
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
                            <button onClick={() => setLinkingTask(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-6 w-6" />
                            </button>
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

            {/* Modal for Task Detail & Notes */}
            {viewingTask && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[80vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                        viewingTask.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                                    )}>
                                        {viewingTask.status}
                                    </span>
                                    {viewingTask.linkedWorkOrderId && (
                                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                                            <Wrench className="h-3 w-3" /> Manutenzione
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-bold text-xl text-slate-800">{viewingTask.title}</h3>
                                <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {format(new Date(viewingTask.startDate), 'dd MMM')} - {format(new Date(viewingTask.endDate), 'dd MMM yyyy', { locale: it })}
                                </p>
                            </div>
                            <button onClick={() => setViewingTask(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Content & Notes Feed */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Notes Section */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" /> Log Note & Avanzamento
                                </h4>
                                
                                <div className="space-y-4">
                                    {(!viewingTask.notes || viewingTask.notes.length === 0) ? (
                                        <div className="text-center py-6 border-2 border-dashed rounded-xl bg-slate-50 text-slate-400 text-sm">
                                            Nessuna nota presente. Inizia la conversazione!
                                        </div>
                                    ) : (
                                        viewingTask.notes.map((note: any) => (
                                            <div key={note.id} className="bg-white border rounded-xl p-4 shadow-sm hover:border-indigo-200 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center">
                                                            <User className="h-3 w-3 text-indigo-600" />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{note.authorName}</span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">{format(new Date(note.createdAt), 'dd/MM/yy HH:mm')}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer / Input */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <form onSubmit={handleAddNote} className="flex gap-2">
                                <input 
                                    type="text"
                                    placeholder="Scrivi una nota..."
                                    className="flex-1 border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    disabled={isSubmittingNote}
                                />
                                <button 
                                    type="submit" 
                                    disabled={!newNote.trim() || isSubmittingNote}
                                    className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
