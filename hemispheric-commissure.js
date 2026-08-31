(function(root){
'use strict';
const LOCAL='RIGHT_INAIHR', PEER='LEFT_HRAIN', ROLE='ASSOCIATIVE_CONTEXT';
const CLASSES=new Set(['ATTENTION_POINTER','CONTEXT_REQUEST','CONTEXT_RETURN','HYPOTHESIS_CANDIDATE','CONTRADICTION_OR_DISAGREEMENT','AMBIGUITY_SET','PROVENANCE_POINTER','DEBT_POINTER']);
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;}return v;}
function bytes(v){return new TextEncoder().encode(JSON.stringify(stable(v)));}
async function sha256Hex(v){
 const b=bytes(v);
 if(globalThis.crypto&&globalThis.crypto.subtle){const d=await globalThis.crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');}
 if(typeof require==='function'){return require('node:crypto').createHash('sha256').update(Buffer.from(b)).digest('hex');}
 throw new Error('SHA-256 unavailable');
}
function validateHemispherePacket(p){
 if(!p||!['janus.demihead.hemisphere_packet.v1','janus.demihead.hemisphere_packet.v3'].includes(p.schema))throw new Error('Unsupported hemisphere packet');
 if(p.hemisphere!==LOCAL||p.role!==ROLE)throw new Error('Local hemisphere packet mismatch');
 const c=p.control||{};if(c.read_only_transfer!==true||c.direct_cross_hemisphere_mutation!==false||c.authority_delta!==0||c.mass_effect_budget_delta!==0)throw new Error('Unsafe packet authority');
 return p;
}
async function buildExchange(packet,messageClass,payload,previousExchangeSha256=null,exchangeId=null){
 validateHemispherePacket(packet);if(!CLASSES.has(messageClass))throw new Error('Invalid message class');
 const e={schema:'janus.physarius.hemispheric_exchange.v1',exchange_id:exchangeId||`right-to-left-${Date.now()}`,source_hemisphere:LOCAL,target_hemisphere:PEER,source_packet_sha256:await sha256Hex(packet),message_class:messageClass,payload:payload||{},previous_exchange_sha256:previousExchangeSha256,control:{read_only_transfer:true,direct_cross_hemisphere_mutation:false,authority_delta:0,mass_effect_budget_delta:0,scientific_claim_promotion:false,proof_authority:false}};
 e.exchange_sha256=await sha256Hex(e);return Object.freeze(e);
}
async function acceptExchange(e){
 if(!e||e.schema!=='janus.physarius.hemispheric_exchange.v1'||e.source_hemisphere!==PEER||e.target_hemisphere!==LOCAL)throw new Error('Wrong commissure route');
 if(!CLASSES.has(e.message_class))throw new Error('Invalid message class');
 const c=e.control||{};if(c.read_only_transfer!==true||c.direct_cross_hemisphere_mutation!==false||c.authority_delta!==0||c.mass_effect_budget_delta!==0||c.scientific_claim_promotion!==false||c.proof_authority!==false)throw new Error('Unsafe commissure authority');
 const copy={...e};delete copy.exchange_sha256;const expected=await sha256Hex(copy);if(e.exchange_sha256!==expected)throw new Error('Exchange SHA mismatch');
 return Object.freeze({...e,accepted_as:'READ_ONLY_STRUCTURAL_CONTEXT',evidence_authority:false,independent_replication:false});
}
const API=Object.freeze({version:'1.0.0',LOCAL,PEER,ROLE,buildExchange,acceptExchange,sha256Hex,laws:Object.freeze(['BOTH_HEMISPHERES_AGREE_NE_TRUTH','COMMISSURE_TRANSPORT_NE_EVIDENCE','DISAGREEMENT_IS_A_FIRST_CLASS_STATE','NO_DIRECT_CROSS_HEMISPHERE_MUTATION'])});
root.JANUS_PHYSARIUS_COMMISSURE=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
