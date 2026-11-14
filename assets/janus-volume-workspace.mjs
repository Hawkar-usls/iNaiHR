/* JANUS Local Mindmap Workspace v3: editable only in browser's classic local desk.
 * This model NEVER produces changes to the public registry / source references.
 */
const rgb = {default:[.27,.93,.72],danger:[1,.38,.55],warn:[1,.76,.37],info:[.76,.48,1]};
const numeric=(n,fallback)=>Number.isFinite(Number(n))?Number(n):fallback;
const idOf=(v)=>String(v&&typeof v==="object"?v.id:v);
const safeLabel=(v)=>String(v===undefined?"Void":v).slice(0,220);
const safeId=(v)=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0 || typeof v==="string"&&v.length>0&&v.length<120&&!v.startsWith("desk:");
export function storageKey(role) {return role==="semantic"?"inaihr_v2":"hrain_v10_4_restore";}
export function legacyKey(role){return role==="semantic"?"inaihr_v1":null;}
export function normalizeDesk(raw,role="registry"){
  if(!raw||!Array.isArray(raw.nodes)||!Array.isArray(raw.links))throw Error("Expected {nodes,links}");
  if(raw.nodes.length>4000||raw.links.length>15000)throw Error("Local desk exceeds safe limits");
  const seen=new Set(),nodes=[];
  for(const item of raw.nodes){
    if(!item||!safeId(item.id)||seen.has(String(item.id)))continue;
    const id=String(item.id);seen.add(id);
    const node={...item,id:item.id,label:safeLabel(item.label),x:numeric(item.x,0),y:numeric(item.y,0)};
    if(!Number.isFinite(node.x)||!Number.isFinite(node.y))continue;
    node.x=Math.max(-100000,Math.min(100000,node.x));node.y=Math.max(-100000,Math.min(100000,node.y));
    if(role==="registry"){
      node.parentId=item.parentId===undefined?null:item.parentId;
      node.emoji=typeof item.emoji==="string"?item.emoji.slice(0,14):"🌀";
      node.type=Object.hasOwn(rgb,item.type)?item.type:"default";
      node.chatHistory=Array.isArray(item.chatHistory)?item.chatHistory.slice(-80).map(m=>({role:m.role==="ai"?"ai":"user",text:String(m.text||"").slice(0,3000)})):[];
    }else{
      node.isAI=!!item.isAI;
    }
    nodes.push(node);
  }
  const keys=new Set(nodes.map(n=>String(n.id)));
  const links=[],seenEdges=new Set();
  for(const l of raw.links){
    if(!l)continue;
    const a=idOf(l.source),b=idOf(l.target);
    if(a===b||!keys.has(a)||!keys.has(b))continue;
    const key=[a,b].sort().join("\x1f");if(seenEdges.has(key))continue;seenEdges.add(key);
    links.push({source:nodes.find(n=>String(n.id)===a).id,target:nodes.find(n=>String(n.id)===b).id});
  }
  for(const n of nodes){
    if(role==="registry"&&n.parentId!=null&&!keys.has(String(n.parentId)))n.parentId=null;
  }
  return {nodes,links};
}
export function initialDesk(role="registry",width=1100,height=750){
  const n=role==="registry"?
    {id:1,label:"Void",emoji:"🌀",type:"default",x:width/2,y:height/2,parentId:null,chatHistory:[]}:
    {id:1,label:"Origin",x:width/2,y:height/2,isAI:false};
  return {nodes:[n],links:[]};
}
export function readDesk(storage,role="registry",w=1100,h=750){
  const keys=[storageKey(role),legacyKey(role)].filter(Boolean);
  for(const key of keys){
    const payload=storage.getItem(key);
    if(!payload)continue;
    try{return {desk:normalizeDesk(JSON.parse(payload),role),key,found:true};}catch(_){}
  }
  return {desk:initialDesk(role,w,h),key:storageKey(role),found:false};
}
export function saveDesk(storage,desk,role="registry"){
  const normalized=normalizeDesk(desk,role),key=storageKey(role);
  const previous=storage.getItem(key);
  if(previous && previous!==JSON.stringify(normalized))storage.setItem(key+"_3d_backup",previous);
  storage.setItem(key,JSON.stringify(normalized));
  return normalized;
}
export function nextId(desk,clock=Date.now()){
  const used=new Set(desk.nodes.map(n=>String(n.id)));
  let id=Math.max(1,Math.trunc(clock));
  while(used.has(String(id)))id++;
  return id;
}
export function createDeskNode(desk,role="registry",selectedId=null,clock=Date.now()){
  const copy=normalizeDesk(desk,role);if(copy.nodes.length>=4000)throw Error("Local desk node limit reached");
  const parent=copy.nodes.find(n=>String(n.id)===String(selectedId))||null;
  const id=nextId(copy,clock),last=copy.nodes.at(-1);
  const x=(parent||last)?.x+115||530, y=(parent||last)?.y+55||380;
  const n=role==="registry"?
    {id,label:"Void",emoji:"🌀",type:"default",x,y,parentId:parent?.id??null,chatHistory:[]}:
    {id,label:"Void",x,y,isAI:false};
  copy.nodes.push(n);
  if(parent)copy.links.push({source:parent.id,target:id});
  return {desk:copy,selectedId:id};
}
export function renameDeskNode(desk,id,label,role="registry"){
  const copy=normalizeDesk(desk,role),n=copy.nodes.find(n=>String(n.id)===String(id));
  if(!n)throw Error("Select a local node");
  if(!String(label).trim())throw Error("Name cannot be blank");
  n.label=safeLabel(String(label).trim());return copy;
}
export function toggleDeskLink(desk,a,b,role="registry"){
  const copy=normalizeDesk(desk,role),aa=copy.nodes.find(n=>String(n.id)===String(a)),
    bb=copy.nodes.find(n=>String(n.id)===String(b));
  if(!aa||!bb||aa===bb)throw Error("Pick two distinct local nodes");
  const k=copy.links.findIndex(l=>[idOf(l.source),idOf(l.target)].sort().join("\x1f")===[String(a),String(b)].sort().join("\x1f"));
  if(k>=0)copy.links.splice(k,1);else copy.links.push({source:aa.id,target:bb.id});
  return copy;
}
export function deleteDeskNode(desk,id,role="registry"){
  const copy=normalizeDesk(desk,role);let toDelete=new Set([String(id)]);
  if(!copy.nodes.some(n=>toDelete.has(String(n.id))))throw Error("Local node not found");
  if(role==="registry"){
    let changed=true;while(changed){
      changed=false;
      for(const n of copy.nodes)if(!toDelete.has(String(n.id))&&toDelete.has(String(n.parentId))){
        toDelete.add(String(n.id));changed=true;
      }
    }
  }
  return {nodes:copy.nodes.filter(n=>!toDelete.has(String(n.id))),
    links:copy.links.filter(l=>!toDelete.has(idOf(l.source))&&!toDelete.has(idOf(l.target)))};
}
export function moveDeskNode(desk,id,dx,dy,role="registry",snap=false){
  const copy=normalizeDesk(desk,role),node=copy.nodes.find(n=>String(n.id)===String(id));
  if(!node)throw Error("Local node not found");
  const nextX=node.x+numeric(dx,0),nextY=node.y+numeric(dy,0);
  node.x=snap?Math.round(nextX/60)*60:nextX;
  node.y=snap?Math.round(nextY/60)*60:nextY;
  return copy;
}
export function diveDesk(desk,focusId,role="registry"){
  const copy=normalizeDesk(desk,role);
  const target=copy.nodes.find(n=>String(n.id)===String(focusId));
  if(!target)return null;
  return String(target.id);
}
export function ascendDesk(desk,focusId,role="registry"){
  const copy=normalizeDesk(desk,role);
  const target=copy.nodes.find(n=>String(n.id)===String(focusId));
  return target?.parentId==null?null:String(target.parentId);
}
export function deskGraph(desk,role="registry",focusId=null){
  const data=normalizeDesk(desk,role),byId=new Map(data.nodes.map(n=>[String(n.id),n]));
  const visible=focusId===null?data.nodes:data.nodes.filter(n=>String(n.id)===String(focusId) ||
    role==="registry"&&String(n.parentId)===String(focusId) ||
    data.links.some(l=>[idOf(l.source),idOf(l.target)].includes(String(focusId)) &&
      [idOf(l.source),idOf(l.target)].includes(String(n.id))));
  const ids=new Set(visible.map(n=>String(n.id)));
  const degree=new Map(data.nodes.map(n=>[String(n.id),0]));
  for(const l of data.links){degree.set(idOf(l.source),(degree.get(idOf(l.source))||0)+1);
    degree.set(idOf(l.target),(degree.get(idOf(l.target))||0)+1);}
  const centerX=focusId===null?(data.nodes[0]?.x||0):(byId.get(String(focusId))?.x||0);
  const centerY=focusId===null?(data.nodes[0]?.y||0):(byId.get(String(focusId))?.y||0);
  const depth=(n)=>{
    if(role!=="registry")return 0;
    const visited=new Set([String(n.id)]);let cur=n,d=0;
    while(cur.parentId!=null&&d<15){
      const key=String(cur.parentId);if(visited.has(key))break;visited.add(key);
      const parent=byId.get(key);if(!parent)break;cur=parent;d++;
    }
    return d;
  };
  const nodes=visible.map(n=>{
    const d=depth(n);
    const pos=[(n.x-centerX)*.66,(centerY-n.y)*.66,d*72-30];
    return {id:"desk:"+n.id,label:n.label,type:"workspace",
      p:pos,size:Math.min(17,9+Math.log2(1+(degree.get(String(n.id))||0))*1.8),
      weight:degree.get(String(n.id))||0,
      color:n.type==="danger"?rgb.danger:n.type==="warn"?rgb.warn:n.type==="info"?rgb.info:
        role==="semantic"?(n.isAI?[.98,.61,.98]:[.68,.53,1]):rgb.default,
      source:null,meta:{kind:"LOCAL_EDITABLE_DESK_NODE",id:n.id,parentId:n.parentId??null,x:n.x,y:n.y,
        isAI:!!n.isAI,type:n.type||"default",depth:d,links:degree.get(String(n.id))||0,
        storageKey:storageKey(role),notRegistryAuthority:true}};
  });
  const edges=data.links.filter(l=>ids.has(idOf(l.source))&&ids.has(idOf(l.target)))
    .map(l=>({from:"desk:"+idOf(l.source),to:"desk:"+idOf(l.target),kind:"LOCAL_EDITABLE_DESK_LINK"}));
  return {nodes,edges,actualRecords:nodes.length,totalLocalNodes:data.nodes.length,kind:"local_workspace",scope:storageKey(role),focusId};
}
