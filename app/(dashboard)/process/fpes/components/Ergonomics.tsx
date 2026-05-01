"use client";

import React from "react";
import { nZone } from "@/lib/fpes-utils";
import { HeartPulse } from "lucide-react";

export default function Ergonomics({ project, upd, cr }: { project: any; upd: (patch: any) => void; cr: any }) {
  const { active, livelli } = cr;
  
  const checks = [
    { ok: livelli.length > 0 && livelli.every((l:any) => nZone(l.prelievo).ok), t: "Livelli rack in zona verde NIOSH (75–125cm)" },
    { ok: active.length > 0 && active.every((s:any) => (s.pesoSollev || 0) <= 15), t: "Peso sollevato ≤ 15 kg" },
    { ok: active.length > 0 && active.every((s:any) => nZone(s.altPrelievo || 95).ok), t: "Postazioni: altezza prelievo in zona verde" },
    { ok: (project.rack?.inclin || 4) >= 3 && (project.rack?.inclin || 4) <= 6, t: `Inclinazione rack 3–6° (att.: ${project.rack?.inclin || 4}°)` },
    { ok: +cr.copMin >= 20 || cr.copMin === "∞", t: `Copertura rack ≥ 20 min (att.: ${cr.copMin} min)` },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-slate-500" /> Valutazione Ergonomica & Sicurezza
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Checklist Ergonomica</h3>
          <div className="flex flex-col gap-3">
            {checks.map((c, i) => (
              <div 
                key={i} 
                className={`flex items-center gap-3 border rounded-lg p-3 ${c.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}
                style={{ borderLeftWidth: "4px", borderLeftColor: c.ok ? "#10b981" : "#ef4444" }}
              >
                <div className={`w-5 h-5 flex items-center justify-center rounded-full text-white text-xs font-bold ${c.ok ? 'bg-emerald-500' : 'bg-red-500'}`}>
                  {c.ok ? "✓" : "✗"}
                </div>
                <span className="text-xs font-medium text-slate-700">{c.t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Altezza Prelievo & Carico per Postazione</h3>
          
          <div className="space-y-4">
            {active.map((s: any) => {
              const z = nZone(s.altPrelievo || 95);
              const peso = s.pesoSollev || 8;
              const isHeavy = peso > 15;
              
              return (
                <div key={s.id} className="border rounded-xl p-4 transition-all" style={{ borderLeftWidth: "4px", borderLeftColor: z.c, background: z.c + "05" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-bold text-sm" style={{ color: s.colore }}>{s.nome}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: z.c }}>{z.l}</span>
                    {isHeavy && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-600">⚠ Peso Eccessivo</span>}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-600">Altezza Prelievo</span> 
                        <span className="font-bold" style={{ color: z.c }}>{s.altPrelievo || 95} cm</span>
                      </div>
                      <input 
                        type="range" min="0" max="200" value={s.altPrelievo || 95} 
                        onChange={e => upd({ stazioni: project.stazioni.map((st:any) => st.id === s.id ? { ...st, altPrelievo: +e.target.value } : st) })} 
                        className="w-full" style={{ accentColor: z.c }} 
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-600">Peso Sollevato</span> 
                        <span className={`font-bold ${isHeavy ? 'text-red-500' : 'text-emerald-600'}`}>{peso} kg</span>
                      </div>
                      <input 
                        type="range" min="0.5" max="50" step="0.5" value={peso} 
                        onChange={e => upd({ stazioni: project.stazioni.map((st:any) => st.id === s.id ? { ...st, pesoSollev: +e.target.value } : st) })} 
                        className={`w-full ${isHeavy ? 'accent-red-500' : 'accent-emerald-500'}`} 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
