# JANUS Locale UI — independent implementation

This is an original, standalone UI-localization helper for iNaiHR. The external translate.js outreach email motivated an evaluation of multilingual accessibility, **not** reuse of its implementation: no translate.js code, assets, API, trademark, or other third-party localization code is included.

## Scope and guarantees

- English, Ukrainian and Russian **curated UI strings** (static controls, including explicitly marked controls inserted later).
- Native one-click selector; stores only the chosen locale in browser localStorage under `janus.ui.locale.v1`, gracefully degrading if storage is unavailable.
- Allowlisted `?janus_lang=en|uk|ru` URL override for shareable language selection; invalid values fall back to saved or browser language. No geolocation.
- Existing DOM layout and element IDs are preserved; translations are installed using `textContent`, `placeholder`, `aria-label` or `title`, never `innerHTML`.
- A `MutationObserver` handles **only newly inserted, opt-in static controls**, without intercepting fetch/XHR, scanning unmarked text, or modifying data sources. The whole graph region is explicitly excluded with `data-janus-i18n-ignore`.
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

Add the language selector with ID `janus-language`; the helper binds to its native change event. To change the language from another interface, call `window.JanusLocale.setLocale('uk')`. Trusted, explicitly annotated static controls added at runtime are localized automatically when the browser supports `MutationObserver`; `window.JanusLocale.refresh()` remains available for manual use. Never add the attribute to user-provided graph labels.

To preserve a complete subtree (for example, user graphs or live status messages), set `data-janus-i18n-ignore` on its container. For accessibility labels use `data-janus-i18n-aria-label="interfaceLanguage"`. A curated dictionary key must exist before the helper changes a value.

Examples: `?janus_lang=uk` chooses Ukrainian for this page visit; an unsupported query value falls back to the stored or browser language. A deliberate selector change persists a preference in localStorage.

## Ideas independently adapted from public documentation

After reviewing the public [translate.js README](https://github.com/xnx3/translate/blob/main/README.md) and [MIT license](https://github.com/xnx3/translate/blob/main/LICENSE), the following are general *design ideas*, not copied code: DOM-aware handling for newly mounted interface controls; selective inclusion/exclusion; browser language preference; optional URL language selection. These are broadly applicable frontend internationalization patterns. JANUS implements them with its own strictly bounded UI-only dictionary and browser APIs.

The upstream project describes much more: automatic detection of arbitrary page text, external or private translation services, caches, and SEO workflows. **We neither implement nor claim those features**, and do not load upstream assets, run their translation API, or use their branding. The unsolicited sender's identity or relationship to the upstream project has not been independently verified.

## Copyright and SEO boundary

The JANUS helper was written independently for this repository under its existing MIT license (Copyright 2026 Hawkar-usls). Attribution here describes the origin of the **idea for a feature request**, not a code dependency or endorsement by the translate.js author.

Client-side language switching **alone does not establish fully indexable multilingual SEO**. For actual localized indexing, publish separately addressable pre-rendered localized documents, canonical/hreflang pairs, and verified metadata. Those pages are outside this small UI feature and must be tested before making SEO claims.

This component does **not** claim arbitrary-content automatic machine translation or parity with translate.js. Extending it to more languages requires authoring and reviewing new translations, not copying another project's source.

## Tests and review

Run `node --test tests/janus-locale-ui.test.cjs` with Node 18 or newer. Eight tests are provided, dependency-free, using a small simulated DOM; a real browser accessibility and mobile layout review is still necessary. No automatic merge or production deployment should be inferred from adding this feature to a draft pull request.
