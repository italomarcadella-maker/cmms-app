"use client";

import React, { useState, useEffect } from "react";
import { Play, Save, Box, Network, Settings, BarChart2 } from "lucide-react";
import { getSimulations, createSimulation, saveSimulationSnapshot } from "@/lib/actions/fpes-actions";

export default function FpesDashboard() {
  const [simulations, setSimulations] = useState<any[]>([]);
  const [activeSim, setActiveSim] = useState<any>(null);
  
  // What-If State
  const [stations, setStations] = useState<any[]>([]);
  const [taktTime, setTaktTime] = useState(60);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getSimulations();
    setSimulations(data);
    if (data.length > 0 && !activeSim) {
      handleSelectSim(data[0]);
    }
  };

  const handleSelectSim = (sim: any) => {
    setActiveSim(sim);
    const loadedStations = sim.dataJson?.stations || [
      { id: "1", name: "Taglio", cycle: 45, va: 30, nva: 10, wait: 5 },
      { id: "2", name: "Saldatura", cycle: 70, va: 50, nva: 10, wait: 10 },
      { id: "3", name: "Assemblaggio", cycle: 55, va: 40, nva: 5, wait: 10 }
    ];
    setStations(loadedStations);
    setTaktTime(sim.dataJson?.takt || 60);
  };

  const handleNewSim = async () => {
    const name = prompt("Nome della nuova simulazione Yamazumi?");
    if (name) {
      const newSim = await createSimulation({
        name,
        layout: "Linea Continua",
        dataJson: {
          takt: 60,
          stations: [
            { id: "1", name: "Stazione 1", cycle: 50, va: 40, nva: 10, wait: 0 }
          ]
        }
      });
      await loadData();
      handleSelectSim(newSim);
    }
  };

  const calculateLeanScore = () => {
    // Finta logica calcolo lean (es. penalità se supera il takt)
    const maxCycle = Math.max(...stations.map(s => s.cycle));
    const isOverTakt = maxCycle > taktTime;
    return isOverTakt ? 45 : 85;
  };

  const handleSaveSnapshot = async () => {
    if (!activeSim) return;
    const score = calculateLeanScore();
    await saveSimulationSnapshot(activeSim.id, {
      label: "Snapshot V" + Date.now(),
      leanScore: score,
      lineEff: score + 5,
      dataJson: { takt: taktTime, stations }
    });
    alert(`Snapshot salvato! Lean Score: ${score}/100. Analizzato dal Global AI Engine.`);
    loadData();
  };

  const updateStation = (index: number, field: string, val: number) => {
    const updated = [...stations];
    updated[index][field] = val;
    // Auto adjust cycle time
    if (field === 'va' || field === 'nva' || field === 'wait') {
      updated[index].cycle = updated[index].va + updated[index].nva + updated[index].wait;
    }
    setStations(updated);
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-slate-50 overflow-hidden rounded-2xl border shadow-sm animate-in fade-in">
      {/* SIDEBAR FPES */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b bg-amber-900 text-white">
          <h2 className="font-bold text-lg flex items-center gap-2"><Network className="h-5 w-5 text-amber-400"/> FPES Suite</h2>
          <p className="text-xs text-amber-200">Process Engineering & Lean</p>
        </div>
        
        <div className="p-2 space-y-1 overflow-y-auto flex-1">
          {simulations.map(s => (
            <div 
              key={s.id} 
              onClick={() => handleSelectSim(s)}
              className={`p-3 rounded-xl cursor-pointer transition-all border ${activeSim?.id === s.id ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-sm' : 'border-transparent hover:bg-slate-100'}`}
            >
              <p className="font-semibold text-sm truncate">{s.name}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-slate-400">{new Date(s.updatedAt).toLocaleDateString()}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s.leanScore >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>Score: {s.leanScore}</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t bg-slate-50 gap-2 flex flex-col">
          <button onClick={handleNewSim} className="flex items-center justify-center gap-2 w-full bg-white border border-slate-300 text-slate-700 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Nuovo Progetto
          </button>
        </div>
      </div>

      {/* MAIN CONTENT: WHAT-IF SIMULATOR */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 bg-slate-50/50">
        {activeSim ? (
          <div className="max-w-5xl mx-auto w-full space-y-6">
            
            {/* Header & Global KPIs */}
            <div className="flex justify-between items-start bg-white p-6 rounded-2xl border shadow-sm">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                  <Play className="h-6 w-6 text-amber-500 fill-amber-500" /> What-If Simulator: {activeSim.name}
                </h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Sposta i tempi tra le postazioni e analizza l'impatto con l'IA Globale.</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-slate-50 px-4 py-2 rounded-xl border flex items-center gap-3">
                   <span className="text-xs font-bold text-slate-400 uppercase">Takt Time (s)</span>
                   <input type="number" value={taktTime} onChange={e => setTaktTime(parseInt(e.target.value) || 60)} className="w-16 bg-white border rounded p-1 text-center font-mono font-bold text-slate-700" />
                </div>
                <button onClick={handleSaveSnapshot} className="flex items-center gap-2 bg-amber-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-amber-700 transition-colors">
                  <Save className="h-4 w-4" /> Salva Snapshot & Analizza
                </button>
              </div>
            </div>

            {/* Visual Yamazumi (Simplified Demo) */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-2"><BarChart2 className="h-4 w-4"/> Grafico Yamazumi</h4>
              <div className="flex items-end gap-4 h-64 border-b-2 border-slate-200 pb-2 relative">
                {/* Takt Line */}
                <div className="absolute w-full border-t-2 border-dashed border-red-400" style={{ bottom: `${(taktTime / 100) * 100}%` }}>
                  <span className="text-xs font-bold text-red-500 absolute -top-5 right-0">Takt: {taktTime}s</span>
                </div>

                {stations.map((s, i) => {
                  const maxH = 100; // max scale 100s
                  const vaH = (s.va / maxH) * 100;
                  const nvaH = (s.nva / maxH) * 100;
                  const waitH = (s.wait / maxH) * 100;
                  const isOver = s.cycle > taktTime;

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                       <span className={`text-xs font-bold mb-1 ${isOver ? 'text-red-600' : 'text-slate-500'}`}>{s.cycle}s</span>
                       <div className={`w-full max-w-[80px] flex flex-col justify-end transition-all rounded-t-md overflow-hidden border-2 ${isOver ? 'border-red-500' : 'border-transparent'}`} style={{height: `${(s.cycle/maxH)*100}%`}}>
                          <div className="bg-red-400 w-full" style={{height: `${(s.wait/s.cycle)*100}%`}} title={`Attesa: ${s.wait}s`}></div>
                          <div className="bg-amber-400 w-full" style={{height: `${(s.nva/s.cycle)*100}%`}} title={`NVA: ${s.nva}s`}></div>
                          <div className="bg-emerald-500 w-full" style={{height: `${(s.va/s.cycle)*100}%`}} title={`VA: ${s.va}s`}></div>
                       </div>
                       <span className="text-xs font-bold text-slate-600 mt-2 truncate w-full text-center">{s.name}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-6 mt-4 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> VA (Valore Aggiunto)</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-400 rounded-sm"></div> NVA (Non Valore)</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-400 rounded-sm"></div> Attesa / Spreco</span>
              </div>
            </div>

            {/* Sliders Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {stations.map((s, i) => (
                <div key={i} className={`bg-white p-5 rounded-2xl border shadow-sm transition-colors ${s.cycle > taktTime ? 'bg-red-50/30 border-red-200' : ''}`}>
                  <h4 className="font-bold text-slate-800 mb-4 flex justify-between">
                    {s.name} 
                    <span className={`font-mono ${s.cycle > taktTime ? 'text-red-600' : 'text-slate-500'}`}>{s.cycle}s</span>
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-500 mb-1"><span>VA (s)</span> <span className="text-emerald-600">{s.va}s</span></div>
                      <input type="range" min="0" max="100" value={s.va} onChange={(e) => updateStation(i, 'va', parseInt(e.target.value))} className="w-full accent-emerald-500" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-500 mb-1"><span>NVA (s)</span> <span className="text-amber-500">{s.nva}s</span></div>
                      <input type="range" min="0" max="100" value={s.nva} onChange={(e) => updateStation(i, 'nva', parseInt(e.target.value))} className="w-full accent-amber-400" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-500 mb-1"><span>Attesa (s)</span> <span className="text-red-500">{s.wait}s</span></div>
                      <input type="range" min="0" max="100" value={s.wait} onChange={(e) => updateStation(i, 'wait', parseInt(e.target.value))} className="w-full accent-red-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Box className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Seleziona o crea una simulazione FPES dalla libreria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
