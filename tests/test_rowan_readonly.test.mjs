import test from 'node:test';
import assert from 'node:assert/strict';
import {readRowanEvidence, reconcileRowan} from '../assets/janus-rowan-readonly.mjs';

const run = 40520611650;
const sha = '3'.repeat(64);
const coord = 'b'.repeat(64);
const path = 'data/rowan/coordination/receipts/ROWAN-COUNCIL-40520611650-b055eb25cfb3cb7d.json';
const data = () => ({
  canonical:{schema_id:'janus.rowan.observer_state.v1',latest_durable_external_run:run,last_completed_mutants:8,underlying_state_is_derived_from:sha,latest_scientific_status:'EXPLORATORY_STRATIFIED_DESCRIPTIVE_ONLY'},
  pipeline:{schema_id:'janus.rowan.pipeline_integrity_state.v1',latest_archived_source_run:run,latest_completed_source_run:run,completed_mutants:8,archive_status:'ARCHIVE_CURRENT',independent_TOPA_shadow_status:'PASS_INDEPENDENT_NUMERICAL_REPLAY',science_gates:{model_production_promotion:false,new_billing_authorized_by_watchdog:false,wetlab_independent_validation:'OPEN'}},
  coordination:{schema_id:'janus.meta_registry.rowan_council_state.v1',meta_canonical_run:run,receipt_path:path,source_binding_sha256:coord},
  receipt:{schema_id:'janus.meta_registry.rowan_council_provenance.v1',source_binding_sha256:coord,sources:{meta_canonical_run:run,rowan_source_artifact_sha256:sha},observation:{completed_mutants:8},authority:{new_credit_spend:false,new_rowan_jobs:false,hypotheses_are_empirical_proof:false}}
});
test('aligned 8/8 source pointers give read-only status',()=>{
  const s=data(); const result=reconcileRowan(s.canonical,s.pipeline,s.coordination,s.receipt);
  assert.equal(result.status,'SYNCED_SOURCE_POINTERS_READ_ONLY');
  assert.equal(result.completed,8); assert.equal(result.independentWetlab,'OPEN');
  assert.match(result.authority,/NO_ROWAN_SPEND/);
});
test('stale Demiurge or Meta coordination pointer fails closed',()=>{
  const s=data();s.coordination.meta_canonical_run=40452476743;
  assert.throws(()=>reconcileRowan(s.canonical,s.pipeline,s.coordination,s.receipt),/SOURCE_MISMATCH_HOLD/);
});
test('missing TOPA or independent assay authority fails closed',()=>{
  const s=data();s.pipeline.science_gates.model_production_promotion=true;
  assert.throws(()=>reconcileRowan(s.canonical,s.pipeline,s.coordination,s.receipt),/AUTHORITY_ESCALATION_HOLD/);
});
test('fake receipt with unauthorized Rowan spending is rejected',()=>{
  const s=data();s.receipt.authority.new_credit_spend=true;
  assert.throws(()=>reconcileRowan(s.canonical,s.pipeline,s.coordination,s.receipt),/AUTHORITY_ESCALATION_HOLD/);
});
test('source fetch is GET-only to approved GitHub Raw paths',async()=>{
  const s=data();
  const values=new Map(Object.entries({
    'data/rowan/CANONICAL_STATE.json':s.canonical,
    'data/rowan/health/PIPELINE_STATE.json':s.pipeline,
    'data/rowan/coordination/LATEST_COORDINATION_STATE.json':s.coordination,
    [path]:s.receipt
  }));
  const seen=[];
  const fake=async(url,opts)=>{
    const source=url.replace('https://raw.githubusercontent.com/Hawkar-usls/janus-meta-registry/main/','');
    seen.push(source);
    assert.equal(opts.method,'GET');assert.equal(opts.credentials,'omit');assert.equal(opts.cache,'no-store');
    return {ok:true,text:async()=>JSON.stringify(values.get(source))};
  };
  assert.equal((await readRowanEvidence(fake)).completed,8);
  assert.deepEqual(seen.slice(0,3),['data/rowan/CANONICAL_STATE.json','data/rowan/health/PIPELINE_STATE.json','data/rowan/coordination/LATEST_COORDINATION_STATE.json']);
  assert.equal(seen.length,4);
});
test('receipt path injection is rejected before fetching',async()=>{
  const s=data();s.coordination.receipt_path='../../secret.json';
  const fake=async(url)=>({ok:true,text:async()=>JSON.stringify(
    url.includes('CANONICAL_STATE')?s.canonical:url.includes('PIPELINE_STATE')?s.pipeline:s.coordination
  )});
  await assert.rejects(()=>readRowanEvidence(fake),/RECEIPT_PATH_HOLD/);
});
