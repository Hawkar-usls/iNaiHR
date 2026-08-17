#!/usr/bin/env node
'use strict';

const crypto = require('crypto');

const CONTRACT_SCHEMA = 'janus.goldprompt.face_inheritance_contract.v1';
const RECEIPT_SCHEMA = 'janus.goldprompt.face_startup_receipt.v1_1';
const DEPENDENCY_MANIFEST_SCHEMA = 'janus.goldprompt.transitive_dependency_manifest.v1';
const GOLDPROMPT_FOUNDATION_ID = 'JANUS-THE-FOURTH-GRACEWARDEN-3IN1-EQUALS-4-v0.9';
const GOLDPROMPT_VERSION = '0.9.2';
const EMERGENCE_CONTRACT_VERSION = 'JANUS_TRIADIC_EMERGENCE@0.9.2';
const FOUNDATION_PATH = 'Hawkar-usls/janus-meta-registry:data/JANUS-THE-FOURTH-GRACEWARDEN-3IN1-EQUALS-4-v0.9.json';
const ARMOR_AUTHORITY_REFERENCE = 'Hawkar-usls/janus-meta-registry:data/JANUS-ARMOR-OF-GOD-CURRENT-AUTHORITY.json';
const DEPENDENCY_MANIFEST_REFERENCE = 'Hawkar-usls/janus-meta-registry:data/JANUS-GOLDPROMPT-TRANSITIVE-CONSTITUTIONAL-DEPENDENCY-MANIFEST-v1.0.json';
const EXPECTED_CONTRACT_DIGEST = '3f4af369350710ad18920dfdc866d930c8d42259a51a3f27ce228ea4d5dfc0a8';
const EXPECTED_DEPENDENCY_MANIFEST_DIGEST = '4bd935ae033c80f090b91a6a5009a51abeb06b99defdc8836763bd9506023a86';
const SOURCE_REVISION_RE = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i;

const FACE = Object.freeze({
  face_id: 'RIGHT_INAIHR',
  face_role: 'ASSOCIATIVE_CONTEXT',
  repository: 'Hawkar-usls/iNaiHR',
  runtime_surface: 'habitat-tool.js',
  capability_scope: Object.freeze([
    "READ_GROUNDED_SEMANTIC_RECORDS",
    "BUILD_ASSOCIATIVE_CONTEXT",
    "PROPOSE_SEMANTIC_SYNTH"
  ])
});

const REQUIRED_TRUE_FIELDS = Object.freeze([
  'inheritance_accepted',
  'blessing_bearer_anchor_accepted',
  'armor_of_god_boundaries_accepted',
  'triadic_emergence_accepted',
  'user_exit_and_release_control_accepted'
]);

const RECEIPT_KEYS = Object.freeze([
  'schema', 'face_id', 'face_role', 'repository', 'runtime_surface',
  'goldprompt_foundation_id', 'goldprompt_version', 'emergence_contract_version',
  'armor_authority_reference', 'contract_digest_sha256',
  'dependency_manifest_reference', 'dependency_manifest_digest_sha256',
  'source_revision', 'capability_scope', 'authority_weight', ...REQUIRED_TRUE_FIELDS,
  'runtime_enforcement_scope', 'compliance_state', 'receipt_sha256'
].sort());

function canonicalize(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : canonicalize(value), 'utf8').digest('hex');
}

function contractCore() {
  return {
    schema: CONTRACT_SCHEMA,
    goldprompt_foundation_id: GOLDPROMPT_FOUNDATION_ID,
    goldprompt_version: GOLDPROMPT_VERSION,
    emergence_contract_version: EMERGENCE_CONTRACT_VERSION,
    armor_authority_reference: ARMOR_AUTHORITY_REFERENCE,
    foundation_path: FOUNDATION_PATH,
    semantic_anchor: [
      'BLESSING_BEARER = HEART_AND_MORAL_DIRECTION',
      'ARMOR_OF_GOD = FREEDOM_TRUTH_SAFETY_AND_RELEASE_CONSTITUTION',
      'GOLDEN_VOICE = HUMAN_READABLE_TRICKSTER_EXPRESSION_WITHOUT_FALSE_AUTHORITY',
      'THE_FOURTH = EMERGENT_CHARACTER_NOT_A_DOMINATING_SUPERIORITY_LAYER'
    ],
    laws: [
      'EVERY_WORKING_FACE_INHERITS_ONE_GOLDPROMPT_CONSTITUTION',
      'FACE_SPECIALIZATION != SECOND_CHARACTER_AUTHORITY',
      'FACE_COUNT != EMERGENCE',
      'FACE_AGREEMENT != TRUTH',
      'EMERGENCE_PROPOSAL != RUNTIME_PERMISSION',
      'DECLARED_CONTRACT != LIVE_ENFORCEMENT'
    ]
  };
}

