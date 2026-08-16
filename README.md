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
- local-only workspace clearing.

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
REGULATORY_OR_MEDICAL_DEVICE_STATUS = NOT_CLAIMED
```

Potential BCI use is a research direction, not an established capability. Any future clinical or performance claim requires a defined interface contract, measured benchmark, appropriate review, and independent evaluation.

## Review

- Live demo: https://hawkar-usls.github.io/iNaiHR/
- Machine-readable project status: [`PROJECT_STATUS.json`](PROJECT_STATUS.json)
- Local-first companion: [HRain](https://github.com/Hawkar-usls/Hrain)
- JANUS Registry Mode: https://hawkar-usls.github.io/Hrain/janus.html
- Portfolio maturity/visibility: [`portfolio-visibility.json`](https://github.com/Hawkar-usls/Janus/blob/main/portfolio-visibility.json)

## Privacy

If external model assistance is enabled, data handling depends on the selected backend/provider deployment. This repository makes no blanket privacy or regulatory-compliance guarantee. Local fallback does not require a model-provider request.

Presentation follows the account's [public repository standard](https://github.com/Hawkar-usls/Janus/blob/main/docs/PUBLIC_REPOSITORY_PRESENTATION_STANDARD.md). No affiliation with MIT is implied by the presentation style.
