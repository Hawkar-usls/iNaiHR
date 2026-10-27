# JANUS iNaiHR · owner-provided original source audit · 2026-10-27

## Provenance and duplicate classification
Five user-provided HTML files resolve to **three distinct SHA-256 source bodies**, not five versions:
- `index — iNaiHr.html` and `index — iNaiHr (1).html`: **byte-identical** 15,430 B, SHA-256 `fb017df1882733a3552b4e69eb4092c20fa8e36d1b44211f67ff5b0d8b22f588`, title **iNaiHR: SPORE MIND**. Original D3 green cell/membrane graph, Shift+click connecting cells, add/edit/delete, periodic GET refresh and POST sync.
- `index(20261027-081951).html` and `index(20261027-082007).html`: **byte-identical** 25,130 B, SHA-256 `165fa1c1cc0617c5ca392278491631c270b668cb18684320f4fa2506498f4243`, title **iNaiHR: AI Nexus**. Original purple D3, concept links, pulses, editing, `inaihr_v1` browser storage, SYNTH via external model.
- `index(20261027-082003).html`: 64,291 B, SHA-256 `ecfaaa8934715d286434d65b99b33ecfbb5e0b1690ac037989625f35a7d41800`, title **HRAIN v4.0: Janus Graph Explorer**. **This is HRAiN's historic registry explorer, NOT iNaiHR.** It separately contains registry fetching, DIVE/ASCEND and AI client integrations. No transplant into iNaiHR.

The unmodified attached originals remain the owner's files, outside the public repository. Their source SHA-256 values establish provenance only, not authorization or scientific truth.

## Serious safety finding: original credential in client HTML
The purple **AI Nexus original embeds an API key** in static client JavaScript. Do not copy it, quote its value, rely on it, or push the original file directly to GitHub. The original key must be revoked/rotated at the provider independently; merely removing it from this recovery does NOT revoke the already-exposed key. The public restored page uses `apiKey=null`, eliminates the external model call and gates SYNTH.

The green SPORE MIND original contains a hardcoded third-party ngrok endpoint and an unauthenticated-looking `user_id` query parameter, fetches every 5 seconds and posts its **entire** graph to `/api/inaihr/sync` on edits. We did not find the backing server implementation in the provided HTML files; no claim of backend authorization is possible. The restored SPORE view removes the old network calls and user identifier entirely.

## Restored **original** independent iNaiHR organisms
- `spore-original.html`: preserves the owner-provided green, organic original D3 membrane/core visualization, link gestures, add/rename/delete, drag/zoom and local cell topology. Browser-session-only JSON draft, explicit import/export, no automatic remote GET or POST.
- `ai-nexus-original.html`: preserves the owner-provided purple original D3, pulses, manual linked ideas, rename, drag/zoom and browser draft/export/import; *read-only legacy* `inaihr_v1` loading where valid; never overwrites historical key. External SYNTH disabled by default; no embedded credential in public source.
- Both reuse the **exact existing `assets/janus-native-atlas.js` and `assets/janus-explicit-links.js`** from current JANUS. They inject only SHA-provenance-indexed **EXPLICIT_SOURCE_REFERENCE** JSON links into the *original* D3 as temporary read-only views and restore original local graph. iNaiHR semantic associations remain suggestions, not evidence; TOPA independently adjudicates science.
- `index.html` remains the current iNaiHR Semantic Nexus and `janus.html` remains the Semantic Registry; neither is replaced. Two links to original views are added.

## Explicit limits and next gates
Restoration is browser-local and no new external AI authority is granted. Full authenticated multiuser backend synchronization, rollback, concurrency control, session authentication and restoring remotely held graph state are **NOT IMPLEMENTED**. The original ngrok service and the exposed model key are **NOT USED**. No private source graph, user data or connected-account secrets are uploaded, and no Rowan credits are used.

Browser regression checks are required before public merging: original D3 graph manipulation in each restored original, no POST, read-only draft, temporary verified Cosmos source-reference projection and exact restore; existing modern Semantic Nexus tests must remain green.
