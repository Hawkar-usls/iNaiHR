/* JANUS ATLAS / native HRAiN and iNaiHR adapter.
 * Preserves each organism's own D3 graph; never opens the retired replica map.
 * A separate read-only drawer links verified public GitHub JSON to the
 * EXISTING JANUS graph via the optional JANUSAtlasNativeFocus callback.
 */
(()=>{
'use strict';
const API='https://api.github.com/repos/Hawkar-usls/Hrain/commits?path=assets/janus-json-atlas/manifest.json&per_page=1';
const ORIGIN='https://raw.githubusercontent.com/Hawkar-usls/Hrain/';
const MAX_FILE=2_000_000;
const STORE={manifest:null,revision:'',rows:new Map(),loaded:new Set(),focus:null,matches:[],busy:false};
const isInai=/inaihr/i.test(location.hostname)||document.title.toLowerCase().includes('inaihr');
const X=id=>document.getElementById('janus-atlas-'+id);
function make(tag,txt,cls){let e=document.createElement(tag);if(txt!==undefined&&txt!==null)e.textContent=String(txt);if(cls)e.className=cls;return e}
function status(msg,err){let e=X('status');if(e){e.textContent=msg;e.dataset.error=err?'yes':'no'}}
function sha(bytes,algo='SHA-256'){return crypto.subtle.digest(algo,bytes).then(ab=>[...new Uint8Array(ab)].map(b=>b.toString(16).padStart(2,'0')).join(''))}
function limitJSON(url){return fetch(url,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP_'+r.status);return r.json()})}
async function initCatalog(){
 if(STORE.manifest)return STORE.manifest;
 const data=await limitJSON(API),revision=data?.[0]?.sha;
 if(typeof revision!=='string'||!/^[a-f0-9]{40}$/.test(revision))throw Error('NO_IMMUTABLE_MANIFEST_COMMIT');
 const manifest=await limitJSON(ORIGIN+revision+'/assets/janus-json-atlas/manifest.json');
 if(manifest.schema!=='janus.hrain.github_json_constellation_manifest.v1'||
  manifest.authority?.readOnly!==true||manifest.authority?.writeAuthority!==false||
  manifest.privateRepositoriesIncluded!==false||!Array.isArray(manifest.shards)||manifest.shardCount!==manifest.shards.length)
  throw Error('CATALOG_AUTHORITY_HOLD');
 STORE.revision=revision;STORE.manifest=manifest;
 const select=X('repo');for(const r of manifest.repositories){
  let o=make('option',r.repository.split('/')[1]+' · '+r.jsonCount);o.value=r.repository;select.append(o);
 }
 X('stamp').textContent=manifest.jsonCount.toLocaleString()+' JSON · '+manifest.repositoryCount+' public repos · '+revision.slice(0,10);
 return manifest;
}
async function getShard(s){
 if(STORE.loaded.has(s.index))return;
 if(!/^assets\/janus-json-atlas\/shards\/[0-9]{4}\.json$/.test(s.path))throw Error('SHARD_PATH_HOLD');
 const uri=ORIGIN+STORE.revision+'/'+s.path,resp=await fetch(uri,{cache:'no-store'});
 if(!resp.ok)throw Error('SHARD_HTTP_'+resp.status);
 const bytes=await resp.arrayBuffer();
 if(await sha(bytes)!==s.sha256)throw Error('SHARD_SHA256_MISMATCH_'+s.index);
 const v=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 const ref=STORE.manifest.repositories.find(x=>x.repository===s.repository);
 if(!ref||v.sourceCommit!==ref.commit||v.repository!==s.repository||v.records?.length!==s.count||
 v.schema!=='janus.hrain.github_json_constellation_shard.v1'||v.readOnly!==true)throw Error('SHARD_SOURCE_HOLD_'+s.index);
 const pending=[];
 for(const r of v.records){
  if(r.repository!==s.repository||r.sourceCommit!==ref.commit||!r.readOnly||r.deleteAllowed!==false||
   !r.path.endsWith('.json')||!r.sourceUrl?.startsWith('https://github.com/'+s.repository+'/blob/'+ref.commit+'/'))
    throw Error('SOURCE_POLICY_HOLD_'+s.index);
  if(STORE.rows.has(r.id))throw Error('DUPLICATE_INDEX_ID');
  pending.push(r);
 }
 pending.forEach(r=>STORE.rows.set(r.id,r));STORE.loaded.add(s.index);
}
async function loadSelection(all=false){
 if(STORE.busy)return;
 STORE.busy=true;X('load').disabled=true;X('all').disabled=true;
 try{
  const m=await initCatalog(),repo=all?'':X('repo').value;
  const sources=m.shards.filter(s=>!repo||s.repository===repo);
  status('Verifying '+sources.length+' source shards from commit '+STORE.revision.slice(0,10)+'…');
  for(let p=0;p<sources.length;p+=6){
   await Promise.all(sources.slice(p,p+6).map(getShard));
  }
  status('Verified '+STORE.loaded.size+' source shards · '+STORE.rows.size.toLocaleString()+' JSON');
  filterRows();
 }catch(e){status('HOLD · '+e.message,true)}
 finally{STORE.busy=false;X('load').disabled=false;X('all').disabled=false}
}
function filterRows(){
 const query=X('query').value.trim().toLocaleLowerCase(),rep=X('repo').value;
 const words=query.split(/\s+/).filter(Boolean);
 const rows=[...STORE.rows.values()].filter(r=>(!rep||rep===r.repository)&&(!words.length||words.every(w=>(r.path+' '+r.repository).toLowerCase().includes(w))));
 rows.sort((a,b)=>a.repository.localeCompare(b.repository)||a.path.localeCompare(b.path));
 STORE.matches=rows;
 const list=X('results');list.replaceChildren();
 X('shown').textContent=rows.length.toLocaleString()+' matching indexed JSON';
 for(const r of rows.slice(0,100)){
  const b=make('button',null,'janus-atlas-hit');b.type='button';
  b.append(make('strong',r.path.split('/').pop()),make('small',r.repository+' / '+r.path));
  b.onclick=()=>choose(r);
  list.append(b);
 }
 if(rows.length>100)list.append(make('p','Showing first 100; refine your query.','janus-atlas-note'));
 if(!rows.length)list.append(make('p','No verified source matches. Choose a repository or VERIFY ALL.','janus-atlas-note'));
}
async function sourceBytes(r){
 if(!/^Hawkar-usls\/[A-Za-z0-9_.-]+$/.test(r.repository)||!(/^[a-f0-9]{40}$/.test(r.sourceCommit))||
 !r.path.endsWith('.json')||r.path.split('/').some(p=>!p||p==='..'||p==='.'||p.includes('\\')))
  throw Error('UNTRUSTED_SOURCE_PATH');
 const expected='https://github.com/'+r.repository+'/blob/'+r.sourceCommit+'/'+r.path.split('/').map(encodeURIComponent).join('/');
 if(expected!==r.sourceUrl||!Number.isSafeInteger(r.sizeBytes)||r.sizeBytes<=0||r.sizeBytes>MAX_FILE)
  throw Error('SOURCE_TOO_LARGE_OR_ORIGIN_CHANGED');
 const raw='https://raw.githubusercontent.com/'+r.repository+'/'+r.sourceCommit+'/'+r.path.split('/').map(encodeURIComponent).join('/');
 const resp=await fetch(raw,{cache:'no-store'});
 if(!resp.ok)throw Error('SOURCE_HTTP_'+resp.status);
 if(Number(resp.headers.get('content-length')||0)>MAX_FILE)throw Error('SOURCE_OVER_CAP');
 const reader=resp.body.getReader();let size=0;const parts=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
  if(size>MAX_FILE){reader.cancel();throw Error('SOURCE_STREAM_OVER_CAP')}parts.push(value)}
 if(size!==r.sizeBytes)throw Error('SOURCE_SIZE_DRIFT');
 const bytes=new Uint8Array(size);let pos=0;for(const p of parts){bytes.set(p,pos);pos+=p.length}
 const head=new TextEncoder().encode('blob '+size+String.fromCharCode(0));
 const full=new Uint8Array(head.length+size);full.set(head);full.set(bytes,head.length);
 if(!/^[a-f0-9]{40}$/.test(r.gitBlobSha||'')||await sha(full,'SHA-1')!==r.gitBlobSha)throw Error('GITHUB_BLOB_INTEGRITY_HOLD');
 const digest=await sha(bytes);
 if(r.sourceSha256&&digest!==r.sourceSha256)throw Error('META_REGISTRY_DIGEST_HOLD');
 return {doc:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),digest,size};
}
function enumerate(obj){
 const rows=[];
 function walk(v,ptr,depth){
  if(rows.length>=90||depth>6)return;
  if(v!==null&&typeof v==='object'){
   const pairs=Array.isArray(v)?v.slice(0,90).map((x,i)=>[String(i),x]):Object.entries(v).slice(0,90);
   for(const [k,x] of pairs)walk(x,ptr+'/'+k.replaceAll('~','~0').replaceAll('/','~1'),depth+1);
  }else rows.push([ptr||'/',JSON.stringify(v)?.slice(0,320)||'null']);
 }
 walk(obj,'',0);return rows;
}
function choose(r){
 STORE.focus=r;const panel=X('focus');panel.replaceChildren();
 panel.append(make('h3',r.path.split('/').pop()),make('code',r.repository+'@'+r.sourceCommit+':'+r.path));
 const link=make('a','OPEN EXACT GITHUB SOURCE ↗','janus-atlas-action');
 link.href=r.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';panel.append(link);
 const add=make('button','VIEW INDEX NEIGHBOURS · CANDIDATES ONLY','janus-atlas-action');
 add.onclick=()=>{if(typeof window.JANUSAtlasNativeFocus==='function'){
   window.JANUSAtlasNativeFocus([r,...STORE.matches.filter(x=>x.id!==r.id).slice(0,15)]);closeDrawer(false);
 }else{
   status('This native desk is intentionally protected: use JANUS Living Registry for graph projection.',false);
 }};
 panel.append(add);
 const verify=make('button','VERIFY BYTES + READ JSON FIELDS','janus-atlas-action');
 const fields=make('div',null,'janus-atlas-fields');
 verify.onclick=async()=>{
  verify.disabled=true;fields.replaceChildren(make('p','Checking SHA/Git blob…','janus-atlas-note'));
  try{const v=await sourceBytes(r);
   if(STORE.focus!==r)return;
   fields.replaceChildren(make('p','VERIFIED SHA256 '+v.digest.slice(0,24)+'… · '+v.size+' bytes','janus-atlas-ok'));
   for(const [ptr,val] of enumerate(v.doc)){let item=make('div',null,'janus-atlas-field');
    item.append(make('code',ptr),make('span',val));fields.append(item)}
   if(!window.JANUSExplicitLinks?.find)throw Error('EXPLICIT_REFERENCE_RESOLVER_UNAVAILABLE');
   const refs=window.JANUSExplicitLinks.find(v.doc,r,STORE.rows);
   fields.append(make('h4','EXPLICIT JSON LINKS · FROZEN CATALOG · '+refs.resolved.length+' indexed','janus-atlas-ok'));
   fields.append(make('p','Source bytes SHA/Git verified. A main-branch link is rebound ONLY to catalog snapshot; target INDEXED only. No historical identity, target-byte verification or scientific truth implied.','janus-atlas-note'));
   if(!refs.resolved.length)fields.append(make('p','No target URLs in loaded verified shards. Use VERIFY ALL to resolve cross-repository links.','janus-atlas-note'));
   for(const edge of refs.resolved.slice(0,16)){
    const target=STORE.rows.get(edge.targetId);
    if(!target)throw Error('EDGE_TARGET_NOT_INDEXED');
    const btn=make('button',null,'janus-atlas-hit');
    btn.type='button';btn.append(make('strong',edge.pointer||'(root)'),make('small','EXPLICIT '+(edge.referenceMode==='BRANCH_MAIN_REBOUND_TO_SNAPSHOT'?'main→snapshot':'pinned commit')+' → '+target.repository+'/'+target.path+' · target indexed only'));
    btn.onclick=()=>choose(target);fields.append(btn);
   }
   if(refs.unresolved.length)fields.append(make('p',refs.unresolved.length+' explicit URLs without a matching target in loaded verified shards; no edge inferred.','janus-atlas-note'));
   if(refs.truncated)fields.append(make('p','Bounded reference scan: results may be incomplete.','janus-atlas-note'));
   if(refs.resolved.length&&typeof window.JANUSAtlasNativeFocus==='function'){
    const unique=[...new Set(refs.resolved.map(e=>e.targetId))].slice(0,12);
    const graph=make('button','PROJECT EXPLICIT LINKS INTO ORIGINAL GRAPH','janus-atlas-action');
    graph.onclick=()=>{
     if(STORE.focus!==r)return;
     const records=[r,...unique.map(id=>STORE.rows.get(id)).filter(Boolean)];
     const ids=new Set(records.map(x=>x.id));
     const links=refs.resolved.filter(e=>ids.has(e.targetId)).map(e=>({sourceId:e.sourceId,targetId:e.targetId,pointer:e.pointer,evidence:'explicit-json-url'}));
     window.JANUSAtlasNativeFocus(records,links);closeDrawer(false);
    };
    fields.append(graph);
   }

  }catch(e){fields.replaceChildren(make('p','FAIL CLOSED · '+e.message,'janus-atlas-fail'))}
  finally{verify.disabled=false}
 };
 panel.append(verify,fields);
 const index=make('button','INDEXED LINKS · FULL PUBLIC CATALOG','janus-atlas-action');
 const result=make('div',null,'janus-atlas-fields');
 index.onclick=async()=>{
  index.disabled=true;result.replaceChildren(make('p','Checking relation-index snapshot provenance…','janus-atlas-note'));
  try{await showIndexedLinks(r,result)}
  catch(e){result.replaceChildren(make('p','RELATION INDEX HOLD · '+e.message,'janus-atlas-fail'))}
  finally{index.disabled=false}
 };
 panel.append(index,result);
}
const RELATION_API='https://api.github.com/repos/Hawkar-usls/Hrain/commits?path=assets/janus-json-relations/manifest.json&per_page=1';
const RELATIONS={revision:'',manifest:null,catalogHash:'',shards:new Map()};
async function getPinnedJSON(url){
 const response=await fetch(url,{cache:'no-store'});
 if(!response.ok)throw Error('HTTP_'+response.status);
 const bytes=await response.arrayBuffer();
 return {digest:await sha(bytes),value:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))};
}
async function verifyRelationManifest(){
 if(RELATIONS.manifest)return RELATIONS.manifest;
 const catalogue=await initCatalog();
 const hashes=await getPinnedJSON(ORIGIN+STORE.revision+'/assets/janus-json-atlas/manifest.json');
 if(hashes.value.schema!==catalogue.schema||hashes.value.jsonCount!==catalogue.jsonCount)throw Error('CATALOG_REPIN_HOLD');
 const commits=await limitJSON(RELATION_API);
 const rev=commits?.[0]?.sha;
 if(!/^[a-f0-9]{40}$/.test(rev||''))throw Error('NO_RELATION_INDEX_COMMIT');
 const obj=await getPinnedJSON(ORIGIN+rev+'/assets/janus-json-relations/manifest.json');
 const m=obj.value;
 if(m.schema!=='janus.hrain.json_explicit_relations.v1'||m.authority?.readOnly!==true||
    m.authority?.writeAuthority!==false||m.authority?.sourceMutationAllowed!==false||
    m.authority?.semanticHypothesesAreEvidence!==false||m.authority?.topaVerdictsAreAutoInferred!==false||
    m.sourceCatalogSha256!==hashes.digest||m.sourceCatalogJsonCount!==catalogue.jsonCount||
    m.publicRepositoryCount!==catalogue.repositoryCount||!Array.isArray(m.shards)||
    m.shards.length!==catalogue.repositoryCount)
  throw Error('RELATION_INDEX_NOT_FOR_CURRENT_VERIFIED_CATALOG');
 RELATIONS.revision=rev;RELATIONS.catalogHash=hashes.digest;RELATIONS.manifest=m;
 return m;
}
async function verifyRelationShard(repo){
 if(RELATIONS.shards.has(repo))return RELATIONS.shards.get(repo);
 const m=await verifyRelationManifest();
 const desc=m.shards.find(s=>s.repository===repo);
 if(!desc||!/^assets\/janus-json-relations\/shards\/[0-9]{2}\.json$/.test(desc.path)||
  !/^[a-f0-9]{64}$/.test(desc.sha256||'')||!Number.isInteger(desc.count))throw Error('RELATION_SHARD_POLICY');
 const obj=await getPinnedJSON(ORIGIN+RELATIONS.revision+'/'+desc.path);
 if(obj.digest!==desc.sha256||obj.value.schema!==m.schema||obj.value.repository!==repo||
    obj.value.catalogSha256!==RELATIONS.catalogHash||obj.value.readOnly!==true||
    obj.value.semanticHypothesesAreEvidence!==false||
    obj.value.topaScientificVerdict!=='NOT_ADJUDICATED'||obj.value.edges?.length!==desc.count)
  throw Error('RELATION_SHARD_HASH_OR_AUTHORITY');
 const edges=obj.value.edges;
 for(const e of edges){
  if(!e.sourceId?.startsWith('json:')||!e.targetId?.startsWith('json:')||
    typeof e.jsonPointer!=='string'||(e.jsonPointer!==''&&!e.jsonPointer.startsWith('/'))||
    !/^[a-f0-9]{40}$/.test(e.sourceGitBlobSha||'')||
    !/^[a-f0-9]{64}$/.test(e.sourceSha256||'')||
    !/^[a-f0-9]{40}$/.test(e.targetSnapshotCommit||'')||
    !['BRANCH_MAIN_REBOUND_TO_SNAPSHOT','PINNED_SAME_COMMIT'].includes(e.referenceMode)||
    e.relationClass!=='EXPLICIT_SOURCE_REFERENCE'||e.scientificVerdict!=='NOT_TOPA_ADJUDICATED')
    throw Error('RELATION_EDGE_POLICY_HOLD');
 }
 RELATIONS.shards.set(repo,edges);
 return edges;
}
async function showIndexedLinks(origin,box){
 const manifest=await verifyRelationManifest();
 if(STORE.focus!==origin)return;
 const edges=(await verifyRelationShard(origin.repository))
    .filter(e=>e.sourceId===origin.id&&e.sourceGitBlobSha===origin.gitBlobSha);
 if(STORE.focus!==origin)return;
 const info=make('p',manifest.scannedVerifiedFiles.toLocaleString()+' / '+manifest.sourceCatalogJsonCount.toLocaleString()+
  ' source JSON byte-verified · '+manifest.directEdges.toLocaleString()+' DIRECT edges · '+manifest.pendingFiles+
  ' PENDING · '+manifest.heldFiles+' HOLD · '+manifest.truncatedFiles+' TRUNCATED','janus-atlas-note');
 box.replaceChildren(info,make('p','EXPLICIT SOURCE REFERENCES only. iNaiHR semantic hypotheses are separate CANDIDATES. TOPA scientific claims remain NOT ADJUDICATED.','janus-atlas-note'));
 if(!edges.length){box.append(make('p','No verified direct edge indexed for this JSON. This does not prove no relation exists.','janus-atlas-note'));return}
 const indexed=edges.slice(0,24);
 for(const e of indexed){
  const target=STORE.rows.get(e.targetId);
  const msg=e.jsonPointer+' → '+(target?target.repository+'/'+target.path:e.targetId+' (load target shard)')+
    ' · '+(e.referenceMode==='BRANCH_MAIN_REBOUND_TO_SNAPSHOT'?'main→snapshot':'exact SHA')+' · TOPA: PENDING';
  const b=make('button',msg,'janus-atlas-hit');
  b.disabled=!target||target.sourceCommit!==e.targetSnapshotCommit;
  b.onclick=()=>{if(target)choose(target)};
  box.append(b);
 }
 if(indexed.length!==edges.length)box.append(make('p','More relations exist; this UI shows first 24.','janus-atlas-note'));
 const button=make('button','VERIFY ALL TARGET SHARDS & PROJECT SOURCE EDGES','janus-atlas-action');
 button.onclick=async()=>{
  button.disabled=true;
  try{
   await loadSelection(true);
   if(STORE.focus!==origin)return;
   const targetRecords=[],links=[],seen=new Set([origin.id]);
   for(const e of indexed){
    const t=STORE.rows.get(e.targetId);
    if(!t||t.sourceCommit!==e.targetSnapshotCommit)continue;
    if(!seen.has(t.id)){seen.add(t.id);targetRecords.push(t)}
    links.push({sourceId:origin.id,targetId:t.id,pointer:e.jsonPointer,evidence:'explicit-json-url'});
    if(targetRecords.length>=12)break;
   }
   if(!links.length)throw Error('NO_VERIFIED_TARGET_CATALOG_ROWS');
   if(typeof window.JANUSAtlasNativeFocus!=='function')throw Error('NATIVE_GRAPH_UNAVAILABLE');
   window.JANUSAtlasNativeFocus([origin,...targetRecords],links);closeDrawer(false);
  }catch(e){status('RELATION GRAPH HOLD · '+e.message,true)}
  finally{button.disabled=false}
 };
 box.append(button);
}
function closeDrawer(restore=false){X('drawer').hidden=true;if(restore)window.JANUSAtlasNativeRestore?.()}
function openDrawer(){X('drawer').hidden=false;initCatalog().catch(e=>status('HOLD · '+e.message,true))}
function style(){
 const css=`
.janus-native-atlas-launch{border:1px solid #31e5bc!important;color:#7ef8db!important;cursor:pointer}
.janus-native-atlas{--atlas-accent:#00ffa3;position:fixed;z-index:200;inset:0;background:rgba(1,3,10,.65);pointer-events:auto;touch-action:auto;font-family:Rajdhani,Arial,sans-serif;color:#e6fff4}
.janus-native-atlas[data-lens=semantic]{--atlas-accent:#d300ff;color:#efdcff}
.janus-native-atlas[hidden]{display:none!important}
.janus-atlas-drawer{position:absolute;right:0;top:0;bottom:0;width:min(730px,100%);background:linear-gradient(135deg,#081014 0%,#02080c 100%);border-left:1px solid var(--atlas-accent);box-shadow:-15px 0 50px #000b;overflow:auto;padding:20px;display:flex;flex-direction:column;gap:10px}
.janus-native-atlas[data-lens=semantic] .janus-atlas-drawer{background:linear-gradient(135deg,#180925,#0a0311)}
.janus-atlas-heading{display:flex;align-items:start;justify-content:space-between;gap:12px}
.janus-atlas-heading strong{font:700 1.1rem Orbitron,system-ui;color:var(--atlas-accent)}
.janus-atlas-heading button,.janus-atlas-grid button,.janus-atlas-action{border:1px solid var(--atlas-accent);background:#10242b;color:inherit;border-radius:7px;padding:8px 10px;cursor:pointer}
.janus-native-atlas input,.janus-native-atlas select{background:#060b12;color:inherit;border:1px solid var(--atlas-accent);padding:10px;min-width:0;border-radius:7px;width:100%;font:inherit}
.janus-atlas-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.janus-atlas-grid button{min-width:0}
.janus-atlas-note,.janus-atlas-ok,.janus-atlas-fail{font-size:.8rem;line-height:1.4;color:#b3afa9}.janus-atlas-ok{color:#54ffc9}.janus-atlas-fail{color:#ff628a}
.janus-atlas-columns{display:grid;grid-template-columns:1fr 1fr;gap:10px;min-height:0;flex:1}
.janus-atlas-list{overflow:auto;border:1px solid #375450;border-radius:8px;max-height:55vh}
.janus-atlas-hit{width:100%;display:block;text-align:left;padding:8px;background:transparent;border:0;border-bottom:1px solid #22403b;color:inherit;cursor:pointer;overflow-wrap:anywhere}
.janus-atlas-hit strong,.janus-atlas-hit small{display:block}.janus-atlas-hit small{font-size:.65rem;opacity:.7}
.janus-atlas-focus{overflow:auto;max-height:55vh;border:1px solid #375450;border-radius:8px;padding:12px;overflow-wrap:anywhere}
.janus-atlas-focus h3{margin:0 0 8px}.janus-atlas-focus>code{font-size:.7rem;white-space:pre-wrap;overflow-wrap:anywhere}
.janus-atlas-action{display:block;margin:10px 0;width:100%;text-decoration:none;text-align:center;font:700 .76rem Orbitron}
.janus-atlas-fields{max-height:30vh;overflow:auto}.janus-atlas-field{padding:6px 0;border-bottom:1px solid #29403d;overflow-wrap:anywhere;font-size:.75rem}
.janus-atlas-field code{display:block;color:var(--atlas-accent);font-size:.70rem}.janus-atlas-field span{white-space:pre-wrap}
.janus-atlas-status[data-error=yes]{color:#ff6586}
@media(max-width:700px){.janus-atlas-drawer{padding:12px}.janus-atlas-columns{grid-template-columns:1fr}.janus-atlas-list,.janus-atlas-focus{max-height:28vh}}
`;
 const sheet=make('style',css);document.head.append(sheet);
}
function mount(){
 if(X('drawer'))return;
 style();
 const host=make('section',null,'janus-native-atlas');host.id='janus-atlas-drawer';host.dataset.lens=isInai?'semantic':'structural';host.hidden=true;
 const drawer=make('div',null,'janus-atlas-drawer');
 const title=make('div',null,'janus-atlas-heading');
 const head=make('div');head.append(make('strong','JANUS · '+(isInai?'iNaiHR ASSOCIATIVE SOURCE':'HRAiN MEMORY SOURCE')),make('p','ORIGINAL NEURAL INTERFACE · SOURCE-PINNED JSON · READ-ONLY','janus-atlas-note'));
 const close=make('button','× CLOSE');close.onclick=()=>closeDrawer(false);title.append(head,close);drawer.append(title);
 const stamp=make('p','Connecting…','janus-atlas-note');stamp.id='janus-atlas-stamp';drawer.append(stamp);
 const repo=make('select');repo.id='janus-atlas-repo';let all=make('option','ALL VERIFIED REPOSITORIES');all.value='';repo.append(all);repo.onchange=()=>loadSelection(false);drawer.append(repo);
 const query=make('input');query.id='janus-atlas-query';query.placeholder='Rowan · Tranception · Osiris · JANUS…';query.type='search';query.oninput=filterRows;drawer.append(query);
 const row=make('div',null,'janus-atlas-grid');
 const load=make('button','LOAD REPOSITORY');load.id='janus-atlas-load';load.onclick=()=>loadSelection(false);
 const allBtn=make('button','VERIFY ALL');allBtn.id='janus-atlas-all';allBtn.onclick=()=>loadSelection(true);
 row.append(load,allBtn);drawer.append(row);
 const state=make('p','Select source to verify','janus-atlas-note janus-atlas-status');state.id='janus-atlas-status';drawer.append(state);
 const shown=make('p','0 loaded','janus-atlas-note');shown.id='janus-atlas-shown';drawer.append(shown);
 const columns=make('div',null,'janus-atlas-columns');
 const list=make('div',null,'janus-atlas-list');list.id='janus-atlas-results';
 const focus=make('div',null,'janus-atlas-focus');focus.id='janus-atlas-focus';focus.append(make('p','Choose an original GitHub JSON source.','janus-atlas-note'));
 columns.append(list,focus);drawer.append(columns);
 const restore=make('button','RESTORE ORIGINAL NEURAL GRAPH','janus-atlas-action');restore.onclick=()=>{window.JANUSAtlasNativeRestore?.();closeDrawer(false)};drawer.append(restore);
 host.append(drawer);document.body.append(host);
 const controls=document.querySelector('.top-controls, .controls');
 if(controls){const btn=make('button','JANUS · JSON MEMORY','btn janus-native-atlas-launch');btn.type='button';btn.onclick=openDrawer;controls.append(btn)}
 if(new URLSearchParams(location.search).get('atlas')==='1')openDrawer();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
