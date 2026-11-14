# JANUS Volumetric Observatory v2 — verified scope

Reference supplied by project owner: https://now.intellectronica.net/hydrogen-milky-way/

**Source limitation:** The original host could not be fetched from the implementation environment during this change. Do not claim source-code inspection, exact visual reproduction, or agreement with the original's scientific model. This is a **new implementation** using the general principles of a volumetric hydrogen visualization: distinct observational lenses, 3D camera motion, density-dependent emission and slices through a data volume.

## What changed from v1

The original Galaxy Lens was a flat Canvas 2D spiral of positions calculated from ID hashes. It was rejected as an inadequate implementation of the provided reference.

Version 2 REPLACES the existing \`galaxy.html\` view (the original D3 \`index.html\` and \`janus.html\` are not replaced). It implements:
- WebGL2 shaders in \`assets/janus-volume-render.mjs\`: actual depth, perspective, 3D camera yaw/pitch/distance, additive radial point sprites, multi-scale Gaussian emission centered **only on real records**, volume slices, and source-edge lines. This smoothing is an explicitly derived visualization of record concentration, not measured physical gas density.
- Canvas 2D fallback only when WebGL2 is unavailable; clearly labelled by the UI.
- An evidence-first graph builder in \`assets/janus-volume-model.mjs\`, independent of DOM and browser code.
- Navigable 3D scene with click-to-inspect, zoom, orbit, shift-drag pan, top/edge/perspective camera presets, optional auto-flight, mobile pointer/pinch handling, density and provenance lenses, source inspection, and read-only safety boundaries.
- Provenance and reproducibility tests in Node, plus Chromium GPU end-to-end smoke checks in GitHub Actions.

## HRain: structural volume

Sources are the existing immutable **public metadata atlas** \`assets/janus-json-atlas/manifest.json\` and its \`shards/*.json\`. The overview has exactly one point for each published repository; size encodes indexed JSON count. Clicking one repository progressively loads **real JSON records**, indexed by file path. Folder nodes are explicitly marked DERIVED_PATH_GROUP and connect to contained files using PATH_CONTAINMENT edges. Layout positions are deterministic, 3D visual coordinates based on **folder nesting and file grouping**, not physical positions or semantic proximity.

When the user clicks \`Загрузить реальные связи JSON\`, the page fetches the matching \`assets/janus-json-relations/shards/*.json\` and draws **only** edges where \`relationClass==="EXPLICIT_SOURCE_REFERENCE"\`; the source ID must be present in the loaded file subset. A target ID not yet represented by a loaded file is rendered as a labeled **pointer-only** node, not presented as a verified object. This published relations index is incomplete and reported three held files at implementation time. The failure tracked in [HRain #57](https://github.com/Hawkar-usls/Hrain/issues/57) is not hidden or bypassed here.

Lazy-loading is intentional. Total counts reflect the published manifest, while the viewport counters reflect the loaded and filtered subset. No claim is made to show all 24,587 public JSONs by default.

## iNaiHR: associative volume

Source: \`janus-synth/state/JANUS_SYNTH_LATEST.json\`. The scene uses real \`SEMANTIC_CANDIDATE\` IDs, real \`pivot.id\` groups and \`meaning.evidence.source_records\` pointers. Lines from candidates to records are labeled **RECORDED_SOURCE_POINTER**, not causal or evidentiary links. Prior-candidate lineage edges appear **only if both IDs exist in the published candidate snapshot**.

Depth and recorded group membership affect spatial layout; attention can alter *sprite size* but is explicitly not a scientific evidence weight, neural gain, model confidence or probabilistic calibration. Every candidate retains its existing \`authority\` flags and inspection metadata. No model is trained or allowed to mutate data through this visualization.

## Epistemic and security boundaries

\`\`\`text
SPATIAL_DISTANCE != SEMANTIC_SIMILARITY
SIZE / GLOW != VERIFIED_TRUTH
ORIGINAL_HYDROGEN_SIMULATION != JANUS_SOURCE_DATA
RECORDED_SOURCE_POINTER != CAUSAL_EDGE
EXPLICIT_SOURCE_REFERENCE != SCIENTIFIC_VERDICT
FOLDER_GROUP != AUTHORITATIVE_JSON_RECORD
ATTENTION_WEIGHT != EVIDENCE_WEIGHT
CACHED_INDEX != CURRENT_LIVE_REPOSITORY
SOURCE_JSON_MUTATION = FALSE
PRODUCTION_MODEL_UPDATE = FALSE
\`\`\`

Source links may only open pinned GitHub \`/blob/<40hex>/\` URLs under \`Hawkar-usls\`; they use \`rel="noopener noreferrer"\`. The runtime uses GET JSON fetches only, never stores credentials, never writes to a browser database, and never mutates external JSON.

## Validation and performance

\`\`\`bash
node --check assets/janus-volume-model.mjs
node --check assets/janus-volume-render.mjs
node --check assets/janus-volume-ui.mjs
node --test tests/janus_volume.test.mjs
python -m pip install playwright
python -m playwright install chromium
python tests/janus_volume_browser.py
\`\`\`

\`Galaxy lens · read-only CI\` was superseded by \`JANUS Galaxy Volume v2 · GPU and provenance gates\`. Browser tests must confirm **WebGL2**, viewport rendering, source-drilldown, camera presets, non-empty recorded edges and absence of uncaught JavaScript errors. If GPU cannot initialize, Canvas 2D fallback is shown transparently and the GPU validation gate should not pass.

Potential next step: external visual reference review once the original site is reachable and performance profiling on actual target phones/GPUs. This change does NOT claim a production benchmark, physical gas-density inference, or trained weights.
