"use client";

import React, { useState } from "react";
import { C, calcP } from "@/lib/fpes-utils";

export default function WhatIfSimulator({ project, upd }: { project: any; upd: (patch: any) => void; }) {
  const [scenarios, setScenarios] = useState<any[]>([
    { id: "base", name: "Scenario Base", data: JSON.parse(JSON.stringify(project)) }
  ]);
  const [activeScen, setActiveScen] = useState("base");

  const addScenario = () => {
    const newScen = {
      id: "scen_" + Date.now(),
      name: "Scenario " + (scenarios.length + 1),
      data: JSON.parse(JSON.stringify(scenarios[0].data))
    };
    setScenarios([...scenarios, newScen]);
    setActiveScen(newScen.id);
  };

  const currentScen = scenarios.find(s => s.id === activeScen) || scenarios[0];
  const cr = calcP(currentScen.data);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          WHAT-IF SIMULATOR
        </h2>
        <button onClick={addScenario} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700">
          + Nuovo Scenario
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {scenarios.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveScen(s.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activeScen === s.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4">{currentScen.name}</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Efficienza Linea</p>
            <p className="text-2xl font-bold text-blue-600">{cr.lineEff}%</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Takt Time</p>
            <p className="text-2xl font-bold text-emerald-600">{cr.takt}s</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valore Aggiunto</p>
            <p className="text-2xl font-bold text-amber-600">{cr.vaAvg}%</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bottleneck</p>
            <p className="text-2xl font-bold text-red-600">{cr.bot ? cr.bot.cicloS + 's' : '—'}</p>
          </div>
        </div>

        <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
          <div className="text-4xl mb-4">🔬</div>
          <p className="font-semibold text-slate-600">Simulatore in fase di sviluppo.</p>
          <p className="text-xs mt-2">Le prossime versioni permetteranno di modificare parametri in tempo reale (cicli, layout, operatori) e confrontare l'impatto sul Lean Score e sull'Efficienza in questa vista parallela.</p>
        </div>
      </div>
    </div>
  );
}
