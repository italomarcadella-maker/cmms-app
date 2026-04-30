"use client";

import React, { useState, useEffect } from "react";
import { Plus, Save, Activity, Camera, Layers, Settings2, Trash2 } from "lucide-react";
import { getRecipes, createRecipe, saveRecipeData, addQualityReading } from "@/lib/actions/sop-actions";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SopMesDashboard() {
  const [activeTab, setActiveTab] = useState<'recipe'|'quality'>('recipe');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [currentRecipe, setCurrentRecipe] = useState<any>(null);
  
  // Local state for the Recipe Builder
  const [machines, setMachines] = useState<any[]>([]);
  
  // Local state for Quality
  const [qualityValue, setQualityValue] = useState("");
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getRecipes();
    setRecipes(data);
    if (data.length > 0 && !currentRecipe) {
      handleSelectRecipe(data[0]);
    }
  };

  const handleSelectRecipe = (recipe: any) => {
    setCurrentRecipe(recipe);
    // Convert prisma machines to UI machines
    const uiMachines = recipe.machines.map((m: any) => ({
      id: m.id,
      title: m.name,
      image: m.image,
      params: m.parameters.map((p: any) => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        set: p.setPoint,
        toll: p.tolerance
      }))
    }));
    setMachines(uiMachines.length > 0 ? uiMachines : [{ id: 'new', title: '', params: [{}, {}, {}] }]);
  };

  const handleNewRecipe = async () => {
    const name = prompt("Nome della nuova SOP / Ricetta Master?");
    if (name) {
      const newRecipe = await createRecipe(name);
      await loadData();
      handleSelectRecipe(newRecipe);
    }
  };

  const handleSaveRecipe = async () => {
    if (!currentRecipe) return;
    await saveRecipeData(currentRecipe.id, machines);
    alert("SOP salvata con successo!");
    loadData();
  };

  const handleAddQualityReading = async () => {
    if (!currentRecipe || !qualityValue) return;
    await addQualityReading(currentRecipe.id, parseFloat(qualityValue));
    setQualityValue("");
    alert("Lettura salvata e analizzata dal Global AI Engine!");
    loadData();
  };

  const addMachine = () => {
    setMachines([...machines, { id: Date.now().toString(), title: '', params: [{}] }]);
  };

  const updateMachine = (index: number, field: string, value: any) => {
    const updated = [...machines];
    updated[index][field] = value;
    setMachines(updated);
  };

  const addParam = (mIndex: number) => {
    const updated = [...machines];
    updated[mIndex].params.push({});
    setMachines(updated);
  };

  const updateParam = (mIndex: number, pIndex: number, field: string, value: any) => {
    const updated = [...machines];
    updated[mIndex].params[pIndex][field] = value;
    setMachines(updated);
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-slate-50 overflow-hidden rounded-2xl border shadow-sm animate-in fade-in">
      {/* SIDEBAR LIBRERIA SOP */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b bg-slate-900 text-white">
          <h2 className="font-bold text-lg flex items-center gap-2"><Layers className="h-5 w-5 text-indigo-400"/> Libreria SOP</h2>
          <p className="text-xs text-slate-400">Piano di Controllo 4.0</p>
        </div>
        
        <div className="p-2 space-y-1 overflow-y-auto flex-1">
          {recipes.map(r => (
            <div 
              key={r.id} 
              onClick={() => handleSelectRecipe(r)}
              className={`p-3 rounded-xl cursor-pointer transition-all border ${currentRecipe?.id === r.id ? 'bg-indigo-50 border-indigo-200 text-indigo-800 shadow-sm' : 'border-transparent hover:bg-slate-100'}`}
            >
              <p className="font-semibold text-sm truncate">{r.name}</p>
              <p className="text-[10px] text-slate-400">{new Date(r.updatedAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t bg-slate-50 gap-2 flex flex-col">
          <button onClick={handleNewRecipe} className="flex items-center justify-center gap-2 w-full bg-white border border-slate-300 text-slate-700 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Nuova SOP
          </button>
          <button onClick={handleSaveRecipe} disabled={!currentRecipe} className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50">
            <Save className="h-4 w-4" /> Salva Corrente
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TABS */}
        <div className="flex border-b bg-white px-6">
          <button 
            onClick={() => setActiveTab('recipe')}
            className={`px-6 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'recipe' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Settings2 className="h-4 w-4" /> Configuratore Macchine
          </button>
          <button 
            onClick={() => setActiveTab('quality')}
            className={`px-6 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'quality' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Activity className="h-4 w-4" /> Qualità Live & AI
          </button>
        </div>

        {/* TAB CONTENT: RECIPE BUILDER */}
        {activeTab === 'recipe' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
            {currentRecipe ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-extrabold text-slate-800">SOP: {currentRecipe.name}</h3>
                  <button onClick={addMachine} className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-200 transition-colors">
                    <Plus className="h-4 w-4" /> Aggiungi Macchina
                  </button>
                </div>

                <div className="space-y-8">
                  {machines.map((m, mIdx) => (
                    <div key={mIdx} className="bg-white rounded-2xl border shadow-sm p-6">
                      <div className="flex justify-between mb-4 border-b pb-4">
                        <input 
                          type="text" 
                          placeholder="Nome Macchina (es. Estrusore 1)" 
                          className="text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-indigo-900 placeholder:text-slate-300 w-full"
                          value={m.title}
                          onChange={(e) => updateMachine(mIdx, 'title', e.target.value)}
                        />
                        <button onClick={() => addParam(mIdx)} className="text-sm font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Param
                        </button>
                      </div>

                      {/* Fake Photo Placeholder */}
                      <div className="h-24 bg-slate-100 rounded-xl mb-6 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-medium cursor-pointer hover:bg-slate-200 transition-colors">
                        <Camera className="h-5 w-5 mr-2" /> {m.image ? "Cambia Foto HMI" : "Carica Foto HMI"}
                      </div>

                      {/* Params */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-400 uppercase px-2">
                          <div className="col-span-5">Variabile</div>
                          <div className="col-span-2">U.M.</div>
                          <div className="col-span-2">Set</div>
                          <div className="col-span-3">Tolleranza</div>
                        </div>
                        {m.params.map((p: any, pIdx: number) => (
                          <div key={pIdx} className="grid grid-cols-12 gap-2 bg-slate-50 p-2 rounded-lg items-center">
                            <input className="col-span-5 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm font-semibold" placeholder="es. Velocità" value={p.name || ''} onChange={e => updateParam(mIdx, pIdx, 'name', e.target.value)} />
                            <input className="col-span-2 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm" placeholder="rpm" value={p.unit || ''} onChange={e => updateParam(mIdx, pIdx, 'unit', e.target.value)} />
                            <input className="col-span-2 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm font-mono text-indigo-700 font-bold" type="number" placeholder="0" value={p.set || ''} onChange={e => updateParam(mIdx, pIdx, 'set', e.target.value)} />
                            <input className="col-span-3 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm font-mono text-slate-600" placeholder="±1" type="number" value={p.toll || ''} onChange={e => updateParam(mIdx, pIdx, 'toll', e.target.value)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Layers className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Seleziona o crea una SOP dalla libreria per iniziare.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: QUALITY */}
        {activeTab === 'quality' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><Activity className="h-5 w-5 text-emerald-500" /> Inserimento Controllo Qualità</h3>
              <p className="text-sm text-slate-500 mb-4">I dati inseriti verranno inviati al Global AI Engine per la ricerca di derive di processo incrociate.</p>
              
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Valore Misurato (mm)</label>
                  <input type="number" step="0.1" value={qualityValue} onChange={e => setQualityValue(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-lg" placeholder="es. 50.2" />
                </div>
                <button onClick={handleAddQualityReading} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors whitespace-nowrap shadow-sm">
                  Salva & Analizza
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm flex-1 flex flex-col">
               <h3 className="text-lg font-bold text-slate-800 mb-4">Trend Qualità: {currentRecipe?.name || "Nessuna ricetta"}</h3>
               <div className="flex-1 min-h-[300px]">
                  {/* Fake Chart for demo purposes to simulate the Vanilla Chart.js */}
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentRecipe?.readings || [{value: 50.1}, {value: 50.2}, {value: 50.8}, {value: 51.5}]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="id" hide />
                      <YAxis domain={['auto', 'auto']} tick={{fontSize: 12, fill: '#64748b'}} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={4} dot={{r: 6, fill: '#fff', strokeWidth: 2}} activeDot={{r: 8}} />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
