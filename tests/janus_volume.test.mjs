import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {hash32,repositoryOverview,publicGalaxy,registryVolume,semanticVolume,viewOf,safeSource} from "../assets/janus-volume-model.mjs";
import {projectPoint} from "../assets/janus-volume-render.mjs";
const repo="Hawkar-usls/Hrain",commit="a".repeat(40);
const record={
 id:"json:one",repository:repo,path:".janus/SOURCE_CONTRACT.json",
 sourceCommit:commit,gitBlobSha:"b".repeat(40),sizeBytes:1024,memoryClass:"PUBLIC_JSON",
 sourceUrl:"https://github.com/"+repo+"/blob/"+commit+"/.janus/SOURCE_CONTRACT.json"
};
test("real registry records get 3D positions and exact path-containment edges",()=>{
 const graph=registryVolume([record,{...record,id:"json:other",repository:"other/unknown"}],repo,[]);
 assert.equal(graph.actualRecords,1);
 assert.ok(graph.nodes.some(n=>n.id==="json:one"&&n.type==="file"));
 assert.ok(graph.nodes.some(n=>n.id==="dir:.janus"&&n.derived));
 assert.ok(graph.edges.some(e=>e.from==="dir:.janus"&&e.to==="json:one"&&e.kind==="PATH_CONTAINMENT"));
 assert.equal(graph.edges.filter(e=>e.kind==="EXPLICIT_SOURCE_REFERENCE").length,0);
 assert.ok(graph.nodes.every(n=>n.p.length===3&&n.p.every(Number.isFinite)));
 assert.deepEqual(graph,registryVolume([record,{...record,id:"json:other",repository:"other/unknown"}],repo,[]));
});
test("explicit source references are never fabricated and are typed as pointers",()=>{
 const relations=[
  {sourceId:"json:one",targetId:"json:target",relationClass:"EXPLICIT_SOURCE_REFERENCE",scientificVerdict:"NOT_TOPA_ADJUDICATED"},
  {sourceId:"json:one",targetId:"json:fake",relationClass:"SEMANTIC_GUESS"},
  {sourceId:"json:unloaded",targetId:"json:other",relationClass:"EXPLICIT_SOURCE_REFERENCE"}
 ];
 const graph=registryVolume([record],repo,relations);
 assert.equal(graph.explicitReferences,1);
 assert.equal(graph.relationsWithUnloadedSource,1);
 assert.ok(graph.nodes.some(n=>n.id==="json:target"&&n.meta.kind==="TARGET_ID_ONLY_SOURCE_NOT_LOADED"));
 assert.ok(!graph.nodes.some(n=>n.id==="json:fake"));
 const prov=viewOf(graph,"provenance");
 assert.ok(prov.edges.some(e=>e.kind==="EXPLICIT_SOURCE_REFERENCE"));
 assert.ok(!prov.edges.some(e=>e.kind==="PATH_CONTAINMENT"));
});
test("SYNTH source pointers are not evidence or truth claims",()=>{
 const candidate={id:"syn:c",kind:"SEMANTIC_CANDIDATE",label:"Hypothesis",pivot:{id:"pivot:A"},
  status:"CANDIDATE_AWAITING_CORROBORATION",attention_score:99,depth:2,
  authority:{proof:false,truth:false,automatic_promotion:false},meaning:{
   evidence:{registry_source_commit:commit,source_records:[{id:"obj:a",path:"data/a.json",sha256:"ff"}]},
   lineage:{prior_candidate_id:"syn:missing"}
  }};
 const graph=semanticVolume([candidate],{repository:"Hawkar-usls/janus-meta-registry"});
 assert.equal(graph.actualRecords,1);
 assert.equal(graph.provenanceEdges,1);
 assert.equal(graph.lineage,0);
 assert.ok(graph.nodes.some(n=>n.id==="syn:c"&&n.meta.authority.truth===false));
 assert.ok(graph.nodes.some(n=>n.id==="source:obj:a"&&n.type==="source"));
 assert.ok(graph.edges.some(e=>e.kind==="RECORDED_SOURCE_POINTER"));
 assert.ok(!graph.edges.some(e=>e.kind==="CAUSAL"));
 assert.ok(viewOf(graph,"lineage").nodes.every(n=>n.type==="candidate"));
});
test("repository overview never invents JSON stars",()=>{
 const source=[{repository:repo,jsonCount:3,commit,complete:true},{repository:"Hawkar-usls/iNaiHR",jsonCount:10}];
 const graph=repositoryOverview(source);
 assert.equal(graph.nodes.length,2);assert.equal(graph.edges.length,0);
 assert.equal(graph.unloadedRecords,13);
 assert.ok(graph.nodes.every(n=>n.type==="repository"));
});
test("perspective camera has genuine depth and orientation",()=>{
 const c={yaw:0,pitch:0,distance:600,focus:[0,0,0]};
 const near=projectPoint([100,0,100],c,1000,800);
 const far=projectPoint([100,0,-100],c,1000,800);
 assert.ok(near && far);
 assert.ok(Math.abs(near.x-500)>Math.abs(far.x-500),"near point must look larger");
 c.yaw=.8;c.pitch=.6;
 const rotated=projectPoint([100,0,100],c,1000,800);
 assert.notEqual(rotated.x,near.x);assert.notEqual(rotated.y,near.y);
});
test("only pinned source blob URLs are approved",()=>{
 assert.equal(safeSource("https://github.com/"+repo+"/blob/"+commit+"/a.json")!==null,true);
 assert.equal(safeSource("https://evil.example/abc"),null);
 assert.equal(safeSource("https://github.com/"+repo+"/blob/main/a.json"),null);
});
test("read-only contract and GPU volume are implemented",()=>{
 const ui=readFileSync(new URL("../assets/janus-volume-ui.mjs",import.meta.url),"utf8");
 const shader=readFileSync(new URL("../assets/janus-volume-render.mjs",import.meta.url),"utf8");
 const html=readFileSync(new URL("../galaxy.html",import.meta.url),"utf8");
 assert.match(shader,/getContext\("webgl2"/);assert.match(shader,/gl\.drawArrays\(gl\.POINTS/);
 assert.match(shader,/gl\.drawArrays\(gl\.LINES/);
 assert.match(shader,/depth-8\./);
 assert.match(html,/volume-ui\.mjs/);
 assert.doesNotMatch(ui,/\blocalStorage\b|\bindexedDB\b|\bXMLHttpRequest\b/);
 assert.doesNotMatch(ui,/method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)/i);
 assert.doesNotMatch(ui,/fetch\([^\n]+method\s*:/i);
});

test("nebula preview contains one visible glyph per ACTUAL loaded source, no synthetic stars",()=>{
 const regs=[{repository:repo,jsonCount:100,commit,complete:true}];
 const scene=publicGalaxy(regs,[record,{...record,id:"json:two",path:"data/other.json"}]);
 assert.equal(scene.sampleRecords,2);
 assert.equal(scene.nodes.length,3); // one real repository + two real JSON
 assert.equal(scene.edges.length,2);
 assert.ok(scene.edges.every(e=>e.kind==="REPOSITORY_CONTAINS_RECORD"));
 assert.ok(scene.nodes.filter(n=>n.type==="file").every(n=>n.meta.kind==="ACTUAL_LOADED_PUBLIC_JSON"));
 assert.deepEqual(scene,publicGalaxy(regs,[record,{...record,id:"json:two",path:"data/other.json"}]));
});

test("density lens emits points but suppresses spiderweb edges",()=>{
 const volume=publicGalaxy([{repository:repo,jsonCount:2}],[record]);
 const density=viewOf(volume,"density");
 assert.equal(density.nodes.length,2);
 assert.equal(density.edges.length,0);
 const structure=viewOf(volume,"structure");
 assert.equal(structure.edges.length,1);
 assert.equal(structure.edges[0].kind,"REPOSITORY_CONTAINS_RECORD");
});
