"use client";

import React, { useState, useEffect } from "react";
import { Play, Save, Box, Network, Settings, BarChart2, Plus, Factory } from "lucide-react";
import { getSimulations, createSimulation, saveSimulationSnapshot } from "@/lib/actions/fpes-actions";
import { format } from "date-fns";
import { newFpesProject, calcP } from "@/lib/fpes-utils";

import Setup from "./components/Setup";
import LineDesigner from "./components/LineDesigner";
import Yamazumi from "./components/Yamazumi";

const TABS = [
  { id: 1, label: "Setup", icon: Settings },
  { id: 2, label: "Line Designer", icon: Factory },
  { id: 3, label: "Yamazumi", icon: BarChart2 },
];

export default function FpesDashboard() {
  const [simulations, setSimulations] = useState<any[]>([]);
  const [activeSim, setActiveSim] = useState<any>(null);
  
  // The active project JSON state
  const [projectData, setProjectData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getSimulations();
      setSimulations(data || []);
      if (data && data.length > 0 && !activeSim) {
        handleSelectSim(data[0]);
      }
    } catch (e) {
      console.error("Error loading simulations:", e);
    }
  };

  const handleSelectSim = (sim: any) => {
    setActiveSim(sim);
    
    let parsedData = sim.dataJson;
    if (typeof parsedData === 'string') {
      try { parsedData = JSON.parse(parsedData); } catch (e) { parsedData = null; }
    }
    
    if (!parsedData || !parsedData.stazioni) {
      parsedData = newFpesProject(sim.name);
    }
    
    setProjectData(parsedData);
  };

  const handleNewSim = async () => {
    const name = prompt("Nome del nuovo Progetto FPES?");
    if (name) {
      const initialData = newFpesProject(name);
      try {
        const newSim = await createSimulation({
          name,
          layout: "U",
          dataJson: initialData
        });
        await loadData();
        handleSelectSim(newSim);
      } catch(e) {
        console.error(e);
        alert("Errore durante la creazione del progetto.");
      }
    }
  };

  const updProject = (patch: any) => {
    setProjectData((prev: any) => ({ ...prev, ...patch }));
  };

  const handleSaveSnapshot = async () => {
    if (!activeSim || !projectData) return;
    const cr = calcP(projectData);
    const score = cr.leanScore || (cr.lineEff > 80 ? 85 : 45); // fallback se non c'è leanScore completo ancora
    
    try {
      await saveSimulationSnapshot(activeSim.id, {
        label: "Snapshot V" + Date.now(),
        leanScore: score,
        lineEff: cr.lineEff,
        dataJson: projectData
      });
      alert(`Snapshot salvato! Lean Score: ${score}/100. Analizzato dal Global AI Engine.`);
      loadData();
    } catch(e) {
      console.error(e);
      alert("Errore durante il salvataggio dello snapshot.");
    }
  };

  const cr = projectData ? calcP(projectData) : null;

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-slate-50 overflow-hidden rounded-2xl border shadow-sm animate-in fade-in">
      {/* SIDEBAR FPES */}
      <div className="w-64 bg-white border-r flex flex-col z-10 shadow-sm">
        <div className="p-4 border-b bg-gradient-to-r from-blue-700 to-blue-900 text-white">
          <h2 className="font-bold text-lg flex items-center gap-2"><Network className="h-5 w-5 text-blue-200"/> FPES Suite</h2>
          <p className="text-xs text-blue-100">Factory Process Engineering</p>
        </div>
        
        <div className="p-3 space-y-2 overflow-y-auto flex-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Progetti Recenti</p>
          {simulations.map(s => (
            <div 
              key={s.id} 
              onClick={() => handleSelectSim(s)}
              className={`p-3 rounded-xl cursor-pointer transition-all border ${activeSim?.id === s.id ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-sm' : 'border-transparent hover:bg-slate-100'}`}
            >
              <p className="font-semibold text-sm truncate">{s.name}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-slate-400">{s.updatedAt ? format(new Date(s.updatedAt), 'dd/MM/yyyy') : ''}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s.leanScore >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>Score: {s.leanScore || 0}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t bg-slate-50 gap-2 flex flex-col">
          <button onClick={handleNewSim} className="flex items-center justify-center gap-2 w-full bg-white border border-slate-300 text-blue-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm hover:shadow">
            <Plus className="h-4 w-4" /> Nuovo Progetto
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {activeSim && projectData ? (
          <>
            {/* Topbar: Simulation Name & Save */}
            <div className="flex justify-between items-center bg-white p-4 border-b shadow-sm z-10">
              <div className="flex flex-col">
                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <Play className="h-5 w-5 text-blue-600 fill-blue-600" /> {projectData.nome}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                  <span className="bg-slate-100 px-2 py-0.5 rounded border">{projectData.layout}</span>
                  {cr && <span>Efficienza: <strong className={cr.lineEff >= 80 ? 'text-emerald-600' : 'text-amber-600'}>{cr.lineEff}%</strong></span>}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button onClick={handleSaveSnapshot} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors hover:shadow-md hover:-translate-y-0.5">
                  <Save className="h-4 w-4" /> Salva Snapshot
                </button>
              </div>
            </div>

            {/* Modules Tabs */}
            <div className="flex bg-white border-b px-4 gap-2 overflow-x-auto z-10 shadow-sm flex-shrink-0">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isAct = activeTab === tab.id;
                return (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold text-sm transition-colors whitespace-nowrap ${isAct ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                  >
                    <Icon className="h-4 w-4" /> {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Module Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="mx-auto w-full max-w-6xl animate-in slide-in-from-bottom-2 fade-in duration-300">
                {activeTab === 1 && <Setup project={projectData} upd={updProject} />}
                {activeTab === 2 && <LineDesigner project={projectData} upd={updProject} />}
                {activeTab === 3 && cr && <Yamazumi project={projectData} upd={updProject} cr={cr} />}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Box className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Seleziona o crea un progetto FPES dalla libreria a sinistra.</p>
          </div>
        )}
      </div>
    </div>
  );
}
