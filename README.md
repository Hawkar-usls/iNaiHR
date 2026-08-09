# iNaiHR — LLM-Assisted Cognitive Graph Interface

iNaiHR is an experimental interface for expanding a small user-provided input — a word, symbol, emoji, or short decoded message — into an editable semantic graph with optional LLM assistance.

The project explores a simple human-computer interaction question:

> Can a low-bandwidth input channel become easier to use when the system proposes a structured semantic neighborhood that the user can inspect, reject, edit, and extend?

## Demo

45-second demo: https://youtu.be/GOEDU86t964

Live versions:

- iNaiHR — AI-assisted graph expansion: https://hawkar-usls.github.io/iNaiHR/
- HRain — manual/offline graph interface: https://hawkar-usls.github.io/Hrain/

## Current scope

The repository is a **research and interaction prototype**, not a medical device and not a validated BCI communication system.

Current capabilities include:

- semantic expansion from short user input;
- visual graph navigation and editing;
- optional LLM-assisted suggestions;
- browser-based interaction;
- compatibility experiments with low-bandwidth input scenarios.

Potential BCI use is a research direction only. The repository does **not** currently establish:

- clinical efficacy;
- a measured communication-throughput multiplier;
- compatibility with any specific implanted BCI;
- regulatory compliance or medical-device readiness;
- patient-pilot readiness.

Any future BCI claim should be supported by a separately defined interface contract, measured benchmark, appropriate ethics/review process, and independent evaluation.

## Privacy boundary

HRain can operate locally in the browser. iNaiHR may use an external model provider when AI features are enabled. Privacy therefore depends on the selected deployment and provider configuration; no blanket compliance claim is made by this repository.

## Run

Open `index.html` in a modern browser.

For AI-assisted operation, configure a supported model endpoint or API key according to the local project settings. Keep credentials out of committed source files.

## Project status

```text
INTERACTION_PROTOTYPE = IMPLEMENTED
LOW_BANDWIDTH_INPUT_EXPERIMENT = AVAILABLE
BCI_DEVICE_INTEGRATION = NOT_ESTABLISHED
CLINICAL_VALIDATION = NOT_PERFORMED
PATIENT_PILOT_READINESS = NOT_CLAIMED
MEASURED_THROUGHPUT_GAIN = NOT_ESTABLISHED
```

## Author

Oleksandr Ahapov (Hawkar) — Ukraine

This repository is part of a broader set of experimental human-computer interaction and local-first AI projects.
