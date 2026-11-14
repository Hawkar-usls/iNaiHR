# Superseded v1 experiment (historical only)

This document describes the **rejected flat hash-based spiral**. It is not the current HRain/iNaiHR Galaxy implementation. The active interface is the source-grounded, perspective **[JANUS Volume Observatory v2](JANUS_VOLUME_OBSERVATORY_V2.md)**. Do not use the v1 geometry, UI assumptions or tests as proof of 3D capability.

---

# JANUS Galaxy Lens · design and safety contract

Reference interface: https://now.intellectronica.net/hydrogen-milky-way/

**Design inspiration only.** The referenced website is an interactive *astronomical simulation* with visual/infrared/21 cm/X-ray views, configurable structures, camera presets and an automatic tour. No 3D star positions, observed H I maps, third-party code or astronomy models are copied into this implementation.

## Architecture

- HRain's \`galaxy.html\` loads \`assets/janus-json-atlas/manifest.json\` from the published HRain Pages site. Its overview displays **actual repository aggregates**, and selecting a repository loads one **real, commit-pinned JSON metadata shard** at a time. The source URL is linked, not edited.
- iNaiHR's \`galaxy.html\` loads its existing \`janus-synth/state/JANUS_SYNTH_LATEST.json\` snapshot. Each point is a published **semantic candidate**, not a fact; status, attention, depth, and source-record pointers are inspectable.
- The shared, self-contained JavaScript engine uses Canvas 2D (no WebGL hardware requirement), deterministic logarithmic spiral coordinates from stable object IDs, an adjustable camera tilt, zoom/pan, optional visual orbit, layer filters, in-segment search, and point inspection.
- Decorative background stars and spiral guides are NOT attributed to records. Visual proximity does not imply a graph edge, causal relationship, verified connection, neural gain, or physical coordinates.
- Display count means **currently loaded and filtered records**, never all indexed records. The overview total comes from the manifest and can become stale. The source manifest provides the generation timestamp and commit provenance.
- The registry source corpus may have newer commits after index generation; the lens never claims to have synchronized them automatically.

## Read-only and epistemic boundaries

\`\`\`text
SOURCE_JSON != SPATIAL_COORDINATE
SEMANTIC_CANDIDATE != EVIDENCE
ATTENTION_WEIGHT != CONFIDENCE
VISUAL_NEIGHBOR != DOCUMENTED_EDGE
CACHED_INDEX != CURRENT_LIVE_REPOSITORY
BROWSER_PROJECTION != META_REGISTRY_AUTHORITY
NO_API_KEYS / NO_BROWSER_WRITE / NO_AUTO_PROMOTION
\`\`\`

No POST/PATCH/DELETE requests, registry mutation, browser persistence, remote LLM access or cross-hemisphere command dispatch. A source link only opens an allowed \`github.com/Hawkar-usls\` blob URL in a new tab with \`noopener noreferrer\`.

**Operational limitations:** iNaiHR depends on the published SYNTH snapshot; HRain depends on the Pages-hosted atlas. No offline dataset is included in the new lens. No benchmark establishes superiority over the existing D3 graph, no physical astronomy claims arise from the new layout, and this remains an opt-in experimental view.

## Validation

\`\`\`bash
node --check assets/janus-galaxy.mjs
node --test tests/galaxy_lens.test.mjs
\`\`\`

Run the two GitHub Pages \`galaxy.html\` routes for manual browser inspection after merging the review PRs. The current \`index.html\`, \`janus.html\`, and DemiHead pages stay authoritative for their existing roles.
