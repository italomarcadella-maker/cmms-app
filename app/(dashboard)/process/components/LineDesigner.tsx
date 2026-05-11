"use client";

import React, { useState, useRef, useCallback } from "react";
import { C, LAYOUTS, lPos, mkSt, SCOLS } from "@/lib/fpes-utils";
import { Plus, RotateCcw, Trash2 } from "lucide-react";

export default function LineDesigner({ project, upd }: { project: any; upd: (patch: any) => void }) {
  const [drag, setDrag] = useState<any>(null);
  const [sel, setSel] = useState<any>(null);
  const [snap, setSnap] = useState(true);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const VBW = 680, VBH = 340;

  const getSVGPt = useCallback((e: any) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (VBW / rect.width),
      y: (e.clientY - rect.top) * (VBH / rect.height)
    };
  }, []);

  const onDown = useCallback((e: any, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const c = getSVGPt(e);
    const st = project.stazioni.find((s: any) => s.id === id);
    if (!st) return;
    setDrag({ id, ox: c.x - st.x, oy: c.y - st.y });
    setSel(id);
  }, [getSVGPt, project.stazioni]);

  const onMove = useCallback((e: any) => {
    if (!drag) return;
    const c = getSVGPt(e);
    const sn = snap ? (v: number) => Math.round(v / 10) * 10 : (v: number) => Math.round(v);
    
    upd({
      stazioni: project.stazioni.map((s: any) => 
        s.id === drag.id 
          ? { ...s, x: Math.max(0, Math.min(VBW - s.w, sn(c.x - drag.ox))), y: Math.max(0, Math.min(VBH - s.h, sn(c.y - drag.oy))) } 
          : s
      )
    });
  }, [drag, getSVGPt, project.stazioni, upd, snap]);

  const onUp = useCallback(() => setDrag(null), []);

  const selSt2 = project.stazioni.find((s: any) => s.id === sel);
  const actSt = project.stazioni.filter((s: any) => s.attiva);

  const addSt = () => {
    const n = project.stazioni.length;
    const s = mkSt(n, project.layout, n + 1);
    s.x = Math.max(0, Math.min(VBW - 90, 80 + n * 20));
    s.y = Math.max(0, Math.min(VBH - 56, 100 + n * 15));
    upd({ stazioni: [...project.stazioni, s] });
    setSel(s.id);
  };

  const delSt = (id: string) => {
    if (project.stazioni.length <= 1) return;
    upd({ stazioni: project.stazioni.filter((s: any) => s.id !== id) });
    if (sel === id) setSel(null);
  };

  const resetL = () => {
    const n = project.stazioni.length;
    const pos = lPos(project.layout, n);
    upd({
      stazioni: project.stazioni.map((s: any, i: number) => ({
        ...s,
        x: pos[i] ? pos[i].x : s.x,
        y: pos[i] ? pos[i].y : s.y
      }))
    });
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Line Designer — {(LAYOUTS as any)[project.layout]?.label || project.layout}
        </h2>
        <div className="flex gap-2 ml-auto">
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer mr-2">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} className="rounded" />
            Snap to Grid
          </label>
          <button onClick={resetL} className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold transition-colors border">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
          <button onClick={addSt} className="flex items-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-semibold transition-colors">
            <Plus className="h-3 w-3" /> Postazione
          </button>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* SVG Canvas */}
        <div className="flex-1 bg-white border rounded-xl overflow-hidden shadow-sm">
          <svg 
            ref={svgRef} 
            viewBox={`0 0 ${VBW} ${VBH}`} 
            className="w-full block"
            style={{ cursor: drag ? "grabbing" : "default", touchAction: "none", userSelect: "none" }}
            onPointerMove={onMove} 
            onPointerUp={onUp} 
            onClick={() => setSel(null)}
          >
            <defs>
              <pattern id="ldg" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
              </pattern>
              <marker id="ldah" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                <polygon points="0 0, 7 2.5, 0 5" fill={C.blue} opacity="0.4"/>
              </marker>
            </defs>
            <rect width={VBW} height={VBH} fill="#f8fafc"/>
            <rect width={VBW} height={VBH} fill="url(#ldg)"/>
            
            {/* Connections */}
            {actSt.map((s: any, i: number) => {
              if (i >= actSt.length - 1) return null;
              const nx = actSt[i + 1];
              return <line key={"a"+i} x1={s.x + s.w} y1={s.y + s.h/2} x2={nx.x} y2={nx.y + nx.h/2} stroke={C.blue} strokeWidth={1.5} strokeDasharray="5,3" opacity={0.4} markerEnd="url(#ldah)"/>;
            })}

            {/* Stations */}
            {project.stazioni.map((s: any) => {
              const isSel = sel === s.id;
              return (
                <g key={s.id} style={{ cursor: "grab" }} onPointerDown={(e) => onDown(e, s.id)} onClick={(e) => e.stopPropagation()}>
                  {isSel && <rect x={s.x - 3} y={s.y - 3} width={s.w + 6} height={s.h + 6} rx={8} fill="none" stroke={C.blue} strokeWidth={1.5} strokeDasharray="4,2"/>}
                  <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={5} fill={s.attiva ? s.colore + "18" : C.s3} stroke={s.attiva ? s.colore : C.dim} strokeWidth={isSel ? 2 : 1.5} opacity={s.attiva ? 1 : 0.5}/>
                  <text x={s.x + s.w/2} y={s.y + s.h/2 - 5} textAnchor="middle" fill={s.attiva ? s.colore : C.dim} fontSize={11} fontWeight="bold">{s.nome}</text>
                  <text x={s.x + s.w/2} y={s.y + s.h/2 + 8} textAnchor="middle" fill={C.mid} fontSize={8}>{s.cicloS}s · {s.operatori}op</text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Properties Panel */}
        <div className="w-64 flex-shrink-0">
          {selSt2 ? (
            <div className="bg-white border rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-[3px]" style={{ background: selSt2.colore }}/>
                <h3 className="font-bold text-sm text-slate-800 truncate">Proprietà Postazione</h3>
                <button onClick={() => delSt(sel)} className="ml-auto text-red-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nome</label>
                  <input type="text" value={selSt2.nome} onChange={e => upd({ stazioni: project.stazioni.map((s:any) => s.id === sel ? { ...s, nome: e.target.value } : s) })} className="w-full border rounded-md p-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Operazione</label>
                  <input type="text" value={selSt2.operazione} onChange={e => upd({ stazioni: project.stazioni.map((s:any) => s.id === sel ? { ...s, operazione: e.target.value } : s) })} className="w-full border rounded-md p-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Ciclo (s)</label>
                    <input type="number" min={1} value={selSt2.cicloS} onChange={e => upd({ stazioni: project.stazioni.map((s:any) => s.id === sel ? { ...s, cicloS: parseInt(e.target.value) || 0 } : s) })} className="w-full border rounded-md p-1.5 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Operatori</label>
                    <input type="number" min={1} max={10} value={selSt2.operatori} onChange={e => upd({ stazioni: project.stazioni.map((s:any) => s.id === sel ? { ...s, operatori: parseInt(e.target.value) || 1 } : s) })} className="w-full border rounded-md p-1.5 text-xs font-mono" />
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Colore</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {SCOLS.map(col => (
                      <button 
                        key={col} 
                        onClick={() => upd({ stazioni: project.stazioni.map((s:any) => s.id === sel ? { ...s, colore: col } : s) })}
                        className={`w-5 h-5 rounded-[4px] cursor-pointer transition-all ${selSt2.colore === col ? 'ring-2 ring-slate-800 ring-offset-1 scale-110' : 'hover:scale-110'}`}
                        style={{ background: col }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t mt-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selSt2.attiva} 
                      onChange={e => upd({ stazioni: project.stazioni.map((s:any) => s.id === sel ? { ...s, attiva: e.target.checked } : s) })}
                      className="rounded text-blue-600 focus:ring-blue-500" 
                    />
                    Postazione Attiva
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center h-48 text-slate-400">
              <span className="text-2xl mb-2 block">👆</span>
              <p className="text-xs font-medium">Seleziona una postazione nel layout per modificarla</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
