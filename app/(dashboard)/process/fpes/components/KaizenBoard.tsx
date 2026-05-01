"use client";

import React, { useState } from "react";
import { uid } from "@/lib/fpes-utils";
import { Lightbulb, Plus, Trash2, Pencil } from "lucide-react";

export default function KaizenBoard({ project, upd, cr }: { project: any; upd: (patch: any) => void; cr: any }) {
  const [edit, setEdit] = useState<string | null>(null);

  const PRIO = {
    ALTA: { label: "Alta", col: "text-red-700 bg-red-100 border-red-200" },
    MEDIA: { label: "Media", col: "text-amber-700 bg-amber-100 border-amber-200" },
    BASSA: { label: "Bassa", col: "text-emerald-700 bg-emerald-100 border-emerald-200" }
  };

  const STATUS = {
    open: { label: "Aperto", col: "text-amber-700 bg-amber-100 border-amber-200" },
    inprogress: { label: "In Corso", col: "text-blue-700 bg-blue-100 border-blue-200" },
    done: { label: "Completato", col: "text-emerald-700 bg-emerald-100 border-emerald-200" },
    blocked: { label: "Bloccato", col: "text-red-700 bg-red-100 border-red-200" }
  };

  const kaizen = project.kaizen || [];

  const addK = () => {
    const nk = { id: uid(), titolo: "Nuovo Ticket Kaizen", desc: "", cat: "LAYOUT", prio: "MEDIA", status: "open", resp: "", deadline: "" };
    upd({ kaizen: [nk, ...kaizen] });
    setEdit(nk.id);
  };

  const updK = (id: string, k: string, v: any) => {
    upd({ kaizen: kaizen.map((x: any) => x.id === id ? { ...x, [k]: v } : x) });
  };

  const delK = (id: string) => {
    if(confirm("Eliminare definitivamente questo ticket Kaizen?")) {
      upd({ kaizen: kaizen.filter((x: any) => x.id !== id) });
    }
  };

  const autoS = [];
  if (cr.lineEff < 80) autoS.push({ titolo: "Ribilanciare postazioni", desc: `Efficienza ${cr.lineEff}% < 80%`, prio: "ALTA", cat: "BILANCIAMENTO" });
  if (+cr.copMin < 20 && cr.copMin !== "∞") autoS.push({ titolo: "Aumentare buffer rack", desc: `Copertura ${cr.copMin} min < 20 min`, prio: "ALTA", cat: "LOGISTICA" });
  if (cr.vaAvg < 65) autoS.push({ titolo: "Ridurre NVA", desc: `VA medio ${cr.vaAvg}% < 65%`, prio: "MEDIA", cat: "PROCESSO" });
  if (cr.twPct < 60) autoS.push({ titolo: "Workshop TIMWOODS", desc: `Score ${cr.twPct}% < 60%`, prio: "MEDIA", cat: "MIGLIORAMENTO" });

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" /> Kaizen Board & Continuous Improvement
        </h2>
        <button onClick={addK} className="ml-auto flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700 transition-colors">
          <Plus className="h-3 w-3" /> Nuovo Ticket
        </button>
      </div>

      {autoS.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 shadow-sm">
          <h3 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-3">💡 Suggerimenti Generati dall'AI</h3>
          <div className="flex flex-col gap-2">
            {autoS.map((s, i) => (
              <div key={i} className="flex items-center gap-4 bg-white border border-amber-100 rounded-lg p-3">
                <div className="flex-1">
                  <div className="font-bold text-slate-800 text-sm">{s.titolo}</div>
                  <div className="text-xs text-slate-500">{s.desc}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${PRIO[s.prio as keyof typeof PRIO]?.col}`}>{s.prio}</span>
                <button 
                  onClick={() => upd({ kaizen: [{ id: uid(), ...s, status: "open", resp: "", deadline: "" }, ...kaizen] })}
                  className="bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  + Accetta
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {kaizen.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white text-slate-400">
            <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-sm">Nessun ticket Kaizen presente. Crea un nuovo ticket o accetta un suggerimento.</p>
          </div>
        )}

        {kaizen.map((k: any) => (
          <div key={k.id} className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${PRIO[k.prio as keyof typeof PRIO]?.col || PRIO.MEDIA.col}`}>{k.prio}</span>
                <span className="text-[10px] px-2 py-0.5 rounded border font-bold text-blue-700 bg-blue-50 border-blue-200">{k.cat}</span>
              </div>
              <div className="flex items-center gap-1">
                <select 
                  value={k.status} onChange={e => updK(k.id, "status", e.target.value)} 
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border cursor-pointer outline-none ${STATUS[k.status as keyof typeof STATUS]?.col || STATUS.open.col}`}
                >
                  {Object.keys(STATUS).map(s => <option key={s} value={s}>{(STATUS as any)[s].label}</option>)}
                </select>
                <button onClick={() => setEdit(edit === k.id ? null : k.id)} className="p-1 text-slate-400 hover:text-blue-600 rounded"><Pencil className="h-3 w-3" /></button>
                <button onClick={() => delK(k.id)} className="p-1 text-slate-400 hover:text-red-600 rounded"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>

            <div className="p-4 flex-1">
              {edit === k.id ? (
                <div className="space-y-3">
                  <input value={k.titolo} onChange={e => updK(k.id, "titolo", e.target.value)} className="w-full font-bold text-sm border-b pb-1 outline-none" placeholder="Titolo Ticket..." />
                  <textarea value={k.desc} onChange={e => updK(k.id, "desc", e.target.value)} className="w-full text-xs text-slate-600 border rounded p-2 h-20 outline-none resize-none" placeholder="Descrizione del problema e della soluzione proposta..." />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Priorità</label>
                      <select value={k.prio} onChange={e => updK(k.id, "prio", e.target.value)} className="w-full border rounded p-1 text-xs outline-none">
                        <option value="ALTA">ALTA</option>
                        <option value="MEDIA">MEDIA</option>
                        <option value="BASSA">BASSA</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Categoria</label>
                      <input value={k.cat} onChange={e => updK(k.id, "cat", e.target.value)} className="w-full border rounded p-1 text-xs outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Assegnato a</label>
                      <input value={k.resp} onChange={e => updK(k.id, "resp", e.target.value)} className="w-full border rounded p-1 text-xs outline-none" placeholder="Nome..." />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Scadenza</label>
                      <input type="date" value={k.deadline} onChange={e => updK(k.id, "deadline", e.target.value)} className="w-full border rounded p-1 text-xs outline-none" />
                    </div>
                  </div>
                  <button onClick={() => setEdit(null)} className="w-full mt-2 bg-slate-800 text-white py-1.5 rounded text-xs font-bold hover:bg-slate-700">Chiudi Modifica</button>
                </div>
              ) : (
                <>
                  <h4 className="font-bold text-slate-800 text-sm mb-2 leading-tight">{k.titolo}</h4>
                  <p className="text-xs text-slate-600 mb-4 whitespace-pre-wrap">{k.desc || "Nessuna descrizione inserita."}</p>
                  
                  <div className="mt-auto flex items-center justify-between text-xs text-slate-500 pt-3 border-t">
                    <span className="flex items-center gap-1 font-medium">👤 {k.resp || "Non assegnato"}</span>
                    {k.deadline && <span className="flex items-center gap-1 font-mono">📅 {k.deadline}</span>}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
