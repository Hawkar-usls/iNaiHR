'use strict';
const assert=require('assert');
const tool=require('../habitat-tool.js');
const goldprompt=require('../goldprompt-handshake.js');

assert.equal(goldprompt.contractDigest(),goldprompt.EXPECTED_CONTRACT_DIGEST);

const req={
  schema:tool.REQUEST_SCHEMA,
  request_id:'HABITAT-INAIHR-0001',
  operation:'SYNTH_LOCAL',
  source_revision:'TEST-REV',
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
const receipt=response.goldprompt_receipt;
assert.equal(receipt.schema,goldprompt.RECEIPT_SCHEMA);
assert.equal(receipt.face_id,'RIGHT_INAIHR');
assert.equal(receipt.face_role,'ASSOCIATIVE_CONTEXT');
assert.equal(receipt.goldprompt_foundation_id,goldprompt.GOLDPROMPT_FOUNDATION_ID);
assert.equal(receipt.goldprompt_version,'0.9.2');
assert.equal(receipt.emergence_contract_version,'JANUS_TRIADIC_EMERGENCE@0.9.2');
assert.equal(receipt.contract_digest_sha256,goldprompt.EXPECTED_CONTRACT_DIGEST);
assert.equal(receipt.source_revision,'TEST-REV');
assert.equal(receipt.authority_weight,0);
assert.equal(receipt.compliance_state,'COMPLIANT');
assert.equal(goldprompt.verifyReceipt(receipt),true);
assert.equal(goldprompt.verifyReceipt({...receipt,face_role:'TRUTH_ORACLE'}),false);

assert.throws(()=>tool.handle({...req,request_id:'HABITAT-INAIHR-0002',records:[{path:'bad.path',value:'x'}]}),/SOURCE_PATH_INVALID/);
assert.throws(()=>tool.handle({...req,request_id:'HABITAT-INAIHR-0003',records:[{path:'$.a',value:'x'},{path:'$.a',value:'y'}]}),/DUPLICATE_SOURCE_PATH/);
console.log('INAIHR_HABITAT_TOOL=PASS');
console.log('INAIHR_GOLDPROMPT_HANDSHAKE=PASS');
console.log('INAIHR_EXACT_SOURCEPATH_GROUNDING=PASS');
console.log('INAIHR_SOURCE_MUTATION=FALSE');
console.log('INAIHR_NETWORK_USED=FALSE');
