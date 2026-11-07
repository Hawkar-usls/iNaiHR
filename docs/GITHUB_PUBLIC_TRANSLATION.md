# JANUS public-only translation in GitHub

**Status:** experimental, GitHub-only implementation. All inference happens on a GitHub-hosted Actions CPU runner, **not in GitHub Pages** and not on a NAS, personal computer, owner infrastructure, or an external translation API.

## Architecture and boundary

1. `public-i18n/source.json` is an **explicit, small, PUBLIC_ONLY allowlist** of display text authored for this repository. No scanning of GitHub issues, project source trees, user graph nodes, messages, registry snapshots, private files, or arbitrary webpages.
2. `scripts/janus_public_translate.py` first validates the exact input schema, size, permitted languages, and exclusions (credentials, email addresses, URLs, HTML/template markers). Invalid input stops the job before model initialization.
3. The **manual** GitHub Actions `workflow_dispatch` job downloads a fixed-revision, Apache-2.0 MarianMT model from Hugging Face and runs CPU inference **on GitHub Actions**. Its only output is `workflow-output/{uk,ru}.json` with `status: UNREVIEWED`, `approved: false`, source SHA-256 and pinned model revision. That file is retained as a GitHub workflow artifact for seven days; the job has only `contents: read` permissions and cannot commit or publish it.
4. An editor checks the translations for linguistic accuracy, meaning, factual claims, attribution, privacy leaks, source digest, licensing and layout. An explicitly reviewed artifact can be introduced separately via an ordinary GitHub PR and normal repository review.
5. GitHub Pages serves **only static, same-origin** `public-i18n/reviewed/uk.json` or `ru.json`, if and when those files are committed through a reviewed PR. The viewer recomputes SHA-256 over the shipped English source bytes and rejects translated files with a mismatched digest, wrong key set, missing approval flag or a status other than `HUMAN_REVIEWED`. Missing/unreviewed/stale translations display the English original.

The approval metadata on its own is not proof of a real human review; **the PR review and commit provenance must be independently checked**. Do not change the metadata merely to make the browser show a candidate.

## Manual use on GitHub

- PR validation (without model download): new workflow `.github/workflows/janus-public-i18n.yml` runs Python policy unit tests, lightweight Node viewer tests, and the existing UI localization tests.
- Once the workflow is present on the repo's default branch, go to **Actions → JANUS Public Translation - GitHub Only → Run workflow**. Select `uk` or `ru`. It intentionally has **no schedule** and no automatic heavy inference.
- When the job succeeds, download its `janus-public-i18n-unreviewed` GitHub artifact. It is an editorial candidate **only**. The repo does not contain reviewed MT output yet.
- After editorial approval and a separate PR, put an approved result at `public-i18n/reviewed/<lang>.json` with `status: HUMAN_REVIEWED`, `approved: true` and **all** original catalog keys. The reference source SHA must be the SHA-256 of the exact shipped `public-i18n/source.json` bytes. No automated merge or self-approval.
- Open the iNaiHR Pages homepage, choose EN/UA/RU, and select **PUBLIC INFO**. This view translates only the allowlisted public informational paragraphs. It never sends text from user graphs for translation.

Until the composed prerequisite draft PR #25 is merged, this follow-on PR is **stacked** against its feature branch. New workflow files may not be manually dispatchable in GitHub Actions until merged into the default branch; this is an intentional review gate, not an operational failure.

## Engine provenance and licensing

The workflow's orchestration and site viewer are original JANUS code under this repository's MIT license. The **pretrained translation weights are third-party models, not trained by JANUS**:

