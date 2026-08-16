(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.JANUSDemiHeadiNaiHRProvenance = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const META_SCHEMA = 'janus.inaihr.demihead_provenance.v1';
  const META_KEY = 'inaihr_demihead_provenance_v1';
  const SAFE_ID = /^[A-Za-z0-9._:-]{8,128}$/;
  const SHA256 = /^[0-9a-f]{64}$/;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function emptyMetadata() {
    return {schema: META_SCHEMA, nodes: {}};
  }

  function validateRecord(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('metadata record must be an object');
    if (Object.keys(record).sort().join(',') !== 'origin,proposal_id,proposal_sha256') throw new Error('metadata record fields drifted');
    if (record.origin !== 'SYSTEM') throw new Error('DemiHead metadata origin must remain SYSTEM');
    if (typeof record.proposal_id !== 'string' || !SAFE_ID.test(record.proposal_id)) throw new Error('invalid metadata proposal_id');
    if (typeof record.proposal_sha256 !== 'string' || !SHA256.test(record.proposal_sha256)) throw new Error('invalid metadata proposal_sha256');
    return record;
  }

  function validateMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('metadata store must be an object');
    if (Object.keys(metadata).sort().join(',') !== 'nodes,schema') throw new Error('metadata store fields drifted');
    if (metadata.schema !== META_SCHEMA) throw new Error('unexpected metadata schema');
    if (!metadata.nodes || typeof metadata.nodes !== 'object' || Array.isArray(metadata.nodes)) throw new Error('metadata nodes map missing');
    for (const [nodeId, record] of Object.entries(metadata.nodes)) {
      if (!SAFE_ID.test(nodeId)) throw new Error(`invalid metadata node id: ${nodeId}`);
      validateRecord(record);
    }
    return metadata;
  }

  function parseMetadata(raw) {
    if (!raw) return emptyMetadata();
    return validateMetadata(JSON.parse(raw));
  }

  function overlayWorkspace(workspace, metadata) {
    if (!workspace || typeof workspace !== 'object' || !Array.isArray(workspace.nodes) || !Array.isArray(workspace.links)) throw new Error('workspace malformed');
    validateMetadata(metadata);
    const next = clone(workspace);
    for (const node of next.nodes) {
      const record = metadata.nodes[String(node.id)];
      if (!record) continue;
      validateRecord(record);
      node.origin = 'SYSTEM';
      node.demiheadProposalId = record.proposal_id;
      node.demiheadProposalSha256 = record.proposal_sha256;
    }
    return next;
  }

  function withProposalRecord(metadata, nodeId, proposalId, proposalSha256) {
    validateMetadata(metadata);
    if (typeof nodeId !== 'string' || !SAFE_ID.test(nodeId)) throw new Error('invalid proposed node id');
    const next = clone(metadata);
    next.nodes[nodeId] = validateRecord({origin:'SYSTEM', proposal_id:proposalId, proposal_sha256:proposalSha256});
    return next;
  }

  return {
    META_SCHEMA,
    META_KEY,
    emptyMetadata,
    validateRecord,
    validateMetadata,
    parseMetadata,
    overlayWorkspace,
    withProposalRecord
  };
});
