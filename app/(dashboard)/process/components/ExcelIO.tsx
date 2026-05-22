"use client";

import React, { useState, useRef } from "react";
import { C, uid, today, addDays, mkSt, mkTask, SCOLS, TW_DEF, TASK_TYPES } from "@/lib/fpes-utils";

export default function ExcelIO({ project: p, upd }: { project: any; upd: (patch: any) => void; }) {
  const [tab, setTab] = useState("export");
  const [preview, setPreview] = useState<any>(null);
  const [log, setLog] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportFull = () => {
    if (!p) return;
    try {
      // @ts-expect-error - we dynamically import xlsx
      import('xlsx').then(XLSX => {
        const wb = XLSX.utils.book_new();
        const stH = ["Nome", "Operazione", "Ciclo(s)", "VA(s)", "NVA(s)", "Attesa(s)", "Operatori", "% VA", "Alt.Prelievo(cm)", "Peso(kg)"];
        const stR = (p.stazioni || []).map((s: any) => [s.nome, s.operazione, s.cicloS, s.va, s.nva, s.attesa, s.operatori, Math.round(s.va / Math.max(s.cicloS, 1) * 100), s.altPrelievo || 95, s.pesoSollev || 8]);
        const ws1 = XLSX.utils.aoa_to_sheet([stH, ...stR]);
        ws1["!cols"] = stH.map(() => ({ wch: 14 }));
        XLSX.utils.book_append_sheet(wb, ws1, "Stazioni & Cicli");
        
        const twD = p.timwoods || {};
        const twH = ["Spreco", "Codice", "Score(1-5)", "Livello"];
        const twR = TW_DEF.map(t => [t.n, t.k, twD[t.k] || 1, (twD[t.k] || 1) <= 2 ? "BASSO" : (twD[t.k] || 1) === 3 ? "MEDIO" : "ALTO"]);
        const ws2 = XLSX.utils.aoa_to_sheet([twH, ...twR]);
        ws2["!cols"] = [{ wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws2, "TIMWOODS");
        
        XLSX.writeFile(wb, (p.nome || "progetto").replace(/[^a-zA-Z0-9_]/g, "_") + "_FPES_" + today() + ".xlsx");
      });
    } catch (e) {
      console.error(e);
      setLog(l => [...l, { t: "err", m: "Errore nell'esportazione. Assicurati che xlsx sia installato." }]);
    }
  };

  const exportTpl = (tipo: string) => {
    import('xlsx').then(XLSX => {
      const wb = XLSX.utils.book_new();
      if (tipo === "stazioni") {
        const h = ["Nome", "Operazione", "Ciclo(s)", "VA(s)", "NVA(s)", "Attesa(s)", "Operatori", "Alt.Prelievo(cm)", "Peso(kg)", "Consumo(mat/min)"];
        const ex = ["P1", "Assemblaggio", 60, 40, 12, 8, 1, 95, 8, 0.3];
        const ws = XLSX.utils.aoa_to_sheet([h, ex]);
        ws["!cols"] = h.map(() => ({ wch: 16 }));
        XLSX.utils.book_append_sheet(wb, ws, "Stazioni");
        XLSX.writeFile(wb, "template_stazioni_FPES.xlsx");
      }
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setImporting(true); setLog([]); setPreview(null);
    
    import('xlsx').then(XLSX => {
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          if(!ev.target || !ev.target.result) return;
          const data = new Uint8Array(ev.target.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          const lg: any[] = [];
          const result: any = {};
          
          wb.SheetNames.forEach(sn => {
            const ws = wb.Sheets[sn];
            const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
            if (rows.length < 2) return;
            const nl = sn.toLowerCase();
            const hdr = (rows[0] || []).map((h: any) => String(h).toLowerCase());
            const isS = nl.includes("stazion") || nl.includes("cicl") || (hdr.some((h:string) => h.includes("ciclo")) && hdr.some((h:string) => h.includes("operazion")));
            
            if (isS) {
              const cm: any = {};
              hdr.forEach((h: string, i: number) => {
                if (h.includes("nome")) cm.nome = i;
                if (h.includes("operazion")) cm.operazione = i;
                if (h.includes("ciclo")) cm.cicloS = i;
                if (h === "va(s)" || h === "va") cm.va = i;
                if (h.includes("nva")) cm.nva = i;
                if (h.includes("attesa")) cm.attesa = i;
                if (h.includes("operator")) cm.operatori = i;
                if (h.includes("prelievo")) cm.altPrelievo = i;
                if (h.includes("peso")) cm.pesoSollev = i;
                if (h.includes("consumo")) cm.consumoMin = i;
              });
              const stazioni = rows.slice(1).filter(r => r[cm.nome]).map((r, i) => Object.assign(mkSt(i, "U", 1), {
                id: uid(), nome: String(r[cm.nome] || "P" + (i + 1)),
                operazione: String(r[cm.operazione] || "Assemblaggio"),
                cicloS: parseFloat(r[cm.cicloS]) || 60, va: parseFloat(r[cm.va]) || 40,
                nva: parseFloat(r[cm.nva]) || 15, attesa: parseFloat(r[cm.attesa]) || 5,
                operatori: parseInt(r[cm.operatori]) || 1, altPrelievo: parseFloat(r[cm.altPrelievo]) || 95,
                pesoSollev: parseFloat(r[cm.pesoSollev]) || 8, consumoMin: parseFloat(r[cm.consumoMin]) || 0.3,
                x: 60 + i * 130, y: 130
              }));
              if (stazioni.length > 0) { result.stazioni = stazioni; lg.push({ t: "ok", m: "✓ \"" + sn + "\": " + stazioni.length + " postazioni" }); }
            }
          });
          
          if (Object.keys(result).length === 0) lg.push({ t: "warn", m: "⚠ Nessun dato riconosciuto. Usa i template." });
          setPreview(result);
          setLog(lg);
        } catch (err: any) {
          setLog([{ t: "err", m: "✗ Errore: " + err.message }]);
        }
        setImporting(false);
      };
      reader.readAsArrayBuffer(f);
      e.target.value = "";
    });
  };

  const applyImport = () => {
    if (!preview || !upd) return;
    const patch: any = {};
    if (preview.stazioni) patch.stazioni = preview.stazioni;
    upd(patch);
    setLog(l => [...l, { t: "ok", m: "✓ Dati applicati al progetto!" }]);
    setPreview(null);
  };

  return (
    <div className="w-full">
      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">IMPORT / EXPORT EXCEL</h2>
      
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mb-6">
        <button onClick={() => setTab("export")} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${tab === "export" ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>⬇ Export Excel</button>
        <button onClick={() => setTab("import")} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${tab === "import" ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>⬆ Import da Excel</button>
      </div>

      {tab === "export" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">EXPORT COMPLETO</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">Esporta l'intero progetto in un file Excel contenente più fogli: Stazioni & Cicli, TIMWOODS, Kaizen, Gantt Task e SOP Steps.</p>
            {!p && <div className="text-xs text-red-500 mb-4 bg-red-50 p-2 rounded border border-red-100">⚠ Apri o crea un progetto per esportare.</div>}
            <button onClick={exportFull} disabled={!p} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              ⬇ Esporta {p ? '"' + p.nome + '"' : "(nessun progetto)"}
            </button>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">TEMPLATE PER IMPORT</h3>
            <p className="text-xs text-slate-500 mb-4">Scarica i template pre-formattati per compilare offline i dati e re-importarli nel sistema in un secondo momento.</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-700">⏱ Template Stazioni</div>
                  <div className="text-[10px] text-slate-400">Postazioni, cicli VA/NVA, ergonomia</div>
                </div>
                <button onClick={() => exportTpl("stazioni")} className="px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-md text-blue-600 text-xs font-bold hover:bg-blue-50 hover:border-blue-200">⬇ Scarica</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "import" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">CARICA FILE EXCEL</h3>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:bg-slate-50 transition-colors mb-4" onClick={() => fileRef.current && fileRef.current.click()}>
                <div className="text-4xl mb-3">📂</div>
                <div className="text-sm font-bold text-slate-700">Trascina qui o clicca per scegliere il file</div>
                <div className="text-xs text-slate-400 mt-2">.xlsx · .xls · .csv</div>
              </div>
              <button onClick={() => fileRef.current && fileRef.current.click()} disabled={importing} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 disabled:opacity-50">
                {importing ? "⏳ Analisi in corso..." : "📂 Scegli file"}
              </button>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">ISTRUZIONI</h3>
              <div className="space-y-4">
                {[
                  ["1", "Scarica un template", "dalla scheda Export per avere il formato corretto"],
                  ["2", "Compila i dati", "assicurati di non modificare le intestazioni delle colonne"],
                  ["3", "Carica il file", "il sistema rileverà automaticamente i fogli riconosciuti"],
                  ["4", "Verifica anteprima", "controlla i dati letti prima di confermare"],
                  ["5", "Applica", "salva i dati nel progetto corrente"]
                ].map((s, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">{s[0]}</div>
                    <div>
                      <div className="text-xs font-bold text-slate-700">{s[1]}</div>
                      <div className="text-[10px] text-slate-500">{s[2]}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {log.length > 0 && (
            <div className="bg-slate-900 rounded-xl p-4 font-mono text-[10px] space-y-1 max-h-40 overflow-y-auto">
              {log.map((l, i) => (
                <div key={i} className={`${l.t === "ok" ? "text-emerald-400" : l.t === "warn" ? "text-amber-400" : "text-red-400"}`}>
                  {l.m}
                </div>
              ))}
            </div>
          )}

          {preview && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Anteprima Dati Rilevati</h3>
                <div className="flex gap-2">
                  <button onClick={() => { setPreview(null); setLog([]); }} className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Annulla</button>
                  <button onClick={applyImport} disabled={!p} className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-sm">✓ Applica al progetto</button>
                </div>
              </div>
              
              {preview.stazioni && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                  <div className="text-xs font-bold text-emerald-800 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    {preview.stazioni.length} Postazioni Rilevate
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {preview.stazioni.slice(0, 6).map((s: any, i: number) => (
                      <div key={i} className="bg-white border border-emerald-200 rounded p-2 text-xs w-32 shadow-sm">
                        <div className="font-bold text-slate-800 truncate" title={s.nome}>{s.nome}</div>
                        <div className="text-[10px] text-slate-500 mt-1">{s.operazione}</div>
                        <div className="text-[10px] font-mono text-emerald-600 font-bold">{s.cicloS}s</div>
                      </div>
                    ))}
                    {preview.stazioni.length > 6 && <div className="text-xs text-slate-400 self-end mb-2 ml-2 italic">...e altre {preview.stazioni.length - 6}</div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
