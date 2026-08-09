<div align="center">

# iNaiHR
### LLM-assisted semantic graph interface

![Status](https://img.shields.io/badge/status-active%20prototype-2f81f7)
![Class](https://img.shields.io/badge/class-interaction%20prototype-6e7681)

</div>

## Status

**Active Prototype.** iNaiHR is implemented as an experimental semantic-interface prototype. Model behavior, interface contracts, and validation remain subject to change.

## Abstract

iNaiHR expands a short user-provided input — a word, symbol, emoji, or decoded message — into an editable semantic graph with optional LLM-assisted suggestions.

## Implemented scope

- semantic graph expansion from short input;
- browser-based navigation/editing;
- optional LLM-assisted suggestions;
- user inspection and rejection of generated content.

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
- Portfolio maturity/visibility: [`portfolio-visibility.json`](https://github.com/Hawkar-usls/Janus/blob/main/portfolio-visibility.json)

## Privacy

If external model assistance is enabled, data handling depends on the selected provider/deployment. This repository makes no blanket privacy or regulatory-compliance guarantee.

Presentation follows the account's [public repository standard](https://github.com/Hawkar-usls/Janus/blob/main/docs/PUBLIC_REPOSITORY_PRESENTATION_STANDARD.md). No affiliation with MIT is implied by the presentation style.