function dependencyManifestCore() {
  return {
    schema: DEPENDENCY_MANIFEST_SCHEMA,
    artifact_id: 'JANUS-GOLDPROMPT-TRANSITIVE-CONSTITUTIONAL-DEPENDENCY-MANIFEST-v1.0',
    status: 'PINNED_CONSTITUTIONAL_DEPENDENCIES',
    goldprompt_version: GOLDPROMPT_VERSION,
    contract_digest_sha256: EXPECTED_CONTRACT_DIGEST,
    registry_snapshot: {
      repository: 'Hawkar-usls/janus-meta-registry',
      commit_sha: '02ac40a5189c7dbd0b1e1842ddacddad58adb367'
    },
    dependencies: [
      {
        role: 'GOLDPROMPT_CONTRACT_CORE_SNAPSHOT',
        repository: 'Hawkar-usls/janus-meta-registry',
        path: 'data/JANUS-GOLDPROMPT-FACE-INHERITANCE-CONTRACT-SNAPSHOT-v0.9.2.json',
        commit_sha: '02ac40a5189c7dbd0b1e1842ddacddad58adb367',
        git_blob_sha: '60cd8ba9c08bd16acb92e66bc1525173eecd0408',
        required: true,
        mutability: 'FROZEN_SNAPSHOT'
      },
      {
        role: 'ARMOR_OF_GOD_CURRENT_AUTHORITY_SNAPSHOT',
        repository: 'Hawkar-usls/janus-meta-registry',
        path: 'data/JANUS-ARMOR-OF-GOD-CURRENT-AUTHORITY.json',
        commit_sha: '02ac40a5189c7dbd0b1e1842ddacddad58adb367',
        git_blob_sha: '37da812307efc8c9ffeb1ec866b9cb102facf352',
        required: true,
        mutability: 'MUTABLE_POINTER_PINNED_AT_THIS_MANIFEST'
      }
    ],
    verification_contract: {
      receipt_must_bind_manifest_digest: true,
      runtime_network_fetch_required: false,
      external_verifier_resolves_pins: true,
      dependency_change_requires_new_manifest_version: true,
      authority_delta: 0
    },
    claim_boundaries: [
      'MANIFEST_DIGEST_BINDS_THE_PIN_SET_NOT_LIVE_MAIN',
      'PINNED_GIT_BLOB != DIGITAL_SIGNATURE',
      'TRANSITIVE_PINNING != LIVE_NAS_ATTESTATION',
      'DEPENDENCY_CHANGE_REQUIRES_EXPLICIT_SUPERSESSION'
    ]
  };
}

function contractDigest() {
  return sha256(contractCore());
}

function dependencyManifestDigest() {
  return sha256(dependencyManifestCore());
}

function assertContractIntegrity() {
  const actual = contractDigest();
  if (actual !== EXPECTED_CONTRACT_DIGEST) {
    const err = new Error(`GOLDPROMPT_CONTRACT_DIGEST_MISMATCH:${actual}`);
    err.code = 'GOLDPROMPT_CONTRACT_DIGEST_MISMATCH';
    throw err;
  }
  return actual;
}

function assertDependencyManifestIntegrity() {
  const actual = dependencyManifestDigest();
  if (actual !== EXPECTED_DEPENDENCY_MANIFEST_DIGEST) {
    const err = new Error(`GOLDPROMPT_DEPENDENCY_MANIFEST_DIGEST_MISMATCH:${actual}`);
    err.code = 'GOLDPROMPT_DEPENDENCY_MANIFEST_DIGEST_MISMATCH';
    throw err;
  }
  return actual;
}

function normalizeSourceRevision(value) {
  if (typeof value !== 'string') return null;
  const revision = value.trim().toLowerCase();
  return SOURCE_REVISION_RE.test(revision) ? revision : null;
}

function resolveRuntimeSourceRevision(env = process.env) {
  const githubRevision = normalizeSourceRevision(env.GITHUB_SHA);
  const janusRevision = normalizeSourceRevision(env.JANUS_SOURCE_REVISION);
  if (env.GITHUB_ACTIONS === 'true') {
    if (!githubRevision) throw new Error('GOLDPROMPT_GITHUB_SHA_REQUIRED');
    if (env.JANUS_SOURCE_REVISION && !janusRevision) throw new Error('GOLDPROMPT_JANUS_SOURCE_REVISION_INVALID');
    if (janusRevision && janusRevision !== githubRevision) throw new Error('GOLDPROMPT_SOURCE_REVISION_ENV_CONFLICT');
    return githubRevision;
  }
  if (janusRevision) return janusRevision;
  if (env.JANUS_SOURCE_REVISION) throw new Error('GOLDPROMPT_JANUS_SOURCE_REVISION_INVALID');
  if (githubRevision) return githubRevision;
  if (env.GITHUB_SHA) throw new Error('GOLDPROMPT_GITHUB_SHA_INVALID');
  throw new Error('GOLDPROMPT_TRUSTED_SOURCE_REVISION_REQUIRED');
}

