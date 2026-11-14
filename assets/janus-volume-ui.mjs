import {repositoryOverview,registryVolume,semanticVolume,viewOf} from "./janus-volume-model.mjs";
import {VolumeRenderer} from "./janus-volume-render.mjs";
/* JANUS Volumetric Observatory v2 · read-only browser UI. Does not send/modify source JSON. */
const $=(id)=>document.getElementById(id);
const role=document.body.dataset.role==="semantic"?"semantic":"registry";
const renderer=new VolumeRenderer($("volume"));
const state={manifest:null,relationsManifest:null,repo:null,shards:[],nextIndex:0,records:new Map(),relations:[],
  source:null,graph:{nodes:[],edges:[],actualRecords:0},loading:false,orbit:false,lastLabelAt:0,showLabels:true};
const reduced=window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
$("renderer-name").textContent=renderer.type+(renderer.initError?" · "+renderer.initError:"");
function status(value,error=false){
  $("status").textContent=String(value);
  $("status").style.color=error?"#f7a6a6":"#9eb8ca";
}
function countText(n){return Number(n||0).toLocaleString("ru-RU");}
async function json(url){
  const r=await fetch(url,{credentials:"omit",cache:"no-store"});
  if(!r.ok)throw Error("HTTP "+r.status+" · "+url);
  return r.json();
}
function updateLabels(){
  const box=$("labels");box.replaceChildren();
  const nodes=renderer.scene.nodes;
  const important=nodes.filter(n=>n.type==="repository"||n.type==="pivot"||n.type==="directory")
    .sort((a,b)=>b.size-a.size).slice(0,15);
  if(renderer.selectedId){
    const selected=nodes.find(n=>n.id===renderer.selectedId);
    if(selected&&!important.some(n=>n.id===selected.id))important.push(selected);
  }
  for(const n of important){
    const p=renderer.project(n);
    if(!p || p.x<10||p.y<15||p.x>renderer.width-10||p.y>renderer.height-12)continue;
    const text=document.createElement("span");text.className="point-label";
    const label=String(n.label||"");
    text.textContent=label.length>34?label.slice(0,31)+"…":label;
    text.style.left=p.x+"px";text.style.top=p.y+"px";box.appendChild(text);
  }
}
function refreshCam(){
  renderer.render();
  const now=performance.now();
  if(now-state.lastLabelAt>80){updateLabels();state.lastLabelAt=now;}
}
function stats(){
  const v=renderer.scene;
  const prefix=state.graph.kind==="registry_overview"?"Репозитории":
    state.graph.kind==="semantic"?"SYNTH / исходные записи":"JSON / папки / ссылки";
  $("counter").textContent=prefix+": "+countText(v.nodes.length)+" узлов · "+countText(v.edges.length)+" реальных/структурных рёбер";
  if(state.graph.kind==="registry_overview"){
    $("scope").textContent="JANUS · "+countText(state.manifest.jsonCount)+" записей в опубликованном индексе · "+state.manifest.repositoryCount+" репозиториев";
    status("Индекс: "+state.manifest.generatedAt+" · показаны только 14 реальных агрегатов, без выдуманных звёзд.");
  } else if(state.graph.kind==="registry"){
    const total=state.manifest.repositories.find(x=>x.repository===state.repo)?.jsonCount;
    $("scope").textContent=state.repo+" · "+countText(state.records.size)+" / "+countText(total)+" загруженных JSON";
    status("Загружено "+state.nextIndex+" / "+state.shards.length+" сегментов. Явные ссылки: "+(state.graph.explicitReferences||0)+
      ". Пропущенные источники ссылок: "+(state.graph.relationsWithUnloadedSource||0)+".");
  } else {
    $("scope").textContent="iNaiHR · кандидаты SYNTH из опубликованного состояния "+(state.source.generated_at||"");
    status("Кандидаты: "+state.graph.actualRecords+" · указатели на записи: "+state.graph.provenanceEdges+
      " · известные линии наследования: "+state.graph.lineage+". Никакой гипотезе не присваивается истинность.");
  }
}
function refresh(reset=false){
  if(reset){renderer.reset(state.graph.kind==="registry_overview"?780:680);$("search").value="";$("slice").value="100";$("slice-value").textContent="100%";}
  const mode=$("band").value;
  const view=viewOf(state.graph,mode,$("search").value,Number($("slice").value)/100);
  renderer.setGraph(view,mode);
  stats();updateLabels();
}
function showDetail(n){
  if(!n)return;
  renderer.select(n.id);
  $("detail").hidden=false;
  $("node-type").textContent=n.type+(n.derived?" · derived folder grouping":" · actual index record");
  $("node-title").textContent=String(n.label);
  const meta=n.meta||{};
  $("node-meta").textContent=JSON.stringify({id:n.id,position_numerical_only_for_layout:n.p,
    source_semantics:n.type==="candidate"?"HYPOTHESIS_NOT_EVIDENCE":n.type==="reference"?"RECORDED_EXPLICIT_POINTER":"SOURCE_METADATA_OR_GROUP",
    ...meta},null,2).slice(0,4700);
  const a=$("source-link");a.hidden=true;a.removeAttribute("href");
  if(n.source){a.href=n.source;a.hidden=false;}
  $("dive").hidden=!(state.graph.kind==="registry_overview"&&meta.repository);
  $("dive").onclick=()=>openRepository(meta.repository).catch(e=>status(e.message,true));
  updateLabels();
}
function closeDetail(){renderer.select(null);$("detail").hidden=true;updateLabels();}
function overview(){
  state.repo=null;state.shards=[];state.nextIndex=0;state.records.clear();state.relations=[];
  state.graph=repositoryOverview(state.manifest.repositories);
  $("back").hidden=true;$("load-more").hidden=true;$("load-refs").hidden=true;
  $("search").value="";closeDetail();refresh(true);
}
async function loadNext(batch=4){
  if(state.loading || !state.repo || state.nextIndex>=state.shards.length)return;
  state.loading=true;$("load-more").disabled=true;
  const start=state.nextIndex,end=Math.min(state.shards.length,start+batch);
  status("Загрузка JSON-сегментов "+(start+1)+"–"+end+"…");
  try{
    const sections=await Promise.all(state.shards.slice(start,end).map(s=>json("./"+s.path)));
    for(const section of sections){
      if(section.readOnly!==true||!Array.isArray(section.records))throw Error("Invalid read-only shard");
      for(const record of section.records)if(record&&record.id)state.records.set(record.id,record);
    }
    state.nextIndex=end;buildRegistry();
    $("load-more").hidden=state.nextIndex>=state.shards.length;
  }finally{state.loading=false;$("load-more").disabled=false;}
}
function buildRegistry(){
  state.graph=registryVolume([...state.records.values()],state.repo,state.relations);
  refresh();
}
async function openRepository(repository){
  if(!state.manifest.repositories.some(r=>r.repository===repository))throw Error("Unknown repository");
  state.repo=repository;state.records.clear();state.relations=[];state.nextIndex=0;
  state.shards=state.manifest.shards.filter(s=>s.repository===repository);
  $("search").value="";$("slice").value="100";$("slice-value").textContent="100%";
  $("back").hidden=false;$("load-refs").hidden=false;$("load-more").hidden=false;
  closeDetail();
  await loadNext(Math.min(4,state.shards.length));
  renderer.reset();
}
async function loadRelations(){
  if(state.loading||!state.repo)return;
  state.loading=true;$("load-refs").disabled=true;
  try{
    status("Загружаю зарегистрированные явные ссылки JSON…");
    if(!state.relationsManifest)state.relationsManifest=await json("./assets/janus-json-relations/manifest.json");
    const found=state.relationsManifest.shards.find(s=>s.repository===state.repo);
    if(!found)throw Error("Нет сегмента явных ссылок для "+state.repo);
    const rel=await json("./"+found.path);
    if(rel.readOnly!==true||!Array.isArray(rel.edges))throw Error("Relation shard schema mismatch");
    state.relations=rel.edges;
    $("load-refs").hidden=true;
    buildRegistry();
    status("Подключены только явные JSON-ссылки · "+state.graph.explicitReferences+
      " видимых рёбер · индекс может быть частичным (held files: "+state.relationsManifest.heldFiles+").");
  }finally{state.loading=false;$("load-refs").disabled=false;}
}
async function initialize(){
  if(role==="registry"){
    $("band").querySelector('[value="hypotheses"]').remove();
    $("band").querySelector('[value="lineage"]').remove();
    const manifest=await json("./assets/janus-json-atlas/manifest.json");
    if(manifest.schema!=="janus.hrain.github_json_constellation_manifest.v1"||manifest.authority?.readOnly!==true||
        !Array.isArray(manifest.shards)||!Array.isArray(manifest.repositories))throw Error("Unrecognized registry manifest");
    state.manifest=manifest;overview();
  }else{
    $("back").hidden=true;$("load-more").hidden=true;$("load-refs").hidden=true;
    const data=await json("./janus-synth/state/JANUS_SYNTH_LATEST.json");
    if(!Array.isArray(data.candidates)||!data.registry?.repository)throw Error("Unrecognized SYNTH snapshot");
    state.source=data;
    state.graph=semanticVolume(data.candidates,data.registry);
    refresh(true);
  }
}
const c=$("volume");
const pointers=new Map();let drag=null;
c.addEventListener("contextmenu",e=>e.preventDefault());
c.addEventListener("pointerdown",e=>{
  e.preventDefault();c.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1)drag={x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY,button:e.button,shift:e.shiftKey,moved:false};
  else drag=null;
});
c.addEventListener("pointermove",e=>{
  if(!pointers.has(e.pointerId))return;
  const prev=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){
    const arr=[...pointers.values()],old=[...pointers.entries()].map(([id,p])=>id===e.pointerId?prev:p);
    const d=Math.hypot(arr[0].x-arr[1].x,arr[0].y-arr[1].y),prior=Math.hypot(old[0].x-old[1].x,old[0].y-old[1].y);
    if(prior>10)renderer.camera.distance=Math.max(80,Math.min(2500,renderer.camera.distance*(prior/d)));
    refreshCam();return;
  }
  if(!drag)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  drag.moved=drag.moved||Math.hypot(e.clientX-drag.ox,e.clientY-drag.oy)>5;
  if(drag.shift||drag.button===2){
    const factor=renderer.camera.distance/Math.max(320,renderer.height);
    renderer.camera.focus[0]-=dx*factor;renderer.camera.focus[1]+=dy*factor;
  }else{
    renderer.camera.yaw+=dx*.006;
    renderer.camera.pitch=Math.max(-1.5,Math.min(1.5,renderer.camera.pitch+dy*.006));
  }
  drag.x=e.clientX;drag.y=e.clientY;refreshCam();
});
function pointerUp(e){
  if(!pointers.has(e.pointerId))return;
  pointers.delete(e.pointerId);
  if(drag&&!drag.moved&&pointers.size===0&&e.button!==2){
    const rect=c.getBoundingClientRect();const n=renderer.nearest(e.clientX-rect.left,e.clientY-rect.top);
    if(n)showDetail(n);else closeDetail();
  }
  if(pointers.size===0)drag=null;
}
c.addEventListener("pointerup",pointerUp);c.addEventListener("pointercancel",pointerUp);
c.addEventListener("wheel",e=>{
  e.preventDefault();
  renderer.camera.distance=Math.max(80,Math.min(2500,renderer.camera.distance*Math.exp(e.deltaY*.0012)));
  refreshCam();
},{passive:false});
$("band").addEventListener("change",()=>refresh());
$("search").addEventListener("input",()=>refresh());
$("slice").addEventListener("input",()=>{$("slice-value").textContent=$("slice").value+"%";refresh();});
$("top").addEventListener("click",()=>{renderer.preset("top");refreshCam();});
$("edge").addEventListener("click",()=>{renderer.preset("edge");refreshCam();});
$("perspective").addEventListener("click",()=>{renderer.preset("perspective");refreshCam();});
$("reset").addEventListener("click",()=>{renderer.reset();refreshCam();});
$("detail-close").addEventListener("click",closeDetail);
$("back").addEventListener("click",overview);
$("load-more").addEventListener("click",()=>loadNext(4).catch(e=>status(e.message,true)));
$("load-refs").addEventListener("click",()=>loadRelations().catch(e=>status(e.message,true)));
$("tour").addEventListener("click",()=>{state.orbit=!state.orbit;$("tour").textContent=state.orbit?"Остановить":"Автооблёт";});
$("quality").addEventListener("click",()=>{
  renderer.quality=renderer.quality==="low"?"balanced":"low";
  $("quality").textContent=renderer.quality==="low"?"Качество: эконом":"Качество: авто";refreshCam();
});
window.addEventListener("resize",()=>{renderer.resize();updateLabels();});
window.addEventListener("keydown",e=>{
  if(e.target.matches("input,select,button"))return;
  if(e.key==="Escape"){if(!$("detail").hidden)closeDetail();else if(role==="registry"&&state.repo)overview();}
  if(e.key.toLowerCase()==="r"){renderer.reset();refreshCam();}
  if(e.code==="Space"){e.preventDefault();$("tour").click();}
});
window.__JANUS_VOLUME_DIAG=()=>({role,renderer:renderer.type,graphKind:state.graph.kind,
  recordCount:state.graph.actualRecords,nodes:renderer.scene.nodes.length,edges:renderer.scene.edges.length,
  loadedShards:state.nextIndex,totalShards:state.shards.length,
  references:state.graph.explicitReferences||state.graph.provenanceEdges||0,
  camera:{...renderer.camera},hasSourceMutation:false});
let last=0;
function animate(ts){
  if(state.orbit&&!document.hidden&&ts-last>40){
    renderer.camera.yaw+=.0022;refreshCam();last=ts;
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
initialize().catch(e=>{status("Ошибка чтения данных: "+e.message,true);$("scope").textContent="Источник недоступен; никаких искусственных узлов не создано.";});
