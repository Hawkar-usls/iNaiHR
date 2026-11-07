# JANUS Locale UI — independent implementation

This is an original, standalone UI-localization helper for iNaiHR. The external translate.js outreach email motivated an evaluation of multilingual accessibility, **not** reuse of its implementation: no translate.js code, assets, API, trademark, or other third-party localization code is included.

## Scope and guarantees

- English, Ukrainian and Russian **curated UI strings** (static controls only).
- Native one-click selector; stores only the chosen locale in browser localStorage under `janus.ui.locale.v1`, gracefully degrading if storage is unavailable.
- Existing DOM layout and element IDs are preserved; translations are installed using `textContent` and `placeholder`, never `innerHTML`.
- No new third-party dependency, remote translation endpoint, analytics, network request or API key.
- The semantic graph, user-created labels, local node data, model prompts and provenance are **never translated or mutated**.
- Missing translation keys retain the original source text; no pretend machine translation.
- This change does not alter JANUS Meta Registry, DemiHead bridge, remote AI uplink, GitHub Actions, or production authority.

## Integration

Include the local helper in the HTML page and annotate **only static interface strings**:

```html
<button data-janus-i18n="clearDesk">CLEAR LOCAL DESK</button>
<script src="./assets/janus-locale-ui.js" defer></script>
```

Add the language selector with ID `janus-language`; the helper binds to its native change event. To change the language from another interface, call `window.JanusLocale.setLocale('uk')`. Use `window.JanusLocale.refresh()` after explicitly adding *trusted, opt-in, static* controls at runtime. Never add the attribute to user-provided graph labels.

## Copyright and SEO boundary

The JANUS helper was written independently for this repository under its existing MIT license (Copyright 2026 Hawkar-usls). Attribution here describes the origin of the **idea for a feature request**, not a code dependency or endorsement by the translate.js author.

Client-side language switching **alone does not establish fully indexable multilingual SEO**. For actual localized indexing, publish separately addressable pre-rendered localized documents, canonical/hreflang pairs, and verified metadata. Those pages are outside this small UI feature and must be tested before making SEO claims.

This component does **not** claim arbitrary-content automatic machine translation or parity with translate.js. Extending it to more languages requires authoring and reviewing new translations, not copying another project's source.

## Tests and review

Run `node --test tests/janus-locale-ui.test.cjs` with Node 18 or newer. The test is dependency-free and uses a small simulated DOM; a real browser accessibility and mobile layout review is still necessary. No automatic merge or production deployment should be inferred from adding this feature to a draft pull request.
