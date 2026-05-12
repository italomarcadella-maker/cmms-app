"use client";

import React from "react";
import { C, sCol, LAYOUTS, dlJSON, today } from "@/lib/fpes-utils";

export default function LeanScore({ project, upd, cr }: { project: any; upd: (patch: any) => void; cr: any }) {
  const p = project;
  const { leanScore: sc, twPct, ergoScore, bufScore, spazScore, lineEff, vaAvg, takt, bot } = cr;
  const col = sCol(sc);
  const lbl = sc >= 85 ? "ECCELLENTE" : sc >= 70 ? "BUONO" : sc >= 50 ? "ACCETTABILE" : "DA MIGLIORARE";
  const storico = p.storico || [];
  const s2r = (d: number) => d * Math.PI / 180;
  const r = 80, gcx = 100, gcy = 100;
  const gSX = (gcx + r * Math.cos(s2r(180))).toFixed(1), gSY = (gcy + r * Math.sin(s2r(180))).toFixed(1);
  const eA = 180 - (sc / 100) * 180;
  const gEX = (gcx + r * Math.cos(s2r(eA))).toFixed(1), gEY = (gcy + r * Math.sin(s2r(eA))).toFixed(1);
  const laf = sc > 50 ? 1 : 0;
  const gPath = "M " + gSX + " " + gSY + " A " + r + " " + r + " 0 " + laf + " 1 " + gEX + " " + gEY;
  const nA = s2r(180 - (sc / 100) * 180);
  const nX = (gcx + 60 * Math.cos(nA)).toFixed(1), nY = (gcy + 60 * Math.sin(nA)).toFixed(1);
  const dims = [
    { l: "TIMWOODS", s: twPct, w: 35, c: C.orange, i: "🗑" },
    { l: "Ergonomia", s: ergoScore, w: 30, c: C.blue, i: "⚖️" },
    { l: "Buffer", s: bufScore, w: 20, c: C.green, i: "📦" },
    { l: "Spazio", s: spazScore, w: 15, c: C.purple, i: "📐" }
  ];
  const rows = [
    ["Progetto", p.nome],
    ["Layout", LAYOUTS[p.layout as keyof typeof LAYOUTS] ? LAYOUTS[p.layout as keyof typeof LAYOUTS].label : p.layout],
    ["Post. attive", String(cr.n)],
    ["Takt", takt + "s"],
    ["Bottleneck", bot ? bot.nome + " (" + bot.cicloS + "s)" : "—"],
    ["Efficienza", lineEff + "%"],
    ["% VA", vaAvg + "%"],
    ["TIMWOODS", twPct + "%"],
    ["Ergonomia", ergoScore + "%"],
    ["Lean Score", sc + "/100 — " + lbl]
  ];

  return (
    <div className="w-full space-y-4">
      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">LEAN SCORE & REPORT</h2>
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col items-center">
          <svg width={200} height={130} viewBox="0 0 200 130">
            <path d={"M " + (gcx + r * Math.cos(s2r(180))).toFixed(1) + " " + (gcy + r * Math.sin(s2r(180))).toFixed(1) + " A " + r + " " + r + " 0 0 1 " + (gcx + r * Math.cos(s2r(0))).toFixed(1) + " " + (gcy + r * Math.sin(s2r(0))).toFixed(1)} fill="none" stroke={C.s3} strokeWidth={14} strokeLinecap="round" />
            <path d={gPath} fill="none" stroke={col} strokeWidth={12} strokeLinecap="round" />
            <line x1={gcx} y1={gcy} x2={nX} y2={nY} stroke={col} strokeWidth={2.5} strokeLinecap="round" />
            <circle cx={gcx} cy={gcy} r={5} fill={col} />
            <text x={gcx} y={gcy - 10} textAnchor="middle" fill={col} fontSize={26} fontWeight="700" fontFamily="monospace">{sc}</text>
            <text x={gcx} y={gcy + 6} textAnchor="middle" fill={C.dim} fontSize={10}>/100</text>
            <text x={gcx} y={gcy + 20} textAnchor="middle" fill={col} fontSize={10} fontWeight="bold">{lbl}</text>
          </svg>
        </div>
        <div className="flex flex-col gap-2">
          {dims.map(d => (
            <div key={d.l} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm">
              <span className="text-lg">{d.i}</span>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-semibold">{d.l} <span className="text-[10px] text-slate-400">({d.w}%)</span></span>
                  <span className="text-sm font-bold font-mono" style={{ color: d.c }}>{d.s}/100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, d.s))}%`, backgroundColor: d.c }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {storico.length > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">TREND LEAN SCORE</h3>
          <div className="flex gap-2 items-end h-20">
            {storico.slice(-12).map((s: any, i: number) => {
              const h = Math.round((s.leanScore / 100) * 70);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full min-h-[4px] rounded-t-sm" style={{ height: `${h}px`, backgroundColor: sCol(s.leanScore) }} />
                  <div className="text-[8px] text-slate-400">{s.data ? s.data.slice(5) : ""}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">REPORT RIEPILOGATIVO</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 py-1.5 border-b border-slate-100">
              <span className="text-xs text-slate-500 min-w-[120px]">{row[0]}</span>
              <span className="text-xs font-semibold">{row[1]}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => dlJSON(p, p.nome.replace(/ /g, "_") + ".fpes.json")} className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">⬇ JSON</button>
          <button onClick={() => window.print()} className="px-3 py-1.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-lg">🖨 PDF</button>
          <button onClick={() => {
            const s = { data: today(), leanScore: sc, lineEff };
            upd({ storico: [...storico, s] });
          }} className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">📸 Snapshot</button>
        </div>
      </div>
    </div>
  );
}
