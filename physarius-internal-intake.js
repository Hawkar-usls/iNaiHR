(function (root) {
  'use strict';
  const DEFAULT_SOURCE='https://raw.githubusercontent.com/Hawkar-usls/Janus-Fundamentum/main/registry/PHYSARIUS_INTERNAL_REPO_HRAIN_LIVE_v1.json';
  function assertGraph(graph){
    if(!graph||graph.schema!=='janus.hrain.physarius_internal_graph.v1') throw new Error('Unsupported internal Physarius graph schema');
    const m=graph.mutationPolicy||{}, c=graph.contentPolicy||{};
    if(m.write!==false||m.delete!==false||m.sourceMutation!==false) throw new Error('RIGHT_INAIHR rejects mutation authority');
    if(c.contentExposed!==false) throw new Error('Internal trunk graph must be tree-first');
    if(c.selectivePullRequiresBinding!==true) throw new Error('Selective pull binding required');
    return graph;
  }
  function normalize(graph){
    assertGraph(graph);
    return Object.freeze({
      schema:'inaihr.physarius.internal_associative_intake.v1',
      hemisphere:'RIGHT_INAIHR', role:'ASSOCIATIVE_CONTEXT',
      sourceNetwork:graph.source_network, graphSha256:graph.graph_sha256,
      authority:'READ_ONLY_INTERNAL_ASSOCIATIVE_PROJECTION', contentExposed:false,
      pathNamesExposed:graph.contentPolicy.pathNamesExposed===true,
      nodes:Object.freeze((graph.nodes||[]).map(n=>Object.freeze({...n,readOnly:true,sourceMutationAllowed:false,evidenceAuthority:false}))),
      links:Object.freeze((graph.edges||[]).map(e=>Object.freeze({...e,readOnly:true}))),
      claimCeiling:Object.freeze([...(graph.claim_ceiling||[])])
    });
  }
  async function load(source=DEFAULT_SOURCE){
    const r=await fetch(source,{cache:'no-store'}); if(!r.ok) throw new Error(`Internal Physarius uplink HTTP ${r.status}`);
    const intake=normalize(await r.json());
    if(typeof root.dispatchEvent==='function'&&typeof root.CustomEvent==='function') root.dispatchEvent(new root.CustomEvent('inaihr:physarius-internal-ready',{detail:intake}));
    return intake;
  }
  const API=Object.freeze({version:'1.0.0',DEFAULT_SOURCE,assertGraph,normalize,load,laws:Object.freeze([
    'META_REGISTRY_MEMORY_NE_EXTERNAL_EVIDENCE','LAPIS_MECHANISM_NE_TRUTH_AUTHORITY','RIGHT_INAIHR_ASSOCIATION_NE_TRUTH_AUTHORITY',
    'BLOB_DEDUP_NE_LINEAGE_ERASURE','SELECTIVE_PULL_REQUIRES_EXACT_BINDING','INTERNAL_ASSOCIATIVE_INTAKE_HAS_NO_WRITE_DELETE_OR_SOURCE_MUTATION_AUTHORITY'
  ])});
  root.JANUS_PHYSARIUS_INTERNAL_ASSOCIATIVE_INTAKE=API;
  if(typeof module!=='undefined'&&module.exports) module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
