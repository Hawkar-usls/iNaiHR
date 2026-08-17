(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JANUSDemiHeadiNaiHRBridge = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PACKET_SCHEMA = 'janus.demihead.hemisphere_packet.v3';
  const BRIDGE_CONTRACT = 'JANUS_DEMIHEAD_BICAMERAL_BRIDGE_V3';
  const REQUEST_TYPE = 'JANUS_DEMIHEAD_REQUEST_PACKET_V3';
  const RESPONSE_TYPE = 'JANUS_DEMIHEAD_HEMISPHERE_PACKET_V3';
  const UNATTESTED_PACKET_SCHEMA = 'janus.demihead.hemisphere_packet.v1';
  const UNATTESTED_BRIDGE_CONTRACT = 'JANUS_DEMIHEAD_BICAMERAL_BRIDGE_V1';
  const UNATTESTED_REQUEST_TYPE = 'JANUS_DEMIHEAD_REQUEST_PACKET_V1';
  const UNATTESTED_RESPONSE_TYPE = 'JANUS_DEMIHEAD_HEMISPHERE_PACKET_V1';
  const HEMISPHERE = 'RIGHT_INAIHR';
  const ROLE = 'ASSOCIATIVE_CONTEXT';
  const REPOSITORY = 'Hawkar-usls/iNaiHR';
  const WORKSPACE_MODE = 'SEMANTIC_GRAPH';
  const ORIGINS = new Set(['USER', 'REMOTE_AI', 'LOCAL_FALLBACK', 'LEGACY_UNKNOWN', 'SYSTEM']);
  const REQUEST_ID_RE = /^[A-Za-z0-9._:-]{8,128}$/;
  const SHA256_RE = /^[0-9a-f]{64}$/;

  function endpointId(value) {
    if (typeof value === 'boolean' || (typeof value !== 'string' && typeof value !== 'number')) throw new Error('Node/link identifiers must be string or number');
    return String(value);
  }
  function validateRequestId(value) {
    if (typeof value !== 'string' || !REQUEST_ID_RE.test(value)) throw new Error('request_id must be 8-128 safe ASCII characters');
    return value;
  }
  function normalizeOrigin(node) {
    if (ORIGINS.has(node && node.origin)) return node.origin;
    if (node && node.isAI === true) return 'REMOTE_AI';
    return 'LEGACY_UNKNOWN';
  }
  function normalizeWorkspace(workspace) {
    const raw = workspace && typeof workspace === 'object' ? workspace : {};
    const sourceNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
    const sourceLinks = Array.isArray(raw.links) ? raw.links : [];
    const ids = new Set();
    const nodes = sourceNodes.map((node) => {
      if (!node || typeof node !== 'object') throw new Error('Every node must be an object');
      const id = node.id;
      const idKey = endpointId(id);
      if (ids.has(idKey)) throw new Error(`Duplicate node id: ${idKey}`);
      ids.add(idKey);
      const label = typeof node.label === 'string' ? node.label.trim() : '';
      if (!label) throw new Error(`Node ${idKey} must have a non-empty label`);
      return { id, label, origin: normalizeOrigin(node), is_ai: node.isAI === true };
    });
    const seen = new Set();
    const links = sourceLinks.map((link) => {
      if (!link || typeof link !== 'object') throw new Error('Every link must be an object');
      const source = link.source && typeof link.source === 'object' ? link.source.id : link.source;
      const target = link.target && typeof link.target === 'object' ? link.target.id : link.target;
      const sourceKey = endpointId(source);
      const targetKey = endpointId(target);
      if (!ids.has(sourceKey) || !ids.has(targetKey)) throw new Error(`Dangling link: ${sourceKey} -> ${targetKey}`);
      const edgeKey = `${sourceKey}\u0000${targetKey}`;
      if (seen.has(edgeKey)) throw new Error(`Duplicate directed link: ${sourceKey} -> ${targetKey}`);
      seen.add(edgeKey);
      return { source, target };
    });
    return { nodes, links };
  }
  function validateGoldPromptReceipt(receipt, sourceRevision) {
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) throw new Error('GoldPrompt receipt must be an object');
    if (receipt.face_id !== HEMISPHERE) throw new Error('GoldPrompt receipt Face mismatch');
    if (receipt.repository !== REPOSITORY) throw new Error('GoldPrompt receipt repository mismatch');
    if (receipt.source_revision !== sourceRevision) throw new Error('GoldPrompt receipt/source revision mismatch');
    if (receipt.compliance_state !== 'COMPLIANT') throw new Error('GoldPrompt receipt must be COMPLIANT');
    if (receipt.authority_weight !== 0) throw new Error('GoldPrompt receipt cannot add authority');
    if (typeof receipt.receipt_sha256 !== 'string' || !SHA256_RE.test(receipt.receipt_sha256)) throw new Error('GoldPrompt receipt SHA-256 required');
    return JSON.parse(JSON.stringify(receipt));
  }
  function validateIntentEnvelope(anchor, handoff) {
    if (!anchor || typeof anchor !== 'object' || Array.isArray(anchor)) throw new Error('intentAnchor required for intent-bound packet');
    if (!handoff || typeof handoff !== 'object' || Array.isArray(handoff)) throw new Error('intentHandoff required for intent-bound packet');
    if (anchor.schema !== 'janus.goldprompt.intent_anchor.v1') throw new Error('Intent anchor schema mismatch');
    if (handoff.schema !== 'janus.goldprompt.intent_handoff.v1') throw new Error('Intent handoff schema mismatch');
    if (typeof anchor.intent_id !== 'string' || !SHA256_RE.test(anchor.intent_id)) throw new Error('Intent ID required');
    if (handoff.intent_id !== anchor.intent_id) throw new Error('Intent handoff/anchor mismatch');
    if (handoff.face_id !== HEMISPHERE) throw new Error('Intent handoff Face mismatch');
    if (handoff.current_turn_digest !== anchor.current_turn_digest) throw new Error('Intent current-turn mismatch');
    if (handoff.requested_operation !== anchor.requested_operation) throw new Error('Intent operation mismatch');
    if (typeof handoff.handoff_sha256 !== 'string' || !SHA256_RE.test(handoff.handoff_sha256)) throw new Error('Intent handoff SHA required');
    return { anchor: JSON.parse(JSON.stringify(anchor)), handoff: JSON.parse(JSON.stringify(handoff)) };
  }
  function buildPacket(workspace, options) {
    const opts = options || {};
    const sourceRevision = typeof opts.sourceRevision === 'string' && opts.sourceRevision ? opts.sourceRevision : null;
    if (!sourceRevision) throw new Error('sourceRevision required for GoldPrompt-bound packet');
    const goldpromptReceipt = validateGoldPromptReceipt(opts.goldpromptReceipt, sourceRevision);
    const intentEnvelope = validateIntentEnvelope(opts.intentAnchor, opts.intentHandoff);
    return {
      schema: PACKET_SCHEMA,
      packet_id: opts.packetId || `inaihr-right-${Date.now()}`,
      hemisphere: HEMISPHERE, role: ROLE, captured_at: opts.capturedAt || new Date().toISOString(),
      source: {
        repository: REPOSITORY, bridge_contract: BRIDGE_CONTRACT, source_revision: sourceRevision,
        goldprompt_receipt_sha256: goldpromptReceipt.receipt_sha256,
        intent_id: intentEnvelope.anchor.intent_id,
        intent_handoff_sha256: intentEnvelope.handoff.handoff_sha256,
        workspace_mode: WORKSPACE_MODE
      },
      goldprompt_receipt: goldpromptReceipt,
      intent_anchor: intentEnvelope.anchor,
      intent_handoff: intentEnvelope.handoff,
      graph: normalizeWorkspace(workspace),
      control: { read_only_transfer: true, direct_cross_hemisphere_mutation: false, authority_delta: 0, mass_effect_budget_delta: 0 }
    };
  }
  function buildUnattestedPacket(workspace, options) {
    const opts = options || {};
    return {
      schema: UNATTESTED_PACKET_SCHEMA,
      packet_id: opts.packetId || `inaihr-right-unattested-${Date.now()}`,
      hemisphere: HEMISPHERE, role: ROLE, captured_at: opts.capturedAt || new Date().toISOString(),
      source: { repository: REPOSITORY, bridge_contract: UNATTESTED_BRIDGE_CONTRACT, source_revision: null, workspace_mode: WORKSPACE_MODE },
      graph: normalizeWorkspace(workspace),
      control: { read_only_transfer: true, direct_cross_hemisphere_mutation: false, authority_delta: 0, mass_effect_budget_delta: 0 }
    };
  }
  function buildResponse(requestId, workspace, options) { return { type: RESPONSE_TYPE, request_id: validateRequestId(requestId), packet: buildPacket(workspace, options) }; }
  function buildUnattestedResponse(requestId, workspace, options) { return { type: UNATTESTED_RESPONSE_TYPE, request_id: validateRequestId(requestId), packet: buildUnattestedPacket(workspace, options), proof_state: 'UNATTESTED_LOCAL_EXPORT' }; }

  return {
    PACKET_SCHEMA, BRIDGE_CONTRACT, REQUEST_TYPE, RESPONSE_TYPE,
    UNATTESTED_PACKET_SCHEMA, UNATTESTED_BRIDGE_CONTRACT, UNATTESTED_REQUEST_TYPE, UNATTESTED_RESPONSE_TYPE,
    HEMISPHERE, ROLE, REPOSITORY, WORKSPACE_MODE,
    validateRequestId, normalizeOrigin, normalizeWorkspace, validateGoldPromptReceipt, validateIntentEnvelope,
    buildPacket, buildUnattestedPacket, buildResponse, buildUnattestedResponse
  };
});
