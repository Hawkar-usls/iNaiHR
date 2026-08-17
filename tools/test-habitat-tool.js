'use strict';
const assert=require('assert');
const tool=require('../habitat-tool.js');
const goldprompt=require('../goldprompt-handshake.js');

const TEST_SHA='b'.repeat(40);
process.env.JANUS_SOURCE_REVISION=process.env.GITHUB_SHA||TEST_SHA;

assert.equal(goldprompt.contractDigest(),goldprompt.EXPECTED_CONTRACT_DIGEST);
assert.equal(goldprompt.STARTUP_CONTRACT_DIGEST,goldprompt.EXPECTED_CONTRACT_DIGEST);
assert.equal(goldprompt.dependencyManifestDigest(),goldprompt.EXPECTED_DEPENDENCY_MANIFEST_DIGEST);
assert.equal(goldprompt.STARTUP_DEPENDENCY_MANIFEST_DIGEST,goldprompt.EXPECTED_DEPENDENCY_MANIFEST_DIGEST);

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
const receipt=response.goldprompt_receipt;
assert.equal(receipt.schema,goldprompt.RECEIPT_SCHEMA);
assert.equal(receipt.face_id,'RIGHT_INAIHR');
assert.equal(receipt.face_role,'ASSOCIATIVE_CONTEXT');
assert.equal(receipt.goldprompt_foundation_id,goldprompt.GOLDPROMPT_FOUNDATION_ID);
assert.equal(receipt.goldprompt_version,'0.9.2');
assert.equal(receipt.emergence_contract_version,'JANUS_TRIADIC_EMERGENCE@0.9.2');
assert.equal(receipt.contract_digest_sha256,goldprompt.EXPECTED_CONTRACT_DIGEST);
assert.equal(receipt.dependency_manifest_reference,goldprompt.DEPENDENCY_MANIFEST_REFERENCE);
assert.equal(receipt.dependency_manifest_digest_sha256,goldprompt.EXPECTED_DEPENDENCY_MANIFEST_DIGEST);
assert.equal(receipt.source_revision,(process.env.GITHUB_SHA||TEST_SHA).toLowerCase());
assert.equal(receipt.authority_weight,0);
assert.equal(receipt.compliance_state,'COMPLIANT');
assert.equal(goldprompt.verifyReceipt(receipt),true);

function rehash(candidate){const payload={...candidate};delete payload.receipt_sha256;return {...payload,receipt_sha256:goldprompt.sha256(payload)};}
assert.equal(goldprompt.verifyReceipt(rehash({...receipt,face_role:'TRUTH_ORACLE'})),false);
assert.equal(goldprompt.verifyReceipt(rehash({...receipt,user_exit_and_release_control_accepted:false})),false);
assert.equal(goldprompt.verifyReceipt(rehash({...receipt,capability_scope:['PROPOSE_SEMANTIC_SYNTH']})),false);
assert.equal(goldprompt.verifyReceipt(rehash({...receipt,dependency_manifest_digest_sha256:'0'.repeat(64)})),false);
assert.equal(goldprompt.verifyReceipt(rehash({...receipt,extra_authority_hint:true})),false);
assert.throws(()=>goldprompt.resolveRuntimeSourceRevision({}),/TRUSTED_SOURCE_REVISION_REQUIRED/);
assert.throws(()=>goldprompt.resolveRuntimeSourceRevision({JANUS_SOURCE_REVISION:'TEST-REV'}),/JANUS_SOURCE_REVISION_INVALID/);

assert.throws(()=>tool.handle({...req,request_id:'HABITAT-INAIHR-0002',source_revision:'c'.repeat(40)}),/CALLER_SOURCE_REVISION_FORBIDDEN/);
assert.throws(()=>tool.handle({...req,request_id:'HABITAT-INAIHR-0003',records:[{path:'bad.path',value:'x'}]}),/SOURCE_PATH_INVALID/);
assert.throws(()=>tool.handle({...req,request_id:'HABITAT-INAIHR-0004',records:[{path:'$.a',value:'x'},{path:'$.a',value:'y'}]}),/DUPLICATE_SOURCE_PATH/);

const bridge=tool.handle({schema:tool.REQUEST_SCHEMA,request_id:'HABITAT-INAIHR-0005',operation:'BRIDGE_PACKET',workspace:{nodes:[{id:'a',label:'A'}],links:[]}});
assert.equal(bridge.packet.schema,'janus.demihead.hemisphere_packet.v2');
assert.equal(bridge.packet.source.source_revision,bridge.goldprompt_receipt.source_revision);
assert.equal(bridge.packet.source.goldprompt_receipt_sha256,bridge.goldprompt_receipt.receipt_sha256);
assert.deepEqual(bridge.packet.goldprompt_receipt,bridge.goldprompt_receipt);

console.log('INAIHR_HABITAT_TOOL=PASS');
console.log('INAIHR_GOLDPROMPT_HANDSHAKE_V1_1=PASS');
console.log('INAIHR_GOLDPROMPT_TRANSITIVE_PIN_BINDING=PASS');
console.log('INAIHR_PACKET_EMBEDS_UPSTREAM_RECEIPT=PASS');
console.log('INAIHR_GOLDPROMPT_CALLER_REVISION_OVERRIDE=REJECTED');
console.log('INAIHR_GOLDPROMPT_FULL_POLICY_VERIFY=PASS');
console.log('INAIHR_EXACT_SOURCEPATH_GROUNDING=PASS');
console.log('INAIHR_SOURCE_MUTATION=FALSE');
console.log('INAIHR_NETWORK_USED=FALSE');
