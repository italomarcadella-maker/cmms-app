"use client";

import React, { useState, useMemo } from "react";
import { C, uid, VA_TYPES, MOVE_TYPES, MK, TW_DEF, gZone, GZ, nioshRWL, nioshLI } from "@/lib/fpes-utils";

export default function MuriMuda({ project: p, upd }: { project: any; upd: (patch: any) => void; }) {
  const mm = p.murimuda || { postazioni: [] };
  const [selP, setSelP] = useState(0);
  const [tab, setTab] = useState("matrice");
  const [showAF, setShowAF] = useState(false);
  const [editAct, setEditAct] = useState<any>(null);
  
  const posts = mm.postazioni || [];
  const post = posts[selP] || posts[0] || null;
  
  const setMM = (patch: any) => upd({ murimuda: Object.assign({}, mm, patch) });
  const updPost = (patch: any) => setMM({ postazioni: posts.map((x: any, i: number) => i === selP ? Object.assign({}, x, patch) : x) });
  const updAct = (id: string, patch: any) => updPost({ attivita: (post.attivita || []).map((a: any) => a.id === id ? Object.assign({}, a, patch) : a) });
  
  const mkAct = (i: number) => ({ id: uid(), nome: "Attività " + (i + 1), desc: "", durataSec: 10, tipoVA: "VA", tipoMov: "OPERARE", timw: "O", altezzaCm: 95, pesoCaricoKg: 0, distOrizzCm: 30, distVertCm: 25, angolazione: 0, freqMin: 0.1, presa: 1, forza: 0, postura: 0, stereotipia: 0, note: "" });
  const addPost = () => { const n = { id: uid(), nome: "Postazione " + (posts.length + 1), operatore: "", cicloSec: 60, durataNettoMin: 420, pauseMin: 60, recuperiAdeg: true, attivita: [mkAct(0)] }; setMM({ postazioni: [...posts, n] }); setSelP(posts.length); };
  const addAct = () => { if (!post) return; const na = mkAct((post.attivita || []).length); updPost({ attivita: [...(post.attivita || []), na] }); setEditAct(na); setShowAF(true); };
  const delAct = (id: string) => updPost({ attivita: (post.attivita || []).filter((a: any) => a.id !== id) });
  const saveAct = (a: any) => { updAct(a.id, a); setShowAF(false); setEditAct(null); };

  const stats = useMemo(() => {
    if (!post) return null;
    const acts = post.attivita || [];
    const totalSec = acts.reduce((s: number, a: any) => s + (a.durataSec || 0), 0);
    const vaSec = acts.filter((a: any) => a.tipoVA === "VA").reduce((s: number, a: any) => s + a.durataSec, 0);
    const nvaSec = acts.filter((a: any) => a.tipoVA === "NVA").reduce((s: number, a: any) => s + a.durataSec, 0);
    const nnvaSec = acts.filter((a: any) => a.tipoVA === "NNVA").reduce((s: number, a: any) => s + a.durataSec, 0);
    const vaPct = totalSec > 0 ? Math.round(vaSec / totalSec * 100) : 0;
    const nvaPct = totalSec > 0 ? Math.round(nvaSec / totalSec * 100) : 0;
    const nnvaPct = totalSec > 0 ? Math.round(nnvaSec / totalSec * 100) : 0;
    
    const twMap: Record<string, number> = {}; 
    TW_DEF.forEach(t => { twMap[t.k] = 0; });
    acts.forEach((a: any) => { if (a.timw && twMap[a.timw] !== undefined) twMap[a.timw] += (a.durataSec || 0); });
    const twTotalSec = Object.values(twMap).reduce((s, v) => s + v, 0);
    
    const nioshActs = acts.filter((a: any) => a.pesoCaricoKg > 0).map((a: any) => {
      const rwl = nioshRWL(a.distOrizzCm || 30, a.altezzaCm || 95, a.distVertCm || 25, a.angolazione || 0, a.freqMin || 0.1, a.presa || 1);
      const li = nioshLI(a.pesoCaricoKg, rwl);
      return Object.assign({}, a, { rwl, li });
    });
    const maxLI = nioshActs.length > 0 ? Math.max(...nioshActs.map((x: any) => x.li)) : 0;
    const twPct = twTotalSec > 0 ? Math.round((1 - (twMap["M"] + twMap["W"] + twMap["D"] + twMap["T"]) / twTotalSec) * 100) : 80;
    const leanScore = Math.round(vaPct * 0.4 + twPct * 0.35 + Math.min((nioshActs.filter((x: any) => x.li <= 1).length / Math.max(nioshActs.length, 1)) * 100, 100) * 0.25);
    
    return { totalSec, vaSec, nvaSec, nnvaSec, vaPct, nvaPct, nnvaPct, twMap, twTotalSec, nioshActs, maxLI, twPct, leanScore };
  }, [post]);

  const TABS = [
    { id: "matrice", l: "📋 Matrice" },
    { id: "yamazumi", l: "📊 Yamazumi" },
    { id: "niosh", l: "⚖️ NIOSH" },
    { id: "ocra", l: "🔄 OCRA" },
    { id: "goldenzone", l: "🧍 Golden Zone" },
    { id: "timwoods", l: "🗑 TIMWOODS" }
  ];

  if (!post) return (
    <div className="text-center p-12 text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="text-5xl mb-4">🏭</div>
      <p className="mb-4">Inizia mappando la tua prima postazione MURI·MUDA</p>
      <button onClick={addPost} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-sm hover:bg-blue-700">+ Aggiungi Postazione</button>
    </div>
  );

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row gap-4 mb-4 md:items-center">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">MURI·MUDA MASTER</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {posts.map((pp: any, i: number) => (
            <button key={pp.id} onClick={() => setSelP(i)} className={`px-3 py-1.5 text-xs font-bold rounded-lg border whitespace-nowrap transition-colors ${selP === i ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {pp.nome}
            </button>
          ))}
          <button onClick={addPost} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 whitespace-nowrap">+ Postazione</button>
        </div>
        <button onClick={addAct} className="md:ml-auto px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm whitespace-nowrap">+ Aggiungi Attività</button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border-t-4 border-t-emerald-500 border rounded-xl p-4 shadow-sm flex flex-col items-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Valore Aggiunto (VA)</p>
            <p className="text-2xl font-bold text-emerald-600 font-mono">{stats.vaPct}%</p>
            <p className="text-xs text-slate-400">{stats.vaSec}s</p>
          </div>
          <div className="bg-white border-t-4 border-t-red-500 border rounded-xl p-4 shadow-sm flex flex-col items-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Spreco (NVA)</p>
            <p className="text-2xl font-bold text-red-600 font-mono">{stats.nvaPct}%</p>
            <p className="text-xs text-slate-400">{stats.nvaSec}s</p>
          </div>
          <div className="bg-white border-t-4 border-t-amber-500 border rounded-xl p-4 shadow-sm flex flex-col items-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Necessario (NNVA)</p>
            <p className="text-2xl font-bold text-amber-600 font-mono">{stats.nnvaPct}%</p>
            <p className="text-xs text-slate-400">{stats.nnvaSec}s</p>
          </div>
          <div className="bg-white border-t-4 border-t-blue-500 border rounded-xl p-4 shadow-sm flex flex-col items-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Lean Score Postazione</p>
            <p className="text-2xl font-bold text-blue-600 font-mono">{stats.leanScore}/100</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap bg-white p-1 rounded-xl shadow-sm w-fit border border-slate-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${tab === t.id ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* MATRIX TAB */}
      {tab === "matrice" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  {["#", "Attività", "Tipo Mov.", "Valore", "Durata(s)", "TIMW", "Alt.(cm)", "Carico(kg)", ""].map((h, i) => (
                    <th key={i} className="p-3 font-bold text-slate-600 text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(post.attivita || []).map((a: any, idx: number) => {
                  const vt = VA_TYPES[a.tipoVA] || VA_TYPES.VA;
                  const mt = MOVE_TYPES[a.tipoMov] || MOVE_TYPES.ALTRO;
                  const twc = TW_DEF.find(t => t.k === a.timw) || TW_DEF[0];
                  const total = stats ? stats.totalSec : 1;
                  const pct = total > 0 ? Math.round(a.durataSec / total * 100) : 0;
                  return (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 min-w-[140px]">
                        <input value={a.nome} onChange={e => updAct(a.id, { nome: e.target.value })} className="w-full bg-transparent font-semibold outline-none focus:border-b focus:border-blue-500" />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 bg-slate-100 rounded px-2 py-1 w-fit border border-slate-200">
                          <span className="text-sm">{mt.icon}</span>
                          <select value={a.tipoMov} onChange={e => updAct(a.id, { tipoMov: e.target.value, timw: MOVE_TYPES[e.target.value]?.timw || "O" })} className="bg-transparent text-[10px] font-bold text-slate-700 outline-none cursor-pointer">
                            {MK.map(k => <option key={k} value={k}>{MOVE_TYPES[k].label}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="p-3">
                        <select value={a.tipoVA} onChange={e => updAct(a.id, { tipoVA: e.target.value })} className="px-2 py-1 rounded text-[10px] font-bold outline-none cursor-pointer" style={{ backgroundColor: vt.bg, color: vt.col, border: `1px solid ${vt.col}44` }}>
                          {Object.keys(VA_TYPES).map(k => <option key={k} value={k}>{VA_TYPES[k].label}</option>)}
                        </select>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <input type="number" value={a.durataSec} min={1} max={600} onChange={e => updAct(a.id, { durataSec: Math.max(1, +e.target.value) })} className="w-12 border border-slate-200 rounded px-1.5 py-1 text-xs font-mono text-right outline-none focus:border-blue-500" />
                          <div className="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: vt.col }} /></div>
                          <span className="text-[9px] font-bold font-mono w-6 text-right" style={{ color: vt.col }}>{pct}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <select value={a.timw} onChange={e => updAct(a.id, { timw: e.target.value })} className="px-2 py-1 rounded text-[10px] font-bold outline-none cursor-pointer text-center w-10" style={{ backgroundColor: `${twc.col}18`, color: twc.col, border: `1px solid ${twc.col}44` }}>
                          {TW_DEF.map(t => <option key={t.k} value={t.k}>{t.k}</option>)}
                        </select>
                      </td>
                      <td className="p-3">
                        <input type="number" value={a.altezzaCm || 95} min={0} max={200} onChange={e => updAct(a.id, { altezzaCm: +e.target.value })} className="w-12 border border-slate-200 rounded px-1.5 py-1 text-xs font-mono text-right outline-none focus:border-blue-500" />
                      </td>
                      <td className="p-3">
                        <input type="number" value={a.pesoCaricoKg || 0} min={0} max={50} step={0.5} onChange={e => updAct(a.id, { pesoCaricoKg: +e.target.value })} className={`w-12 border rounded px-1.5 py-1 text-xs font-mono text-right outline-none focus:border-blue-500 ${a.pesoCaricoKg > 0 ? 'border-amber-400 text-amber-700 bg-amber-50' : 'border-slate-200 text-slate-700'}`} />
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button onClick={() => { setEditAct(Object.assign({}, a)); setShowAF(true); }} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">✏</button>
                          <button onClick={() => delAct(a.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">×</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(post.attivita || []).length > 0 && (
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={4} className="p-3 text-slate-800 font-bold text-right text-[10px] uppercase tracking-wider">Totale Ciclo</td>
                    <td className="p-3 font-mono font-bold text-blue-700 text-sm">{stats ? stats.totalSec : 0}s</td>
                    <td colSpan={4} />
                  </tr>
                )}
                {(post.attivita || []).length === 0 && (
                  <tr><td colSpan={9} className="p-12 text-center text-slate-400 italic">Nessuna attività registrata. Clicca "+ Aggiungi Attività" per iniziare.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* YAMAZUMI TAB */}
      {tab === "yamazumi" && stats && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden">
          <div className="flex gap-4 mb-6 flex-wrap">
            {Object.keys(VA_TYPES).map(k => (
              <div key={k} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: VA_TYPES[k].col }} />
                <span className="text-xs font-bold text-slate-600">{VA_TYPES[k].full}</span>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto pb-4">
            <svg width={Math.max(560, (post.attivita || []).length * 80 + 80)} height={300} className="block">
              {(post.attivita || []).map((a: any, i: number) => {
                const BH = 240, BW = 60, maxS = Math.max(...(post.attivita || []).map((x: any) => x.durataSec), 1);
                const x = 40 + i * (BW + 16), h = (a.durataSec / maxS) * BH;
                const vt = VA_TYPES[a.tipoVA] || VA_TYPES.VA;
                const col = vt.col;
                const mt = MOVE_TYPES[a.tipoMov] || MOVE_TYPES.ALTRO;
                const pct = stats.totalSec > 0 ? Math.round(a.durataSec / stats.totalSec * 100) : 0;
                return (
                  <g key={a.id} transform={`translate(${x},20)`}>
                    <rect x={0} y={BH - h} width={BW} height={h} fill={col} opacity={0.8} rx={4} />
                    <rect x={0} y={BH - h} width={BW} height={h} fill="none" stroke={col} strokeWidth={2} rx={4} />
                    <text x={BW / 2} y={BH - h - 10} textAnchor="middle" fontSize={16}>{mt.icon}</text>
                    {h > 24 && <text x={BW / 2} y={BH - h / 2 + 4} textAnchor="middle" fill="white" fontSize={11} fontWeight="bold">{pct}%</text>}
                    <text x={BW / 2} y={BH + 16} textAnchor="middle" fill={C.text} fontSize={10} fontWeight="bold">{a.durataSec}s</text>
                    <text x={BW / 2} y={BH + 28} textAnchor="middle" fill={C.mid} fontSize={9} transform={`rotate(-30 ${BW / 2} ${BH + 28})`}>{a.nome.slice(0, 14)}</text>
                    <rect x={BW / 2 - 12} y={BH - h + 4} width={24} height={12} fill="white" opacity={0.9} rx={2} />
                    <text x={BW / 2} y={BH - h + 13} textAnchor="middle" fill={col} fontSize={8} fontWeight="bold">{vt.label}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* NIOSH TAB */}
      {tab === "niosh" && stats && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">INDICE DI SOLLEVAMENTO (LIFTING INDEX)</h3>
            <p className="text-xs text-slate-500">L'indice valuta il rischio per la colonna vertebrale durante le operazioni di sollevamento manuale.</p>
          </div>
          {stats.nioshActs.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-emerald-700 font-bold text-sm">Nessuna attività con movimentazione manuale carichi (MMC).</p>
            </div>
          ) : stats.nioshActs.map((a: any) => {
            const liCol = a.li <= 1 ? C.green : a.li <= 1.5 ? C.orange : C.red;
            const liLbl = a.li <= 1 ? "ACCETTABILE" : a.li <= 1.5 ? "ATTENZIONE" : "RISCHIO ELEVATO";
            return (
              <div key={a.id} className="bg-white border rounded-xl p-5 shadow-sm" style={{ borderLeftWidth: '6px', borderLeftColor: liCol, borderColor: `${liCol}44` }}>
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 mb-3">{a.nome}</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 rounded text-[10px] font-bold text-white tracking-wider" style={{ backgroundColor: liCol }}>{liLbl}</span>
                      <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">RWL = {a.rwl} kg</span>
                      <span className="px-2 py-1 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">Peso = {a.pesoCaricoKg} kg</span>
                      <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-500">Alt = {a.altezzaCm} cm</span>
                      <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-500">Dist = {a.distOrizzCm} cm</span>
                    </div>
                  </div>
                  <div className="text-center bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[140px]">
                    <div className="text-4xl font-bold font-mono mb-1" style={{ color: liCol }}>{a.li}</div>
                    <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: liCol }}>LIFTING INDEX</div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((a.li / 3), 1) * 100}%`, backgroundColor: liCol }} />
                    </div>
                  </div>
                </div>
                {a.li > 1 && (
                  <div className="mt-4 p-3 rounded-lg text-xs" style={{ backgroundColor: `${liCol}12`, color: liCol }}>
                    <strong className="block mb-1">💡 Suggerimento:</strong>
                    {a.li > 1.5 ? "Intervenire obbligatoriamente. Ridurre il peso del carico, utilizzare ausili meccanici (es. paranchi), o avvicinare il carico al corpo riducendo la distanza orizzontale." : "Valutare la riduzione del peso o la riprogettazione dell'altezza di presa per rientrare nei limiti ottimali (LI ≤ 1)."}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* OCRA TAB */}
      {tab === "ocra" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-6">INDICE OCRA — MOVIMENTI RIPETITIVI DEGLI ARTI SUPERIORI</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-1"><label className="text-xs font-bold text-slate-600">Durata Netta Turno (min)</label><span className="text-sm font-mono font-bold text-blue-600">{post.durataNettoMin || 420}</span></div>
                <input type="range" min={60} max={600} step={10} value={post.durataNettoMin || 420} onChange={e => updPost({ durataNettoMin: +e.target.value })} className="w-full accent-blue-600" />
              </div>
              <div>
                <div className="flex justify-between mb-1"><label className="text-xs font-bold text-slate-600">Pause (min)</label><span className="text-sm font-mono font-bold text-emerald-600">{post.pauseMin || 60}</span></div>
                <input type="range" min={0} max={120} step={5} value={post.pauseMin || 60} onChange={e => updPost({ pauseMin: +e.target.value })} className="w-full accent-emerald-600" />
              </div>
              <div>
                <div className="flex justify-between mb-1"><label className="text-xs font-bold text-slate-600">Tempo di Ciclo (s)</label><span className="text-sm font-mono font-bold text-amber-600">{post.cicloSec || 60}</span></div>
                <input type="range" min={5} max={600} step={5} value={post.cicloSec || 60} onChange={e => updPost({ cicloSec: +e.target.value })} className="w-full accent-amber-600" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={post.recuperiAdeg !== false} onChange={e => updPost({ recuperiAdeg: e.target.checked })} className="accent-blue-600 w-4 h-4" />
                Presenza di periodi di recupero adeguati
              </label>
            </div>
            
            <div className="flex justify-center">
              {(() => {
                const acts = post.attivita || [];
                const nMov = acts.filter((a: any) => ["OPERARE", "PRENDERE", "POSARE"].includes(a.tipoMov)).length;
                const cs = post.cicloSec || 60;
                const azMin = nMov > 0 ? Math.round(nMov / (cs / 60)) : 0;
                const FF = post.recuperiAdeg !== false ? 1.0 : 0.7;
                const ocra = parseFloat((azMin * FF).toFixed(1));
                const oc = ocra <= 2.2 ? C.green : ocra <= 3.5 ? C.orange : C.red;
                const ol = ocra <= 2.2 ? "VERDE — ACCETTABILE" : ocra <= 3.5 ? "GIALLO — BORDERLINE" : "ROSSO — RISCHIO";
                return (
                  <div className="text-center bg-slate-50 p-8 rounded-2xl border border-slate-100 shadow-inner w-full max-w-sm">
                    <div className="text-7xl font-bold font-mono mb-2" style={{ color: oc }}>{ocra}</div>
                    <div className="text-xs font-bold tracking-widest uppercase mb-6" style={{ color: oc }}>{ol}</div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-4">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((ocra / 6), 1) * 100}%`, backgroundColor: oc }} />
                    </div>
                    <div className="text-xs text-slate-500 bg-white py-2 rounded-lg border border-slate-200 shadow-sm">
                      Stima Azioni/min: <strong className="font-mono text-slate-800 text-sm">{azMin}</strong>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TIMWOODS TAB */}
      {tab === "timwoods" && stats && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">HEATMAP TIMWOODS PER ATTIVITÀ</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-200">
                  <th className="p-3 text-slate-600 font-bold text-[10px] uppercase text-left min-w-[200px]">ATTIVITÀ</th>
                  <th className="p-3 text-slate-600 font-bold text-[10px] uppercase text-center">TIPO</th>
                  <th className="p-3 text-slate-600 font-bold text-[10px] uppercase text-center">SEC</th>
                  {TW_DEF.map(t => (
                    <th key={t.k} className="p-2 text-center" title={t.n}>
                      <div className="text-xl mb-1">{t.i}</div>
                      <div className="text-[9px] font-bold" style={{ color: t.col }}>{t.k}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(post.attivita || []).map((a: any, i: number) => {
                  const vt = VA_TYPES[a.tipoVA] || VA_TYPES.VA;
                  const mt = MOVE_TYPES[a.tipoMov] || MOVE_TYPES.ALTRO;
                  return (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-800 truncate max-w-[200px]"><span className="text-sm mr-2">{mt.icon}</span>{a.nome}</td>
                      <td className="p-3 text-center"><span className="px-2 py-1 rounded text-[9px] font-bold" style={{ backgroundColor: vt.bg, color: vt.col }}>{vt.label}</span></td>
                      <td className="p-3 text-center font-mono font-bold text-slate-600">{a.durataSec}s</td>
                      {TW_DEF.map(t => {
                        const isA = a.timw === t.k;
                        return (
                          <td key={t.k} className="p-2 text-center">
                            <button onClick={() => updAct(a.id, { timw: t.k })} className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${isA ? 'shadow-inner' : 'hover:bg-slate-100'}`} style={{ backgroundColor: isA ? `${t.col}22` : 'transparent', borderColor: isA ? t.col : C.border, color: isA ? t.col : C.border }}>
                              {isA && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.col }} />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={3} className="p-4 text-right font-bold text-slate-700 text-xs uppercase tracking-wider">Impatto % per Spreco</td>
                  {TW_DEF.map(t => {
                    const sec = stats.twMap[t.k] || 0;
                    const pct = stats.twTotalSec > 0 ? Math.round(sec / stats.twTotalSec * 100) : 0;
                    return (
                      <td key={t.k} className="p-3 text-center">
                        <div className="text-sm font-bold font-mono" style={{ color: t.col }}>{pct}%</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{sec}s</div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GOLDEN ZONE TAB */}
      {tab === "goldenzone" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">MAPPA ZONE ERGONOMICHE</h3>
              <div className="space-y-2">
                {GZ.map(z => (
                  <div key={z.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: `${z.col}08`, borderLeft: `4px solid ${z.col}` }}>
                    <div className="flex-1">
                      <div className="text-xs font-bold" style={{ color: z.col }}>{z.label}</div>
                      <div className="text-[10px] text-slate-500">{z.y2}–{z.y1} cm · {z.desc}</div>
                    </div>
                    {z.ok && <span className="text-emerald-500 font-bold text-lg">✓</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">ATTIVITÀ VS ZONE</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {(post.attivita || []).map((a: any) => {
                  const z = gZone(a.altezzaCm || 95);
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-2 border-b border-slate-100 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: z.col }} />
                      <span className="flex-1 font-semibold text-slate-700 truncate">{a.nome}</span>
                      <span className="font-mono font-bold w-12 text-right" style={{ color: z.col }}>{a.altezzaCm || 95}cm</span>
                      <input type="range" min={0} max={180} value={a.altezzaCm || 95} onChange={e => updAct(a.id, { altezzaCm: +e.target.value })} className="w-24 ml-2" style={{ accentColor: z.col }} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVITY EDIT MODAL */}
      {showAF && editAct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800">Modifica Dettagli Attività</h3>
              <button onClick={() => { setShowAF(false); setEditAct(null); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg">✕</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome Attività</label>
                  <input value={editAct.nome} onChange={e => setEditAct({ ...editAct, nome: e.target.value })} className="w-full border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-semibold" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo Movimento</label>
                  <select value={editAct.tipoMov} onChange={e => setEditAct({ ...editAct, tipoMov: e.target.value, timw: MOVE_TYPES[e.target.value]?.timw || "O" })} className="w-full border-slate-200 rounded-lg focus:ring-blue-500 font-semibold text-slate-700 bg-white">
                    {MK.map(k => <option key={k} value={k}>{MOVE_TYPES[k].icon} {MOVE_TYPES[k].label}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Classificazione Valore</label>
                  <select value={editAct.tipoVA} onChange={e => setEditAct({ ...editAct, tipoVA: e.target.value })} className="w-full border-slate-200 rounded-lg focus:ring-blue-500 font-bold bg-white" style={{ color: VA_TYPES[editAct.tipoVA]?.col }}>
                    {Object.keys(VA_TYPES).map(k => <option key={k} value={k}>{VA_TYPES[k].full}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Durata (secondi)</label>
                  <input type="number" min={1} value={editAct.durataSec} onChange={e => setEditAct({ ...editAct, durataSec: +e.target.value })} className="w-full border-slate-200 rounded-lg focus:ring-blue-500 font-mono font-bold text-blue-700" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">TIMWOODS</label>
                  <select value={editAct.timw} onChange={e => setEditAct({ ...editAct, timw: e.target.value })} className="w-full border-slate-200 rounded-lg focus:ring-blue-500 font-semibold text-slate-700 bg-white">
                    {TW_DEF.map(t => <option key={t.k} value={t.k}>{t.i} {t.k} — {t.n}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Dati Ergonomici</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <div className="flex justify-between mb-2"><label className="text-xs font-bold text-slate-600">Altezza Operazione (cm)</label><span className="text-sm font-mono font-bold" style={{ color: gZone(editAct.altezzaCm).col }}>{editAct.altezzaCm}</span></div>
                    <input type="range" min={0} max={180} value={editAct.altezzaCm} onChange={e => setEditAct({ ...editAct, altezzaCm: +e.target.value })} className="w-full mb-2" style={{ accentColor: gZone(editAct.altezzaCm).col }} />
                    <div className="text-[10px] px-2 py-1 rounded font-bold" style={{ backgroundColor: `${gZone(editAct.altezzaCm).col}18`, color: gZone(editAct.altezzaCm).col }}>Zona: {gZone(editAct.altezzaCm).label}</div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2"><label className="text-xs font-bold text-slate-600">Peso Carico (kg)</label><span className="text-sm font-mono font-bold text-amber-600">{editAct.pesoCaricoKg}</span></div>
                    <input type="range" min={0} max={50} step={0.5} value={editAct.pesoCaricoKg} onChange={e => setEditAct({ ...editAct, pesoCaricoKg: +e.target.value })} className="w-full mb-2 accent-amber-500" />
                    {editAct.pesoCaricoKg > 0 && (
                      <div className="text-[10px] px-2 py-1 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                        LI = {nioshLI(editAct.pesoCaricoKg, nioshRWL(editAct.distOrizzCm || 30, editAct.altezzaCm || 95, 25, 0, 0.1, 1))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Note / Osservazioni</label>
                <textarea value={editAct.note || ""} onChange={e => setEditAct({ ...editAct, note: e.target.value })} rows={3} className="w-full border-slate-200 rounded-lg focus:ring-blue-500 text-sm" placeholder="Aggiungi eventuali note..." />
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => { setShowAF(false); setEditAct(null); }} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200 rounded-lg">Annulla</button>
              <button onClick={() => saveAct(editAct)} className="px-6 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">Salva Attività</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
