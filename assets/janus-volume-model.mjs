/*
 * JANUS Volume Model v2.
 * Coordinates are a DETERMINISTIC LOGICAL 3D EMBEDDING of real hierarchy and source pointers.
 * The geometry is NOT astronomical, physical, probabilistic or an inferred semantic relation.
 * This module is pure and safe to import in Node without browser globals.
 */
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const PI2 = 2 * Math.PI;
const PALETTE = {
  repository:[.27,.87,.76], directory:[.29,.57,.94], file:[.56,.83,1],
  reference:[1,.66,.34], pivot:[.75,.48,1], candidate:[.91,.59,1], source:[.36,.9,.99]
};
export function hash32(value) {
  let h=2166136261;
  for (const c of String(value)){h ^= c.codePointAt(0);h=Math.imul(h,16777619);}
  return h>>>0;
}
export function unit(seed) { return (hash32(seed) % 1000003) / 1000003; }
export function safeSource(url) {
  if(typeof url!=="string")return null;
  try {
    const parsed=new URL(url);
    if(parsed.protocol!=="https:" || parsed.hostname!=="github.com" || parsed.username || parsed.password || parsed.port)return null;
    if(!/^\/Hawkar-usls\/[A-Za-z0-9_.-]+\/blob\/[0-9a-f]{40}\/.+$/.test(parsed.pathname))return null;
    return parsed.href;
  }catch(_){return null;}
}
const node=(id,label,type,p,extra={})=>({id,label,type,p,size:type==="repository"?20:type==="directory"?10:type==="pivot"?18:type==="candidate"?8:type==="source"?6:type==="reference"?5:4.3,
  color:PALETTE[type]||[.8,.8,.8],derived:type==="directory",...extra});
