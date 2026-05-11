"use client";

import React from "react";
import { LAYOUTS } from "@/lib/fpes-utils";
import { Settings } from "lucide-react";

export default function Setup({ project, upd }: { project: any; upd: (patch: any) => void }) {
  const takt = project.domandaGiorn > 0 ? Math.round((project.turniGiorn * project.hTurno * 3600) / project.domandaGiorn) : 0;

  return (
    <div className="max-w-4xl w-full">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Settings className="h-4 w-4 text-slate-500" /> Setup Progetto
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Informazioni Generali</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Nome Simulazione / Linea</label>
              <input type="text" value={project.nome || ""} onChange={e => upd({ nome: e.target.value })} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Reparto</label>
                <input type="text" value={project.reparto || ""} onChange={e => upd({ reparto: e.target.value })} className="w-full border rounded-lg p-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Data</label>
                <input type="date" value={project.data || ""} onChange={e => upd({ data: e.target.value })} className="w-full border rounded-lg p-2 text-sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Parametri di Domanda</h3>
          
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1"><span>Domanda (Pezzi/giorno)</span> <span className="text-blue-600 font-bold">{project.domandaGiorn}</span></div>
              <input type="range" min="1" max="5000" step="10" value={project.domandaGiorn || 500} onChange={e => upd({ domandaGiorn: +e.target.value })} className="w-full accent-blue-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1"><span>Turni/giorno</span> <span className="text-blue-600 font-bold">{project.turniGiorn}</span></div>
              <input type="range" min="1" max="3" step="1" value={project.turniGiorn || 2} onChange={e => upd({ turniGiorn: +e.target.value })} className="w-full accent-blue-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1"><span>Ore/turno</span> <span className="text-blue-600 font-bold">{project.hTurno}</span></div>
              <input type="range" min="4" max="12" step="0.5" value={project.hTurno || 8} onChange={e => upd({ hTurno: +e.target.value })} className="w-full accent-blue-500" />
            </div>
            
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex justify-between items-center mt-2">
              <span className="text-xs font-semibold text-blue-800">Takt Time Calcolato</span>
              <span className="text-xl font-bold text-blue-600 font-mono">{takt} s</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5 shadow-sm">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Layout della Cella</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.keys(LAYOUTS).map(k => {
            const l = (LAYOUTS as any)[k];
            const isSel = project.layout === k;
            return (
              <button 
                key={k} 
                onClick={() => upd({ layout: k })}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center ${isSel ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
              >
                <div className="text-3xl mb-2">{l.icon}</div>
                <div className={`text-xs font-bold ${isSel ? 'text-blue-700' : 'text-slate-700'}`}>{l.label}</div>
                <div className="text-[9px] text-slate-400 mt-1">{l.desc}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  );
}
