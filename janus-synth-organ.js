(() => {
'use strict';

const CONTRACT='JANUS_SYNTH_ORGAN_V1';
const REGISTRY_URL='https://hawkar-usls.github.io/janus-meta-registry/assets/hrain-registry-index.json';
const EXPECTED_REGISTRY_SCHEMA='janus.hrain.registry_graph_index.v1_0';
const STORAGE_KEY='inaihr_v2';
const LEGACY_KEY='inaihr_v1';
const PROVENANCE_KEY='inaihr_janus_synth_v1';
const SESSION_GUARD='inaihr_janus_synth_reload_guard_v1';
const DEFAULT_BACKEND='https://supperless-yoshiko-noneruditely.ngrok-free.dev';
const AUTO_INTERVAL_MS=180000;
const MAX_PROVENANCE=256;

const norm=s=>String(s||'').replace(/^\p{Extended_Pictographic}+\s*/u,'').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ');
const endpoint=x=>(x&&typeof x==='object')?x.id:x;
const nowIso=()=>new Date().toISOString();
const clampLabel=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,110);
const tokens=s=>new Set(norm(s).split(' ').filter(x=>x.length>2));

function readGraph(){
 for(const key of [STORAGE_KEY,LEGACY_KEY]){
  try{
   const d=JSON.parse(localStorage.getItem(key)||'null');
   if(d&&Array.isArray(d.nodes)&&Array.isArray(d.links))return {nodes:d.nodes,links:d.links};
  }catch(_){ }
 }
 return {nodes:[{id:1,label:'Origin',x:innerWidth/2,y:innerHeight/2}],links:[]};
}
function writeGraph(g){localStorage.setItem(STORAGE_KEY,JSON.stringify(g));}
function readMemory(){
 try{
  const d=JSON.parse(localStorage.getItem(PROVENANCE_KEY)||'null');
  if(d&&d.schema==='janus.inaihr.synth_memory.v1'&&Array.isArray(d.receipts))return d;
 }catch(_){ }
 return {schema:'janus.inaihr.synth_memory.v1',receipts:[],registryRefs:{}};
}
function writeMemory(m){
 m.receipts=m.receipts.slice(-MAX_PROVENANCE);
 localStorage.setItem(PROVENANCE_KEY,JSON.stringify(m));
}
function pairKey(a,b){return [String(a),String(b)].sort().join('|');}
function linkSet(links){
 const out=new Set();
 for(const l of links){const a=endpoint(l.source),b=endpoint(l.target);if(a!=null&&b!=null)out.add(pairKey(a,b));}
 return out;
}
function adjacency(nodes,links){
 const ids=new Set(nodes.map(n=>String(n.id)));const a=new Map();
 for(const id of ids)a.set(id,new Set());
 for(const l of links){const s=String(endpoint(l.source)),t=String(endpoint(l.target));if(!ids.has(s)||!ids.has(t)||s===t)continue;a.get(s).add(t);a.get(t).add(s);}
 return a;
}
function nodeMap(nodes){return new Map(nodes.map(n=>[String(n.id),n]));}
function seenSignatures(memory){return new Set(memory.receipts.map(r=>r.signature).filter(Boolean));}

function localMotifs(graph,memory){
 const map=nodeMap(graph.nodes),adj=adjacency(graph.nodes,graph.links),direct=linkSet(graph.links),seen=seenSignatures(memory),out=[];
 for(const [pivotId,ns] of adj){
  const list=[...ns];
  if(list.length<2)continue;
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
   const a=list[i],b=list[j]; if(direct.has(pairKey(a,b)))continue;
   const na=map.get(a),nb=map.get(b),p=map.get(pivotId); if(!na||!nb||!p)continue;
   const sig=`LOCAL_PATH2:${pairKey(a,b)}:VIA:${pivotId}`; if(seen.has(sig))continue;
   const ta=tokens(na.label),tb=tokens(nb.label);let shared=0;for(const t of ta)if(tb.has(t))shared++;
   out.push({kind:'INAIHR_EXISTING_PATH2',signature:sig,pivot:{id:pivotId,label:p.label},sources:[{id:a,label:na.label,localId:na.id},{id:b,label:nb.label,localId:nb.id}],score:50+list.length*3+shared});
  }
 }
 return out.sort((x,y)=>y.score-x.score);
}