const edge=(from,to,kind)=>({from,to,kind});
function directions(seed){const a=PI2*unit(seed+":a"),b=(unit(seed+":b")-.5)*Math.PI;return[Math.cos(a)*Math.cos(b),Math.sin(b),Math.sin(a)*Math.cos(b)];}
export function repositoryOverview(repositories=[]) {
  const items=[...repositories].filter(r=>r && typeof r.repository==="string").sort((a,b)=>a.repository.localeCompare(b.repository));
  const nodes=items.map((repo,i)=>{
    const angle=PI2*i/Math.max(1,items.length), count=Math.max(0,Number(repo.jsonCount)||0);
    const radius=190+Math.min(50,Math.log2(count+1)*3), y=(unit(repo.repository+":height")-.5)*120;
    return node("repo:"+repo.repository,repo.repository.split("/").at(-1),"repository",
      [Math.cos(angle)*radius,y,Math.sin(angle)*radius],
      {size:Math.min(43,13+Math.log2(count+1)*1.7),meta:{repository:repo.repository,recordCount:count,sourceMode:repo.sourceMode,sourceCommit:repo.commit,complete:repo.complete},weight:count,source:null});
  });
  return {nodes,edges:[],scope:"all repositories",kind:"registry_overview",actualRecords:items.length,unloadedRecords:items.reduce((n,r)=>n+(r.jsonCount||0),0)};
}
function cleanPath(path){
  if(typeof path!=="string"||path.includes("\\")||path.split("/").includes("..")||path.startsWith("/"))return null;
  return path.split("/").filter(Boolean).join("/");
}
export function registryVolume(records=[],repository="",relations=[]) {
  const files=[...records].filter(r=>r && r.id && cleanPath(r.path) && r.repository===repository);
  files.sort((a,b)=>a.path.localeCompare(b.path)||String(a.id).localeCompare(String(b.id)));
  const nodes=[node("repo:"+repository,repository.split("/").at(-1),"repository",[0,0,0],{size:28,meta:{repository,kind:"repository root"}})];
  const edges=[],byId=new Map([[nodes[0].id,nodes[0]]]),dirs=new Map();
  const group=new Map();
  for(const record of files){
    const path=cleanPath(record.path);const segments=path.split("/");
    const dir=segments.slice(0,-1).join("/");
    if(!group.has(dir))group.set(dir,[]);
    group.get(dir).push(record);
    let prefix="";
    for(const part of segments.slice(0,-1)){prefix=prefix?prefix+"/"+part:part;dirs.set(prefix,true);}
  }
  const dirPaths=[...dirs.keys()].sort((a,b)=>a.split("/").length-b.split("/").length||a.localeCompare(b));
  for(const dir of dirPaths){
    const seg=dir.split("/"),parent=seg.slice(0,-1).join("/"),p=byId.get(parent?"dir:"+parent:"repo:"+repository);
    if(!p)continue;
    const v=directions("folder:"+repository+"/"+dir);
    const step=seg.length===1?108:Math.max(28,85-10*seg.length);
    const pos=[p.p[0]+v[0]*step,p.p[1]+(seg.length===1?-10:20)+v[1]*step*.42,p.p[2]+v[2]*step];
    const d=node("dir:"+dir,seg.at(-1),"directory",pos,{meta:{repository,path:dir,kind:"DERIVED_PATH_GROUP"},source:null});
    nodes.push(d);byId.set(d.id,d);edges.push(edge(p.id,d.id,"PATH_CONTAINMENT"));
  }
  for(const [dir,groupRecords] of group){
    const parent=byId.get(dir?"dir:"+dir:"repo:"+repository);
    if(!parent)continue;
    const n=groupRecords.length;
    for(let i=0;i<n;i++){
      const r=groupRecords[i],h=hash32(r.id),a=i*GOLDEN+unit(dir+":angle")*PI2;
      const radius=13+Math.sqrt((i+.6)/Math.max(n,1))*(28+Math.min(80,Math.sqrt(n)*3.2));
      const q=[parent.p[0]+Math.cos(a)*radius,parent.p[1]+(unit(r.id+":height")-.5)*Math.min(85,20+Math.sqrt(n)*2.2),
        parent.p[2]+Math.sin(a)*radius+(unit(r.id+":depth")-.5)*50];
      const item=node(String(r.id),r.path.split("/").at(-1),"file",q,{size:Math.min(8,3.2+Math.log2(1+Math.max(0,r.sizeBytes||0))*.23),
        meta:{repository:r.repository,path:r.path,sizeBytes:r.sizeBytes,sourceCommit:r.sourceCommit,gitBlobSha:r.gitBlobSha,memoryClass:r.memoryClass,
          authority:r.authority},source:safeSource(r.sourceUrl),weight:Math.max(1,Number(r.sizeBytes)||0)});
      nodes.push(item);byId.set(item.id,item);edges.push(edge(parent.id,item.id,"PATH_CONTAINMENT"));
    }
  }
  let linked=0,missingSource=0;
  for(const r of relations){
    if(!r || r.relationClass!=="EXPLICIT_SOURCE_REFERENCE"||!r.sourceId||!r.targetId)continue;
    const s=byId.get(r.sourceId);
    if(!s){missingSource++;continue;}
    if(!byId.has(r.targetId)){
      const v=directions("reference:"+r.targetId),p=s.p;
      const newNode=node(String(r.targetId),String(r.targetId).slice(0,19),"reference",
        [p[0]+v[0]*57,p[1]+v[1]*57+40,p[2]+v[2]*57],
        {meta:{targetId:r.targetId,referenceMode:r.referenceMode,relationClass:r.relationClass,scientificVerdict:r.scientificVerdict,
               kind:"TARGET_ID_ONLY_SOURCE_NOT_LOADED"},source:null});
      nodes.push(newNode);byId.set(newNode.id,newNode);
    }
    edges.push(edge(r.sourceId,r.targetId,"EXPLICIT_SOURCE_REFERENCE"));linked++;
  }
  return {nodes,edges,scope:repository,kind:"registry",actualRecords:files.length,explicitReferences:linked,relationsWithUnloadedSource:missingSource,
    derivedFolders:dirPaths.length};
}
export function semanticVolume(candidates=[],registry={}) {
  const safeCandidates=[...candidates].filter(x=>x && x.id && x.kind==="SEMANTIC_CANDIDATE").sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  const pivots=[...new Set(safeCandidates.map(c=>String(c.pivot?.id||"unspecified")))].sort();
  const nodes=[],edges=[],byId=new Map(),sourceTouches=new Map();
  const centers=new Map();
  pivots.forEach((key,i)=>{
    const angle=PI2*i/Math.max(1,pivots.length),pos=[Math.cos(angle)*160,0,Math.sin(angle)*160];
    const n=node("pivot:"+key,key.split(":").at(-1),"pivot",pos,{meta:{pivot:key,meaning:"EXPLICIT_SYNTH_GROUPING"},source:null});
    nodes.push(n);byId.set(n.id,n);centers.set(key,pos);
  });
  const counts=new Map();
  for(const c of safeCandidates){const key=String(c.pivot?.id||"unspecified");counts.set(key,(counts.get(key)||0)+1);}
  const indices=new Map();
  for(const c of safeCandidates){
    const key=String(c.pivot?.id||"unspecified"),center=centers.get(key),i=indices.get(key)||0;
    indices.set(key,i+1);
    const a=i*GOLDEN+unit(key)*PI2,rad=35+Math.sqrt((i+.7)/Math.max(1,counts.get(key)))*128;
    const depth=Math.max(0,Math.min(8,Number(c.depth)||0)),p=[
      center[0]+Math.cos(a)*rad,
      (depth-2)*38+(unit(c.id+":y")-.5)*42,
      center[2]+Math.sin(a)*rad*.8+(unit(c.id+":z")-.5)*48
    ];
    const sources=c.meaning?.evidence?.source_records||[];
    const n=node(String(c.id),c.label||c.id,"candidate",p,{size:Math.min(12,6+Math.log2((Number(c.attention_score)||0)+1)),
      weight:Number(c.attention_score)||0,source:null,meta:{status:c.status,kind:c.kind,depth,attentionScore:c.attention_score,
      authority:c.authority,pivot:key,sourceRecordCount:sources.length,
      meaning:c.meaning?.mechanism,signature:c.signature,createdAt:c.created_at}});
    nodes.push(n);byId.set(n.id,n);
    edges.push(edge("pivot:"+key,n.id,"GROUPING_NOT_EVIDENCE"));
    for(const sr of sources){
      if(!sr || !sr.id)continue;
      const sid="source:"+sr.id;
      if(!sourceTouches.has(sid))sourceTouches.set(sid,{records:[],candidates:[],position:[0,0,0]});
      const dest=sourceTouches.get(sid);dest.candidates.push(n.id);dest.records.push({record:sr,parent:c}); 
    }
  }
  const rootRepo=typeof registry.repository==="string"?registry.repository:"";
  for(const [id,referenced] of sourceTouches){
    const first=referenced.records[0],s=first.record,found=referenced.candidates.map(x=>byId.get(x)).filter(Boolean);
    const mean=[0,0,0];for(const c of found){for(let k=0;k<3;k++)mean[k]+=c.p[k]/found.length;}
    const d=directions(id);
    const p=[mean[0]+d[0]*32,mean[1]-28+d[1]*23,mean[2]+d[2]*32];
    const commit=first.parent.meaning?.evidence?.registry_source_commit;
    let url=null;
    if(/^Hawkar-usls\/[A-Za-z0-9_.-]+$/.test(rootRepo) && /^[0-9a-f]{40}$/.test(String(commit||""))
      &&cleanPath(s.path)===s.path){
      url=safeSource("https://github.com/"+rootRepo+"/blob/"+commit+"/"+s.path.split("/").map(encodeURIComponent).join("/"));
    }
    const n=node(id,s.path?.split("/").at(-1)||s.id,"source",p,{
      source:url,meta:{id:s.id,path:s.path,sha256:s.sha256,lineageKey:s.lineage_key,
      repository:rootRepo,sourceCommit:commit,kind:"RECORDED_SOURCE_POINTER_NOT_INDEPENDENTLY_VERIFIED"}});
    nodes.push(n);byId.set(id,n);
    for(const candidateId of referenced.candidates)edges.push(edge(candidateId,id,"RECORDED_SOURCE_POINTER"));
  }
  let lineage=0;
  for(const c of safeCandidates){
    const prior=c.meaning?.lineage?.prior_candidate_id;
    if(prior && byId.has(prior) && prior!==c.id){edges.push(edge(prior,c.id,"RECORDED_LINEAGE"));lineage++;}
  }
  return {nodes,edges,scope:"iNaiHR SYNTH",kind:"semantic",actualRecords:safeCandidates.length,sourcePointers:sourceTouches.size,provenanceEdges:edges.filter(e=>e.kind==="RECORDED_SOURCE_POINTER").length,lineage};
}

