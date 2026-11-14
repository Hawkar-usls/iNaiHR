import test from "node:test";
import assert from "node:assert/strict";
import {storageKey,legacyKey,initialDesk,readDesk,saveDesk,normalizeDesk,createDeskNode,
  renameDeskNode,toggleDeskLink,deleteDeskNode,moveDeskNode,deskGraph,ascendDesk} from "../assets/janus-volume-workspace.mjs";
import {viewOf} from "../assets/janus-volume-model.mjs";
function storage(){
 const map=new Map();
 return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),map};
}
for(const role of ["registry","semantic"]){
 test(role+" reuses EXACT original classic mindmap storage",()=>{
   const s=storage(),key=storageKey(role),base=initialDesk(role);
   assert.equal(key,role==="registry"?"hrain_v10_4_restore":"inaihr_v2");
   s.setItem(key,JSON.stringify(base));
   const loaded=readDesk(s,role);
   assert.equal(loaded.found,true);
   assert.deepEqual(loaded.desk,normalizeDesk(base,role));
   let next=createDeskNode(loaded.desk,role,1,1000).desk;
   next=renameDeskNode(next,1000,"JANUS 3D",role);
   const clean=saveDesk(s,next,role);
   assert.equal(clean.nodes.find(n=>n.id===1000).label,"JANUS 3D");
   assert.equal(JSON.parse(s.getItem(key)).nodes.length,2);
   assert.equal(JSON.parse(s.getItem(key+"_3d_backup")).nodes.length,1);
   assert.ok(clean.links.some(l=>l.source===1&&l.target===1000));
   const graph=deskGraph(clean,role);
   assert.equal(graph.kind,"local_workspace");
   assert.equal(graph.nodes.length,2);
   assert.ok(graph.nodes.every(n=>n.type==="workspace"&&n.meta.notRegistryAuthority));
   assert.equal(viewOf(graph,"structure").edges.length,1);
   assert.equal(viewOf(graph,"density").edges.length,1,"local desk must remain editable graph");
 });
 test(role+" links can be created, toggled off and preserved in original format",()=>{
   let data=initialDesk(role);
   data=createDeskNode(data,role,1,2001).desk;
   data=createDeskNode(data,role,1,2002).desk;
   const initial=data.links.length;
   data=toggleDeskLink(data,2001,2002,role);
   assert.equal(data.links.length,initial+1);
   data=toggleDeskLink(data,2001,2002,role);
   assert.equal(data.links.length,initial);
   const moved=moveDeskNode(data,2001,110,80,role,true);
   assert.equal(moved.nodes.find(n=>n.id===2001).x%60,0);
   assert.equal(moved.nodes.find(n=>n.id===2001).y%60,0);
 });
 test(role+" deletion stays within local workspace (no registry record)",()=>{
   let data=initialDesk(role);
   data=createDeskNode(data,role,1,3001).desk;
   data=createDeskNode(data,role,3001,3002).desk;
   const clean=deleteDeskNode(data,3001,role);
   assert.equal(clean.nodes.some(n=>n.id===3001),false);
   assert.equal(clean.nodes.some(n=>n.id===3002),role==="semantic");
   assert.equal(clean.links.some(l=>l.source===3001||l.target===3001),false);
 });
}
test("HRain DIVE/ASCEND follows recorded parentId; no fake semantic parent",()=>{
 let desk=initialDesk("registry");
 desk=createDeskNode(desk,"registry",1,700).desk;
 desk=createDeskNode(desk,"registry",700,701).desk;
 assert.equal(ascendDesk(desk,"701","registry"),"700");
 assert.equal(ascendDesk(desk,"700","registry"),"1");
 assert.equal(ascendDesk(desk,"1","registry"),null);
 const focused=deskGraph(desk,"registry","700");
 assert.equal(focused.focusId,"700");
 assert.deepEqual(new Set(focused.nodes.map(n=>n.id)),new Set(["desk:700","desk:701","desk:1"]));
});
test("semantic old storage LEGACY only imported, future saves in v2",()=>{
 const s=storage();const old=initialDesk("semantic");
 s.setItem(legacyKey("semantic"),JSON.stringify(old));
 assert.equal(readDesk(s,"semantic").key,"inaihr_v1");
 saveDesk(s,old,"semantic");
 assert.ok(s.getItem("inaihr_v2"));
});
test("invalid imported JSON is isolated from source authority and bad links",()=>{
 assert.throws(()=>normalizeDesk({nodes:null,links:[]}),/Expected/);
 const fixed=normalizeDesk({nodes:[{id:1,label:"A",x:1,y:2},{id:1,label:"DUP",x:1,y:2}],
 links:[{source:1,target:1},{source:1,target:9}]});
 assert.equal(fixed.nodes.length,1);
 assert.equal(fixed.links.length,0);
 assert.equal(fixed.nodes[0].label,"A");
});
