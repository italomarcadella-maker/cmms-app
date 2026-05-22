"use client";

import React, { useState, useRef, useCallback } from "react";
import { C, LAYOUTS, lPos, mkSt, SCOLS } from "@/lib/fpes-utils";
import { Plus, RotateCcw, Trash2, X, Shuffle, Combine } from "lucide-react";
import { toast } from "sonner";

export default function LineDesigner({ project, upd }: { project: any; upd: (patch: any) => void }) {
  const [drag, setDrag] = useState<any>(null);
  const [sel, setSel] = useState<any>(null);
  const [snap, setSnap] = useState(true);
  
  const [rebalanceSt, setRebalanceSt] = useState<any>(null);
  const [rebalanceTarget, setRebalanceTarget] = useState<string>("");
  
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
    
    // Auto-sync with MuriMuda if MuriMuda is initialized
    let newMuriMuda = undefined;
    if (project.murimuda && project.murimuda.postazioni) {
      const nm = {
        id: s.id,
        nome: s.nome,
        operatore: "",
        cicloSec: s.cicloS,
        durataNettoMin: 420,
        pauseMin: 60,
        recuperiAdeg: true,
        attivita: [{
          id: "_" + Math.random().toString(36).slice(2, 9),
          nome: "Attività base",
          desc: "",
          durataSec: s.cicloS,
          tipoVA: "VA",
          tipoMov: "OPERARE",
          timw: "O",
          altezzaCm: 95,
          pesoCaricoKg: 0,
          distOrizzCm: 30,
          distVertCm: 25,
          angolazione: 0,
          freqMin: 0.1,
          presa: 1,
          forza: 0,
          postura: 0,
          stereotipia: 0,
          note: ""
        }]
      };
      newMuriMuda = { ...project.murimuda, postazioni: [...project.murimuda.postazioni, nm] };
    }
    
    upd({ 
      stazioni: [...project.stazioni, s],
      ...(newMuriMuda ? { murimuda: newMuriMuda } : {})
    });
    setSel(s.id);
    toast.success(`Aggiunta postazione ${s.nome}!`);
  };

  const handleDeleteClick = (id: string) => {
    if (project.stazioni.length <= 1) {
      toast.error("Impossibile eliminare: la linea deve avere almeno una postazione.");
      return;
    }
    const st = project.stazioni.find((s: any) => s.id === id);
    if (!st) return;
    setRebalanceSt(st);
    
    // Pre-select first remaining station for merging
    const others = project.stazioni.filter((s: any) => s.id !== id);
    if (others.length > 0) {
      setRebalanceTarget(others[0].id);
    }
  };

  const applyRebalance = (mode: "SMART" | "MERGE" | "DISCARD") => {
    if (!rebalanceSt) return;
    const otherSt = project.stazioni.filter((s: any) => s.id !== rebalanceSt.id);
    const remCount = otherSt.length;
    
    let updatedSt = [...otherSt];
    let newMuriMuda = undefined;
    
    if (mode === "SMART" && remCount > 0) {
      const shareVa = Math.round(rebalanceSt.va / remCount);
      const shareNva = Math.round(rebalanceSt.nva / remCount);
      const shareAttesa = Math.round(rebalanceSt.attesa / remCount);
      
      updatedSt = otherSt.map((s: any) => {
        const newVa = s.va + shareVa;
        const newNva = s.nva + shareNva;
        const newAtt = s.attesa + shareAttesa;
        return {
          ...s,
          va: newVa,
          nva: newNva,
          attesa: newAtt,
          cicloS: newVa + newNva + newAtt
        };
      });
      
      // Redistribute MuriMuda activities at rotation
      if (project.murimuda && project.murimuda.postazioni) {
        const sourcePost = project.murimuda.postazioni.find((p: any) => p.nome === rebalanceSt.nome || p.id === rebalanceSt.id);
        const remainingPosts = project.murimuda.postazioni.filter((p: any) => p.nome !== rebalanceSt.nome && p.id !== rebalanceSt.id);
        
        if (sourcePost && sourcePost.attivita && sourcePost.attivita.length > 0 && remainingPosts.length > 0) {
          sourcePost.attivita.forEach((act: any, idx: number) => {
            const targetPostIdx = idx % remainingPosts.length;
            remainingPosts[targetPostIdx].attivita = [
              ...(remainingPosts[targetPostIdx].attivita || []),
              { ...act, id: "_" + Math.random().toString(36).slice(2, 9) }
            ];
            remainingPosts[targetPostIdx].cicloSec = remainingPosts[targetPostIdx].attivita.reduce((s: number, a: any) => s + (a.durataSec || 0), 0);
          });
          newMuriMuda = { ...project.murimuda, postazioni: remainingPosts };
        } else {
          newMuriMuda = { ...project.murimuda, postazioni: remainingPosts };
        }
      }
    } else if (mode === "MERGE" && rebalanceTarget) {
      updatedSt = otherSt.map((s: any) => {
        if (s.id === rebalanceTarget) {
          const newVa = s.va + rebalanceSt.va;
          const newNva = s.nva + rebalanceSt.nva;
          const newAtt = s.attesa + rebalanceSt.attesa;
          return {
            ...s,
            va: newVa,
            nva: newNva,
            attesa: newAtt,
            cicloS: newVa + newNva + newAtt
          };
        }
        return s;
      });
      
      // Merge all MuriMuda activities to target
      if (project.murimuda && project.murimuda.postazioni) {
        const sourcePost = project.murimuda.postazioni.find((p: any) => p.nome === rebalanceSt.nome || p.id === rebalanceSt.id);
        const targetStObj = project.stazioni.find((s: any) => s.id === rebalanceTarget);
        const targetPost = project.murimuda.postazioni.find((p: any) => p.nome === targetStObj?.nome || p.id === targetStObj?.id);
        
        if (sourcePost && targetPost) {
          const remainingPosts = project.murimuda.postazioni.filter((p: any) => p.id !== sourcePost.id).map((p: any) => {
            if (p.id === targetPost.id) {
              const mergedActs = [...(p.attivita || []), ...(sourcePost.attivita || []).map((a: any) => ({ ...a, id: "_" + Math.random().toString(36).slice(2, 9) }))];
              return {
                ...p,
                attivita: mergedActs,
                cicloSec: mergedActs.reduce((s: number, a: any) => s + (a.durataSec || 0), 0)
              };
            }
            return p;
          });
          newMuriMuda = { ...project.murimuda, postazioni: remainingPosts };
        } else {
          const remainingPosts = project.murimuda.postazioni.filter((p: any) => p.nome !== rebalanceSt.nome && p.id !== rebalanceSt.id);
          newMuriMuda = { ...project.murimuda, postazioni: remainingPosts };
        }
      }
    } else {
      // Discard
      if (project.murimuda && project.murimuda.postazioni) {
        newMuriMuda = { ...project.murimuda, postazioni: project.murimuda.postazioni.filter((p: any) => p.nome !== rebalanceSt.nome && p.id !== rebalanceSt.id) };
      }
    }
    
    // Sync names of MuriMuda postazioni in case they were customized in stazioni
    if (newMuriMuda && newMuriMuda.postazioni) {
      newMuriMuda.postazioni = newMuriMuda.postazioni.map((p: any) => {
        const st = updatedSt.find((s: any) => s.id === p.id);
        if (st) return { ...p, nome: st.nome };
        return p;
      });
    }

    upd({
      stazioni: updatedSt,
      ...(newMuriMuda ? { murimuda: newMuriMuda } : {})
    });
    
    const active = updatedSt.filter((s: any) => s.attiva);
    const n = Math.max(active.length, 1);
    const bot = active.reduce((a: any, b: any) => a.cicloS > b.cicloS ? a : b, active[0] || { cicloS: 0, nome: "—" });
    const sumC = active.reduce((s: number, st: any) => s + st.cicloS, 0);
    const lineEff = bot.cicloS > 0 ? Math.round((sumC / (n * bot.cicloS)) * 100) : 0;
    
    toast.success(`Linea Ribilanciata! Nuovo Bottleneck: ${bot.nome} (${bot.cicloS}s), Nuova Efficienza: ${lineEff}%`);
    
    setRebalanceSt(null);
    if (sel === rebalanceSt.id) setSel(null);
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
                <button 
                  onClick={() => handleDeleteClick(sel)}
                  disabled={project.stazioni.length <= 1}
                  className={`ml-auto p-1 rounded-md transition-colors ${project.stazioni.length <= 1 ? 'text-slate-300 cursor-not-allowed' : 'text-red-400 hover:text-red-600 hover:bg-red-50'}`}
                  title={project.stazioni.length <= 1 ? "La linea deve contenere almeno 1 postazione" : "Elimina postazione"}
                >
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

      {/* Rebalancing Modal */}
      {rebalanceSt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-lg border border-slate-200/85 rounded-2xl p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Decorative top gradient gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>⚡</span> Ribilanciamento Linea
              </h3>
              <button 
                onClick={() => setRebalanceSt(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-slate-600">
                Stai eliminando la postazione <strong className="text-slate-900 font-semibold">{rebalanceSt.nome}</strong>.
                Come vuoi gestire il suo carico di lavoro di <strong className="text-slate-900 font-semibold">{rebalanceSt.cicloS}s</strong> e le sue attività?
              </p>
            </div>

            <div className="space-y-3">
              {/* Option 1: SMART */}
              <button
                onClick={() => applyRebalance("SMART")}
                className="w-full flex items-start gap-3 text-left p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 transition-all group"
              >
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <Shuffle className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Ribilanciamento Automatico (Smart)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Suddivide equamente i tempi ({rebalanceSt.cicloS}s) e distribuisce a rotazione le attività MURI-MUDA sulle postazioni rimanenti.
                  </p>
                </div>
              </button>

              {/* Option 2: MERGE */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <Combine className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Fusione con Postazione</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Trasferisce l'intero carico di lavoro e tutte le attività dettagliate in una postazione adiacente specifica.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-10">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Destinatario:</label>
                  <select
                    value={rebalanceTarget}
                    onChange={(e) => setRebalanceTarget(e.target.value)}
                    className="flex-1 border rounded-lg px-2 py-1 text-xs bg-slate-50 font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    {project.stazioni
                      .filter((s: any) => s.id !== rebalanceSt.id)
                      .map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.nome} — {s.operazione} ({s.cicloS}s)
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => applyRebalance("MERGE")}
                    disabled={!rebalanceTarget}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Fondi
                  </button>
                </div>
              </div>

              {/* Option 3: DISCARD */}
              <button
                onClick={() => applyRebalance("DISCARD")}
                className="w-full flex items-start gap-3 text-left p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-red-300 transition-all group"
              >
                <div className="p-2 rounded-lg bg-red-50 text-red-600 group-hover:bg-red-100 transition-colors">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-red-700">Elimina e Scarta</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cancella definitivamente la postazione senza redistribuire tempi o attività (perdita dei dati di questa stazione).
                  </p>
                </div>
              </button>
            </div>

            <div className="flex justify-end mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={() => setRebalanceSt(null)}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
