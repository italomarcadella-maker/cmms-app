// fpes-utils.ts
export const C = {
  bg:"#f0f4f8",surface:"#fff",s2:"#f7fafc",s3:"#eef4f9",
  border:"#d4e0ec",bhi:"#b0c8dc",
  blue:"#0069a8",blt:"#e8f3fb",bmid:"#c2dff2",
  green:"#067a52",glt:"#e5f7f0",gmid:"#b0e4cf",
  orange:"#c96500",olt:"#fff4e6",omid:"#fdd9a0",
  red:"#b91c1c",rlt:"#fef2f2",
  yellow:"#a16207",ylt:"#fffbeb",
  purple:"#5b21b6",plt:"#f5f3ff",
  teal:"#0f766e",
  text:"#1a3040",mid:"#4a6070",dim:"#8aacbc",
  shadow:"0 1px 3px rgba(0,50,100,.09)",
  smd:"0 2px 12px rgba(0,50,100,.13)",
  slg:"0 4px 24px rgba(0,50,100,.16)"
};

export const SCOLS=["#0069a8","#067a52","#c96500","#5b21b6","#b91c1c","#0f766e","#a16207","#64748b"];

export const LAYOUTS = {
  U: {label:"Cella a U",icon:"⊓",desc:"Flusso a U"},
  C: {label:"Cella a C",icon:"⊂",desc:"Apertura laterale"},
  LINE: {label:"Lineare",icon:"═",desc:"Rettilineo"},
  L: {label:"Forma a L",icon:"⌐",desc:"Svolta 90°"},
  ISLAND: {label:"Isola",icon:"⬡",desc:"Radiale"},
  DU: {label:"Doppia U",icon:"⊓⊓",desc:"Due celle"}
};

export function uid(){return "_"+Math.random().toString(36).slice(2,9);}
export function clamp(v:number,a:number,b:number){return Math.min(b,Math.max(a,v));}

export function lPos(layout:string, n:number): { x: number, y: number }[] {
  if(layout==="LINE")return Array.from({length:n},(_,i)=>({x:50+i*130,y:130}));
  if(layout==="L"){const t=Math.ceil(n*.6);return Array.from({length:n},(_,i)=>i<t?{x:50+i*120,y:60}:{x:50+(t-1)*120,y:60+(i-t+1)*110});}
  if(layout==="C"){const t=Math.ceil(n/2);return Array.from({length:n},(_,i)=>{if(i<t)return{x:60+i*120,y:50};if(i===Math.floor(n/2))return{x:60+(t-1)*120,y:130};return{x:60+(n-1-i)*120,y:210};});}
  if(layout==="ISLAND")return Array.from({length:n},(_,i)=>{const a=(i/n)*2*Math.PI-Math.PI/2;return{x:Math.round(280+120*Math.cos(a)),y:Math.round(160+90*Math.sin(a))};});
  if(layout==="DU"){const h=Math.ceil(n/2);const p1=lPos("U",h);const p2=lPos("U",n-h);return[...p1,...p2.map((p: {x: number, y: number})=>({x:p.x+340,y:p.y}))];}
  // Default to U
  const h=Math.ceil(n/2);return Array.from({length:n},(_,i)=>i<h?{x:60+i*120,y:50}:{x:60+(n-1-i)*120,y:200});
}

export function mkSt(i:number, layout:string, total:number) {
  const pos=lPos(layout,total);const p=pos[i]||{x:60+i*130,y:100};
  return{id:uid(),nome:"P"+(i+1),x:p.x,y:p.y,w:90,h:56,cicloS:60,operatori:1,operazione:"Assemblaggio",va:40,nva:15,attesa:5,colore:SCOLS[i%SCOLS.length],attiva:true,note:"",altPrelievo:95,pesoSollev:8,consumoMin:0.3};
}

