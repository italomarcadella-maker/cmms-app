"use client";

import React from "react";
import { TW_DEF } from "@/lib/fpes-utils";
import { Trash2 } from "lucide-react";

export default function Timwoods({ project, upd, cr }: { project: any; upd: (patch: any) => void; cr: any }) {
  const twPct = cr.twPct || 0;
  
  // 1 = Eccellente, 5 = Critico
  const getCol = (v: number) => v <= 2 ? "#10b981" : v === 3 ? "#f59e0b" : "#ef4444";

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-slate-500" /> TIMWOODS & Sprechi (8 Wastes)
        </h2>
      </div>

      <div className="flex items-center gap-6 mb-6 bg-white p-6 rounded-xl border shadow-sm">
        <div className="flex-1">
          <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <span>Score TIMWOODS</span>
            <span className="font-mono text-lg" style={{ color: getCol(twPct >= 80 ? 1 : twPct >= 60 ? 3 : 5) }}>{twPct}%</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500" 
              style={{ width: `${twPct}%`, background: getCol(twPct >= 80 ? 1 : twPct >= 60 ? 3 : 5) }} 
            />
          </div>
        </div>
        <div className="w-48 text-right">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Stato Attuale</div>
          <div className="text-xl font-bold mt-1" style={{ color: getCol(twPct >= 80 ? 1 : twPct >= 60 ? 3 : 5) }}>
            {twPct >= 80 ? "OTTIMO" : twPct >= 60 ? "ACCETTABILE" : "DA MIGLIORARE"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TW_DEF.map(t => {
          const val = project.timwoods?.[t.k] || 1;
          const col = getCol(val);
          
          return (
            <div key={t.k} className="bg-white border rounded-xl p-5 shadow-sm transition-all" style={{ borderLeftWidth: "4px", borderLeftColor: col }}>
              <div className="flex items-start gap-3 mb-4">
                <span className="text-3xl bg-slate-50 p-2 rounded-lg">{t.i}</span>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight">{t.n}</h3>
                  <p className="text-[10px] text-slate-500 leading-tight mt-1">{t.d}</p>
                </div>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Livello Spreco</span>
                  <span className="font-bold text-lg font-mono" style={{ color: col }}>{val}</span>
                </div>
                <input 
                  type="range" min="1" max="5" step="1" value={val} 
                  onChange={e => upd({ timwoods: { ...project.timwoods, [t.k]: parseInt(e.target.value) } })}
                  className="w-full" style={{ accentColor: col }}
                />
              </div>
              <div className="flex justify-between px-1">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className={`text-[10px] ${n === val ? 'font-bold' : 'text-slate-300 font-medium'}`} style={{ color: n === val ? col : undefined }}>{n}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
