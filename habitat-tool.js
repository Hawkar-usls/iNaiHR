#!/usr/bin/env node
'use strict';

const bridge = require('./demihead-bridge.js');
const goldprompt = require('./goldprompt-handshake.js');
const intent = require('./intent-handoff.js');

const REQUEST_SCHEMA = 'janus.habitat.inaihr.request.v1';
const RESPONSE_SCHEMA = 'janus.habitat.inaihr.response.v1';
const TOOL_ID = 'JANUS.INAIHR.SYNTH.LOCAL';
const FACE_ID = 'RIGHT_INAIHR';
const REQUEST_ID_RE = /^[A-Za-z0-9._:-]{8,128}$/;

const CAT = [
  ['purpose', /purpose|goal|summary|description|core|intent|mission|question/i],
  ['claims', /claim|status|result|finding|conclusion|authority|hypothesis/i],
  ['evidence', /evidence|test|metric|score|receipt|certificate|audit|observation/i],
  ['boundaries', /firewall|boundary|forbid|ceiling|constraint|safety|limit|not_/i],
  ['next', /gate|next|required|open|todo|future|roadmap|pending/i],
  ['lineage', /reference|source|parent|historical|version|lineage|mirror|provenance/i],
  ['mechanism', /implementation|method|architecture|protocol|workflow|runtime|algorithm|mechanism/i]
];
const LABEL = {
  en:{purpose:'Purpose & meaning',claims:'Claims & state',evidence:'Evidence & tests',boundaries:'Boundaries & safeguards',next:'Open gates & next steps',lineage:'Sources & lineage',mechanism:'Mechanisms & implementation'},
  ua:{purpose:'Мета й сенс',claims:'Твердження й стан',evidence:'Докази й тести',boundaries:'Межі й запобіжники',next:'Відкриті рубежі й наступні кроки',lineage:'Джерела й походження',mechanism:'Механізми й реалізація'},
  ru:{purpose:'Цель и смысл',claims:'Утверждения и состояние',evidence:'Доказательства и тесты',boundaries:'Границы и предохранители',next:'Открытые рубежи и следующие шаги',lineage:'Источники и происхождение',mechanism:'Механизмы и реализация'}
};
const EMOJI={purpose:'🎯',claims:'◇',evidence:'🔎',boundaries:'🛡️',next:'➡️',lineage:'🧬',mechanism:'⚙️'};

