'use strict';

const fs = require('fs');
const path = require('path');
const bridge = require(path.join('..', 'demihead-bridge.js'));
const provenance = require(path.join('..', 'demihead-provenance.js'));
const apply = require(path.join('..', 'demihead-apply.js'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function enrichedGraph(workspace, metadata) {
  return bridge.normalizeWorkspace(provenance.overlayWorkspace(workspace, metadata));
}

async function makeEnvelope(workspace, metadata, overrides = {}) {
  const graph = enrichedGraph(workspace, metadata);
  const proposal = {
    schema: apply.PROPOSAL_SCHEMA,
    proposal_id: 'proposal-inaihr-test-0001',
    created_at: '2026-08-16T10:05:00Z',
    target: {hemisphere: 'RIGHT_INAIHR', repository: 'Hawkar-usls/iNaiHR'},
    base_graph_sha256: await apply.sha256Json(graph),
    operation: { type: 'ADD_NODE', node: {id: 'dh-node-inaihr-test-0001', label: 'Candidate association', origin: 'SYSTEM'} },
    control: { auto_apply: false, requires_explicit_local_accept: true, direct_cross_hemisphere_write: false, external_effect_permitted: false, authority_delta: 0, mass_effect_budget_delta: 0 }
  };
  if (overrides.target) proposal.target = overrides.target;
  if (overrides.control) proposal.control = overrides.control;
  if (overrides.operation) proposal.operation = overrides.operation;
  return {type: apply.ENVELOPE_TYPE, proposal_sha256: await apply.sha256Json(proposal), proposal};
}

async function expectRefusal(fn, expectedPart) {
  let error = null;
  try { await fn(); } catch (err) { error = err; }
  assert(error, `expected refusal containing ${expectedPart}`);
  assert(String(error.message).includes(expectedPart), `wrong refusal: ${error.message}`);
}

async function main() {
  const workspace = {
    nodes: [
      {id: 1, label: 'Origin', x: 10, y: 20, isAI: false},
      {id: 2, label: 'Remote concept', x: 30, y: 40, isAI: true}
    ],
    links: [{source: 1, target: 2}]
  };
  const metadata = provenance.emptyMetadata();
  const graph = enrichedGraph(workspace, metadata);
  const envelope = await makeEnvelope(workspace, metadata);
  await apply.verifyEnvelope(envelope);

  const originalWorkspace = clone(workspace);
  const originalMetadata = clone(metadata);
  const prepared = await apply.prepareAcceptedMutation(workspace, graph, metadata, provenance, envelope);
  assert(JSON.stringify(workspace) === JSON.stringify(originalWorkspace), 'pure adapter mutated input workspace');
  assert(JSON.stringify(metadata) === JSON.stringify(originalMetadata), 'pure adapter mutated input metadata');
  assert(prepared.workspace.nodes.length === workspace.nodes.length + 1, 'accepted mutation must add exactly one node');
  assert(prepared.workspace.links.length === workspace.links.length, 'ADD_NODE v1 must not create links');
  const added = prepared.workspace.nodes.at(-1);
  assert(added.id === 'dh-node-inaihr-test-0001', 'node id drifted');
  assert(added.label === 'Candidate association', 'node label drifted');
  assert(added.isAI === false, 'DemiHead proposal must not be relabelled as remote AI');
  const metaRecord = prepared.metadata.nodes[added.id];
  assert(metaRecord.origin === 'SYSTEM', 'proposal provenance metadata must remain SYSTEM');
  assert(metaRecord.proposal_id === envelope.proposal.proposal_id, 'proposal id metadata binding lost');
  assert(metaRecord.proposal_sha256 === envelope.proposal_sha256, 'proposal hash metadata binding lost');

  const enriched = provenance.overlayWorkspace(prepared.workspace, prepared.metadata);
  const enrichedAdded = enriched.nodes.find((node) => node.id === added.id);
  assert(enrichedAdded.origin === 'SYSTEM', 'sidecar overlay failed to restore SYSTEM provenance');
  assert(enrichedAdded.demiheadProposalId === envelope.proposal.proposal_id, 'sidecar proposal id overlay lost');
  assert(enrichedAdded.demiheadProposalSha256 === envelope.proposal_sha256, 'sidecar proposal hash overlay lost');

  const sanitizedWorkspace = {
    nodes: prepared.workspace.nodes.map((node) => ({id:node.id,label:node.label,x:node.x,y:node.y,isAI:!!node.isAI})),
    links: prepared.workspace.links.map((link) => ({source:link.source.id||link.source,target:link.target.id||link.target}))
  };
  const restoredAfterAppSave = provenance.overlayWorkspace(sanitizedWorkspace, prepared.metadata);
  const restoredNode = restoredAfterAppSave.nodes.find((node) => node.id === added.id);
  assert(restoredNode && restoredNode.origin === 'SYSTEM', 'proposal provenance must survive existing app serializer via sidecar metadata');

  const noNodeWorkspace = {nodes:[{id:1,label:'Origin',x:0,y:0,isAI:false}],links:[]};
  const orphanOverlay = provenance.overlayWorkspace(noNodeWorkspace, prepared.metadata);
  assert(!orphanOverlay.nodes.some((node) => node.id === added.id), 'metadata must never create a missing graph node');

  const afterGraph = enrichedGraph(prepared.workspace, prepared.metadata);
  const afterSha = await apply.sha256Json(afterGraph);
  const receipt = apply.buildReceipt({
    proposalId: prepared.proposal_id,
    proposalSha256: prepared.proposal_sha256,
    beforeGraphSha256: prepared.before_graph_sha256,
    afterGraphSha256: afterSha,
    nodeId: added.id,
    metadataKey: provenance.META_KEY
  });
  assert(receipt.acceptance_event === 'EXPLICIT_LOCAL_ACCEPT_BUTTON', 'receipt must record local accept event');
  assert(receipt.before_graph_sha256 !== receipt.after_graph_sha256, 'accepted add-node mutation must change graph hash');
  assert(receipt.provenance_metadata_key === provenance.META_KEY, 'metadata key must be explicit in receipt');
  assert(receipt.control.direct_cross_hemisphere_write === false, 'direct cross-hemisphere write must remain false');
  assert(receipt.control.external_effect_permitted === false, 'external effect must remain false');
  assert(receipt.control.authority_delta === 0, 'authority delta must remain zero');
  assert(receipt.claim_ceiling.click_event_is_verified_human_identity === false, 'click cannot become verified identity');
  assert(receipt.claim_ceiling.sha256_binding_is_signature === false, 'hash cannot become signature claim');
  assert(receipt.claim_ceiling.local_metadata_is_trusted_attestation === false, 'local metadata cannot become trusted attestation');

  const tampered = clone(envelope);
  tampered.proposal.operation.node.label = 'Tampered label';
  await expectRefusal(() => apply.verifyEnvelope(tampered), 'proposal hash mismatch');

  const wrongTarget = await makeEnvelope(workspace, metadata, {target:{hemisphere:'LEFT_HRAIN',repository:'Hawkar-usls/Hrain'}});
  await expectRefusal(() => apply.verifyEnvelope(wrongTarget), 'proposal target mismatch');

  const autoApply = await makeEnvelope(workspace, metadata, {control:{auto_apply:true,requires_explicit_local_accept:true,direct_cross_hemisphere_write:false,external_effect_permitted:false,authority_delta:0,mass_effect_budget_delta:0}});
  await expectRefusal(() => apply.verifyEnvelope(autoApply), 'proposal control boundary drifted');

  const changedWorkspace = clone(workspace);
  changedWorkspace.nodes[0].label = 'Origin changed after proposal';
  const changedGraph = enrichedGraph(changedWorkspace, metadata);
  await expectRefusal(() => apply.prepareAcceptedMutation(changedWorkspace, changedGraph, metadata, provenance, envelope), 'BASE_WORKSPACE_CHANGED_REPROPOSE_REQUIRED');

  const duplicateWorkspace = clone(workspace);
  duplicateWorkspace.nodes.push({id:'dh-node-inaihr-test-0001',label:'Already here',x:0,y:0,isAI:false});
  const duplicateEnvelope = await makeEnvelope(duplicateWorkspace, metadata);
  const duplicateGraph = enrichedGraph(duplicateWorkspace, metadata);
  await expectRefusal(() => apply.prepareAcceptedMutation(duplicateWorkspace, duplicateGraph, metadata, provenance, duplicateEnvelope), 'PROPOSED_NODE_ID_ALREADY_EXISTS');

  const page = fs.readFileSync(path.join(__dirname, '..', 'demihead-apply.html'), 'utf8');
  for (const forbidden of ['postMessage(', 'fetch(', 'XMLHttpRequest', 'api.github.com/repos/']) assert(!page.includes(forbidden), `apply page contains forbidden remote/write channel: ${forbidden}`);
  assert((page.match(/localStorage\.setItem/g) || []).length === 2, 'iNaiHR apply page must contain exactly metadata+workspace writes');
  const metaWrite = 'localStorage.setItem(provenance.META_KEY, JSON.stringify(prepared.metadata))';
  const graphWrite = 'localStorage.setItem(apply.STORAGE_KEY, JSON.stringify(prepared.workspace))';
  const declineStart = page.indexOf("decline.addEventListener('click'");
  const acceptStart = page.indexOf("accept.addEventListener('click'");
  assert(declineStart >= 0 && acceptStart > declineStart, 'decline/accept handlers missing');
  assert(!page.slice(declineStart, acceptStart).includes('localStorage.setItem'), 'DECLINE path must not write local state');
  const prepareIndex = page.indexOf('await apply.prepareAcceptedMutation', acceptStart);
  const metaWriteIndex = page.indexOf(metaWrite, acceptStart);
  const graphWriteIndex = page.indexOf(graphWrite, acceptStart);
  assert(prepareIndex > acceptStart && metaWriteIndex > prepareIndex && graphWriteIndex > metaWriteIndex, 'writes must occur only after recheck; metadata must precede graph write');
  assert(page.includes('LOCAL_METADATA != TRUSTED_ATTESTATION'), 'metadata claim ceiling missing');
  assert(page.includes('GITHUB_PAGES_PROJECT_PATH != ORIGIN_ISOLATION'), 'same-origin threat-model law missing');

  const sidecar = fs.readFileSync(path.join(__dirname, '..', 'demihead.html'), 'utf8');
  assert(sidecar.includes('provenance.overlayWorkspace(workspace, metadata)'), 'read-only sidecar must overlay proposal provenance');
  assert(sidecar.includes('LOCAL_METADATA != TRUSTED_ATTESTATION'), 'sidecar metadata claim ceiling missing');
  assert(sidecar.includes('BROWSER_EXPORT != RUNTIME_ATTESTATION'), 'browser/runtime proof boundary missing');
  assert(!sidecar.includes('localStorage.setItem'), 'read-only sidecar must remain write-free');

  console.log('INAIHR_DEMIHEAD_LOCAL_ACCEPT_GATE=PASS');
  console.log('ADD_NODE_ONLY=true');
  console.log('DECLINE_WRITES_STATE=false');
  console.log('NO_ACCEPT_EVENT_NO_MUTATION=true');
  console.log('PROVENANCE_SURVIVES_APP_SERIALIZER=true');
  console.log('ORPHAN_METADATA_CREATES_NODE=false');
  console.log('LOCAL_METADATA_TRUSTED_ATTESTATION=false');
  console.log('DIRECT_CROSS_HEMISPHERE_WRITE=false');
  console.log('EXTERNAL_EFFECT=false');
  console.log('AUTHORITY_DELTA=0');
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
