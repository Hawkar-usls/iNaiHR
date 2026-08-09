<div align="center">

# iNaiHR
### LLM-assisted semantic graph interface

`short input` · `editable graph` · `optional model suggestions`

</div>

iNaiHR is an experimental interface for expanding a short user-provided input — a word, symbol, emoji or decoded message — into an editable semantic graph.

It is an **interaction prototype**, not a medical device or validated BCI communication system.

- **Live demo:** https://hawkar-usls.github.io/iNaiHR/
- **Machine-readable status:** [`PROJECT_STATUS.json`](PROJECT_STATUS.json)
- **Local-first companion:** [HRain](https://github.com/Hawkar-usls/Hrain)

## Implemented scope

- semantic graph expansion from short input;
- browser-based navigation/editing;
- optional LLM-assisted suggestions;
- user inspection and rejection of generated content.

## Boundary

```text
BCI_DEVICE_INTEGRATION = NOT_ESTABLISHED
CLINICAL_VALIDATION = NOT_PERFORMED
PATIENT_PILOT_READINESS = NOT_CLAIMED
MEASURED_THROUGHPUT_GAIN = NOT_ESTABLISHED
REGULATORY_OR_MEDICAL_DEVICE_STATUS = NOT_CLAIMED
```

Potential BCI use remains a research direction. Any future performance or clinical claim requires a defined interface contract, measured benchmark, appropriate ethics/review process and independent evaluation.

## Privacy

If external model assistance is enabled, data handling depends on the selected provider/deployment. No blanket privacy or regulatory-compliance guarantee is made by this repository.
