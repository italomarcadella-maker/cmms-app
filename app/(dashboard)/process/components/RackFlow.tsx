"use client";

import React, { useState } from "react";
import { uid, SCOLS, C, nZone, NZ } from "@/lib/fpes-utils";
import { PackageSearch, Plus, Trash2 } from "lucide-react";

export default function RackFlow({ project, upd, cr }: { project: any; upd: (patch: any) => void; cr: any }) {
  const { cod, profRack, bufRack, copMin, livelli, hTotRack, okSp } = cr;
  const [selCod, setSelCod] = useState<string | null>(null);

  const S = 2.0, W = 540, H = 330, gY = H - 40, rL = 108, rR = rL + profRack * S;

  const rackCodici = project.rackCodici || [];
  const rack = project.rack || { livelli: 2, mxLiv: 4, inclin: 4, clearLat: 10, gapLiv: 10, hBase: 15, spazioDisp: 150 };

  const addCod = () => {
    upd({
      rackCodici: [...rackCodici, { id: uid(), nome: "COD-" + (rackCodici.length + 1), dExt: 50, dInt: 14, sp: 20, peso: 9, col: SCOLS[rackCodici.length % 8], attivo: false }]
    });
  };

  const updCod = (id: string, k: string, v: any) => {
    upd({
      rackCodici: rackCodici.map((c: any) => c.id === id ? { ...c, [k]: isNaN(+v) ? v : +v } : c)
    });
  };

  const setAtt = (id: string) => {
    upd({
      rackCodici: rackCodici.map((c: any) => ({ ...c, attivo: c.id === id }))
    });
  };

  const updRack = (k: string, v: number) => {
    upd({ rack: { ...rack, [k]: v } });
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <PackageSearch className="h-4 w-4 text-slate-500" /> Logistica di Linea & Rack Flow
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className="flex flex-col gap-6">
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Codici Matassa</h3>
            
            <div className="flex flex-col gap-2 mb-4">
              {rackCodici.map((c: any) => (
                <div 
                  key={c.id} 
                  className={`border rounded-lg overflow-hidden transition-all ${selCod === c.id ? 'ring-2 ring-blue-500 bg-blue-50/30' : 'bg-slate-50 border-slate-200'}`}
                >
                  <div 
                    className="flex items-center p-2 gap-2 cursor-pointer"
                    onClick={() => setSelCod(selCod === c.id ? null : c.id)}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.col }} />
                    <span className={`flex-1 text-xs font-semibold truncate ${c.attivo ? 'text-blue-700' : 'text-slate-700'}`}>
                      {c.nome}{c.attivo ? " ★" : ""}
                    </span>
                    <span className="text-[10px] text-slate-500">Ø{c.dExt} · {c.peso}kg</span>
                    {!c.attivo && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setAtt(c.id); }} 
                        className="text-[10px] px-1.5 py-0.5 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded cursor-pointer hover:bg-emerald-200"
                      >
                        ✓ Set
                      </button>
                    )}
                  </div>
                  
                  {selCod === c.id && (
                    <div className="p-3 pt-1 grid grid-cols-2 gap-2 bg-white border-t border-slate-100" onClick={e => e.stopPropagation()}>
                      <div className="col-span-2">
                        <label className="text-[10px] font-semibold text-slate-500">Nome</label>
                        <input value={c.nome} onChange={e => updCod(c.id, "nome", e.target.value)} className="w-full border rounded p-1 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500">Ø Esterno (cm)</label>
                        <input type="number" value={c.dExt} onChange={e => updCod(c.id, "dExt", e.target.value)} className="w-full border rounded p-1 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500">Altezza (cm)</label>
                        <input type="number" value={c.sp} onChange={e => updCod(c.id, "sp", e.target.value)} className="w-full border rounded p-1 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500">Peso (kg)</label>
                        <input type="number" value={c.peso} onChange={e => updCod(c.id, "peso", e.target.value)} className="w-full border rounded p-1 text-xs" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {rackCodici.length < 8 && (
              <button onClick={addCod} className="flex items-center justify-center gap-1 w-full bg-blue-50 text-blue-600 border border-blue-200 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-100">
                <Plus className="h-3 w-3" /> Nuovo Codice
              </button>
            )}
          </div>

          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Dimensionamento Rack</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1"><span>Livelli Rack</span> <span className="text-emerald-600 font-bold">{rack.livelli}</span></div>
                <input type="range" min="1" max="4" step="1" value={rack.livelli} onChange={e => updRack("livelli", +e.target.value)} className="w-full accent-emerald-500" />
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1"><span>Matasse per Livello</span> <span className="text-emerald-600 font-bold">{rack.mxLiv}</span></div>
                <input type="range" min="1" max="12" step="1" value={rack.mxLiv} onChange={e => updRack("mxLiv", +e.target.value)} className="w-full accent-emerald-500" />
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1"><span>Inclinazione (°)</span> <span className="text-emerald-600 font-bold">{rack.inclin}°</span></div>
                <input type="range" min="2" max="10" step="0.5" value={rack.inclin} onChange={e => updRack("inclin", +e.target.value)} className="w-full accent-emerald-500" />
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1"><span>Clearance lat. (cm)</span> <span className="text-emerald-600 font-bold">{rack.clearLat} cm</span></div>
                <input type="range" min="5" max="30" value={rack.clearLat} onChange={e => updRack("clearLat", +e.target.value)} className="w-full accent-emerald-500" />
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1"><span>Gap tra livelli (cm)</span> <span className="text-emerald-600 font-bold">{rack.gapLiv} cm</span></div>
                <input type="range" min="5" max="30" value={rack.gapLiv} onChange={e => updRack("gapLiv", +e.target.value)} className="w-full accent-emerald-500" />
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1"><span>Altezza Base (cm)</span> <span className="text-emerald-600 font-bold">{rack.hBase} cm</span></div>
                <input type="range" min="0" max="40" value={rack.hBase} onChange={e => updRack("hBase", +e.target.value)} className="w-full accent-emerald-500" />
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1"><span>Spazio a Layout (cm)</span> <span className="text-amber-500 font-bold">{rack.spazioDisp} cm</span></div>
                <input type="range" min="50" max="300" value={rack.spazioDisp} onChange={e => updRack("spazioDisp", +e.target.value)} className="w-full accent-amber-500" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border-t-4 border-t-emerald-500 border rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Buffer Rack</p>
              <p className="text-2xl font-bold text-emerald-600 font-mono">{bufRack} <span className="text-sm">pz</span></p>
            </div>
            <div className={`bg-white border-t-4 border rounded-xl p-4 shadow-sm ${+copMin >= 30 ? 'border-t-emerald-500' : 'border-t-amber-500'}`}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Copertura</p>
              <p className={`text-2xl font-bold font-mono ${+copMin >= 30 ? 'text-emerald-600' : 'text-amber-500'}`}>{copMin} <span className="text-sm">min</span></p>
            </div>
            <div className={`bg-white border-t-4 border rounded-xl p-4 shadow-sm ${okSp ? 'border-t-emerald-500' : 'border-t-red-500'}`}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ingombro</p>
              <p className={`text-2xl font-bold font-mono ${okSp ? 'text-emerald-600' : 'text-red-600'}`}>{profRack} <span className="text-sm">cm</span></p>
              <p className="text-[10px] text-slate-400">max {rack.spazioDisp}cm</p>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-5 shadow-sm overflow-hidden">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Sezione Frontale & Zone NIOSH</h3>
            <div className="overflow-x-auto">
              <svg width={W} height={H} className="block border rounded-lg bg-slate-50">
                <rect width={W} height={H} fill="#f8fafc" />
                
                {/* Background NIOSH zones */}
                {NZ.map((z:any, i:number) => {
                  const yB = gY - z.h1 * S;
                  const yT = gY - z.h2 * S;
                  if (yT > H || yB < 0) return null;
                  return (
                    <g key={i}>
                      <rect x={0} y={Math.max(0, yT)} width={100} height={Math.min(H, yB) - Math.max(0, yT)} fill={z.c} opacity={0.08} />
                      <text x={50} y={(gY - ((z.h1 + z.h2) / 2) * S) + 4} textAnchor="middle" fill={z.c} fontSize={10} fontWeight="bold">{z.l}</text>
                    </g>
                  );
                })}
                
                {/* Ground */}
                <line x1={0} y1={gY} x2={W} y2={gY} stroke="#cbd5e1" strokeWidth={3} />
                
                {/* Rack Outline */}
                <rect x={rL} y={gY - hTotRack * S} width={rR - rL} height={hTotRack * S} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1.5} rx={3} />
                
                {/* Levels */}
                {livelli.map((lv:any, i:number) => {
                  const pY = gY - lv.piano * S;
                  const tY = gY - (lv.piano + cod.sp) * S;
                  const z = nZone(lv.prelievo);
                  const cx = (rL + rR) / 2;
                  
                  return (
                    <g key={lv.lv}>
                      <rect x={rL + 4} y={tY} width={rR - rL - 8} height={pY - tY} fill={z.c} opacity={0.15} stroke={z.c} strokeWidth={1.5} rx={2} />
                      <ellipse cx={cx} cy={(pY + tY) / 2} rx={(rR - rL - 12) / 2} ry={Math.max((pY - tY) / 2 - 2, 3)} fill={z.c} opacity={0.2} stroke={z.c} strokeWidth={1.5} />
                      <text x={cx} y={(pY + tY) / 2 + 4} textAnchor="middle" fill={z.c} fontSize={12} fontWeight="bold">L{lv.lv}</text>
                      
                      {/* Quote Line */}
                      <line x1={rR + 4} y1={gY - lv.prelievo * S} x2={rR + 18 + i * 68} y2={gY - lv.prelievo * S} stroke={z.c} strokeWidth={1} strokeDasharray="3,2" />
                      <text x={rR + 22 + i * 68} y={gY - lv.prelievo * S - 6} fill={z.c} fontSize={11} fontWeight="bold">
                        {lv.prelievo}cm {z.ok ? "✓" : "⚠"}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
