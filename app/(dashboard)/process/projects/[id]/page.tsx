"use client";

import React, { useState, useEffect } from "react";
import { getProjectById, createProjectTask, updateTaskDates, linkTaskToMaintenance, addProjectTaskNote, updateProject, deleteProject, archiveProject } from "@/lib/process-actions";
import { getAssets } from "@/lib/actions";
import { getSimulations, createSimulation, saveSimulationSnapshot } from "@/lib/actions/fpes-actions";
import { Calendar, Plus, Link as LinkIcon, AlertCircle, Wrench, ArrowLeft, GripHorizontal, TrendingUp, Edit3, Network, Box, BarChart2, Lightbulb, Grid, FileCheck2, Trash2, Archive, X, Send, User, MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format, addDays, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { DndContext, useDraggable, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";

// Import FPES Utils
import { newFpesProject, calcP } from "@/lib/fpes-utils";

// Import FPES Components dynamically to avoid massive bundle load, but for MVP standard import is fine
import Setup from "../../components/Setup";
import LineDesigner from "../../components/LineDesigner";
import Yamazumi from "../../components/Yamazumi";
import RackFlow from "../../components/RackFlow";
import Ergonomics from "../../components/Ergonomics";
import Timwoods from "../../components/Timwoods";
import KaizenBoard from "../../components/KaizenBoard";
import SopPro from "../../components/SopPro";
import MuriMuda from "../../components/MuriMuda";
import LeanScore from "../../components/LeanScore";
import ExcelIO from "../../components/ExcelIO";
import WhatIfSimulator from "../../components/WhatIfSimulator";

interface GanttTask {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
    status: string;
    linkedWorkOrderId: string | null;
}

// ----------------- DRAGGABLE COMPONENT -----------------
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
            ref={setNodeRef} {...listeners} {...attributes}
            className={`absolute top-1 bottom-1 rounded-md shadow-sm border flex items-center px-3 cursor-grab active:cursor-grabbing hover:brightness-95 transition-all z-20
                ${task.status === 'DONE' ? 'bg-emerald-500 border-emerald-600 text-white' :
                    task.linkedWorkOrderId ? 'bg-amber-400 border-amber-500 text-amber-950' : 'bg-indigo-500 border-indigo-600 text-white'}
            `}
            style={style} onClick={onClick}
        >
            <span className="text-[10px] font-bold truncate pointer-events-none">{task.title}</span>
        </div>
    );
}

