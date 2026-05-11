"use client";

import React, { useState, useRef } from "react";
import { C, uid, today, PARAM_TYPES, PK, SAFETY_TYPES, SK } from "@/lib/fpes-utils";

export default function SopPro({ project: p, upd }: { project: any; upd: (patch: any) => void; }) {
  const mkSStep = (i: number) => ({
    id: uid(),
    titolo: "Step " + (i + 1),
    descrizione: "",
    parametri: [],
    safety: [],
    checklist: [],
    immagineB64: null,
    immagineCaption: "",
    note: "",
    durataMinuti: null,
    completato: false
  });

  const sop = p.sopPro || {
    id: uid(), titolo: "Work Instruction", codice: "SOP-001", revisione: "A", dataRevisione: today(),
    reparto: "", linea: "", macchina: "", redattore: "", approvatore: "", scopo: "", campo: "", dpi: "", steps: [], versioni: [], firme: {}
  };
  
  const updSOP = (patch: any) => upd({ sopPro: Object.assign({}, sop, patch) });
  const updStep = (id: string, patch: any) => updSOP({ steps: sop.steps.map((s: any) => s.id === id ? Object.assign({}, s, patch) : s) });
  const addStep = () => { const ns = mkSStep(sop.steps.length); updSOP({ steps: [...sop.steps, ns] }); setSelStep(sop.steps.length); };
  const delStep = (i: number) => { updSOP({ steps: sop.steps.filter((_: any, idx: number) => idx !== i) }); if (selStep >= i && selStep > 0) setSelStep(selStep - 1); };
  
  const [selStep, setSelStep] = useState(0);
  const [secTab, setSecTab] = useState("desc");
  const [isPrint, setIsPrint] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  
  const step = sop.steps[selStep] || null;
  const addParam = () => { if (!step) return; updStep(step.id, { parametri: [...(step.parametri || []), { id: uid(), tipo: "TEMP", nome: "Parametro", valore: "", min: "", max: "", um: "°C", note: "" }] }); };
  const addSafety = (tipo: string) => { if (!step) return; updStep(step.id, { safety: [...(step.safety || []), { id: uid(), tipo, testo: "Avviso" }] }); };
  const addCheck = () => { if (!step) return; updStep(step.id, { checklist: [...(step.checklist || []), { id: uid(), testo: "Verificare", obbligatorio: true }] }); };
  const moveStep = (i: number, dir: number) => { const arr = [...sop.steps]; const to = i + dir; if (to < 0 || to >= arr.length) return; const tmp = arr[i]; arr[i] = arr[to]; arr[to] = tmp; updSOP({ steps: arr }); setSelStep(to); };

  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=" + encodeURIComponent("FITT-" + sop.codice + "-Rev" + sop.revisione);
  const secTabs = [
    { id: "desc", l: "📝 Descrizione" },
    { id: "params", l: "⚙️ Parametri (" + (step ? (step.parametri || []).length : 0) + ")" },
    { id: "safety", l: "⚠️ Sicurezza (" + (step ? (step.safety || []).length : 0) + ")" },
    { id: "check", l: "☑️ Checklist (" + (step ? (step.checklist || []).length : 0) + ")" },
    { id: "img", l: "📷 Immagine" }
  ];

  if (isPrint) return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <button className="px-3 py-1 bg-slate-100 rounded text-slate-700 font-bold text-sm" onClick={() => setIsPrint(false)}>← Editor</button>
        <button className="px-3 py-1 bg-emerald-600 rounded text-white font-bold text-sm" onClick={() => window.print()}>🖨 Stampa PDF</button>
      </div>
      <div className="bg-white max-w-4xl mx-auto border border-slate-200 rounded p-8">
        <div className="border-b-4 border-blue-700 pb-4 flex justify-between items-start mb-6">
          <div>
            <div className="text-[10px] text-blue-700 tracking-widest font-bold mb-1">FITT S.p.A. · ISTRUZIONE OPERATIVA</div>
            <div className="text-2xl font-bold">{sop.titolo}</div>
            <div className="text-xs text-slate-500 mt-1">{sop.reparto && "Reparto: " + sop.reparto} {sop.macchina && "· Macchina: " + sop.macchina}</div>
          </div>
          <img src={qrUrl} alt="QR" className="w-16 h-16 border border-slate-200" />
        </div>
        <div className="grid grid-cols-5 border border-slate-200 mb-4">
          {[["Codice", sop.codice], ["Revisione", "Rev." + sop.revisione], ["Data", sop.dataRevisione], ["Redattore", sop.redattore || "—"], ["Approvatore", sop.approvatore || "—"]].map((item, i) => (
            <div key={i} className={`p-2 border-r border-slate-200 last:border-0 ${i === 0 ? 'bg-blue-50' : 'bg-white'}`}>
              <div className="text-[9px] text-slate-400 font-bold">{item[0].toUpperCase()}</div>
              <div className="text-xs font-bold font-mono">{item[1]}</div>
            </div>
          ))}
        </div>
        {sop.dpi && <div className="mb-4 bg-emerald-50 rounded p-2 text-xs text-emerald-800 font-semibold border border-emerald-100">🦺 DPI richiesti: {sop.dpi}</div>}
        
        <div className="space-y-6">
          {sop.steps.map((st: any, i: number) => (
            <div key={st.id} className="break-inside-avoid border border-slate-100 p-4 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 bg-blue-50 p-2 rounded-lg border-l-4 border-blue-600 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">{i + 1}</div>
                <div className="font-bold text-sm flex-1">{st.titolo}</div>
                {st.durataMinuti && <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border">⏱ {st.durataMinuti} min</span>}
              </div>
              
              {(st.safety || []).map((s: any) => {
                const sat = SAFETY_TYPES[s.tipo] || SAFETY_TYPES.WARNING;
                return (
                  <div key={s.id} className="flex gap-2 items-center rounded px-3 py-2 mb-2 text-xs" style={{ backgroundColor: sat.bg, borderLeft: `4px solid ${sat.col}`, border: `1px solid ${sat.col}44` }}>
                    <span className="text-base">{sat.icon}</span>
                    <strong style={{ color: sat.col }}>{sat.label}:</strong>
                    <span>{s.testo}</span>
                  </div>
                );
              })}
              
              {st.descrizione && <div className="text-xs text-slate-600 leading-relaxed mb-3 whitespace-pre-wrap">{st.descrizione}</div>}
              
              {(st.parametri || []).length > 0 && (
                <table className="w-full border-collapse text-xs mb-3">
                  <thead>
                    <tr className="bg-slate-50">
                      {["Parametro", "Tipo", "Valore", "Min", "Max", "U.M."].map(h => <th key={h} className="p-1.5 text-left border border-slate-200 text-blue-800 text-[10px]">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(st.parametri || []).map((pm: any) => {
                      const pt = PARAM_TYPES[pm.tipo] || PARAM_TYPES.CUSTOM;
                      return (
                        <tr key={pm.id}>
                          <td className="p-1.5 font-semibold border border-slate-200">{pm.nome}</td>
                          <td className="p-1.5 border border-slate-200 text-slate-500">{pt.icon} {pt.label}</td>
                          <td className="p-1.5 font-bold font-mono border border-slate-200" style={{ color: pt.color }}>{pm.valore} {pm.um || pt.unit}</td>
                          <td className="p-1.5 text-slate-400 font-mono border border-slate-200">{pm.min || "—"}</td>
                          <td className="p-1.5 text-slate-400 font-mono border border-slate-200">{pm.max || "—"}</td>
                          <td className="p-1.5 border border-slate-200 text-slate-500">{pm.um || pt.unit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              
              {st.immagineB64 && (
                <div className="text-center mb-3">
                  <img src={"data:image/jpeg;base64," + st.immagineB64} alt="" className="max-w-[85%] max-h-48 object-contain rounded border border-slate-200 mx-auto" />
                  {st.immagineCaption && <p className="text-[10px] text-slate-400 mt-1">{st.immagineCaption}</p>}
                </div>
              )}
              
              {(st.checklist || []).length > 0 && (
                <div className="space-y-1 mb-2">
                  {(st.checklist || []).map((c: any) => (
                    <div key={c.id} className="flex gap-2 items-center p-1 border-b border-slate-50 text-xs">
                      <div className="w-3 h-3 border-2 rounded-sm" style={{ borderColor: c.obbligatorio ? C.green : C.dim }} />
                      <span>{c.testo}</span>
                      {c.obbligatorio && <span className="text-[9px] text-emerald-600 font-bold">OBB.</span>}
                    </div>
                  ))}
                </div>
              )}
              
              {st.note && <div className="bg-amber-50 border border-amber-100 rounded px-2 py-1 text-xs text-amber-700">📝 {st.note}</div>}
            </div>
          ))}
        </div>
        
        <div className="mt-8 border-t-2 border-slate-200 pt-6 grid grid-cols-3 gap-8">
          {["Redatto da", "Verificato da", "Approvato da"].map((l, i) => (
            <div key={i}>
              <div className="text-[10px] text-slate-400 mb-4 font-bold">{l.toUpperCase()}</div>
              <div className="border-b border-slate-800 h-6 mb-1" />
              <div className="text-[10px] text-slate-400">Data: _______________</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">SOP BUILDER PRO</h2>
        <div className="text-xs text-slate-500 font-mono">{sop.codice} · Rev.{sop.revisione}</div>
        <div className="ml-auto flex gap-2">
          <button className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold" onClick={() => setIsPrint(true)}>🖨 Anteprima</button>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-4">
          <div className="bg-white border rounded-xl p-3 shadow-sm">
            <div className="flex gap-2 mb-3">
              <button className="flex-1 bg-emerald-50 text-emerald-700 rounded py-1 text-xs font-bold border border-emerald-200" onClick={addStep}>+ Step</button>
              <input value={sop.revisione} onChange={e => updSOP({ revisione: e.target.value })} className="w-16 border rounded px-2 py-1 text-xs font-mono" placeholder="Rev." />
            </div>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
              {sop.steps.map((st: any, i: number) => (
                <div key={st.id} onClick={() => setSelStep(i)} className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${selStep === i ? 'bg-blue-50 border-blue-200 shadow-sm' : 'border-transparent hover:bg-slate-50'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${selStep === i ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{st.completato ? "✓" : i + 1}</div>
                  <span className={`flex-1 text-xs truncate ${selStep === i ? 'font-bold text-blue-800' : 'text-slate-700'}`}>{st.titolo || "Step " + (i + 1)}</span>
                  <div className="flex opacity-0 hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); moveStep(i, -1); }} className="text-slate-400 hover:text-slate-800 px-1">↑</button>
                    <button onClick={e => { e.stopPropagation(); moveStep(i, 1); }} className="text-slate-400 hover:text-slate-800 px-1">↓</button>
                    <button onClick={e => { e.stopPropagation(); if (confirm("Eliminare?")) delStep(i); }} className="text-red-400 hover:text-red-600 px-1">×</button>
                  </div>
                </div>
              ))}
              {sop.steps.length === 0 && <div className="text-center p-4 text-slate-400 text-xs border border-dashed rounded">Nessuno step</div>}
            </div>
          </div>
          
          <div className="bg-white border rounded-xl p-3 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2">METADATI</h3>
            <div className="space-y-2">
              <div><label className="text-[10px] text-slate-500">Titolo</label><input value={sop.titolo} onChange={e => updSOP({ titolo: e.target.value })} className="w-full border rounded px-2 py-1 text-xs" /></div>
              <div><label className="text-[10px] text-slate-500">Codice</label><input value={sop.codice} onChange={e => updSOP({ codice: e.target.value })} className="w-full border rounded px-2 py-1 text-xs font-mono" /></div>
              <div><label className="text-[10px] text-slate-500">Redattore</label><input value={sop.redattore || ""} onChange={e => updSOP({ redattore: e.target.value })} className="w-full border rounded px-2 py-1 text-xs" /></div>
              <div><label className="text-[10px] text-slate-500">DPI Richiesti</label><input value={sop.dpi || ""} onChange={e => updSOP({ dpi: e.target.value })} placeholder="guanti, occhiali…" className="w-full border rounded px-2 py-1 text-xs" /></div>
            </div>
          </div>
        </div>
        
        <div className="flex-1">
          {!step ? (
            <div className="bg-white border rounded-xl p-12 text-center shadow-sm">
              <div className="text-4xl mb-4">📄</div>
              <p className="text-slate-500 font-medium">Aggiungi uno step per iniziare la stesura</p>
            </div>
          ) : (
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-4 border-b flex items-center gap-4 bg-slate-50">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">{selStep + 1}</div>
                <input value={step.titolo} onChange={e => updStep(step.id, { titolo: e.target.value })} className="flex-1 bg-transparent text-lg font-bold text-slate-800 outline-none border-b-2 border-transparent focus:border-blue-500 transition-colors px-1" />
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                  <input type="checkbox" checked={step.completato || false} onChange={e => updStep(step.id, { completato: e.target.checked })} className="accent-emerald-500" />
                  Completato
                </label>
              </div>
              
              <div className="flex px-4 pt-3 gap-2 border-b overflow-x-auto">
                {secTabs.map(s => (
                  <button key={s.id} onClick={() => setSecTab(s.id)} className={`px-4 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${secTab === s.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    {s.l}
                  </button>
                ))}
              </div>
              
              <div className="p-5 flex-1 bg-white">
                {secTab === "desc" && (
                  <div className="space-y-4 animate-in fade-in">
                    <textarea value={step.descrizione} onChange={e => updStep(step.id, { descrizione: e.target.value })} rows={8} placeholder="Descrivi in dettaglio l'operazione..." className="w-full border border-slate-200 rounded-lg p-3 text-sm leading-relaxed resize-y focus:ring-1 focus:ring-blue-500 outline-none" />
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs font-bold text-slate-500 mb-1 block">Durata stimata (min)</label><input type="number" min={1} value={step.durataMinuti || ""} onChange={e => updStep(step.id, { durataMinuti: +e.target.value || null })} className="w-full border rounded-lg p-2 text-sm" placeholder="es. 5" /></div>
                      <div><label className="text-xs font-bold text-slate-500 mb-1 block">Note per l'operatore</label><input type="text" value={step.note || ""} onChange={e => updStep(step.id, { note: e.target.value })} className="w-full border rounded-lg p-2 text-sm" placeholder="Attenzione a..." /></div>
                    </div>
                  </div>
                )}
                
                {secTab === "params" && (
                  <div className="space-y-3 animate-in fade-in">
                    {(step.parametri || []).map((pm: any) => {
                      const pt = PARAM_TYPES[pm.tipo] || PARAM_TYPES.CUSTOM;
                      return (
                        <div key={pm.id} className="flex gap-2 items-center bg-slate-50 border rounded-lg p-2 shadow-sm">
                          <span className="text-xl w-8 text-center">{pt.icon}</span>
                          <select value={pm.tipo} onChange={e => updStep(step.id, { parametri: (step.parametri || []).map((x: any) => x.id === pm.id ? { ...x, tipo: e.target.value, um: PARAM_TYPES[e.target.value]?.unit || "" } : x) })} className="border rounded px-2 py-1 text-xs font-bold bg-white cursor-pointer" style={{ color: pt.color }}>
                            {PK.map(k => <option key={k} value={k}>{PARAM_TYPES[k].label}</option>)}
                          </select>
                          <input value={pm.nome} onChange={e => updStep(step.id, { parametri: (step.parametri || []).map((x: any) => x.id === pm.id ? { ...x, nome: e.target.value } : x) })} placeholder="Nome Parametro" className="flex-1 border rounded px-2 py-1 text-xs font-semibold" />
                          <input value={pm.valore} onChange={e => updStep(step.id, { parametri: (step.parametri || []).map((x: any) => x.id === pm.id ? { ...x, valore: e.target.value } : x) })} placeholder="Valore" className="w-20 border rounded px-2 py-1 text-xs font-bold font-mono text-center" style={{ color: pt.color }} />
                          <input value={pm.um || pt.unit} onChange={e => updStep(step.id, { parametri: (step.parametri || []).map((x: any) => x.id === pm.id ? { ...x, um: e.target.value } : x) })} className="w-16 border rounded px-2 py-1 text-xs text-center text-slate-500" placeholder="U.M." />
                          <button onClick={() => updStep(step.id, { parametri: (step.parametri || []).filter((x: any) => x.id !== pm.id) })} className="text-red-500 hover:bg-red-50 p-1 rounded">×</button>
                        </div>
                      );
                    })}
                    <button onClick={addParam} className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100">+ Aggiungi Parametro</button>
                  </div>
                )}
                
                {secTab === "safety" && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {SK.map(k => (
                        <button key={k} onClick={() => addSafety(k)} className="text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1" style={{ backgroundColor: SAFETY_TYPES[k].bg, color: SAFETY_TYPES[k].col, borderColor: `${SAFETY_TYPES[k].col}44` }}>
                          {SAFETY_TYPES[k].icon} + {SAFETY_TYPES[k].label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {(step.safety || []).map((s: any) => {
                        const sat = SAFETY_TYPES[s.tipo] || SAFETY_TYPES.WARNING;
                        return (
                          <div key={s.id} className="flex gap-3 items-center rounded-lg p-2 shadow-sm border" style={{ backgroundColor: sat.bg, borderLeftWidth: '4px', borderLeftColor: sat.col, borderColor: `${sat.col}33` }}>
                            <span className="text-2xl">{sat.icon}</span>
                            <select value={s.tipo} onChange={e => updStep(step.id, { safety: (step.safety || []).map((x: any) => x.id === s.id ? { ...x, tipo: e.target.value } : x) })} className="bg-white/50 border rounded px-2 py-1 text-xs font-bold outline-none" style={{ color: sat.col, borderColor: `${sat.col}55` }}>
                              {SK.map(k => <option key={k} value={k}>{SAFETY_TYPES[k].icon} {SAFETY_TYPES[k].label}</option>)}
                            </select>
                            <input value={s.testo} onChange={e => updStep(step.id, { safety: (step.safety || []).map((x: any) => x.id === s.id ? { ...x, testo: e.target.value } : x) })} className="flex-1 bg-transparent border-none text-sm font-semibold outline-none" style={{ color: sat.col }} placeholder="Testo avviso..." />
                            <button onClick={() => updStep(step.id, { safety: (step.safety || []).filter((x: any) => x.id !== s.id) })} className="text-slate-400 hover:text-slate-600 px-2">×</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {secTab === "check" && (
                  <div className="space-y-3 animate-in fade-in">
                    {(step.checklist || []).map((c: any) => (
                      <div key={c.id} className="flex gap-3 items-center border border-slate-200 rounded-lg p-2 shadow-sm">
                        <div className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0" style={{ borderColor: c.obbligatorio ? C.green : C.dim }}>{c.obbligatorio && <span className="text-emerald-600 text-xs font-bold">!</span>}</div>
                        <input value={c.testo} onChange={e => updStep(step.id, { checklist: (step.checklist || []).map((x: any) => x.id === c.id ? { ...x, testo: e.target.value } : x) })} className="flex-1 border-none text-sm outline-none" placeholder="Elemento da verificare..." />
                        <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer bg-slate-50 px-2 py-1 rounded">
                          <input type="checkbox" checked={c.obbligatorio} onChange={e => updStep(step.id, { checklist: (step.checklist || []).map((x: any) => x.id === c.id ? { ...x, obbligatorio: e.target.checked } : x) })} className="accent-emerald-500" />
                          Obbligatorio
                        </label>
                        <button onClick={() => updStep(step.id, { checklist: (step.checklist || []).filter((x: any) => x.id !== c.id) })} className="text-red-400 hover:bg-red-50 p-1 rounded">×</button>
                      </div>
                    ))}
                    <button onClick={addCheck} className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100">+ Aggiungi Verifica</button>
                  </div>
                )}
                
                {secTab === "img" && (
                  <div className="animate-in fade-in">
                    <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => {
                      const f = e.target.files && e.target.files[0]; if (!f) return;
                      const r = new FileReader();
                      r.onload = ev => { if(ev.target) updStep(step.id, { immagineB64: (ev.target.result as string).split(",")[1], immagineCaption: f.name }); };
                      r.readAsDataURL(f); e.target.value = "";
                    }} />
                    {step.immagineB64 ? (
                      <div className="flex flex-col items-center gap-4">
                        <img src={"data:image/jpeg;base64," + step.immagineB64} alt="" className="max-w-full max-h-[300px] object-contain rounded-xl border shadow-sm" />
                        <div className="w-full max-w-md flex gap-2 items-center">
                          <div className="flex-1">
                            <label className="text-[10px] text-slate-500 font-bold uppercase">Didascalia</label>
                            <input value={step.immagineCaption || ""} onChange={e => updStep(step.id, { immagineCaption: e.target.value })} className="w-full border rounded p-2 text-sm" placeholder="Descrizione immagine..." />
                          </div>
                          <button onClick={() => updStep(step.id, { immagineB64: null, immagineCaption: "" })} className="mt-4 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded text-sm font-bold">Rimuovi</button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => imgRef.current?.click()}>
                        <div className="text-4xl mb-4">📷</div>
                        <div className="text-sm font-bold text-slate-700">Carica una foto dell'operazione o del pannello HMI</div>
                        <div className="text-xs text-slate-400 mt-2">Formati supportati: JPG, PNG, WEBP</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