/* Actual public JSON point cloud: one glyph per loaded record, never fabricated stars. */
export function publicGalaxy(repositories=[],records=[]) {
  const scene=repositoryOverview(repositories);
  const roots=new Map(scene.nodes.map(n=>[n.meta.repository,n]));
  const groups=new Map();
  for(const r of records){
    if(!r || !r.id || !roots.has(r.repository) || !cleanPath(r.path))continue;
    if(!groups.has(r.repository))groups.set(r.repository,[]);
    groups.get(r.repository).push(r);
  }
  let loaded=0;
  for(const [repo,items] of groups){
    items.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    const root=roots.get(repo);
    for(let i=0;i<items.length;i++){
      const r=items[i],dir=directions(r.id+":cluster"),theta=i*GOLDEN+unit(repo+":cloud")*PI2;
      const radius=16+Math.sqrt((i+.4)/Math.max(items.length,1))*92;
      const p=[root.p[0]+Math.cos(theta)*radius+dir[0]*12,
        root.p[1]+dir[1]*radius*.62,root.p[2]+Math.sin(theta)*radius+dir[2]*14];
      scene.nodes.push(node(r.id,r.path.split("/").at(-1),"file",p,{
        size:Math.min(6,2.8+Math.log2(1+Math.max(0,r.sizeBytes||0))*.2),
        meta:{repository:r.repository,path:r.path,sizeBytes:r.sizeBytes,sourceCommit:r.sourceCommit,
          gitBlobSha:r.gitBlobSha,authority:r.authority,kind:"ACTUAL_LOADED_PUBLIC_JSON"},
        source:safeSource(r.sourceUrl),weight:Number(r.sizeBytes)||0
      }));
      scene.edges.push(edge(root.id,r.id,"REPOSITORY_CONTAINS_RECORD"));
      loaded++;
    }
  }
  scene.actualRecords=loaded;scene.sampleRecords=loaded;
  scene.kind="registry_overview";
  return scene;
}

