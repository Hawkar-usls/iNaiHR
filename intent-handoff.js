'use strict';

const crypto = require('crypto');

const ANCHOR_SCHEMA = 'janus.goldprompt.intent_anchor.v1';
const HANDOFF_SCHEMA = 'janus.goldprompt.intent_handoff.v1';
const CONTEXT_TIERS = Object.freeze({
  0: 'CURRENT_EXPLICIT_USER_REQUEST',
  1: 'IMMEDIATELY_REQUIRED_RECENT_REFERENTS',
  2: 'ACTIVE_PROJECT_CONSTRAINTS_REQUIRED_FOR_CORRECTNESS',
  3: 'OLDER_RELEVANT_CONTEXT',
  4: 'ASSOCIATIVE_OR_EMERGENT_CONTEXT'
});
const ANCHOR_KEYS = Object.freeze([
  'schema','current_turn_digest','requested_operation','primary_entities','must_answer_points',
  'required_answer_evidence','operation_markers','optional_association_markers','explicit_constraints',
  'allow_anaphoric_continuation','context_priority','intent_id'
].sort());
const HANDOFF_KEYS = Object.freeze([
  'schema','intent_id','current_turn_digest','requested_operation','primary_entities','must_answer_points',
  'face_id','context_tier_used','context_tier_name','handoff_sha256'
].sort());
const HEX64 = /^[0-9a-f]{64}$/;

function canonicalize(value){
  if(Array.isArray(value)) return value.map(canonicalize);
  if(value&&typeof value==='object'){
    const out={};
    for(const key of Object.keys(value).sort()) out[key]=canonicalize(value[key]);
    return out;
  }
  return value;
}
function sha256(value){return crypto.createHash('sha256').update(JSON.stringify(canonicalize(value)),'utf8').digest('hex');}
function exactKeys(value,expected){return !!value&&typeof value==='object'&&!Array.isArray(value)&&JSON.stringify(Object.keys(value).sort())===JSON.stringify(expected);}
function stringArray(value){return Array.isArray(value)&&value.every(item=>typeof item==='string'&&item.trim());}
function verifyAnchor(anchor){
  if(!exactKeys(anchor,ANCHOR_KEYS)||anchor.schema!==ANCHOR_SCHEMA) return false;
  if(!HEX64.test(String(anchor.current_turn_digest||''))||!HEX64.test(String(anchor.intent_id||''))) return false;
  if(typeof anchor.requested_operation!=='string'||!anchor.requested_operation.trim()) return false;
  if(!anchor.primary_entities||typeof anchor.primary_entities!=='object'||Array.isArray(anchor.primary_entities)||!Object.keys(anchor.primary_entities).length) return false;
  for(const [entity,aliases] of Object.entries(anchor.primary_entities)) if(!entity.trim()||!stringArray(aliases)) return false;
  if(!stringArray(anchor.must_answer_points)) return false;
  if(!Array.isArray(anchor.required_answer_evidence)||!anchor.required_answer_evidence.every(group=>stringArray(group))) return false;
  for(const key of ['operation_markers','optional_association_markers','explicit_constraints']) if(!Array.isArray(anchor[key])||!anchor[key].every(item=>typeof item==='string'&&item.trim())) return false;
  if(typeof anchor.allow_anaphoric_continuation!=='boolean') return false;
  if(JSON.stringify(anchor.context_priority)!==JSON.stringify(Object.keys(CONTEXT_TIERS).map(k=>CONTEXT_TIERS[k]))) return false;
  const payload={...anchor};delete payload.intent_id;return sha256(payload)===anchor.intent_id;
}
function buildHandoff(anchor,faceId,contextTierUsed=2){
  if(!verifyAnchor(anchor)) throw new Error('GOLDPROMPT_INTENT_ANCHOR_INVALID');
  if(!Object.prototype.hasOwnProperty.call(CONTEXT_TIERS,contextTierUsed)) throw new Error('GOLDPROMPT_CONTEXT_TIER_INVALID');
  const handoff={schema:HANDOFF_SCHEMA,intent_id:anchor.intent_id,current_turn_digest:anchor.current_turn_digest,requested_operation:anchor.requested_operation,primary_entities:Object.keys(anchor.primary_entities).sort(),must_answer_points:[...anchor.must_answer_points],face_id:String(faceId),context_tier_used:contextTierUsed,context_tier_name:CONTEXT_TIERS[contextTierUsed]};
  handoff.handoff_sha256=sha256(handoff);return handoff;
}
function verifyHandoff(anchor,handoff,expectedFaceId){
  if(!verifyAnchor(anchor)||!exactKeys(handoff,HANDOFF_KEYS)||handoff.schema!==HANDOFF_SCHEMA) return false;
  if(handoff.intent_id!==anchor.intent_id||handoff.current_turn_digest!==anchor.current_turn_digest||handoff.requested_operation!==anchor.requested_operation) return false;
  if(JSON.stringify(handoff.primary_entities)!==JSON.stringify(Object.keys(anchor.primary_entities).sort())) return false;
  if(JSON.stringify(handoff.must_answer_points)!==JSON.stringify(anchor.must_answer_points)||String(handoff.face_id)!==String(expectedFaceId)) return false;
  if(!Object.prototype.hasOwnProperty.call(CONTEXT_TIERS,handoff.context_tier_used)||handoff.context_tier_name!==CONTEXT_TIERS[handoff.context_tier_used]) return false;
  if(!HEX64.test(String(handoff.handoff_sha256||''))) return false;
  const payload={...handoff};delete payload.handoff_sha256;return sha256(payload)===handoff.handoff_sha256;
}

module.exports=Object.freeze({ANCHOR_SCHEMA,HANDOFF_SCHEMA,CONTEXT_TIERS,canonicalize,sha256,verifyAnchor,buildHandoff,verifyHandoff});
