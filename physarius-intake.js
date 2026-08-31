(function (root) {
  'use strict';
  const DEFAULT_SOURCE='https://raw.githubusercontent.com/Hawkar-usls/Janus-Fundamentum/main/registry/PHYSARIUS_NETWORK_HRAIN_LIVE_v1.json';
  function assertGraph(graph){
    if(!graph||graph.schema!=='janus.hrain.physarius_graph.v1') throw new Error('Unsupported Physarius graph schema');
    const m=graph.mutationPolicy||{}, c=graph.contentPolicy||{};
    if(m.write!==false||m.delete!==false||m.sourceMutation!==false) throw new Error('RIGHT_INAIHR rejects mutation authority');
    if(c.contentExposed!==false||c.memberNamesExposed!==false) throw new Error('RIGHT_INAIHR external intake requires blind graph');
    return graph;
  }
  function normalize(graph){
    assertGraph(graph);
    return Object.freeze({
      schema:'inaihr.physarius.associative_intake.v1',
      hemisphere:'RIGHT_INAIHR', role:'ASSOCIATIVE_CONTEXT',
      sourceNetwork:graph.source_network, graphSha256:graph.graph_sha256,
      authority:'READ_ONLY_ASSOCIATIVE_DISCOVERY_PROJECTION', contentExposed:false,
      nodes:Object.freeze((graph.nodes||[]).map(n=>Object.freeze({...n,readOnly:true,sourceMutationAllowed:false,evidenceAuthority:false}))),
      links:Object.freeze((graph.edges||[]).map(e=>Object.freeze({...e,readOnly:true})))
    });
  }
  async function load(source=DEFAULT_SOURCE){
    const r=await fetch(source,{cache:'no-store'}); if(!r.ok) throw new Error(`Physarius uplink HTTP ${r.status}`);
    const intake=normalize(await r.json());
    if(typeof root.dispatchEvent==='function'&&typeof root.CustomEvent==='function') root.dispatchEvent(new root.CustomEvent('inaihr:physarius-ready',{detail:intake}));
    return intake;
  }
  const API=Object.freeze({version:'1.0.0',DEFAULT_SOURCE,assertGraph,normalize,load,laws:Object.freeze([
    'RIGHT_INAIHR_ASSOCIATION_NE_EVIDENCE','BLIND_MEMBER_NE_SCIENTIFIC_RESULT','GRAPH_POSITION_NE_EVIDENCE_STRENGTH',
    'SAME_LINEAGE_NE_INDEPENDENT_REPLICATION','ASSOCIATIVE_INTAKE_HAS_NO_WRITE_DELETE_OR_SOURCE_MUTATION_AUTHORITY'
  ])});
  root.JANUS_PHYSARIUS_ASSOCIATIVE_INTAKE=API;
  if(typeof module!=='undefined'&&module.exports) module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