| Direction | Model | Fixed upstream revision | Reported license |
|---|---|---|---|
| en→uk | [Helsinki-NLP/opus-mt-en-uk](https://huggingface.co/Helsinki-NLP/opus-mt-en-uk) | `b448d49ddc54149ac1c4efe9a5c4b44ebfaefa03` | Apache-2.0 |
| en→ru | [Helsinki-NLP/opus-mt-en-ru](https://huggingface.co/Helsinki-NLP/opus-mt-en-ru) | `bb09c99d180016eac6819df3dae68edb1690fdee` | Apache-2.0 |

The runner must access PyPI/PyTorch package mirrors and Hugging Face **to download dependencies/model weights**, not to send source text for remote translation. Pinned model repository revisions reduce drift; transitive pip packages, upstream binary metadata, service availability and model semantics still require independent security/reproducibility review. The official model cards/license and third-party notices should accompany any later redistribution of model weights. No third-party weights or translate.js code are checked into this repository.

The workflow uses a `torch` CPU build and `transformers` v4 with `trust_remote_code=False` and `weights_only=True`. Verify this dependency combination and the remote weight-loading security boundary in a real Actions run before declaring model execution PASS.

## Actual GitHub-only canary · 2026-11-07

The first scoped canary ran on GitHub-hosted Actions, without using a NAS or owner's PC:

- [Actions run #42366723825](https://github.com/Hawkar-usls/iNaiHR/actions/runs/42366723825) / source commit `89b0bb4a85c48978000094df4d4d457129bdd1fe` — **SUCCESS**.
- Python policy tests: **10 passed**; Node UI/viewer tests: **13 passed**; model inference: **4 EN→UK public entries generated**.
- Source SHA-256: `e3e85a945c84b79807af5bb1f8eb8cc8155186abcde27f9881a191d1341d1ca8`.
- [UNREVIEWED candidate artifact #13572370575](https://github.com/Hawkar-usls/iNaiHR/actions/runs/42366723825/artifacts/13572370575), ZIP SHA-256 `0946365407eab5b14f782e455b7ce21a534d6a60d6f4428659d3514111b7682d`, expires 2026-11-14.
- JSON receipt: [public-i18n/evidence/github-canary-20261107.json](../public-i18n/evidence/github-canary-20261107.json).

A second controlled GitHub Actions canary tested EN→RU:

- [Actions run #42367056858](https://github.com/Hawkar-usls/iNaiHR/actions/runs/42367056858) / source commit `946639e6e434e1b2f8317251d8733fbef42ef1de` — **SUCCESS**.
- Python policy tests: **10 passed**; Node UI/viewer tests: **13 passed**; model inference: **4 EN→RU public entries generated**.
- Exact same source SHA-256: `e3e85a945c84b79807af5bb1f8eb8cc8155186abcde27f9881a191d1341d1ca8`.
- [UNREVIEWED Russian artifact #13571853099](https://github.com/Hawkar-usls/iNaiHR/actions/runs/42367056858/artifacts/13571853099), ZIP SHA-256 `54265de5b330410620e9a85f056cdcd733ff186ff6879065baa1cacd14b1e9ed`, expires 2026-11-14.
- JSON receipt: [public-i18n/evidence/github-canary-20261107-ru.json](../public-i18n/evidence/github-canary-20261107-ru.json).

**Both model directions have now executed successfully on GitHub-hosted CPU runners**, without proving translation accuracy, human approval, or site deployment. Both temporary title-edit canary triggers were removed afterward; the heavy translation job is once again restricted to `workflow_dispatch`.

## Explicitly not claimed

- No live machine translation of any page, user input or graph; no server accepting arbitrary translations.
- No independent proof of model quality, medical/scientific accuracy or bidirectional translation.
- No promise of zero network use: dependency/model downloads and same-origin Pages JSON requests are network traffic.
- No privacy guarantee for content somebody manually inserts into a public GitHub PR: only **PUBLIC_ONLY** catalog entries are permitted.
- No SEO/hreflang or indexable multi-language routes until a separate reviewed static-site generation stage.
- No new JANUS autonomy, science, market/witness or deployment authority.
- No guarantee of free/unlimited GitHub Actions quota or model-running success.

**Fail-closed:** missing translations, missing cryptographic support, bad output, incorrect source digest, absent human review, and outdated models do **not** become public translated content.