export function newFpesProject(nome:string) {
  const s1=mkSt(0,"U",3),s2=mkSt(1,"U",3),s3=mkSt(2,"U",3);
  return {
    nome: nome || "Nuova Simulazione", reparto: "", responsabile: "", data: new Date().toISOString().slice(0,10), tipo: "ASSEMBLY", layout: "U",
    stazioni: [s1, s2, s3],
    domandaGiorn: 500, turniGiorn: 2, hTurno: 8,
    rack:{livelli:2,mxLiv:4,inclin:4,clearLat:10,gapLiv:10,hBase:15,spazioDisp:150},
    rackCodici:[{id:uid(),nome:"COD-A",dExt:50,dInt:14,sp:20,peso:9,col:SCOLS[0],attivo:true}],
    timwoods:{T:2,I:2,M:2,W:2,O:1,P:1,D:1,S:2},
    kaizen:[], gantt:{phases:[],tasks:[]}
  };
}

export function calcP(p: any) {
  if(!p || !p.stazioni) return { active: [], n: 0, takt: 60, bot: null, lineEff: 0, vaAvg: 0 };
  const active=p.stazioni.filter((s:any)=>s.attiva);const n=Math.max(active.length,1);
  const takt=p.domandaGiorn>0?Math.round((p.turniGiorn*p.hTurno*3600)/p.domandaGiorn):0;
  const bot=active.reduce((a:any,b:any)=>a.cicloS>b.cicloS?a:b,active[0]||{cicloS:0,nome:"—"});
  const sumC=active.reduce((s:number,st:any)=>s+st.cicloS,0);
  const lineEff=bot.cicloS>0?Math.round((sumC/(n*bot.cicloS))*100):0;
  const vaAvg=Math.round(active.reduce((s:number,st:any)=>s+(st.va/Math.max(st.cicloS,1))*100,0)/n);
  
  // Rack calculations
  const cod = p.rackCodici?.find((c:any) => c.attivo) || p.rackCodici?.[0] || {dExt:50,sp:20,peso:8,dInt:14};
  const profRack = cod.dExt + (p.rack?.clearLat || 10) * 2;
  const bufRack = (p.rack?.livelli || 2) * (p.rack?.mxLiv || 4);
  const consT = active.reduce((s:number,st:any)=>s+(st.consumoMin||0),0);
  const copMin = consT>0?(bufRack/consT).toFixed(1):"∞";
  const livelli = [];
  let hB = p.rack?.hBase || 15;
  for(let i=0;i<(p.rack?.livelli || 2);i++){
    const pn=hB,pr=pn+cod.sp;
    livelli.push({lv:i+1,piano:pn,prelievo:pr});
    hB=pr+(p.rack?.gapLiv || 10);
  }
  const hTotRack=hB+10;
  const okSp=profRack<=(p.rack?.spazioDisp || 150);
  
  const twTotal = TW_DEF.reduce((s,t)=>s+(p.timwoods?.[t.k]||1),0);
  const twPct = Math.round((1-twTotal/(TW_DEF.length*5))*100);

  return { active, n, takt, bot, lineEff, vaAvg, cod, profRack, bufRack, consT, copMin, livelli, hTotRack, okSp, twPct };
}

// ERGONOMICS CONSTANTS
export const NZ=[
  {h1:0,h2:35,c:"#b91c1c",l:"ROSSO",ok:false,desc:"Zona proibita"},
  {h1:35,h2:75,c:"#c96500",l:"ARANCIO",ok:false,desc:"Con ausili"},
  {h1:75,h2:125,c:"#067a52",l:"VERDE",ok:true,desc:"Ottimale"},
  {h1:125,h2:145,c:"#c96500",l:"ARANCIO",ok:false,desc:"Con ausili"},
  {h1:145,h2:220,c:"#b91c1c",l:"ROSSO",ok:false,desc:"Zona proibita"},
];

export function nZone(h:number){
  for(let i=0;i<NZ.length;i++){if(h>=NZ[i].h1&&h<NZ[i].h2)return NZ[i];}
  return NZ[NZ.length-1];
}

