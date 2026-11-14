/* JANUS Galaxy Lens v1: read-only visualization. Spiral coordinates are a metaphor, not physical dynamics or evidence. */
export function stableHash(value) {
  let h = 2166136261;
  for (const c of String(value)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function spiralLayout(items, role = "registry", overview = false) {
  const n = Math.max(items.length, 1);
  return items.map((item, i) => {
    const id = String(item.id || item.repository || i);
    const h = stableHash(id);
    const arm = overview ? i % 4 : role === "semantic" ? Number(item.depth || 0) % 5 : h % 5;
    const radius = overview ? 78 + Math.sqrt((i + .7) / n) * 280 : 26 + Math.sqrt((i + .7) / n) * 326;
    const angle = arm * Math.PI * 2 / (overview ? 4 : 5) + radius * .016 + ((h >>> 7) % 1000 / 1000 - .5) * .48;
    return {item, id, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius,
      color: ["#61ebcf", "#c68fff", "#83a5ff", "#f1c574", "#f078aa"][arm % 5],
      size: overview ? Math.min(15, 5 + Math.log2(1 + Number(item.jsonCount || 0)) * .73) : 2.4 + (h % 5) * .35};
  });
}
export function matchesBand(item, band, role = "registry") {
  if (band === "all") return true;
  if (role === "semantic") {
    const sources = item.meaning?.evidence?.source_records;
    if (band === "source") return Array.isArray(sources) && sources.length > 0;
    if (band === "contract") return Number(item.depth || 0) >= 2;
    if (band === "signal") return Number(item.attention_score || 0) >= 10;
    return false;
  }
  if (band === "source") return Boolean(item.sourceCommit && item.sourceUrl);
  if (band === "contract") return /(^|\/)\.janus\/|CONTRACT|contract/i.test(String(item.path || ""));
  if (band === "signal") return Number(item.sizeBytes || 0) >= 16384;
  return false;
}
if (typeof document !== "undefined") {
const $ = (id) => document.getElementById(id);
const html = (id, value) => { $(id).textContent = String(value); };
const safeGithub = (url) => typeof url === "string" && /^https:\/\/github\.com\/Hawkar-usls\/[A-Za-z0-9_.-]+\/blob\/[A-Za-z0-9._\/%-]+$/.test(url);
const INDEX_ROOT = "https://hawkar-usls.github.io/Hrain/";
const formatCount = (n) => Number(n || 0).toLocaleString("ru-RU");
const role = document.body.dataset.role === "semantic" ? "semantic" : "registry";
const state = {
  manifest:null, synth:null, repo:null, shardIndex:0, shards:[], items:[], points:[],
  heading:"", detail:null, tilt:.85, zoom:1, panX:0, panY:0, spin:0,
  playing:false, showLabels:true, lastDraw:0, screen:[]
};
const canvas = $("sky");
const context = canvas.getContext("2d", {alpha:false});
const reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reducedMotion) state.playing = false;
function message(s) { html("state", s); }
function cleanName(repository) { return String(repository || "").split("/").at(-1); }
function badge(name, value) { html(name, value); }
async function getJSON(url) {
  const response = await fetch(url, {cache:"no-store", credentials:"omit"});
  if (!response.ok) throw new Error("HTTP " + response.status + " · " + url);
  return response.json();
}
function sizeCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = Math.max(1, Math.floor(w * dpr)); canvas.height = Math.max(1, Math.floor(h * dpr));
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.zoom = Math.min(state.zoom, 2);
  draw();
}
function fitView() {
  state.panX = 0; state.panY = 0;
  state.zoom = Math.max(.47, Math.min(1.3, Math.min(canvas.clientWidth / 850, canvas.clientHeight / 750)));
  draw();
}
function setItems(items, label, overview = false) {
  state.items = items;
  state.heading = label;
  state.detail = null;
  state.overview = overview;
  state.showLabels = true;
  html("scope", label);
  applyBand();
  fitView();
}
function applyBand() {
  const band = $("band").value;
  const query = $("search").value.trim().toLocaleLowerCase();
  let data = state.items;
  if (!state.overview) data = data.filter((item) => matchesBand(item, band, role));
  if (query) data = data.filter((item) => JSON.stringify([item.id,item.path,item.repository,item.label]).toLocaleLowerCase().includes(query));
  state.points = spiralLayout(data, role, state.overview);
  badge("visible", formatCount(data.length) + (query ? " найдено в текущем сегменте" : " показано"));
  $("detail").hidden = true;
  draw();
}
function viewOverview() {
  state.repo = null;
  state.shards = [];
  state.shardIndex = 0;
  $("pagination").hidden = true;
  $("back").disabled = true;
  setItems(state.manifest.repositories, "JANUS · " + formatCount(state.manifest.jsonCount) + " публичных JSON · " + state.manifest.repositoryCount + " репозиториев", true);
  message("Срез реестра: " + state.manifest.generatedAt + " · метаданные, не вывод модели");
}
async function loadShard(index) {
  if (!state.shards.length) return;
  const shard = state.shards[Math.max(0, Math.min(index, state.shards.length - 1))];
  state.shardIndex = state.shards.indexOf(shard);
  message("Загружаю сегмент " + (state.shardIndex + 1) + " / " + state.shards.length + "…");
  const data = await getJSON(INDEX_ROOT + shard.path);
  if (!data.readOnly || !Array.isArray(data.records)) throw new Error("Несовместимый read-only сегмент");
  setItems(data.records, cleanName(state.repo) + " · сегмент " + (state.shardIndex + 1) + "/" + state.shards.length);
  badge("page", (state.shardIndex + 1) + " / " + state.shards.length + " · " + data.records.length + " записей сегмента");
  $("pagination").hidden = false;
  $("prev").disabled = state.shardIndex <= 0;
  $("next").disabled = state.shardIndex >= state.shards.length - 1;
  message("Открыт сегмент публичных JSON · всего в репозитории " + formatCount(state.manifest.repositories.find(r=>r.repository===state.repo)?.jsonCount));
}
async function openRepo(repo) {
  state.repo = repo;
  state.shards = state.manifest.shards.filter(s => s.repository === repo);
  $("back").disabled = false;
  await loadShard(0);
}
function viewSemantic() {
  const data = state.synth;
  const items = Array.isArray(data.candidates) ? data.candidates : [];
  $("back").disabled = true;
  $("pagination").hidden = true;
  setItems(items, "iNaiHR · " + formatCount(items.length) + " кандидатов SYNTH");
  message("Снимок: " + String(data.generated_at || "без даты") + " · гипотезы не являются фактами");
}
function project(point) {
  const cos = Math.cos(state.spin), sin = Math.sin(state.spin);
  const xx = point.x * cos - point.y * sin;
  const yy = (point.x * sin + point.y * cos) * state.tilt;
  return {x: canvas.clientWidth / 2 + state.panX + xx * state.zoom,
    y: canvas.clientHeight / 2 + state.panY + yy * state.zoom};
}
function draw() {
  if (!context) return;
  const width = canvas.clientWidth, height = canvas.clientHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  context.setTransform(dpr,0,0,dpr,0,0);
  context.fillStyle = "#050713"; context.fillRect(0,0,width,height);
  const gradient = context.createRadialGradient(width*.52,height*.46,4,width*.52,height*.46,Math.max(width,height)*.65);
  gradient.addColorStop(0, role==="semantic"?"#210d35":"#0a2433");
  gradient.addColorStop(1,"#050713");
  context.fillStyle = gradient; context.fillRect(0,0,width,height);
  // Decorative stars and spiral guides are algorithmic: they do not represent registry records.
  for(let i=0;i<110;i++) {
    const x=(stableHash("s"+i)%10000/10000)*width, y=(stableHash("t"+i)%10000/10000)*height;
    context.fillStyle="rgba(173,198,230,.22)"; context.fillRect(x,y,1,1);
  }
  const center = project({x:0,y:0});
  for(let radius=80;radius<=340;radius+=65) {
    context.beginPath();
    context.ellipse(center.x, center.y, radius*state.zoom, Math.max(1,radius*state.zoom*state.tilt), state.spin, 0,Math.PI*2);
    context.strokeStyle="rgba(131,180,225,.11)"; context.lineWidth=1; context.stroke();
  }
  const core=context.createRadialGradient(center.x,center.y,1,center.x,center.y,44*state.zoom);
  core.addColorStop(0,role==="semantic"?"rgba(206,118,255,.6)":"rgba(93,240,210,.56)");
  core.addColorStop(1,"rgba(26,48,92,0)");
  context.fillStyle=core; context.beginPath(); context.arc(center.x,center.y,44*state.zoom,0,2*Math.PI);context.fill();
  const hit = [];
  for(const point of state.points) {
    const p = project(point);
    if (p.x<-30 || p.y<-30 || p.x>width+30 || p.y>height+30) continue;
    hit.push({...p,point});
    const selected=state.detail?.id===point.id;
    const radius=Math.max(2,point.size*state.zoom*(selected?1.55:1));
    context.beginPath();context.arc(p.x,p.y,radius,0,Math.PI*2);
    context.shadowBlur=selected?25:12; context.shadowColor=point.color; context.fillStyle=point.color; context.fill();
    context.shadowBlur=0;
    if(state.showLabels && (state.overview || selected || (state.zoom>1.65 && state.points.length<=250))) {
      const label=state.overview?cleanName(point.item.repository):String(point.item.path||point.item.label||point.id).split("/").at(-1);
      context.font="12px system-ui";context.textAlign="center";context.fillStyle=selected?"#fff":"rgba(224,236,251,.85)";
      context.fillText(label.length>34?label.slice(0,31)+"…":label,p.x,p.y+radius+15,190);
    }
  }
  state.screen=hit;
}
function showDetail(point) {
  state.detail = point;
  const record = point.item;
  $("detail").hidden = false;
  badge("node-title", state.overview?cleanName(record.repository):String(record.path || record.label || point.id));
  const link = $("source-link");
  link.hidden = true; link.removeAttribute("href");
  if (state.overview) {
    badge("node-summary", formatCount(record.jsonCount)+" JSON · "+record.sourceMode+" · "+(record.complete?"индекс полный":"частичный"));
    badge("node-origin",record.repository+"\ncommit: "+record.commit);
    badge("detail-hint","Нажми «Погрузиться», чтобы открыть первые записи");
    $("dive").hidden=false;
  } else if(role==="semantic") {
    const sources=record.meaning?.evidence?.source_records || [];
    badge("node-summary","Кандидат · depth "+record.depth+" · attention "+record.attention_score+" · "+String(record.status));
    badge("node-origin","ID: "+record.id+"\nисточников: "+sources.length+"\n"+sources.slice(0,4).map(s=>s.path || s.id).join("\n"));
    badge("detail-hint","ATTENTION ≠ EVIDENCE · SYNTHESIS ≠ TRUTH · автоматического допуска нет");
    $("dive").hidden=true;
  } else {
    badge("node-summary",record.memoryClass+" · "+formatCount(record.sizeBytes)+" байт · метаданные");
    badge("node-origin",record.repository+"\n"+record.path+"\ncommit: "+record.sourceCommit+"\nblob: "+record.gitBlobSha);
    badge("detail-hint","Источник закреплён на коммите · этот интерфейс не редактирует JSON");
    if(safeGithub(record.sourceUrl)){link.href=record.sourceUrl;link.hidden=false;}
    $("dive").hidden=true;
  }
  draw();
}
async function start() {
  sizeCanvas();
  if(role==="registry"){
    const manifest=await getJSON(INDEX_ROOT+"assets/janus-json-atlas/manifest.json");
    if(manifest.schema!=="janus.hrain.github_json_constellation_manifest.v1" || manifest.authority?.readOnly!==true)
      throw new Error("Недоверенный формат индекса: только read-only");
    state.manifest=manifest;
    viewOverview();
  } else {
    const synth=await getJSON("./janus-synth/state/JANUS_SYNTH_LATEST.json");
    if(!Array.isArray(synth.candidates)) throw new Error("Неизвестный формат SYNTH");
    state.synth=synth;
    viewSemantic();
  }
}
$("band").addEventListener("change",applyBand);
$("search").addEventListener("input",applyBand);
$("back").addEventListener("click",()=>{if(state.manifest){$("search").value="";viewOverview();}});
$("prev").addEventListener("click",()=>loadShard(state.shardIndex-1).catch(e=>message(e.message)));
$("next").addEventListener("click",()=>loadShard(state.shardIndex+1).catch(e=>message(e.message)));
$("reset").addEventListener("click",()=>{state.spin=0;state.tilt=.85;$("tilt").value=".85";fitView();});
$("tilt").addEventListener("input",e=>{state.tilt=Number(e.target.value);draw();});
$("labels").addEventListener("click",()=>{state.showLabels=!state.showLabels;draw();});
$("tour").addEventListener("click",()=>{state.playing=!state.playing;$("tour").textContent=state.playing?"Пауза":"Автооблёт";});
$("dive").addEventListener("click",()=>{if(state.detail?.item?.repository)openRepo(state.detail.item.repository).catch(e=>message(e.message));});
$("close").addEventListener("click",()=>{$("detail").hidden=true;state.detail=null;draw();});
let down=null;
canvas.addEventListener("pointerdown",e=>{down={x:e.clientX,y:e.clientY,panX:state.panX,panY:state.panY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener("pointermove",e=>{if(!down)return;state.panX=down.panX+e.clientX-down.x;state.panY=down.panY+e.clientY-down.y;draw();});
canvas.addEventListener("pointerup",e=>{
  if(!down)return;
  const move=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;
  if(move>6)return;
  const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
  const closest=state.screen.map(p=>({...p,distance:Math.hypot(p.x-x,p.y-y)})).sort((a,b)=>a.distance-b.distance)[0];
  if(closest && closest.distance<19) showDetail(closest.point);
});
canvas.addEventListener("wheel",e=>{e.preventDefault();state.zoom=Math.max(.18,Math.min(6,state.zoom*(e.deltaY<0?1.12:.89)));draw();},{passive:false});
window.addEventListener("keydown",e=>{
 if(e.key==="Escape"){$("detail").hidden=true;state.detail=null;draw();}
 if(e.key===" " && e.target.tagName!=="INPUT"){e.preventDefault();$("tour").click();}
});
window.addEventListener("resize",sizeCanvas);
let previous=0;
function animate(now){
 if(now-previous>=40 && state.playing && !document.hidden && !reducedMotion){state.spin+=.0015;draw();previous=now;}
 requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
start().catch(e=>{message("Не удалось загрузить данные: "+e.message);$("scope").textContent="Ошибка данных — граф не синтезирован";});

} // End browser-only runtime; pure layout/filter functions can be tested in Node.