function fail(message){const e=new Error(message);e.code=message;throw e;}
function humanize(s){return String(s).replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
function cleanRecords(value){
  if(!Array.isArray(value)) fail('INAIHR_HABITAT_RECORDS_ARRAY_REQUIRED');
  if(value.length>400) fail('INAIHR_HABITAT_RECORD_LIMIT');
  const paths=new Set();
  return value.map((r,i)=>{
    if(!r||typeof r!=='object'||Array.isArray(r)) fail(`INAIHR_HABITAT_RECORD_OBJECT_REQUIRED:${i}`);
    const path=String(r.path||'').trim();
    if(!path.startsWith('$')) fail(`INAIHR_HABITAT_SOURCE_PATH_INVALID:${i}`);
    if(paths.has(path)) fail(`INAIHR_HABITAT_DUPLICATE_SOURCE_PATH:${path}`);
    paths.add(path);
    return {path,value:String(r.value??'').replace(/\s+/g,' ').trim().slice(0,600)};
  }).filter(r=>r.value);
}
function synthLocal(records,lang,maxConcepts){
  const groups={};
  for(const [key,re] of CAT){const x=records.filter(r=>re.test(r.path));if(x.length)groups[key]=x;}
  let entries=Object.entries(groups).sort((a,b)=>b[1].length-a[1].length).slice(0,maxConcepts);
  if(entries.length<2){
    const byTop={};
    for(const r of records){const m=r.path.match(/^\$\.([^\.\[]+)/);const k=m?m[1]:'context';(byTop[k]||(byTop[k]=[])).push(r);}
    entries=Object.entries(byTop).sort((a,b)=>b[1].length-a[1].length).slice(0,maxConcepts);
  }
  return entries.map(([key,rs])=>({title:(LABEL[lang]&&LABEL[lang][key])||humanize(key),emoji:EMOJI[key]||'✦',summary:rs[0]?.value||'',sourcePaths:rs.slice(0,10).map(r=>r.path)}));
}
function buildGoldPromptReceipt(){
  const receipt=goldprompt.buildRuntimeReceipt();
  if(!goldprompt.verifyReceipt(receipt)) fail('INAIHR_GOLDPROMPT_RECEIPT_SELF_VERIFY_FAILED');
  return receipt;
}
function handle(request){
  if(!request||typeof request!=='object'||Array.isArray(request)) fail('INAIHR_HABITAT_REQUEST_OBJECT_REQUIRED');
  if(request.schema!==REQUEST_SCHEMA) fail('INAIHR_HABITAT_REQUEST_SCHEMA_MISMATCH');
  const requestId=String(request.request_id||'');
  if(!REQUEST_ID_RE.test(requestId)) fail('INAIHR_HABITAT_REQUEST_ID_INVALID');
  if(Object.prototype.hasOwnProperty.call(request,'source_revision')) fail('INAIHR_CALLER_SOURCE_REVISION_FORBIDDEN');
  const operation=String(request.operation||'');
  if(operation!=='BRIDGE_PACKET'&&operation!=='SYNTH_LOCAL') fail('INAIHR_HABITAT_OPERATION_UNSUPPORTED');

  if(!intent.verifyAnchor(request.intent_anchor)) fail('INAIHR_GOLDPROMPT_INTENT_ANCHOR_REQUIRED_OR_INVALID');
  const intentHandoff=intent.buildHandoff(request.intent_anchor,FACE_ID,2);
  if(!intent.verifyHandoff(request.intent_anchor,intentHandoff,FACE_ID)) fail('INAIHR_GOLDPROMPT_INTENT_HANDOFF_SELF_VERIFY_FAILED');

  const goldpromptReceipt=buildGoldPromptReceipt();
  if(operation==='BRIDGE_PACKET'){
    const packet=bridge.buildPacket(request.workspace||{}, {
      packetId:`habitat-inaihr-${requestId}`,
      capturedAt:request.captured_at||new Date().toISOString(),
      sourceRevision:goldpromptReceipt.source_revision,
      goldpromptReceipt,
      intentAnchor:request.intent_anchor,
      intentHandoff
    });
    if(packet.source.goldprompt_receipt_sha256!==goldpromptReceipt.receipt_sha256) fail('INAIHR_PACKET_RECEIPT_BINDING_FAILED');
    if(packet.source.intent_id!==request.intent_anchor.intent_id||packet.source.intent_handoff_sha256!==intentHandoff.handoff_sha256) fail('INAIHR_PACKET_INTENT_BINDING_FAILED');
    return {schema:RESPONSE_SCHEMA,request_id:requestId,tool_id:TOOL_ID,tool:'iNaiHR',role:'ASSOCIATIVE_CONTEXT',status:'BRIDGE_PACKET_READY_OPTIONAL',intent_anchor:request.intent_anchor,intent_handoff:intentHandoff,goldprompt_receipt:goldpromptReceipt,packet,may_be_ignored:true,authority_delta:0,mass_effect_budget_delta:0,world_effect_requested:false,source_mutation_allowed:false,network_used_by_tool:false};
  }
  const lang=['en','ua','ru'].includes(request.lang)?request.lang:'en';
  const max=Math.max(2,Math.min(6,Number.isInteger(request.max_concepts)?request.max_concepts:6));
  const records=cleanRecords(request.records);
  if(records.length<1) fail('INAIHR_HABITAT_RECORDS_EMPTY');
  const concepts=synthLocal(records,lang,max);
  const allowed=new Set(records.map(r=>r.path));
  for(const c of concepts) for(const p of c.sourcePaths) if(!allowed.has(p)) fail('INAIHR_HABITAT_UNGROUNDED_SOURCE_PATH');
  return {
    schema:RESPONSE_SCHEMA,request_id:requestId,tool_id:TOOL_ID,tool:'iNaiHR',role:'ASSOCIATIVE_CONTEXT',status:'SYNTH_READY_OPTIONAL',
    intent_anchor:request.intent_anchor,intent_handoff:intentHandoff,goldprompt_receipt:goldpromptReceipt,
    synth_mode:'LOCAL_SEMANTIC_SYNTH',parent_label:String(request.parent_label||'').slice(0,240),concepts,exact_source_path_grounding:true,
    may_be_ignored:true,authority_delta:0,mass_effect_budget_delta:0,world_effect_requested:false,source_mutation_allowed:false,network_used_by_tool:false
  };
}
function runCli(){let raw='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>raw+=c);process.stdin.on('end',()=>{try{process.stdout.write(JSON.stringify(handle(JSON.parse(raw||'{}')))+'\n');}catch(err){process.stderr.write(JSON.stringify({schema:'janus.habitat.inaihr.error.v1',status:'REJECTED',error:String(err&&(err.code||err.message)||'UNKNOWN')})+'\n');process.exitCode=2;}});}
if(require.main===module)runCli();
module.exports=Object.freeze({REQUEST_SCHEMA,RESPONSE_SCHEMA,TOOL_ID,FACE_ID,cleanRecords,synthLocal,buildGoldPromptReceipt,handle});
