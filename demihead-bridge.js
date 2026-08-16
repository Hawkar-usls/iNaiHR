(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JANUSDemiHeadiNaiHRBridge = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PACKET_SCHEMA = 'janus.demihead.hemisphere_packet.v1';
  const BRIDGE_CONTRACT = 'JANUS_DEMIHEAD_BICAMERAL_BRIDGE_V1';
  const REQUEST_TYPE = 'JANUS_DEMIHEAD_REQUEST_PACKET_V1';
  const RESPONSE_TYPE = 'JANUS_DEMIHEAD_HEMISPHERE_PACKET_V1';
  const HEMISPHERE = 'RIGHT_INAIHR';
  const ROLE = 'ASSOCIATIVE_CONTEXT';
  const REPOSITORY = 'Hawkar-usls/iNaiHR';
  const WORKSPACE_MODE = 'SEMANTIC_GRAPH';
  const ORIGINS = new Set(['USER', 'REMOTE_AI', 'LOCAL_FALLBACK', 'LEGACY_UNKNOWN', 'SYSTEM']);
  const REQUEST_ID_RE = /^[A-Za-z0-9._:-]{8,128}$/;

  function endpointId(value) {
    if (typeof value === 'boolean' || (typeof value !== 'string' && typeof value !== 'number')) {
      throw new Error('Node/link identifiers must be string or number');
    }
    return String(value);
  }

  function validateRequestId(value) {
    if (typeof value !== 'string' || !REQUEST_ID_RE.test(value)) {
      throw new Error('request_id must be 8-128 safe ASCII characters');
    }
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
      return {
        id,
        label,
        origin: normalizeOrigin(node),
        is_ai: node.isAI === true
      };
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

  function buildPacket(workspace, options) {
    const opts = options || {};
    const capturedAt = opts.capturedAt || new Date().toISOString();
    const packetId = opts.packetId || `inaihr-right-${Date.now()}`;
    const sourceRevision = typeof opts.sourceRevision === 'string' && opts.sourceRevision ? opts.sourceRevision : null;
    return {
      schema: PACKET_SCHEMA,
      packet_id: packetId,
      hemisphere: HEMISPHERE,
      role: ROLE,
      captured_at: capturedAt,
      source: {
        repository: REPOSITORY,
        bridge_contract: BRIDGE_CONTRACT,
        source_revision: sourceRevision,
        workspace_mode: WORKSPACE_MODE
      },
      graph: normalizeWorkspace(workspace),
      control: {
        read_only_transfer: true,
        direct_cross_hemisphere_mutation: false,
        authority_delta: 0,
        mass_effect_budget_delta: 0
      }
    };
  }

  function buildResponse(requestId, workspace, options) {
    return {
      type: RESPONSE_TYPE,
      request_id: validateRequestId(requestId),
      packet: buildPacket(workspace, options)
    };
  }

  return {
    PACKET_SCHEMA,
    BRIDGE_CONTRACT,
    REQUEST_TYPE,
    RESPONSE_TYPE,
    HEMISPHERE,
    ROLE,
    REPOSITORY,
    WORKSPACE_MODE,
    validateRequestId,
    normalizeOrigin,
    normalizeWorkspace,
    buildPacket,
    buildResponse
  };
});
