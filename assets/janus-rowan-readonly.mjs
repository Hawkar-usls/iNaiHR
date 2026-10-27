// JANUS Rowan read-only evidence bridge. No provider calls, secrets, writes or claims promotion.
const BASE = 'https://raw.githubusercontent.com/Hawkar-usls/janus-meta-registry/main/';
const SOURCES = Object.freeze({
  canonical: 'data/rowan/CANONICAL_STATE.json',
  pipeline: 'data/rowan/health/PIPELINE_STATE.json',
  coordination: 'data/rowan/coordination/LATEST_COORDINATION_STATE.json'
});
const RECEIPT_PATTERN = /^data\/rowan\/coordination\/receipts\/ROWAN-COUNCIL-\d+-[0-9a-f]{16}\.json$/;
const HEX = /^[0-9a-f]{64}$/;
const MAX_RESPONSE = 64_000;

export function reconcileRowan(canonical, pipeline, coordination, receipt) {
  if (canonical?.schema_id !== 'janus.rowan.observer_state.v1' ||
      pipeline?.schema_id !== 'janus.rowan.pipeline_integrity_state.v1' ||
      coordination?.schema_id !== 'janus.meta_registry.rowan_council_state.v1' ||
      receipt?.schema_id !== 'janus.meta_registry.rowan_council_provenance.v1') {
    throw new Error('ROWAN_UNTRUSTED_SCHEMA_HOLD');
  }
  const run = canonical.latest_durable_external_run;
  const count = canonical.last_completed_mutants;
  if (!Number.isSafeInteger(run) || run <= 0 || !Number.isInteger(count) || count < 0 || count > 8) {
    throw new Error('ROWAN_RUN_OR_COUNT_HOLD');
  }
  if (pipeline.latest_archived_source_run !== run ||
      pipeline.latest_completed_source_run !== run ||
      pipeline.completed_mutants !== count ||
      receipt.sources?.meta_canonical_run !== run ||
      receipt.observation?.completed_mutants !== count ||
      coordination.meta_canonical_run !== run ||
      coordination.source_binding_sha256 !== receipt.source_binding_sha256 ||
      !RECEIPT_PATTERN.test(coordination.receipt_path) ||
      !HEX.test(receipt.sources?.rowan_source_artifact_sha256 ?? '') ||
      receipt.sources.rowan_source_artifact_sha256 !== canonical.underlying_state_is_derived_from) {
    throw new Error('ROWAN_CROSS_ORGAN_SOURCE_MISMATCH_HOLD');
  }
  if (receipt.authority?.new_credit_spend !== false ||
      receipt.authority?.new_rowan_jobs !== false ||
      receipt.authority?.hypotheses_are_empirical_proof !== false ||
      pipeline.science_gates?.model_production_promotion !== false ||
      pipeline.science_gates?.new_billing_authorized_by_watchdog !== false ||
      pipeline.science_gates?.wetlab_independent_validation !== 'OPEN') {
    throw new Error('ROWAN_AUTHORITY_ESCALATION_HOLD');
  }
  return Object.freeze({
    status: 'SYNCED_SOURCE_POINTERS_READ_ONLY',
    run, completed: count, total: 8,
    sourceSha256: canonical.underlying_state_is_derived_from,
    coordinationSha256: coordination.source_binding_sha256,
    archive: pipeline.archive_status,
    topaNumerical: pipeline.independent_TOPA_shadow_status,
    independentWetlab: pipeline.science_gates.wetlab_independent_validation,
    scientificStatus: canonical.latest_scientific_status,
    sourceLink: 'https://github.com/Hawkar-usls/Janus/actions/runs/' + run,
    authority: 'NO_ROWAN_SPEND_NO_GRAPH_WRITE_NO_SCIENTIFIC_PROMOTION'
  });
}

async function publicJson(path, fetchImpl) {
  if (![...Object.values(SOURCES)].includes(path) && !RECEIPT_PATTERN.test(path)) {
    throw new Error('ROWAN_SOURCE_PATH_NOT_ALLOWED');
  }
  const response = await fetchImpl(BASE + path, {
    method: 'GET', mode: 'cors', credentials: 'omit',
    cache: 'no-store', redirect: 'error'
  });
  if (!response.ok) throw new Error('ROWAN_PUBLIC_SOURCE_UNAVAILABLE');
  const body = await response.text();
  if (body.length > MAX_RESPONSE) throw new Error('ROWAN_PUBLIC_SOURCE_OVERSIZED');
  return JSON.parse(body);
}

export async function readRowanEvidence(fetchImpl = fetch) {
  const [canonical, pipeline, coordination] = await Promise.all([
    publicJson(SOURCES.canonical, fetchImpl),
    publicJson(SOURCES.pipeline, fetchImpl),
    publicJson(SOURCES.coordination, fetchImpl)
  ]);
  if (!RECEIPT_PATTERN.test(coordination.receipt_path)) throw new Error('ROWAN_RECEIPT_PATH_HOLD');
  const receipt = await publicJson(coordination.receipt_path, fetchImpl);
  return reconcileRowan(canonical, pipeline, coordination, receipt);
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = String(value);
}

async function renderRowan() {
  try {
    const status = await readRowanEvidence();
    setText('rowan-status', 'Источник синхронизирован · только чтение');
    setText('rowan-count', status.completed + '/' + status.total);
    setText('rowan-run', status.run);
    setText('rowan-topa', status.topaNumerical);
    setText('rowan-science', status.scientificStatus);
    setText('rowan-wetlab', status.independentWetlab);
    const link = document.getElementById('rowan-source');
    if (link) link.href = status.sourceLink;
  } catch (error) {
    setText('rowan-status', 'HOLD · источник недоступен или версии расходятся');
    setText('rowan-count', '—');
    setText('rowan-run', '—');
    setText('rowan-topa', 'НЕ ПОДТВЕРЖДЕНО');
    setText('rowan-science', 'БЛОКИРОВКА ИСТОЧНИКА');
    setText('rowan-wetlab', 'НЕ ПОДТВЕРЖДЕНО');
  }
}
if (typeof document !== 'undefined') void renderRowan();