// TIMWOODS CONSTANTS
export const TW_DEF=[
  {k:"T",n:"Transport",i:"🚛",d:"Spostamento non necessario",col:"#c96500"},
  {k:"I",n:"Inventory",i:"📦",d:"Scorte eccessive",col:"#a16207"},
  {k:"M",n:"Motion",i:"🚶",d:"Movimenti operatore",col:"#0069a8"},
  {k:"W",n:"Waiting",i:"⏳",d:"Attese",col:"#5b21b6"},
  {k:"O",n:"Overproduction",i:"⚙️",d:"Produzione anticipata",col:"#0f766e"},
  {k:"P",n:"Overprocessing",i:"🔧",d:"Lavorazioni non richieste",col:"#64748b"},
  {k:"D",n:"Defects",i:"❌",d:"Scarti, rilavorazioni",col:"#b91c1c"},
  {k:"S",n:"Skills",i:"🧠",d:"Talenti non valorizzati",col:"#6d28d9"},
];

export const VA_TYPES: Record<string, any> = {
  VA:{label:"VA",full:"Valore Aggiunto",col:"#067a52",bg:"#e5f7f0"},
  NVA:{label:"NVA",full:"Non Valore Aggiunto",col:"#b91c1c",bg:"#fef2f2"},
  NNVA:{label:"NNVA",full:"Necessario Non VA",col:"#c96500",bg:"#fff4e6"},
};

export const MOVE_TYPES: Record<string, any> = {
  OPERARE:{label:"Operare",icon:"🔧",timw:"O"},
  TRASPORTARE:{label:"Trasportare",icon:"🚛",timw:"T"},
  CAMMINARE:{label:"Camminare",icon:"🚶",timw:"M"},
  PRENDERE:{label:"Prendere",icon:"✋",timw:"M"},
  POSARE:{label:"Posare",icon:"📥",timw:"M"},
  ISPEZIONARE:{label:"Ispezionare",icon:"🔍",timw:"D"},
  ATTENDERE:{label:"Attendere",icon:"⏳",timw:"W"},
  CERCARE:{label:"Cercare",icon:"🔎",timw:"M"},
  ALTRO:{label:"Altro",icon:"📌",timw:"S"},
};
export const MK = Object.keys(MOVE_TYPES);

export const PARAM_TYPES: Record<string, any> = {
  TEMP:{label:"Temperatura",icon:"🌡️",unit:"°C",color:C.red},
  PRESS:{label:"Pressione",icon:"⬛",unit:"bar",color:C.orange},
  SPEED:{label:"Velocità",icon:"⚡",unit:"rpm",color:C.blue},
  FLOW:{label:"Portata",icon:"💧",unit:"l/min",color:C.blue},
  TIME:{label:"Tempo",icon:"⏱",unit:"s",color:C.purple},
  WEIGHT:{label:"Peso",icon:"⚖️",unit:"kg",color:C.green},
  DISTANCE:{label:"Distanza",icon:"📏",unit:"mm",color:C.mid},
  PERCENT:{label:"Percentuale",icon:"📊",unit:"%",color:C.teal},
  CUSTOM:{label:"Custom",icon:"⚙️",unit:"",color:C.mid},
};
export const PK = Object.keys(PARAM_TYPES);

export const SAFETY_TYPES: Record<string, any> = {
  DANGER:{label:"PERICOLO",icon:"☠️",col:C.red,bg:C.rlt},
  WARNING:{label:"AVVISO",icon:"⚠️",col:C.orange,bg:C.olt},
  CAUTION:{label:"ATTENZIONE",icon:"⚡",col:C.yellow,bg:C.ylt},
  INFO:{label:"NOTA",icon:"ℹ️",col:C.blue,bg:C.blt},
  PPE:{label:"DPI",icon:"🦺",col:C.green,bg:C.glt},
};
export const SK = Object.keys(SAFETY_TYPES);

export const TASK_TYPES: Record<string, any> = {
  KAIZEN:{label:"Kaizen",icon:"💡",col:"#067a52"},
  MAINTENANCE:{label:"Manutenzione",icon:"🔧",col:"#c96500"},
  ENGINEERING:{label:"Ingegneria",icon:"⚙️",col:"#0069a8"},
  AUDIT:{label:"Audit",icon:"📋",col:"#5b21b6"},
  TRAINING:{label:"Formazione",icon:"🎓",col:"#0f766e"},
  MILESTONE:{label:"Milestone",icon:"🏁",col:"#b91c1c"},
  OTHER:{label:"Altro",icon:"📌",col:"#64748b"},
};
export const TTK = Object.keys(TASK_TYPES);