// ----------------- MAIN WORKSPACE PAGE -----------------
export default function ProjectWorkspace() {
    const params = useParams<{ id: string }>();
    const id = params?.id as string;
    const [project, setProject] = useState<any>(null);
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);

    // Workspace UI State
    const [activeTab, setActiveTab] = useState("DASHBOARD");
    const [showModuleSelector, setShowModuleSelector] = useState(false);
    const [activeModules, setActiveModules] = useState<string[]>(['GANTT']); // GANTT is default

    // FPES State
    const [fpesSimId, setFpesSimId] = useState<string | null>(null);
    const [fpesData, setFpesData] = useState<any>(null);

    // Modals
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskStart, setNewTaskStart] = useState("");
    const [newTaskEnd, setNewTaskEnd] = useState("");
    const [newTaskDependency, setNewTaskDependency] = useState("");

    const [linkingTask, setLinkingTask] = useState<GanttTask | null>(null);
    const [selectedAsset, setSelectedAsset] = useState("");
    const [maintenanceDesc, setMaintenanceDesc] = useState("");

    const [viewingTask, setViewingTask] = useState<any>(null);
    const [newNote, setNewNote] = useState("");
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);

    const [isEditingRoi, setIsEditingRoi] = useState(false);
    const [tempRoi, setTempRoi] = useState("0");

    const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor));

    const loadData = async () => {
        setLoading(true);
        setPageError(null);
        try {
            const [projData, assetsData, simsData] = await Promise.all([
                getProjectById(id),
                getAssets(),
                getSimulations()
            ]);
            setProject(projData);
            setAssets(assetsData);
            if (projData) setTempRoi(projData.roi?.toString() || "0");

            // Check if there is an FPES Simulation linked to this Project ID
            if (simsData && Array.isArray(simsData)) {
                const linkedSim = simsData.find((s: any) => s.name === `PROJ_${id}`);
                if (linkedSim) {
                    setFpesSimId(linkedSim.id);
                    let parsed = typeof linkedSim.dataJson === 'string' ? JSON.parse(linkedSim.dataJson) : linkedSim.dataJson;
                    setFpesData(parsed);
                    // Auto-enable FPES module if found
                    setActiveModules(prev => prev.includes('FPES') ? prev : [...prev, 'FPES']);
                }
            }

            // Load saved modules from local storage for this project
            const savedModules = localStorage.getItem(`proj_modules_${id}`);
            if (savedModules) {
                setActiveModules(JSON.parse(savedModules));
            }

        } catch (error: any) {
            console.error("Load data error:", error);
            setPageError(error?.message || "Errore sconosciuto durante il caricamento");
            toast.error("Errore caricamento dati");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            loadData().catch(e => setPageError(e.message));
        }
    }, [id]);

    useEffect(() => {
        if (!loading) {
            localStorage.setItem(`proj_modules_${id}`, JSON.stringify(activeModules));
        }
    }, [activeModules, id, loading]);

    useEffect(() => {
        if (isAddingTask && !newTaskStart) {
            setNewTaskStart(format(new Date(), 'yyyy-MM-dd'));
            setNewTaskEnd(format(addDays(new Date(), 3), 'yyyy-MM-dd'));
        }
    }, [isAddingTask, newTaskStart]);

    // ---- MODULE MANAGEMENT ----
    const handleAddModule = async (modName: string) => {
        if (!activeModules.includes(modName)) {
            setActiveModules([...activeModules, modName]);
        }
        
        setActiveTab(modName);
        toast.success(`Modulo attivato.`);

        // FPES data needs to be initialized if any FPES module is selected
        const fpesModules = ['SETUP', 'LINE_DESIGNER', 'YAMAZUMI', 'ERGO', 'TIMWOODS', 'KAIZEN'];
        if (fpesModules.includes(modName) && !fpesSimId) {
            // Initialize FPES for this project
            const initialData = newFpesProject(`PROJ_${id}`);
            try {
                const newSim = await createSimulation({ name: `PROJ_${id}`, layout: "U", dataJson: initialData });
                setFpesSimId(newSim.id);
                setFpesData(initialData);
            } catch (e) {
                toast.error("Errore inizializzazione dati FPES");
            }
        }
    };

    const handleUpdateFpes = (patch: any) => {
        setFpesData((prev: any) => {
            const next = { ...prev, ...patch };
            // Auto-save debounced or explicit save? Explicit save for now.
            return next;
        });
    };

    const handleSaveFpes = async () => {
        if (!fpesSimId || !fpesData) return;
        const cr = calcP(fpesData);
        try {
            await saveSimulationSnapshot(fpesSimId, {
                label: "Project Auto-Save",
                leanScore: cr.twPct || 50,
                lineEff: cr.lineEff,
                dataJson: fpesData
            });
            toast.success("Dati modulo di linea salvati.");
        } catch(e) {
            toast.error("Errore salvataggio modulo di linea.");
        }
    };

    // ---- PROJECT HANDLERS ----
    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle) return;
        const res = await createProjectTask({
            projectId: id, title: newTaskTitle, startDate: new Date(newTaskStart), endDate: new Date(newTaskEnd),
            status: "TODO", dependencies: newTaskDependency ? JSON.stringify([newTaskDependency]) : undefined
        });
        if (res.success) {
            setNewTaskTitle(""); setIsAddingTask(false); toast.success("Task aggiunto con successo"); loadData();
        } else {
            toast.error(`Errore: ${res.message}`);
        }
    };

    const handleLinkMaintenance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linkingTask || !selectedAsset) return;
        const res = await linkTaskToMaintenance(linkingTask.id, selectedAsset, maintenanceDesc, id);
        if (res.success) {
            setLinkingTask(null); setMaintenanceDesc(""); setSelectedAsset(""); loadData(); toast.success("Work Order creato!");
        } else toast.error(res.message);
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim() || !viewingTask) return;
        setIsSubmittingNote(true);
        const res = await addProjectTaskNote(viewingTask.id, newNote, id);
        if (res.success) {
            setNewNote(""); toast.success("Nota aggiunta");
            loadData().then(() => {
                setProject((prev: any) => {
                    const updatedTask = prev.tasks.find((t: any) => t.id === viewingTask.id);
                    if (updatedTask) setViewingTask(updatedTask);
                    return prev;
                });
            });
        } else toast.error(res.message);
        setIsSubmittingNote(false);
    };

    const handleUpdateRoi = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await updateProject(id, { roi: parseFloat(tempRoi) });
        if (res.success) { toast.success("ROI aggiornato"); setIsEditingRoi(false); loadData(); }
        else toast.error(res.message);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, delta } = event;
        if (!delta.x || !project) return;
        const task = active.data.current?.task;
        if (!task) return;
        const container = document.getElementById("gantt-container");
        if (!container) return;
        const innerContainer = container.querySelector(".min-w-\\[800px\\]");
        if (!innerContainer) return;
        
        const trackWidth = innerContainer.clientWidth - 192; 
        const pixelsPerDay = trackWidth / 30;
        const daysShifted = Math.round(delta.x / pixelsPerDay);
        if (daysShifted === 0) return;

        const newStart = addDays(new Date(task.startDate), daysShifted);
        const newEnd = addDays(new Date(task.endDate), daysShifted);

        setProject((prev: any) => ({
            ...prev,
            tasks: prev.tasks.map((t: any) => t.id === task.id ? { ...t, startDate: newStart, endDate: newEnd } : t)
        }));
        try { await updateTaskDates(task.id, newStart, newEnd, id); }
        catch (error) { toast.error("Errore salvataggio date"); loadData(); }
    };

    // Render Helpers
    const renderGantt = () => {
        const earliestDate = project?.tasks?.length > 0
            ? new Date(Math.min(...project.tasks.map((t: any) => new Date(t.startDate).getTime())))
            : new Date();
        const timelineStart = new Date(earliestDate);
        timelineStart.setHours(0, 0, 0, 0);
        const daysWindow = 30; 
        const dayLabels = Array.from({ length: daysWindow }).map((_, i) => addDays(timelineStart, i));

        const getTaskStyle = (task: any) => {
            const taskStart = new Date(task.startDate); const taskEnd = new Date(task.endDate);
            const offsetDays = differenceInDays(taskStart, timelineStart);
            const durationDays = differenceInDays(taskEnd, taskStart) || 1; 
            const leftPercent = Math.max(0, (offsetDays / daysWindow) * 100);
            const widthPercent = Math.min(100 - leftPercent, (durationDays / daysWindow) * 100);
            return { left: `${leftPercent}%`, width: `${widthPercent}%` };
        };

        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="gantt-container">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-indigo-500" />
                        <h3 className="font-bold text-slate-700">Gantt & Timeline</h3>
                    </div>
                    <button onClick={() => setIsAddingTask(true)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700">
                        <Plus className="h-4 w-4" /> Nuovo Task
                    </button>
                </div>
                {/* Gantt Implementation */}
                {isAddingTask && (
                    <form onSubmit={handleAddTask} className="p-4 bg-indigo-50/50 border-b flex flex-wrap gap-3 items-center">
                        <input type="text" placeholder="Titolo attività..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm" required autoFocus />
                        <input type="date" value={newTaskStart} onChange={e => setNewTaskStart(e.target.value)} className="border rounded-lg px-3 py-2 text-sm text-slate-700" required />
                        <input type="date" value={newTaskEnd} onChange={e => setNewTaskEnd(e.target.value)} className="border rounded-lg px-3 py-2 text-sm text-slate-700" required />
                        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Salva</button>
                        <button type="button" onClick={() => setIsAddingTask(false)} className="text-slate-500 px-3 py-2 text-sm hover:bg-slate-200 rounded-lg">Annulla</button>
                    </form>
                )}
                <div className="p-6 overflow-x-auto min-h-[400px]">
                    <div className="min-w-[800px]">
                        <div className="flex relative border-b border-slate-200 pb-2 mb-4 ml-48">
                            {dayLabels.map((date, i) => (
                                <div key={i} className="flex-1 text-center min-w-[30px] border-l border-slate-100 first:border-l-0">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">{format(date, 'E', { locale: it })}</div>
                                    <div className="text-xs font-semibold text-slate-700">{format(date, 'd')}</div>
                                </div>
                            ))}
                        </div>
                        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                            <div className="space-y-4">
                                {project?.tasks?.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 italic">Nessun task. Inizia ad aggiungere attività.</div>
                                ) : (
                                    project?.tasks?.map((task: any) => (
                                        <div key={task.id} className="relative flex items-center group">
                                            <div className="w-48 pr-4 py-1 shrink-0 flex items-center justify-between z-10 bg-white">
                                                <div className="truncate text-sm font-medium text-slate-700 flex items-center gap-2">
                                                    <GripHorizontal className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab" />
                                                    {task.title}
                                                </div>
                                                {task.linkedWorkOrderId ? (
                                                    <Link href={`/work-orders/${task.linkedWorkOrderId}?tab=details`} className="text-amber-600 hover:bg-amber-50 p-1 rounded">
                                                        <Wrench className="h-3.5 w-3.5" />
                                                    </Link>
                                                ) : (
                                                    <button onClick={() => setLinkingTask(task)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <LinkIcon className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex-1 relative h-10 border-b border-slate-50 border-dashed rounded bg-slate-50/50">
                                                <DraggableTaskBar task={task} timelineStart={timelineStart} daysWindow={daysWindow} getTaskStyle={getTaskStyle} onClick={() => setViewingTask(task)} />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </DndContext>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
    
    if (pageError) return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
            <div className="bg-red-50 text-red-700 p-6 rounded-2xl max-w-2xl text-center border border-red-200">
                <AlertCircle className="h-10 w-10 mx-auto mb-4 text-red-500" />
                <h2 className="text-xl font-bold mb-2">Errore Critico nel caricamento</h2>
                <p className="text-sm">{pageError}</p>
                <p className="text-xs mt-4 text-red-500/70">Il problema solitamente deriva dal timeout del database. Attendi qualche minuto o aggiorna la pagina (Ctrl+F5).</p>
            </div>
        </div>
    );

    if (!project) return <div className="text-center py-20">Progetto non trovato.</div>;

    return (
        <div className="flex h-[calc(100vh-5rem)] bg-slate-50 overflow-hidden animate-in fade-in">
            {/* WORKSPACE SIDEBAR (TABS) */}
            <div className="w-64 bg-white border-r flex flex-col z-10 shadow-sm shrink-0">
                <div className="p-4 border-b bg-slate-900 text-white">
                    <Link href="/process" className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2"><ArrowLeft className="h-3 w-3"/> Hub Processo</Link>
                    <h2 className="font-bold text-lg leading-tight">{project.title}</h2>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] uppercase font-bold tracking-wider">Workspace</span>
                </div>
                
                <div className="p-3 space-y-1 overflow-y-auto flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 mt-2">Core</p>
                    <button onClick={() => setActiveTab("DASHBOARD")} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors", activeTab === "DASHBOARD" ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50")}>
                        <Grid className="h-4 w-4" /> Overview
                    </button>
                    {/* GANTT MODULE */}
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 mt-4">Gestione Attività</p>
                    {activeModules.includes('GANTT') ? (
                        <button onClick={() => setActiveTab("GANTT")} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors", activeTab === "GANTT" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50")}>
                            <Calendar className="h-4 w-4" /> Gantt & Task
                        </button>
                    ) : (
                        <button onClick={() => handleAddModule('GANTT')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition-colors bg-slate-50">
                            <span className="flex items-center gap-3"><Calendar className="h-4 w-4" /> Gantt & Task</span>
                            <Plus className="h-4 w-4" />
                        </button>
                    )}

                    {/* FPES ATOMIC MODULES */}
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2 px-2 mt-4">Ingegneria di Linea</p>
                    
                    {activeModules.includes('SETUP') ? (
                        <button onClick={() => setActiveTab("SETUP")} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors", activeTab === "SETUP" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50")}>
                            <Settings className="h-4 w-4" /> Parametri
                        </button>
                    ) : (
                        <button onClick={() => handleAddModule('SETUP')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors bg-slate-50">
                            <span className="flex items-center gap-3"><Settings className="h-4 w-4" /> Parametri</span>
                            <Plus className="h-4 w-4" />
                        </button>
                    )}

                    {activeModules.includes('LINE_DESIGNER') ? (
                        <button onClick={() => setActiveTab("LINE_DESIGNER")} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors", activeTab === "LINE_DESIGNER" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50")}>
                            <Network className="h-4 w-4" /> Line Designer
                        </button>
                    ) : (
                        <button onClick={() => handleAddModule('LINE_DESIGNER')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors bg-slate-50">
                            <span className="flex items-center gap-3"><Network className="h-4 w-4" /> Line Designer</span>
                            <Plus className="h-4 w-4" />
                        </button>
                    )}

                    {activeModules.includes('YAMAZUMI') ? (
                        <button onClick={() => setActiveTab("YAMAZUMI")} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors", activeTab === "YAMAZUMI" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50")}>
                            <BarChart2 className="h-4 w-4" /> Yamazumi
                        </button>
                    ) : (
                        <button onClick={() => handleAddModule('YAMAZUMI')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors bg-slate-50">
                            <span className="flex items-center gap-3"><BarChart2 className="h-4 w-4" /> Yamazumi</span>
                            <Plus className="h-4 w-4" />
                        </button>
                    )}

                    {activeModules.includes('ERGO') ? (
                        <button onClick={() => setActiveTab("ERGO")} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors", activeTab === "ERGO" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50")}>
                            <Box className="h-4 w-4" /> Ergonomia
                        </button>
                    ) : (
                        <button onClick={() => handleAddModule('ERGO')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors bg-slate-50">
                            <span className="flex items-center gap-3"><Box className="h-4 w-4" /> Ergonomia</span>
                            <Plus className="h-4 w-4" />
                        </button>
                    )}

                    {/* LEAN MODULES */}
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2 px-2 mt-4">Miglioramento Continuo</p>
                    
                    {activeModules.includes('TIMWOODS') ? (
                        <button onClick={() => setActiveTab("TIMWOODS")} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors", activeTab === "TIMWOODS" ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50")}>
                            <Trash2 className="h-4 w-4" /> TIMWOODS
                        </button>
                    ) : (
                        <button onClick={() => handleAddModule('TIMWOODS')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-amber-400 hover:text-amber-600 transition-colors bg-slate-50">
                            <span className="flex items-center gap-3"><Trash2 className="h-4 w-4" /> TIMWOODS</span>
                            <Plus className="h-4 w-4" />
                        </button>
                    )}

                    {activeModules.includes('WHATIF') ? (
                        <button onClick={() => setActiveTab("WHATIF")} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors", activeTab === "WHATIF" ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50")}>
                            <TrendingUp className="h-4 w-4" /> What-If Simulator
                        </button>
                    ) : (
                        <button onClick={() => handleAddModule('WHATIF')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-amber-400 hover:text-amber-600 transition-colors bg-slate-50">
                            <span className="flex items-center gap-3"><TrendingUp className="h-4 w-4" /> What-If Sim.</span>
                            <Plus className="h-4 w-4" />
                        </button>
                    )}

                    {activeModules.includes('KAIZEN') ? (
                        <button onClick={() => setActiveTab("KAIZEN")} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors", activeTab === "KAIZEN" ? "bg-amber-50 text-amber-700" : "text-slate-600 hover:bg-slate-50")}>
                            <Lightbulb className="h-4 w-4" /> Kaizen Board
                        </button>
                    ) : (
                        <button onClick={() => handleAddModule('KAIZEN')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-amber-400 hover:text-amber-600 transition-colors bg-slate-50">
                            <span className="flex items-center gap-3"><Lightbulb className="h-4 w-4" /> Kaizen Board</span>
                            <Plus className="h-4 w-4" />
                        </button>
                    )}
                    
                    {/* SOP MODULE */}
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2 px-2 mt-4">Standardizzazione</p>
                    {activeModules.includes('SOP') ? (
                        <button onClick={() => setActiveTab("SOP")} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors", activeTab === "SOP" ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50")}>
                            <FileCheck2 className="h-4 w-4" /> SOP Builder
                        </button>
                    ) : (
                        <button onClick={() => handleAddModule('SOP')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-emerald-400 hover:text-emerald-600 transition-colors bg-slate-50">
                            <span className="flex items-center gap-3"><FileCheck2 className="h-4 w-4" /> SOP Builder</span>
                            <Plus className="h-4 w-4" />
                        </button>
                    )}

                    {activeModules.includes('MURIMUDA') ? (
                        <button onClick={() => setActiveTab("MURIMUDA")} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors", activeTab === "MURIMUDA" ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50")}>
                            <Box className="h-4 w-4" /> MURI·MUDA
                        </button>
                    ) : (
                        <button onClick={() => handleAddModule('MURIMUDA')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-emerald-400 hover:text-emerald-600 transition-colors bg-slate-50">
                            <span className="flex items-center gap-3"><Box className="h-4 w-4" /> MURI·MUDA</span>
                            <Plus className="h-4 w-4" />
                        </button>
                    )}

                    {activeModules.includes('LEANSCORE') ? (
                        <button onClick={() => setActiveTab("LEANSCORE")} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors", activeTab === "LEANSCORE" ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50")}>
                            <TrendingUp className="h-4 w-4" /> Lean Score
                        </button>
                    ) : (
                        <button onClick={() => handleAddModule('LEANSCORE')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-emerald-400 hover:text-emerald-600 transition-colors bg-slate-50">
                            <span className="flex items-center gap-3"><TrendingUp className="h-4 w-4" /> Lean Score</span>
                            <Plus className="h-4 w-4" />
                        </button>
                    )}

                    {/* DATA MODULE */}
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-2 mt-4">Dati e Report</p>
                    {activeModules.includes('EXCELIO') ? (
                        <button onClick={() => setActiveTab("EXCELIO")} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors", activeTab === "EXCELIO" ? "bg-slate-100 text-slate-700" : "text-slate-600 hover:bg-slate-50")}>
                            <Send className="h-4 w-4" /> Excel I/O
                        </button>
                    ) : (
                        <button onClick={() => handleAddModule('EXCELIO')} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-slate-400 border border-dashed border-slate-300 hover:border-slate-400 hover:text-slate-600 transition-colors bg-slate-50">
                            <span className="flex items-center gap-3"><Send className="h-4 w-4" /> Excel I/O</span>
                            <Plus className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* MAIN CANVAS */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-slate-50/50">
                {activeTab === "DASHBOARD" && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Workspace Overview</h3>
                            <p className="text-slate-500 mb-6">{project.description}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl cursor-pointer hover:bg-emerald-100 transition" onClick={() => setIsEditingRoi(true)}>
                                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">ROI Stimato</p>
                                    <p className="text-2xl font-extrabold text-emerald-900">€{project.roi?.toLocaleString() || "0"}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Task Aperti</p>
                                    <p className="text-2xl font-extrabold text-slate-800">{project.tasks?.filter((t:any)=>t.status!=='DONE').length || 0}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Moduli Attivi</p>
                                    <p className="text-2xl font-extrabold text-slate-800">{activeModules.length}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Stato</p>
                                    <p className="text-lg font-extrabold text-slate-800 mt-1">{project.status}</p>
                                </div>
                            </div>
                        </div>

                        {/* Renders the top-level view of tasks directly in overview for convenience */}
                        <div className="opacity-90 scale-[0.98] origin-top">
                            {renderGantt()}
                        </div>
                    </div>
                )}

                {activeTab === "GANTT" && (
                    <div className="max-w-6xl mx-auto h-full pb-20">
                        {renderGantt()}
                    </div>
                )}

                {/* ATOMIC FPES & LEAN MODULES RENDERING */}
                {fpesData && (
                    <div className="max-w-6xl mx-auto h-full relative">
                        {(activeTab === 'SETUP' || activeTab === 'LINE_DESIGNER' || activeTab === 'YAMAZUMI' || activeTab === 'ERGO' || activeTab === 'TIMWOODS' || activeTab === 'KAIZEN') && (
                            <div className="absolute -top-4 right-0 flex gap-2 z-10">
                                 <button onClick={handleSaveFpes} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-bold hover:bg-blue-200 shadow-sm border border-blue-200">Salva Moduli Ing.</button>
                            </div>
                        )}
                        {activeTab === "SETUP" && <Setup project={fpesData} upd={handleUpdateFpes} />}
                        {activeTab === "LINE_DESIGNER" && <LineDesigner project={fpesData} upd={handleUpdateFpes} />}
                        {activeTab === "YAMAZUMI" && <Yamazumi project={fpesData} upd={handleUpdateFpes} cr={calcP(fpesData)} />}
                        {activeTab === "ERGO" && <Ergonomics project={fpesData} upd={handleUpdateFpes} cr={calcP(fpesData)} />}
                        {activeTab === "TIMWOODS" && <Timwoods project={fpesData} upd={handleUpdateFpes} cr={calcP(fpesData)} />}
                        {activeTab === "KAIZEN" && <KaizenBoard project={fpesData} upd={handleUpdateFpes} cr={calcP(fpesData)} />}
                        {activeTab === "SOP" && <SopPro project={fpesData} upd={handleUpdateFpes} />}
                        {activeTab === "MURIMUDA" && <MuriMuda project={fpesData} upd={handleUpdateFpes} />}
                        {activeTab === "LEANSCORE" && <LeanScore project={fpesData} upd={handleUpdateFpes} cr={calcP(fpesData)} />}
                        {activeTab === "EXCELIO" && <ExcelIO project={fpesData} upd={handleUpdateFpes} />}
                        {activeTab === "WHATIF" && <WhatIfSimulator project={fpesData} upd={handleUpdateFpes} />}
                    </div>
                )}
            </div>

            {/* MODALS */}
            {/* Keeping the ROI and Linking modals here */}
            {isEditingRoi && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full"><h3 className="font-bold mb-4">Aggiorna ROI</h3>
                    <input type="number" className="w-full border p-2 rounded mb-4" value={tempRoi} onChange={e=>setTempRoi(e.target.value)} />
                    <div className="flex gap-2 justify-end"><button onClick={()=>setIsEditingRoi(false)}>Annulla</button><button onClick={handleUpdateRoi} className="bg-emerald-600 text-white px-4 py-2 rounded">Salva</button></div></div>
                </div>
            )}

        </div>
    );
}
