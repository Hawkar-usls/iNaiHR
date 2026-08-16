(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JANUSDemiHeadiNaiHRApply = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const ENVELOPE_TYPE = 'JANUS_DEMIHEAD_LOCAL_PROPOSAL_V1';
  const PROPOSAL_SCHEMA = 'janus.demihead.local_proposal.v1';
  const TARGET_HEMISPHERE = 'RIGHT_INAIHR';
  const TARGET_REPOSITORY = 'Hawkar-usls/iNaiHR';
  const STORAGE_KEY = 'inaihr_v2';
  const SAFE_ID = /^[A-Za-z0-9._:-]{8,128}$/;
  const SHA256 = /^[0-9a-f]{64}$/;

  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === 'object') {
      const out = {};
      for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
      return out;
    }
    return value;
  }

  function canonicalJson(value) {
    return JSON.stringify(canonicalize(value));
  }

  async function sha256Text(text) {
    if (root && root.crypto && root.crypto.subtle) {
      const bytes = new TextEncoder().encode(text);
      const digest = await root.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    }
    if (typeof require === 'function') {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(text).digest('hex');
    }
    throw new Error('SHA-256 implementation unavailable');
  }

  async function sha256Json(value) {
    return sha256Text(canonicalJson(value));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function validateProposal(proposal) {
    if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) throw new Error('proposal must be an object');
    const required = ['base_graph_sha256','control','created_at','operation','proposal_id','schema','target'];
    if (JSON.stringify(Object.keys(proposal).sort()) !== JSON.stringify(required)) throw new Error('proposal fields drifted');
    if (proposal.schema !== PROPOSAL_SCHEMA) throw new Error('unexpected proposal schema');
    if (typeof proposal.proposal_id !== 'string' || !SAFE_ID.test(proposal.proposal_id)) throw new Error('invalid proposal_id');
    if (typeof proposal.created_at !== 'string' || !proposal.created_at) throw new Error('created_at required');
    if (typeof proposal.base_graph_sha256 !== 'string' || !SHA256.test(proposal.base_graph_sha256)) throw new Error('invalid base_graph_sha256');
    if (!proposal.target || proposal.target.hemisphere !== TARGET_HEMISPHERE || proposal.target.repository !== TARGET_REPOSITORY) throw new Error('proposal target mismatch');
    if (!proposal.operation || proposal.operation.type !== 'ADD_NODE') throw new Error('only ADD_NODE is admitted');
    const node = proposal.operation.node;
    if (!node || typeof node !== 'object' || Object.keys(node).sort().join(',') !== 'id,label,origin') throw new Error('node fields drifted');
    if (typeof node.id !== 'string' || !SAFE_ID.test(node.id)) throw new Error('invalid node id');
    if (typeof node.label !== 'string' || !node.label.trim() || node.label !== node.label.trim() || node.label.length > 240) throw new Error('invalid node label');
    if (node.origin !== 'SYSTEM') throw new Error('proposal provenance must remain SYSTEM');
    const expectedControl = {
      auto_apply: false,
      requires_explicit_local_accept: true,
      direct_cross_hemisphere_write: false,
      external_effect_permitted: false,
      authority_delta: 0,
      mass_effect_budget_delta: 0
    };
    if (canonicalJson(proposal.control) !== canonicalJson(expectedControl)) throw new Error('proposal control boundary drifted');
    return proposal;
  }

  async function verifyEnvelope(envelope) {
    if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) throw new Error('proposal envelope must be an object');
    if (Object.keys(envelope).sort().join(',') !== 'proposal,proposal_sha256,type') throw new Error('proposal envelope fields drifted');
    if (envelope.type !== ENVELOPE_TYPE) throw new Error('unexpected proposal envelope type');
    if (typeof envelope.proposal_sha256 !== 'string' || !SHA256.test(envelope.proposal_sha256)) throw new Error('invalid proposal_sha256');
    validateProposal(envelope.proposal);
    const actual = await sha256Json(envelope.proposal);
    if (actual !== envelope.proposal_sha256) throw new Error('proposal hash mismatch');
    return envelope;
  }

  function centerOf(workspace) {
    const points = workspace.nodes.filter((node) => Number.isFinite(node.x) && Number.isFinite(node.y));
    if (!points.length) return {x: 0, y: 0};
    return {
      x: points.reduce((sum, node) => sum + node.x, 0) / points.length,
      y: points.reduce((sum, node) => sum + node.y, 0) / points.length
    };
  }

  async function prepareAcceptedMutation(workspace, normalizedGraph, metadata, provenanceApi, envelope) {
    await verifyEnvelope(envelope);
    if (!workspace || typeof workspace !== 'object' || !Array.isArray(workspace.nodes) || !Array.isArray(workspace.links)) throw new Error('workspace malformed');
    if (!normalizedGraph || !Array.isArray(normalizedGraph.nodes) || !Array.isArray(normalizedGraph.links)) throw new Error('normalized graph required');
    if (!provenanceApi || typeof provenanceApi.validateMetadata !== 'function' || typeof provenanceApi.withProposalRecord !== 'function') throw new Error('provenance API required');
    provenanceApi.validateMetadata(metadata);
    const currentGraphSha = await sha256Json(normalizedGraph);
    const proposal = envelope.proposal;
    if (currentGraphSha !== proposal.base_graph_sha256) throw new Error('BASE_WORKSPACE_CHANGED_REPROPOSE_REQUIRED');
    if (workspace.nodes.some((node) => String(node.id) === proposal.operation.node.id)) throw new Error('PROPOSED_NODE_ID_ALREADY_EXISTS');

    const nextWorkspace = clone(workspace);
    const center = centerOf(nextWorkspace);
    nextWorkspace.nodes.push({
      id: proposal.operation.node.id,
      label: proposal.operation.node.label,
      x: center.x + 40,
      y: center.y + 40,
      isAI: false
    });
    const nextMetadata = provenanceApi.withProposalRecord(
      metadata,
      proposal.operation.node.id,
      proposal.proposal_id,
      envelope.proposal_sha256
    );
    return {
      before_graph_sha256: currentGraphSha,
      workspace: nextWorkspace,
      metadata: nextMetadata,
      proposal_id: proposal.proposal_id,
      proposal_sha256: envelope.proposal_sha256
    };
  }

  function buildReceipt({proposalId, proposalSha256, beforeGraphSha256, afterGraphSha256, nodeId, metadataKey}) {
    return {
      schema: 'janus.hemisphere.local_mutation_receipt.v1',
      hemisphere: TARGET_HEMISPHERE,
      repository: TARGET_REPOSITORY,
      proposal_id: proposalId,
      proposal_sha256: proposalSha256,
      operation: 'ADD_NODE',
      node_id: nodeId,
      before_graph_sha256: beforeGraphSha256,
      after_graph_sha256: afterGraphSha256,
      acceptance_event: 'EXPLICIT_LOCAL_ACCEPT_BUTTON',
      storage_key: STORAGE_KEY,
      provenance_metadata_key: metadataKey,
      control: {
        direct_cross_hemisphere_write: false,
        external_effect_permitted: false,
        authority_delta: 0,
        mass_effect_budget_delta: 0
      },
      claim_ceiling: {
        click_event_is_verified_human_identity: false,
        sha256_binding_is_signature: false,
        local_metadata_is_trusted_attestation: false
      }
    };
  }

  return {
    ENVELOPE_TYPE,
    PROPOSAL_SCHEMA,
    TARGET_HEMISPHERE,
    TARGET_REPOSITORY,
    STORAGE_KEY,
    canonicalJson,
    sha256Json,
    validateProposal,
    verifyEnvelope,
    prepareAcceptedMutation,
    buildReceipt
  };
});