export function viewOf(graph,mode="all",query="",cut=1) {
  const q=String(query||"").trim().toLocaleLowerCase(),limit=Math.max(0,Math.min(1,Number(cut)||0));
  const all=graph.nodes||[];
  const filtered=all.filter(n=>{
    if(mode==="structure" && !["repository","directory","file","pivot","candidate"].includes(n.type))return false;
    if(mode==="provenance" && ["directory","pivot"].includes(n.type))return false;
    if(mode==="hypotheses" && !["pivot","candidate","source"].includes(n.type))return false;
    if(mode==="lineage" && n.type!=="candidate")return false;
    if(q && ![n.id,n.label,n.meta?.path,n.meta?.repository].some(v=>String(v||"").toLocaleLowerCase().includes(q)))return false;
    if(limit<1 && n.p[2]>-280+limit*560)return false;
    return true;
  });
  const ids=new Set(filtered.map(n=>n.id));
  const edges=(graph.edges||[]).filter(e=>{
    if(!ids.has(e.from)||!ids.has(e.to))return false;
    if(mode==="structure")return e.kind==="PATH_CONTAINMENT"||e.kind==="GROUPING_NOT_EVIDENCE"||e.kind==="REPOSITORY_CONTAINS_RECORD";
    if(mode==="provenance")return e.kind==="EXPLICIT_SOURCE_REFERENCE"||e.kind==="RECORDED_SOURCE_POINTER";
    if(mode==="lineage")return e.kind==="RECORDED_LINEAGE";
    return true;
  });
  return {nodes:filtered,edges,displayed:filtered.length,total:all.length};
}