export const TS: Record<string, any> = {
  TODO:{label:"Da fare",col:"#8aacbc"},
  INPROGRESS:{label:"In corso",col:"#0069a8"},
  BLOCKED:{label:"Bloccato",col:"#b91c1c"},
  REVIEW:{label:"In verifica",col:"#c96500"},
  DONE:{label:"Completato",col:"#067a52"},
};
export const TSK = Object.keys(TS);

export const PRIO: Record<string, any> = {
  LOW:{label:"Bassa",col:"#8aacbc"},
  MEDIUM:{label:"Media",col:"#c96500"},
  HIGH:{label:"Alta",col:"#b91c1c"},
  CRITICAL:{label:"Critica",col:"#7c0000"},
};
export const PRIOK = Object.keys(PRIO);

export const GZ = [
  {id:"a",y1:185,y2:160,col:C.red,label:"Rosso alto",ok:false,desc:"Sopra spalle"},
  {id:"b",y1:160,y2:130,col:C.orange,label:"Arancio alto",ok:false,desc:"Spalle"},
  {id:"c",y1:130,y2:70,col:C.green,label:"Golden Zone",ok:true,desc:"Ottimale 70–130cm"},
  {id:"d",y1:70,y2:35,col:C.orange,label:"Arancio basso",ok:false,desc:"Sotto creste iliache"},
  {id:"e",y1:35,y2:0,col:C.red,label:"Rosso basso",ok:false,desc:"Piegamento"},
];

export function sCol(s: number){return s>=75?C.green:s>=50?C.orange:C.red;}
export function pCol(p: number){return p>=100?C.green:p>=60?C.blue:p>=30?C.orange:C.red;}
export function gZone(h: number){for(let i=0;i<GZ.length;i++){if(h>=GZ[i].y2&&h<GZ[i].y1)return GZ[i];}return GZ[GZ.length-1];}

export function nioshRWL(h:number,v:number,d:number,a:number,f:number,c:number){return parseFloat((23*Math.min(1,25/Math.max(h,1))*(1-0.003*Math.abs(v-75))*(0.82+4.5/Math.max(d,1))*(1-0.0032*Math.abs(a))*(f||1)*(c||1)).toFixed(2));}
export function nioshLI(peso:number,rwl:number){return parseFloat((peso/Math.max(rwl,0.01)).toFixed(2));}
export function dlJSON(d:any,n:string){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:"application/json"}));a.download=n;a.click();}

export function today(){return new Date().toISOString().slice(0,10);}
export function addDays(d:string,n:number){const dt=new Date(d);dt.setDate(dt.getDate()+n);return dt.toISOString().slice(0,10);}
export function diffDays(a:string,b:string){return Math.round((new Date(b).getTime()-new Date(a).getTime())/86400000);}
export function fmtDate(d:string){if(!d)return"—";const p=d.split("-");return p[2]+"/"+p[1]+"/"+p[0];}

export function mkAct(i:number){return{id:uid(),nome:"Attività "+(i+1),desc:"",durataSec:10,tipoVA:"VA",tipoMov:"OPERARE",timw:"O",altezzaCm:95,pesoCaricoKg:0,distOrizzCm:30,distVertCm:25,angolazione:0,freqMin:0.1,presa:1,forza:0,postura:0,stereotipia:0,note:""};}
export function mkSStep(i:number){return{id:uid(),titolo:"Step "+(i+1),descrizione:"",parametri:[],safety:[],checklist:[],immagineB64:null,immagineCaption:"",note:"",durataMinuti:null,completato:false};}
export function mkTask(i:number,phId:string|null){const s=addDays(today(),i*7);return{id:uid(),phaseId:phId||null,nome:"Task "+(i+1),desc:"",tipo:"ENGINEERING",status:"TODO",priority:"MEDIUM",assignee:"",startDate:s,endDate:addDays(s,5+i*2),baselineStart:s,baselineEnd:addDays(s,5+i*2),progress:0,isMilestone:false,deps:[],note:"",createdAt:new Date().toISOString()};}
