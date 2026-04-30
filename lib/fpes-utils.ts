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

export function lPos(layout:string, n:number) {
  if(layout==="LINE")return Array.from({length:n},(_,i)=>({x:50+i*130,y:130}));
  if(layout==="L"){const t=Math.ceil(n*.6);return Array.from({length:n},(_,i)=>i<t?{x:50+i*120,y:60}:{x:50+(t-1)*120,y:60+(i-t+1)*110});}
  if(layout==="C"){const t=Math.ceil(n/2);return Array.from({length:n},(_,i)=>{if(i<t)return{x:60+i*120,y:50};if(i===Math.floor(n/2))return{x:60+(t-1)*120,y:130};return{x:60+(n-1-i)*120,y:210};});}
  if(layout==="ISLAND")return Array.from({length:n},(_,i)=>{const a=(i/n)*2*Math.PI-Math.PI/2;return{x:Math.round(280+120*Math.cos(a)),y:Math.round(160+90*Math.sin(a))};});
  if(layout==="DU"){const h=Math.ceil(n/2);const p1=lPos("U",h);const p2=lPos("U",n-h);return[...p1,...p2.map(p=>({x:p.x+340,y:p.y}))];}
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
    // Add other fields as we implement them: rack, timwoods, etc.
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
  
  return { active, n, takt, bot, lineEff, vaAvg };
}