function registryMotifs(reg,memory){
 const nodes=(reg.nodes||[]).filter(n=>String(n.id||'').startsWith('obj:')&&n.readOnly===true&&n.status!=='INVALID_JSON');
 const map=nodeMap(reg.nodes||[]),adj=adjacency(reg.nodes||[],reg.links||[]),direct=linkSet(reg.links||[]),seen=seenSignatures(memory),out=[];
 const fresh=[...nodes].sort((a,b)=>String(b.modifiedAt||'').localeCompare(String(a.modifiedAt||''))).slice(0,90);
 const freshIds=new Set(fresh.map(n=>String(n.id)));
 for(const [pivotId,ns0] of adj){
  const ns=[...ns0].filter(id=>freshIds.has(id));
  if(ns.length<2)continue;
  for(let i=0;i<ns.length;i++)for(let j=i+1;j<ns.length;j++){
   const a=ns[i],b=ns[j];if(direct.has(pairKey(a,b)))continue;
   const na=map.get(a),nb=map.get(b),p=map.get(pivotId);if(!na||!nb||!p)continue;
   const sig=`HRAIN_PATH2:${pairKey(a,b)}:VIA:${pivotId}:AT:${reg.sourceCommit||'unknown'}`;if(seen.has(sig))continue;
   const ta=tokens(na.label),tb=tokens(nb.label);let shared=0;for(const t of ta)if(tb.has(t))shared++;
   out.push({kind:'HRAIN_REGISTRY_EXISTING_PATH2',signature:sig,pivot:{id:pivotId,label:p.label},sources:[{id:a,label:na.label,sourceUrl:na.sourceUrl,path:na.path,status:na.status},{id:b,label:nb.label,sourceUrl:nb.sourceUrl,path:nb.path,status:nb.status}],score:35+shared*5,registrySourceCommit:reg.sourceCommit||null});
  }
 }
 // Fallback: the registry projection is often a parent tree. Two objects sharing the same parent are an existing two-edge motif even if link materialization is sparse.
 const groups=new Map();
 for(const n of fresh){const p=String(n.parentId||'');if(!p)continue;if(!groups.has(p))groups.set(p,[]);groups.get(p).push(n);}
 for(const [pivotId,arr] of groups){
  for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){
   const na=arr[i],nb=arr[j],sig=`HRAIN_SHARED_PARENT:${pairKey(na.id,nb.id)}:VIA:${pivotId}:AT:${reg.sourceCommit||'unknown'}`;if(seen.has(sig))continue;
   const ta=tokens(na.label),tb=tokens(nb.label);let shared=0;for(const t of ta)if(tb.has(t))shared++;
   out.push({kind:'HRAIN_REGISTRY_SHARED_PARENT_LINKS',signature:sig,pivot:{id:pivotId,label:(map.get(pivotId)||{}).label||pivotId},sources:[{id:na.id,label:na.label,sourceUrl:na.sourceUrl,path:na.path,status:na.status},{id:nb.id,label:nb.label,sourceUrl:nb.sourceUrl,path:nb.path,status:nb.status}],score:20+shared*7,registrySourceCommit:reg.sourceCommit||null});
  }
 }
 return out.sort((x,y)=>y.score-x.score);
}

function chooseMotif(graph,reg,memory){
 const local=localMotifs(graph,memory);if(local.length)return local[0];
 const remote=registryMotifs(reg,memory);return remote[0]||null;
}

