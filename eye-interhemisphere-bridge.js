(function(root){
'use strict';

const LOCAL='RIGHT_INAIHR';
const MEDIATOR='LEFT_HRAIN';
const EYE='EYE';
const ROLE='ASSOCIATIVE_CONTEXT';
const REQUEST_SCHEMA='janus.eye.inaihr_association_request.v1';
const RESPONSE_SCHEMA='janus.eye.inaihr_association_response.v1';
const GROUNDING_STATUSES=new Set(['MATCH','MISMATCH','OPEN']);
const FORBIDDEN_OUTPUT_KEYS=new Set(['truth','proof','execute','execution','write','mutate','authority','claim_promotion','exact_recovery']);

function stable(v){
  if(Array.isArray(v)) return v.map(stable);
  if(v&&typeof v==='object'){
    const o={};
    for(const k of Object.keys(v).sort()) o[k]=stable(v[k]);
    return o;
  }
  return v;
}
function bytes(v){return new TextEncoder().encode(JSON.stringify(stable(v)));}
async function sha256Hex(v){
  const b=bytes(v);
  if(globalThis.crypto&&globalThis.crypto.subtle){
    const d=await globalThis.crypto.subtle.digest('SHA-256',b);
    return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  if(typeof require==='function') return require('node:crypto').createHash('sha256').update(Buffer.from(b)).digest('hex');
  throw new Error('SHA-256 unavailable');
}
async function sealPacket(packet){
  const copy={...packet};
  delete copy.packet_sha256;
  return Object.freeze({...copy,packet_sha256:await sha256Hex(copy)});
}
async function verifyPacketHash(packet){
  if(!packet||typeof packet.packet_sha256!=='string') throw new Error('Missing packet SHA');
  const copy={...packet};
  delete copy.packet_sha256;
  const expected=await sha256Hex(copy);
  if(expected!==packet.packet_sha256) throw new Error('Packet SHA mismatch');
  return true;
}
function assertReadOnlyControl(control){
  const c=control||{};
  if(c.read_only_transfer!==true) throw new Error('read_only_transfer must be true');
  if(c.direct_mutation!==false) throw new Error('direct_mutation must be false');
  if(c.authority_delta!==0) throw new Error('authority_delta must be zero');
  if(c.claim_promotion!==false) throw new Error('claim_promotion must be false');
  if(c.proof_authority!==false) throw new Error('proof_authority must be false');
  if(c.external_effect_authority!==false) throw new Error('external_effect_authority must be false');
}
function defaultControl(){
  return Object.freeze({
    read_only_transfer:true,
    direct_mutation:false,
    authority_delta:0,
    claim_promotion:false,
    proof_authority:false,
    external_effect_authority:false
  });
}
function assertAssociationPayloadSafe(value,path='associations'){
  if(Array.isArray(value)){
    value.forEach((x,i)=>assertAssociationPayloadSafe(x,`${path}[${i}]`));
    return;
  }
  if(value&&typeof value==='object'){
    for(const [k,v] of Object.entries(value)){
      if(FORBIDDEN_OUTPUT_KEYS.has(String(k).casefold?.()||String(k).toLowerCase())) throw new Error(`Forbidden authoritative association key: ${path}.${k}`);
      assertAssociationPayloadSafe(v,`${path}.${k}`);
    }
  }
}
async function acceptAssociationRequest(packet){
  if(!packet||packet.schema!==REQUEST_SCHEMA) throw new Error('Unsupported EYE association request schema');
  if(packet.channel!=='EYE_TO_INAIHR_VIA_HRAIN') throw new Error('Wrong EYE association channel');
  if(packet.source!==MEDIATOR||packet.logical_source!==EYE||packet.target!==LOCAL||packet.via!==MEDIATOR) throw new Error('Direct EYE->iNaiHR bypass forbidden');
  if(!GROUNDING_STATUSES.has(packet.grounding_status)) throw new Error('Invalid grounding status');
  if(packet.accepted_as!=='SEMANTIC_ASSOCIATION_INPUT_ONLY'||packet.evidence_authority!==false) throw new Error('Association request authority leak');
  if(!packet.representation_contract||typeof packet.representation_contract.target_invariant!=='string') throw new Error('Representation contract target invariant required');
  assertReadOnlyControl(packet.control);
  await verifyPacketHash(packet);
  return Object.freeze({...packet,accepted_by:LOCAL,association_authority:false});
}
async function buildAssociationResponse(acceptedRequest,associations){
  const request=await acceptAssociationRequest(acceptedRequest);
  if(!associations||typeof associations!=='object') throw new Error('Associations object required');
  assertAssociationPayloadSafe(associations);
  return sealPacket({
    schema:RESPONSE_SCHEMA,
    channel:'INAIHR_TO_EYE_VIA_HRAIN',
    source:LOCAL,
    target:EYE,
    via:MEDIATOR,
    request_sha256:request.packet_sha256,
    grounded_context_sha256:request.grounded_context_sha256,
    grounding_status:request.grounding_status,
    associations,
    accepted_as:'ASSOCIATIVE_CONTEXT_ONLY',
    evidence_authority:false,
    independent_replication:false,
    terminal_authority:false,
    control:defaultControl()
  });
}
async function validateAssociationResponse(packet){
  if(!packet||packet.schema!==RESPONSE_SCHEMA) throw new Error('Unsupported association response schema');
  if(packet.channel!=='INAIHR_TO_EYE_VIA_HRAIN'||packet.source!==LOCAL||packet.target!==EYE||packet.via!==MEDIATOR) throw new Error('Wrong mediated response route');
  if(packet.accepted_as!=='ASSOCIATIVE_CONTEXT_ONLY'||packet.evidence_authority!==false||packet.independent_replication!==false||packet.terminal_authority!==false) throw new Error('Association response authority leak');
  assertAssociationPayloadSafe(packet.associations);
  assertReadOnlyControl(packet.control);
  await verifyPacketHash(packet);
  return packet;
}

const API=Object.freeze({
  version:'1.0.0',LOCAL,MEDIATOR,EYE,ROLE,REQUEST_SCHEMA,RESPONSE_SCHEMA,
  sealPacket,verifyPacketHash,acceptAssociationRequest,buildAssociationResponse,validateAssociationResponse,sha256Hex,
  laws:Object.freeze([
    'HRAIN_GROUNDS',
    'EYE_BRIDGES',
    'INAIHR_ASSOCIATES',
    'VERIFY_DECIDES',
    'EYE_TO_INAIHR_VIA_HRAIN=SEMANTIC_ASSOCIATION_INPUT_ONLY',
    'DIRECT_EYE_TO_INAIHR_BYPASS_FORBIDDEN',
    'ASSOCIATION_NE_EVIDENCE',
    'BICAMERAL_AGREEMENT_NE_INDEPENDENT_REPLICATION',
    'SEMANTIC_REGION_NE_EXACT_RECOVERY',
    'NO_DIRECT_MUTATION',
    'NO_CLAIM_PROMOTION'
  ])
});
root.JANUS_EYE_INAIHR_BRIDGE=API;
if(typeof module!=='undefined'&&module.exports) module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
