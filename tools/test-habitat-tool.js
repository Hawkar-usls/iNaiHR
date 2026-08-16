'use strict';
const assert=require('assert');
const tool=require('../habitat-tool.js');

const req={
  schema:tool.REQUEST_SCHEMA,
  request_id:'HABITAT-INAIHR-0001',
  operation:'SYNTH_LOCAL',
  lang:'en',
  parent_label:'Test parent',
  records:[
    {path:'$.purpose',value:'Preserve an inspectable semantic map.'},
    {path:'$.claim.status',value:'OPEN'},
    {path:'$.evidence.tests[0]',value:'A deterministic test passed.'},
    {path:'$.boundary.claim_ceiling',value:'SYNTH != SOURCE AUTHORITY'},
    {path:'$.next.gate',value:'Run external verification.'},
    {path:'$.lineage.source',value:'Canonical source record.'}
  ]
};
const response=tool.handle(req);
assert.equal(response.status,'SYNTH_READY_OPTIONAL');
assert.equal(response.tool_id,'JANUS.INAIHR.SYNTH.LOCAL');
assert.equal(response.exact_source_path_grounding,true);
assert.equal(response.source_mutation_allowed,false);
assert.equal(response.network_used_by_tool,false);
const allowed=new Set(req.records.map(r=>r.path));
for(const c of response.concepts){
  assert.ok(c.sourcePaths.length>0);
  for(const p of c.sourcePaths) assert.ok(allowed.has(p));
}
assert.throws(()=>tool.handle({...req,request_id:'HABITAT-INAIHR-0002',records:[{path:'bad.path',value:'x'}]}),/SOURCE_PATH_INVALID/);
assert.throws(()=>tool.handle({...req,request_id:'HABITAT-INAIHR-0003',records:[{path:'$.a',value:'x'},{path:'$.a',value:'y'}]}),/DUPLICATE_SOURCE_PATH/);
console.log('INAIHR_HABITAT_TOOL=PASS');
console.log('INAIHR_EXACT_SOURCEPATH_GROUNDING=PASS');
console.log('INAIHR_SOURCE_MUTATION=FALSE');
console.log('INAIHR_NETWORK_USED=FALSE');
