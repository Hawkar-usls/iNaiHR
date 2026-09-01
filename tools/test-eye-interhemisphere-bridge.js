'use strict';
const assert=require('node:assert/strict');
const bridge=require('../eye-interhemisphere-bridge.js');

function control(){return {read_only_transfer:true,direct_mutation:false,authority_delta:0,claim_promotion:false,proof_authority:false,external_effect_authority:false};}
async function rejects(fn,pattern){
  let failed=false;
  try{await fn();}catch(err){failed=true;if(pattern) assert.match(String(err.message||err),pattern);}
  if(!failed) throw new Error('Expected rejection');
}

(async()=>{
  const request=await bridge.sealPacket({
    schema:bridge.REQUEST_SCHEMA,
    channel:'EYE_TO_INAIHR_VIA_HRAIN',source:'LEFT_HRAIN',logical_source:'EYE',target:'RIGHT_INAIHR',via:'LEFT_HRAIN',
    grounded_context_sha256:'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    grounding_status:'OPEN',
    representation_contract:{target_invariant:'SEMANTIC_REGION',must_preserve:['question','language','provenance']},
    structural_context:{source_refs:['data/source-fixture.json'],facts:{language:'ru',byte_length:427}},
    association_input:{bridge_invariants:['question','claim_ceiling'],requested_output:'ASSOCIATIVE_CONTEXT_ONLY'},
    accepted_as:'SEMANTIC_ASSOCIATION_INPUT_ONLY',evidence_authority:false,control:control()
  });
  const accepted=await bridge.acceptAssociationRequest(request);
  assert.equal(accepted.accepted_by,'RIGHT_INAIHR');
  assert.equal(accepted.association_authority,false);

  const response=await bridge.buildAssociationResponse(request,{
    semantic_region:'AFFIRMATIVE_CREATIVE_CONTINUITY',
    ambiguity_set:['exact plaintext remains OPEN'],
    contradiction_set:[],
    bridge_support:['question continuity','claim ceiling']
  });
  await bridge.validateAssociationResponse(response);
  assert.equal(response.channel,'INAIHR_TO_EYE_VIA_HRAIN');
  assert.equal(response.via,'LEFT_HRAIN');
  assert.equal(response.evidence_authority,false);
  assert.equal(response.terminal_authority,false);

  const direct=await bridge.sealPacket({...request,source:'EYE',via:'EYE'});
  await rejects(async()=>bridge.acceptAssociationRequest(direct),/Direct EYE->iNaiHR bypass forbidden/);

  const leaked=await bridge.sealPacket({...request,control:{...control(),authority_delta:1}});
  await rejects(async()=>bridge.acceptAssociationRequest(leaked),/authority_delta/);

  await rejects(async()=>bridge.buildAssociationResponse(request,{truth:'THIS IS TRUE'}),/Forbidden authoritative association key/);
  await rejects(async()=>bridge.buildAssociationResponse(request,{exact_recovery:'plaintext'}),/Forbidden authoritative association key/);

  const tampered={...response,associations:{semantic_region:'TAMPERED'}};
  await rejects(async()=>bridge.validateAssociationResponse(tampered),/Packet SHA mismatch/);

  console.log('EYE_INAIHR_INTERHEMISPHERE=PASS');
  console.log('SEMANTIC_ASSOCIATION_INPUT_ONLY=PASS');
  console.log('DIRECT_EYE_BYPASS_REJECTED=PASS');
  console.log('AUTHORITY_LEAK_REJECTED=PASS');
  console.log('AUTHORITATIVE_OUTPUT_KEYS_REJECTED=PASS');
  console.log('TAMPER_DETECTED=PASS');
})().catch(err=>{console.error(err);process.exit(1);});