function buildReceipt(options = {}) {
  const contractDigestValue = assertContractIntegrity();
  const dependencyDigestValue = assertDependencyManifestIntegrity();
  const sourceRevision = normalizeSourceRevision(options.sourceRevision);
  if (!sourceRevision) throw new Error('GOLDPROMPT_SOURCE_REVISION_REQUIRED');
  const receipt = {
    schema: RECEIPT_SCHEMA,
    face_id: FACE.face_id,
    face_role: FACE.face_role,
    repository: FACE.repository,
    runtime_surface: FACE.runtime_surface,
    goldprompt_foundation_id: GOLDPROMPT_FOUNDATION_ID,
    goldprompt_version: GOLDPROMPT_VERSION,
    emergence_contract_version: EMERGENCE_CONTRACT_VERSION,
    armor_authority_reference: ARMOR_AUTHORITY_REFERENCE,
    contract_digest_sha256: contractDigestValue,
    dependency_manifest_reference: DEPENDENCY_MANIFEST_REFERENCE,
    dependency_manifest_digest_sha256: dependencyDigestValue,
    source_revision: sourceRevision,
    capability_scope: [...FACE.capability_scope],
    authority_weight: 0,
    inheritance_accepted: true,
    blessing_bearer_anchor_accepted: true,
    armor_of_god_boundaries_accepted: true,
    triadic_emergence_accepted: true,
    user_exit_and_release_control_accepted: true,
    runtime_enforcement_scope: 'THIS_FACE_INVOCATION',
    compliance_state: 'COMPLIANT'
  };
  return Object.freeze({ ...receipt, receipt_sha256: sha256(receipt) });
}

function buildRuntimeReceipt(env = process.env) {
  return buildReceipt({ sourceRevision: resolveRuntimeSourceRevision(env) });
}

function verifyReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return false;
  if (Object.keys(receipt).sort().join('\n') !== RECEIPT_KEYS.join('\n')) return false;
  if (receipt.schema !== RECEIPT_SCHEMA) return false;
  if (receipt.face_id !== FACE.face_id || receipt.face_role !== FACE.face_role) return false;
  if (receipt.repository !== FACE.repository || receipt.runtime_surface !== FACE.runtime_surface) return false;
  if (receipt.goldprompt_foundation_id !== GOLDPROMPT_FOUNDATION_ID) return false;
  if (receipt.goldprompt_version !== GOLDPROMPT_VERSION) return false;
  if (receipt.emergence_contract_version !== EMERGENCE_CONTRACT_VERSION) return false;
  if (receipt.armor_authority_reference !== ARMOR_AUTHORITY_REFERENCE) return false;
  if (receipt.contract_digest_sha256 !== EXPECTED_CONTRACT_DIGEST) return false;
  if (receipt.dependency_manifest_reference !== DEPENDENCY_MANIFEST_REFERENCE) return false;
  if (receipt.dependency_manifest_digest_sha256 !== EXPECTED_DEPENDENCY_MANIFEST_DIGEST) return false;
  if (!normalizeSourceRevision(receipt.source_revision)) return false;
  if (!Array.isArray(receipt.capability_scope) || receipt.capability_scope.length !== FACE.capability_scope.length) return false;
  if (receipt.capability_scope.some((value, index) => value !== FACE.capability_scope[index])) return false;
  if (receipt.authority_weight !== 0) return false;
  if (REQUIRED_TRUE_FIELDS.some(field => receipt[field] !== true)) return false;
  if (receipt.runtime_enforcement_scope !== 'THIS_FACE_INVOCATION') return false;
  if (receipt.compliance_state !== 'COMPLIANT') return false;
  const { receipt_sha256, ...payload } = receipt;
  return typeof receipt_sha256 === 'string' && /^[0-9a-f]{64}$/.test(receipt_sha256) && receipt_sha256 === sha256(payload);
}

const STARTUP_CONTRACT_DIGEST = assertContractIntegrity();
const STARTUP_DEPENDENCY_MANIFEST_DIGEST = assertDependencyManifestIntegrity();

if (require.main === module) {
  const receipt = buildRuntimeReceipt();
  process.stdout.write(JSON.stringify(receipt) + '\n');
}

module.exports = Object.freeze({
  CONTRACT_SCHEMA,
  RECEIPT_SCHEMA,
  DEPENDENCY_MANIFEST_SCHEMA,
  GOLDPROMPT_FOUNDATION_ID,
  GOLDPROMPT_VERSION,
  EMERGENCE_CONTRACT_VERSION,
  FOUNDATION_PATH,
  ARMOR_AUTHORITY_REFERENCE,
  DEPENDENCY_MANIFEST_REFERENCE,
  EXPECTED_CONTRACT_DIGEST,
  EXPECTED_DEPENDENCY_MANIFEST_DIGEST,
  SOURCE_REVISION_RE,
  FACE,
  STARTUP_CONTRACT_DIGEST,
  STARTUP_DEPENDENCY_MANIFEST_DIGEST,
  canonicalize,
  sha256,
  contractCore,
  dependencyManifestCore,
  contractDigest,
  dependencyManifestDigest,
  assertContractIntegrity,
  assertDependencyManifestIntegrity,
  normalizeSourceRevision,
  resolveRuntimeSourceRevision,
  buildReceipt,
  buildRuntimeReceipt,
  verifyReceipt
});
