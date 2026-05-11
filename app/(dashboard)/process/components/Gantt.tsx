"use client";

import React, { useState } from "react";
import { uid } from "@/lib/fpes-utils";
import { Calendar, Plus, Trash2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function Gantt({ project, upd }: { project: any; upd: (patch: any) => void }) {
  const gantt = project.gantt || { phases: [], tasks: [] };
  const [newPhaseName, setNewPhaseName] = useState("");
  
  const addTask = (phaseId: string) => {
    const s = new Date().toISOString().slice(0, 10);
    const nt = {
      id: uid(),
      phaseId,
      nome: "Nuovo Task",
      status: "TODO",
      priority: "MEDIUM",
      assignee: "",
      startDate: s,
      endDate: s,
      progress: 0
    };
    upd({ gantt: { ...gantt, tasks: [...gantt.tasks, nt] } });
  };

  const addPhase = () => {
    if (!newPhaseName.trim()) return;
    const nph = { id: uid(), nome: newPhaseName.trim(), col: "#0ea5e9" };
    upd({ gantt: { ...gantt, phases: [...gantt.phases, nph] } });
    setNewPhaseName("");
  };

  const updTask = (id: string, field: string, val: any) => {
    upd({ gantt: { ...gantt, tasks: gantt.tasks.map((t:any) => t.id === id ? { ...t, [field]: val } : t) } });
  };

  const delTask = (id: string) => {
    if (confirm("Eliminare questo task?")) {
      upd({ gantt: { ...gantt, tasks: gantt.tasks.filter((t:any) => t.id !== id) } });
    }
  };

  const delPhase = (id: string) => {
    if (confirm("Eliminare questa fase e tutti i suoi task?")) {
      upd({ gantt: { 
        phases: gantt.phases.filter((p:any) => p.id !== id),
        tasks: gantt.tasks.filter((t:any) => t.phaseId !== id)
      } });
    }
  };

  const statuses = [
    { k: "TODO", l: "Da Fare", c: "text-slate-600 bg-slate-100" },
    { k: "INPROGRESS", l: "In Corso", c: "text-blue-700 bg-blue-100" },
    { k: "DONE", l: "Completato", c: "text-emerald-700 bg-emerald-100" },
    { k: "BLOCKED", l: "Bloccato", c: "text-red-700 bg-red-100" },
  ];

  const total = gantt.tasks.length;
  const done = gantt.tasks.filter((t:any) => t.status === "DONE").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-500" /> Gantt & Task di Progetto
        </h2>
      </div>

      <div className="flex items-center gap-6 mb-6 bg-white p-6 rounded-xl border shadow-sm">
        <div className="flex-1">
          <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>Avanzamento Progetto</span>
            <span className="font-mono text-lg text-blue-600">{pct}%</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="w-32 text-right">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Task Completati</div>
          <div className="text-xl font-bold mt-1 text-slate-800 font-mono">{done} / {total}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 bg-white p-2 rounded-lg border shadow-sm w-max">
        <input 
          value={newPhaseName} 
          onChange={e => setNewPhaseName(e.target.value)} 
          placeholder="Nome nuova fase..." 
          className="text-sm px-3 py-1.5 border-none outline-none focus:ring-0 w-64 bg-transparent"
        />
        <button onClick={addPhase} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-xs font-bold transition-colors">
          + Aggiungi Fase
        </button>
      </div>

      <div className="space-y-6">
        {gantt.phases.length === 0 && (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white text-slate-400">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-sm">Nessuna fase di progetto presente. Aggiungine una per iniziare.</p>
          </div>
        )}

        {gantt.phases.map((ph: any) => {
          const phTasks = gantt.tasks.filter((t:any) => t.phaseId === ph.id);
          const phDone = phTasks.filter((t:any) => t.status === "DONE").length;
          const phPct = phTasks.length > 0 ? Math.round((phDone / phTasks.length) * 100) : 0;

          return (
            <div key={ph.id} className="bg-white border rounded-xl shadow-sm overflow-hidden">
              {/* Header Fase */}
              <div className="bg-slate-50 p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-slate-800 text-sm">{ph.nome}</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-600 rounded-full" style={{ width: `${phPct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 font-mono">{phPct}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => addTask(ph.id)} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add Task
                  </button>
                  <button onClick={() => delPhase(ph.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              {/* Tabella Task */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="text-[10px] font-bold uppercase bg-white text-slate-400 border-b">
                    <tr>
                      <th className="px-4 py-3 w-1/3">Task</th>
                      <th className="px-4 py-3">Stato</th>
                      <th className="px-4 py-3">Assegnato</th>
                      <th className="px-4 py-3">Inizio</th>
                      <th className="px-4 py-3">Fine</th>
                      <th className="px-4 py-3">Avanzamento</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {phTasks.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs italic">Nessun task in questa fase.</td></tr>
                    )}
                    {phTasks.map((t: any) => (
                      <tr key={t.id} className="border-b last:border-b-0 hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <input value={t.nome} onChange={e => updTask(t.id, "nome", e.target.value)} className="w-full font-semibold bg-transparent border-none outline-none focus:ring-0 p-0 text-sm" />
                        </td>
                        <td className="px-4 py-2">
                          <select value={t.status} onChange={e => updTask(t.id, "status", e.target.value)} className="text-[10px] font-bold px-2 py-1 rounded border cursor-pointer outline-none w-full bg-white">
                            {statuses.map(s => <option key={s.k} value={s.k}>{s.l}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input value={t.assignee} onChange={e => updTask(t.id, "assignee", e.target.value)} placeholder="Nessuno" className="w-full bg-transparent border-none outline-none p-0 text-xs text-slate-500" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="date" value={t.startDate} onChange={e => updTask(t.id, "startDate", e.target.value)} className="w-full bg-transparent border-none outline-none p-0 text-[10px] font-mono text-slate-500" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="date" value={t.endDate} onChange={e => updTask(t.id, "endDate", e.target.value)} className="w-full bg-transparent border-none outline-none p-0 text-[10px] font-mono text-slate-500" />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <input type="range" min="0" max="100" step="5" value={t.progress} onChange={e => updTask(t.id, "progress", parseInt(e.target.value))} className="w-16 accent-blue-500" />
                            <span className="text-[10px] font-mono font-bold w-6">{t.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <button onClick={() => delTask(t.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 className="h-3 w-3" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
