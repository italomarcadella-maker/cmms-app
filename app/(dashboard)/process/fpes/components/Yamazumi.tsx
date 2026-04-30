"use client";

import React from "react";
import { C } from "@/lib/fpes-utils";
import { BarChart2 } from "lucide-react";

export default function Yamazumi({ project, upd, cr }: { project: any; upd: (patch: any) => void; cr: any }) {
  const { active, takt, bot, lineEff, vaAvg } = cr;
  
  if (!active || active.length === 0) {
    return <div className="p-8 text-center text-slate-400">Nessuna postazione attiva.</div>;
  }

  const maxC = Math.max(...active.map((s:any) => s.cicloS), takt, 1);
  const BH = 256, BW = 54, GAP = 18;
  const svgW = Math.max(560, active.length * (BW + GAP) + 80);
  const taktY = takt > 0 ? BH - (takt / maxC) * BH + 20 : null;
  const yPcts = [0, 25, 50, 75, 100];

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-slate-500" /> Bilanciamento & Yamazumi
        </h2>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border-t-4 border-t-blue-500 border rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Takt Time</p>
          <p className="text-2xl font-bold text-blue-600 font-mono">{takt}s</p>
        </div>
        <div className="bg-white border-t-4 border-t-red-500 border rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bottleneck</p>
          <p className="text-2xl font-bold text-red-600 truncate">{bot ? bot.nome : "—"}</p>
          {bot && <p className="text-xs text-slate-400 mt-1">{bot.cicloS}s</p>}
        </div>
        <div className={`bg-white border-t-4 border rounded-xl p-4 shadow-sm ${lineEff >= 85 ? 'border-t-emerald-500' : lineEff >= 70 ? 'border-t-amber-500' : 'border-t-red-500'}`}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Efficienza</p>
          <p className={`text-2xl font-bold font-mono ${lineEff >= 85 ? 'text-emerald-600' : lineEff >= 70 ? 'text-amber-500' : 'text-red-600'}`}>{lineEff}%</p>
        </div>
        <div className={`bg-white border-t-4 border rounded-xl p-4 shadow-sm ${vaAvg >= 70 ? 'border-t-emerald-500' : 'border-t-amber-500'}`}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">% VA Medio</p>
          <p className={`text-2xl font-bold font-mono ${vaAvg >= 70 ? 'text-emerald-600' : 'text-amber-500'}`}>{vaAvg}%</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5 shadow-sm mb-6 overflow-hidden">
        <div className="flex gap-4 mb-4 flex-wrap">
          {[
            { c: "#22c55e", l: "VA (Valore Aggiunto)" },
            { c: C.orange, l: "NVA (Non Valore)" },
            { c: C.red, l: "Attesa / Spreco" },
            { c: C.blue, l: "Takt Time Target" }
          ].map((x, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="rounded-sm" style={{ width: 12, height: i === 3 ? 3 : 12, background: x.c }} />
              <span className="text-xs font-semibold text-slate-600">{x.l}</span>
            </div>
          ))}
        </div>
        
        <div className="overflow-x-auto pb-4">
          <svg width={svgW} height={BH + 70} className="block">
            {taktY !== null && (
              <g>
                <line x1={40} y1={taktY} x2={svgW - 10} y2={taktY} stroke={C.blue} strokeWidth={2} strokeDasharray="6,4" />
                <text x={44} y={taktY - 4} fill={C.blue} fontSize={10} fontWeight="bold">TAKT {takt}s</text>
              </g>
            )}
            {active.map((s:any, i:number) => {
              const x = 40 + i * (BW + GAP);
              const tH = (s.cicloS / maxC) * BH;
              const attH = (s.attesa / maxC) * BH;
              const nvaH = (s.nva / maxC) * BH;
              const vaH = Math.max(0, tH - attH - nvaH);
              const sat = Math.round((s.va / Math.max(s.cicloS, 1)) * 100);
              const isB = bot && s.id === bot.id;
              
              return (
                <g key={s.id} transform={`translate(${x},20)`}>
                  {attH > 0 && <rect x={0} y={BH - tH} width={BW} height={attH} fill={C.red} opacity={0.8} />}
                  {nvaH > 0 && <rect x={0} y={BH - tH + attH} width={BW} height={nvaH} fill={C.orange} opacity={0.85} />}
                  {vaH > 0 && <rect x={0} y={BH - vaH} width={BW} height={vaH} fill="#22c55e" opacity={0.85} />}
                  
                  <rect x={0} y={BH - tH} width={BW} height={tH} fill="none" stroke={isB ? C.red : C.dim} strokeWidth={isB ? 2.5 : 1} rx={3} />
                  
                  {vaH > 14 && <text x={BW / 2} y={BH - vaH / 2 + 4} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">{s.va}s</text>}
                  
                  <text x={BW / 2} y={BH + 16} textAnchor="middle" fill={isB ? C.red : C.text} fontSize={11} fontWeight={isB ? "bold" : "600"}>{s.nome.slice(0, 10)}</text>
                  <text x={BW / 2} y={BH + 28} textAnchor="middle" fill={C.dim} fontSize={10}>{s.cicloS}s</text>
                  <text x={BW / 2} y={BH - tH - 8} textAnchor="middle" fill={sat >= 70 ? C.green : C.orange} fontSize={10} fontWeight="bold">{sat}%</text>
                </g>
              );
            })}
            
            {yPcts.map((pct) => {
              const y = 20 + BH * (1 - pct / 100);
              return (
                <g key={pct}>
                  <line x1={36} y1={y} x2={svgW - 10} y2={y} stroke={C.border} strokeWidth={0.7} />
                  <text x={30} y={y + 4} textAnchor="end" fill={C.dim} fontSize={9}>{Math.round(maxC * pct / 100)}s</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5 shadow-sm">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Modifica Tempi (What-If)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {active.map((s:any) => (
            <div key={s.id} className="border rounded-lg p-4" style={{ borderLeft: `4px solid ${s.colore}`, background: s.colore+"08" }}>
              <h4 className="font-bold text-sm mb-3" style={{ color: s.colore }}>{s.nome} <span className="text-slate-400 font-normal ml-1">({s.cicloS}s)</span></h4>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-1"><span className="text-emerald-600">VA (Valore)</span> <span>{s.va}s</span></div>
                  <input type="range" min={0} max={s.cicloS} value={s.va} onChange={e => upd({ stazioni: project.stazioni.map((st:any) => st.id === s.id ? { ...st, va: +e.target.value } : st) })} className="w-full accent-emerald-500" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-1"><span className="text-amber-500">NVA (Non Valore)</span> <span>{s.nva}s</span></div>
                  <input type="range" min={0} max={s.cicloS} value={s.nva} onChange={e => upd({ stazioni: project.stazioni.map((st:any) => st.id === s.id ? { ...st, nva: +e.target.value } : st) })} className="w-full accent-amber-500" />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-1"><span className="text-red-500">Attesa</span> <span>{s.attesa}s</span></div>
                  <input type="range" min={0} max={s.cicloS} value={s.attesa} onChange={e => upd({ stazioni: project.stazioni.map((st:any) => st.id === s.id ? { ...st, attesa: +e.target.value } : st) })} className="w-full accent-red-500" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
