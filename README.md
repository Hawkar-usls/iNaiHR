<div align="center">

# iNaiHR
### LLM-assisted semantic graph interface

![Status](https://img.shields.io/badge/status-active%20prototype-2f81f7)
![Class](https://img.shields.io/badge/class-interaction%20prototype-6e7681)

</div>

## Status

**Active Prototype.** iNaiHR is implemented as an experimental semantic-interface prototype. Model behavior, interface contracts, and validation remain subject to change.

## Abstract

iNaiHR expands a short user-provided input — a word, symbol, emoji, or decoded message — into an editable semantic graph with optional remote LLM-assisted suggestions.

The public browser build is now **backend-first and secret-free**: no provider API key is embedded in the repository or shipped to visitors. When the configured remote AI uplink is unavailable, SYNTH falls back to an explicitly labelled deterministic local semantic mode instead of failing with a generic `AI ERROR`.

## Implemented scope

- semantic graph expansion from short input;
- browser-based navigation/editing;
- optional remote LLM-assisted suggestions through an external backend;
- deterministic `LOCAL SEMANTIC FALLBACK` when the remote uplink is unavailable;
- user inspection and rejection/editing of generated content;
- migration of legacy browser-local graph data;
- local-only workspace clearing;
- read-only DemiHead `RIGHT_INAIHR` hemisphere sidecar with deterministic packet normalization.

## DemiHead right hemisphere

iNaiHR now exposes a separate [`demihead.html`](demihead.html) sidecar and [`demihead-bridge.js`](demihead-bridge.js) builder for the JANUS DemiHead bicameral bridge.

The hemisphere terminology is a **software metaphor**, not a biological claim:

```text
HRain / LEFT_HRAIN   = STRUCTURAL_CONTEXT
DemiHead              = bind / compare / preserve disagreement
iNaiHR / RIGHT_INAIHR = ASSOCIATIVE_CONTEXT
```

The sidecar reads only the browser-local semantic workspace and emits `janus.demihead.hemisphere_packet.v1`. It cannot write to HRain, JANUS Meta Registry, GitHub or external platforms.

For legacy data, provenance is deliberately conservative:

```text
old node with isAI=true  -> REMOTE_AI
explicit origin field    -> preserve exact supported origin
old non-AI node           -> LEGACY_UNKNOWN
```

An old non-AI node is **not** guessed to be `USER` or `LOCAL_FALLBACK`, because the existing persisted format does not distinguish those histories.

```text
HEMISPHERE_METAPHOR != NEUROSCIENCE_CLAIM
ASSOCIATION != EVIDENCE
REMOTE_AI_OUTPUT != INDEPENDENT_WITNESS
LOCAL_FALLBACK != MODEL_OUTPUT
BOTH_HEMISPHERES_AGREE != TRUTH
PACKET_TRANSFER = READ_ONLY
DIRECT_CROSS_HEMISPHERE_MUTATION = false
AUTHORITY_DELTA = 0
MASS_EFFECT_BUDGET_DELTA = 0
```

The sidecar may answer an explicit `JANUS_DEMIHEAD_REQUEST_PACKET_V1` `postMessage` from the same GitHub Pages origin or a localhost development origin. The response is sent back only to that exact requesting origin, never to `*`.

## Data and deletion boundary

The iNaiHR graph is a browser-local user workspace. It is **not** the JANUS Meta Registry database.

`CLEAR LOCAL DESK` and long-press node deletion affect only local browser workspace state. They do not call the JANUS Meta Registry, HRaiN Registry Mode, GitHub contents APIs, or any registry deletion endpoint.

```text
LOCAL_WORKSPACE != JANUS_REGISTRY
LOCAL_NODE_DELETE != REGISTRY_DELETE
CLEAR_LOCAL_DESK != SOURCE_MUTATION
REMOTE_AI_OUTPUT != REGISTRY_FACT
LOCAL_SEMANTIC_FALLBACK != LLM_OUTPUT
```

## AI security boundary

Provider credentials must never be embedded in `index.html`, JavaScript bundles, query strings committed to the repository, or public Pages assets. The frontend may call a configured backend; secrets remain server-side. Any credential previously published in Git history must be treated as exposed and revoked/rotated at the provider.

## Boundary

```text
MATURITY = ACTIVE_PROTOTYPE
BCI_DEVICE_INTEGRATION = NOT_ESTABLISHED
CLINICAL_VALIDATION = NOT_PERFORMED
PATIENT_PILOT_READINESS = NOT_CLAIMED
MEASURED_THROUGHPUT_GAIN = NOT_ESTABLISHED
MEASURED_BICAMERAL_COGNITIVE_GAIN = NOT_ESTABLISHED
REGULATORY_OR_MEDICAL_DEVICE_STATUS = NOT_CLAIMED
```

Potential BCI use is a research direction, not an established capability. Any future clinical or performance claim requires a defined interface contract, measured benchmark, appropriate review, and independent evaluation.

## Review

- Live demo: https://hawkar-usls.github.io/iNaiHR/
- DemiHead right-hemisphere sidecar: https://hawkar-usls.github.io/iNaiHR/demihead.html
- Machine-readable project status: [`PROJECT_STATUS.json`](PROJECT_STATUS.json)
- Local-first companion: [HRain](https://github.com/Hawkar-usls/Hrain)
- JANUS Registry Mode: https://hawkar-usls.github.io/Hrain/janus.html
- Portfolio maturity/visibility: [`portfolio-visibility.json`](https://github.com/Hawkar-usls/Janus/blob/main/portfolio-visibility.json)

## Privacy

If external model assistance is enabled, data handling depends on the selected backend/provider deployment. This repository makes no blanket privacy or regulatory-compliance guarantee. Local fallback does not require a model-provider request.

Presentation follows the account's [public repository standard](https://github.com/Hawkar-usls/Janus/blob/main/docs/PUBLIC_REPOSITORY_PRESENTATION_STANDARD.md). No affiliation with MIT is implied by the presentation style.