function backendCandidates(){
 const out=[];try{const q=new URL(location.href).searchParams.get('backend');if(q)out.push(q.replace(/\/$/,''));}catch(_){ }
 try{const saved=localStorage.getItem('hrain_backend');if(saved)out.push(saved.replace(/\/$/,''));}catch(_){ }
 out.push(DEFAULT_BACKEND);return [...new Set(out)];
}
async function fetchTimeout(url,opts={},ms=9000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await fetch(url,{...opts,signal:c.signal});}finally{clearTimeout(t);}}
function parseJsonText(text){const clean=String(text||'').replace(/```json|```/g,'').trim(),a=clean.indexOf('{'),b=clean.lastIndexOf('}');if(a<0||b<=a)throw new Error('NO_JSON_OBJECT');return JSON.parse(clean.slice(a,b+1));}
async function remoteCompose(motif){
 const src=motif.sources.map((s,i)=>`${i+1}. ${s.label}`).join('\n');
 const prompt=`You are JANUS SYNTH, a candidate-only synthesis organ. Use the EXISTING graph motif below, not isolated keyword association. Build exactly ONE concise new concept that is useful only when the connected sources are considered together. Do not claim truth, proof, causality, authority, or scientific validation. Do not merely join the names.\n\nEXISTING MOTIF TYPE: ${motif.kind}\nSOURCE A/B:\n${src}\nEXISTING PIVOT/BRIDGE: ${motif.pivot.label}\n\nReturn JSON only: {"label":"2-9 word synthesis","bridge":"one short sentence describing what relation is being proposed","confidence":0.0}.`;
 let last=null;
 for(const base of backendCandidates()){
  try{
   const r=await fetchTimeout(base+'/api/hrain/sync',{method:'POST',headers:{'Content-Type':'application/json','ngrok-skip-browser-warning':'true'},body:JSON.stringify({text:prompt,client:'inaihr-janus-synth-v1'})});
   if(!r.ok)throw new Error('HTTP_'+r.status);const payload=await r.json();const text=payload.text||payload.response||payload.output||payload.message||payload.result?.text;const obj=typeof text==='string'?parseJsonText(text):(payload.result&&typeof payload.result==='object'?payload.result:payload);
   return {mode:'JANUS REMOTE SYNTH',result:obj};
  }catch(e){last=e;}
 }
 throw last||new Error('NO_BACKEND');
}
function fallbackCompose(motif){
 const a=clampLabel(motif.sources[0].label).split(/\s+/).slice(0,4).join(' '),b=clampLabel(motif.sources[1].label).split(/\s+/).slice(0,4).join(' ');
 return {mode:'JANUS STRUCTURAL SYNTH',result:{label:`⟁ ${a} ↔ ${b}`,bridge:`Candidate bridge inferred from the existing ${motif.kind} motif through ${clampLabel(motif.pivot.label)}.`,confidence:0}};
}
function verifyCandidate(bundle,motif,graph){
 const label=clampLabel(bundle?.result?.label),bridge=clampLabel(bundle?.result?.bridge);if(label.length<3||label.length>110)return null;
 const nl=norm(label);if(!nl||motif.sources.some(s=>norm(s.label)===nl)||norm(motif.pivot.label)===nl)return null;
 if(graph.nodes.some(n=>norm(n.label)===nl))return null;
 const c=Number(bundle?.result?.confidence);return {label,bridge:bridge||'Candidate composition of existing linked sources.',confidence:Number.isFinite(c)?Math.max(0,Math.min(1,c)):0,mode:bundle.mode};
}
function ensureRegistryRef(graph,memory,source,index,total){
 const key=String(source.id),existing=memory.registryRefs[key];if(existing&&graph.nodes.some(n=>String(n.id)===String(existing)))return existing;
 const id=Date.now()+index+1;const angle=(Math.PI*2*index)/Math.max(2,total),r=120;
 graph.nodes.push({id,label:`⌁ ${clampLabel(source.label)}`,x:innerWidth/2+Math.cos(angle)*r,y:innerHeight/2+Math.sin(angle)*r,isAI:false});memory.registryRefs[key]=id;return id;
}
function materialize(graph,memory,motif,candidate){
 let anchors=[];
 if(motif.kind.startsWith('INAIHR_'))anchors=motif.sources.map(s=>s.localId);
 else anchors=motif.sources.map((s,i)=>ensureRegistryRef(graph,memory,s,i,motif.sources.length));
 const anchorNodes=anchors.map(id=>graph.nodes.find(n=>String(n.id)===String(id))).filter(Boolean);const cx=anchorNodes.length?anchorNodes.reduce((z,n)=>z+(Number(n.x)||innerWidth/2),0)/anchorNodes.length:innerWidth/2;const cy=anchorNodes.length?anchorNodes.reduce((z,n)=>z+(Number(n.y)||innerHeight/2),0)/anchorNodes.length:innerHeight/2;
 const id=Date.now()+1000+Math.floor(Math.random()*1000);graph.nodes.push({id,label:`✦ ${candidate.label}`,x:cx+40,y:cy-40,isAI:true});
 for(const a of anchors){if(!graph.links.some(l=>pairKey(endpoint(l.source),endpoint(l.target))===pairKey(a,id)))graph.links.push({source:a,target:id});}
 const receipt={schema:'janus.inaihr.synth_receipt.v1',contract:CONTRACT,candidateId:id,createdAt:nowIso(),signature:motif.signature,motif,candidate,authority:{candidateOnly:true,registryMutation:false,proofAuthority:false,truthAuthority:false,automaticPromotion:false},law:'EXISTING_LINKS -> COMPOSE -> STRUCTURAL_VERIFY -> LOCAL_CANDIDATE; SYNTHESIS != TRUTH'};
 memory.receipts.push(receipt);memory.lastRegistrySourceCommit=motif.registrySourceCommit||memory.lastRegistrySourceCommit||null;writeGraph(graph);writeMemory(memory);return receipt;
}
async function fetchRegistry(){const r=await fetch(REGISTRY_URL,{cache:'no-store',headers:{Accept:'application/json'}});if(!r.ok)throw new Error('REGISTRY_HTTP_'+r.status);const d=await r.json();if(d.schema!==EXPECTED_REGISTRY_SCHEMA||!Array.isArray(d.nodes)||!Array.isArray(d.links)||!d.nodes.every(n=>n.readOnly===true))throw new Error('REGISTRY_CONTRACT_REJECTED');return d;}
function state(text){const el=document.getElementById('ai-state');if(el)el.textContent=text;}
function toast(text){const el=document.getElementById('message');if(!el)return;el.textContent=text;el.style.opacity=1;setTimeout(()=>{el.style.opacity=0;},2200);}
let running=false;
async function janusSynthesis(force=false){
 if(running)return;running=true;const btn=document.getElementById('btn-synth');if(btn){btn.disabled=true;btn.classList.add('loading');btn.textContent='JANUS SYNTH…';}
 try{
  state('JANUS SYNTH · SCANNING LINKS');const graph=readGraph(),memory=readMemory(),reg=await fetchRegistry(),motif=chooseMotif(graph,reg,memory);
  if(!motif){state('JANUS SYNTH · NO NEW MOTIF');if(force)toast('NO NEW LINK MOTIF');return;}
  let bundle;try{bundle=await remoteCompose(motif);}catch(e){console.warn('JANUS SYNTH remote unavailable',e);bundle=fallbackCompose(motif);}
  const candidate=verifyCandidate(bundle,motif,graph);if(!candidate){memory.receipts.push({schema:'janus.inaihr.synth_receipt.v1',contract:CONTRACT,createdAt:nowIso(),signature:motif.signature,motif,verdict:'REJECTED_STRUCTURAL_VERIFY',authority:{candidateOnly:true}});writeMemory(memory);state('JANUS SYNTH · REJECTED');return;}
  const receipt=materialize(graph,memory,motif,candidate);state('JANUS SYNTH · CANDIDATE PRESERVED');toast(`JANUS SYNTH · ${candidate.label}`);console.info(CONTRACT,receipt);
  sessionStorage.setItem(SESSION_GUARD,String(Date.now()));setTimeout(()=>location.reload(),900);
 }catch(e){console.warn(CONTRACT,e);state('JANUS SYNTH · DEGRADED');if(force)toast('SYNTH DEGRADED · CHECK UPLINK');}
 finally{running=false;if(btn){btn.disabled=false;btn.classList.remove('loading');btn.classList.add('active');btn.style.opacity='1';btn.style.pointerEvents='auto';btn.textContent='SYNTH · JANUS';}}
}
function install(){
 const btn=document.getElementById('btn-synth');if(!btn)return setTimeout(install,100);
 btn.classList.add('active');btn.style.opacity='1';btn.style.pointerEvents='auto';btn.disabled=false;btn.textContent='SYNTH · JANUS';btn.title='JANUS autonomous synthesis from existing HRaiN + iNaiHR links. Click to force one cycle.';btn.onclick=e=>{e.preventDefault();e.stopPropagation();janusSynthesis(true);};
 state('JANUS SYNTH · AUTO');
 const last=Number(sessionStorage.getItem(SESSION_GUARD)||0);if(Date.now()-last>60000)setTimeout(()=>janusSynthesis(false),1600);
 setInterval(()=>janusSynthesis(false),AUTO_INTERVAL_MS);
 window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY)setTimeout(()=>janusSynthesis(false),1200);});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
