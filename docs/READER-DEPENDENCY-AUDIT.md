# Reader dependency audit — production baseline 912248e5

## Scope

Entrypoints: `_generator/lib/render.mjs`, `_generator/lib/reader.mjs`, and `_layouts/default.html`.

The Compiler may reuse only reader-product dependencies. It must not inherit the production orchestration architecture.

## Dependency classification

| Dependency | Class | Decision |
|---|---|---|
| render.mjs | READER_PURE | allow |
| reader.mjs | READER_PURE | allow |
| reading-support.mjs | READER_PURE | allow |
| book-reading.mjs | READER_PURE | allow with runtime-copy patch described below |
| watchlist.mjs | READER_PURE | allow |
| analytics.mjs | OPTIONAL_OBSERVATION | preserve in immutable baseline; exclude from Compiler runtime copy |
| constants.mjs | READER_PURE | allow; environment value parameterized after snapshot |
| util.mjs | READER_PURE | allow |
| quality.mjs | OPTIONAL_OBSERVATION | preserve in immutable baseline; exclude from Compiler runtime copy |
| edition-feed.mjs | READER_PURE | allow; environment value parameterized after snapshot |
| historical.mjs | READER_PURE | allow |
| trends.mjs | READER_PURE | allow with optional editorial-feedback projection omitted from runtime copy |
| podcasts.mjs | READER_PURE | allow |
| article-freshness.mjs | READER_PURE | allow |
| book-selection.mjs | EDITORIAL_RESEARCH | **deny** |
| production page/history data | READER_DATA | allow |
| production reader CSS/JS/layout/include | READER_BROWSER | allow |
| Supervisor/Watchdog/lease/recovery/task-state modules | CONTROL_PLANE | **deny** |
| production workflows and operational records | CONTROL_PLANE | **deny** |

### book-reading dependency cut

The production reader renderer imports `book-selection.mjs` only to re-run a semantic mapping validation path. That module is editorial research/selection logic and is outside the reader product. The vendored snapshot therefore preserves the canonical `book-reading.mjs` source hash for provenance, while the Compiler materializes a runtime copy that removes the `book-selection.mjs` import and semantic reselection check. Reader markup/rendering exports remain production-derived and unchanged.

This prevents reader reuse from causing semantic rework and preserves the existing October 7 book decisions.

### Optional analytics and QA projection cut

Iteration 6 found that the imported `generatedFiles` function also produced an optional reader-analytics observation and a 30-day operational QA dashboard. Its analytics record used the current clock, and both projections introduced module/data dependencies unrelated to reader-content validity.

`compiler/reader-core-projection.mjs` checks the exact imported `render.mjs` and `trends.mjs` source hashes and removes only the two optional renderer imports, the exact optional renderer output block, and the optional editorial-feedback read/output from the materialized copies. The immutable vendored sources stay unchanged. The copies exclude `_generator/lib/analytics.mjs`, `_generator/lib/quality.mjs`, `_records/analytics/`, `_records/editorial-feedback/`, `_records/qa/`, `data/qa/`, and `qa/`. New Compiler builds therefore do not create those optional observation/dashboard outputs or read their potentially missing, malformed or stale input records. Reader Trend Radar remains based on the same story evidence and renders unchanged.

The golden reader-parity check uses the same isolated product projection and compares its required story/media output against the original immutable expected page bytes. Missing or malformed optional observations cannot prevent the core parity check from running. Renderer source drift and any actual reader-page mismatch still fail.

The dated/latest/home reader, permanent story and media routes, source links, Watchlist, book connections, accessibility, and browser ratings/share/comments remain in the product path. Browser analytics and audience scripts are separate reader assets and remain preserved. Actual compile, image/media, route, hash and live-verification gates remain mandatory. A future renderer-baseline change requires review of this exact projection cut; optional observer failure cannot trigger that change or bypass any product gate.

### Terminal finalization and exact retries

`scripts/finalize-shadow-state.mjs` has no observer imports, reads, acknowledgements or deferred callbacks. It validates the actual bundle, current image/media evidence and accepted asset bytes again, then requires complete source, built, live and history receipts. Receipt schemas, edition/bundle/manifest/renderer identities, all required route hashes, the six canonical image identities, reader feature checks, feedback persistence probes and historical/current-reader preservation must pass. `compiler/finalization-evidence.mjs` and `compiler/release-evidence.mjs` provide the same mandatory evidence checks to base-run and separate correction finalization. Existing optional intelligence can consume the persisted records independently through its existing command.

The first completion writes the five exact mandatory receipts and `compiler/finalization-receipt.json`, then advances the base state once. The additional receipt binds the original input state SHA, resulting terminal state SHA, bundle, reader manifest, renderer, URL and original receipt hashes. An exact retry of the same build requires those original bytes, rechecks current product integrity and returns without a new timestamp or write. A separately compiled reader rebuild bound to the unchanged terminal state can have new manifest/renderer evidence; it also leaves the first state and receipts untouched. Historical terminal records without this new receipt are never backfilled: they can be independently recompiled and reverified against their actual terminal-state SHA. Additive corrections use their separate revision record and cannot be passed to the base-run finalizer.

## Browser dependency closure

The canonical layout loads the production CSS and browser scripts for header, reader release, share, archive, feedback, Watchlist, subscriptions, analytics/audience, calendar/RSS, and comments. Their local imports are included in the allowlist. No production workflow or execution-state API is part of the browser closure.

## Enforcement

`tests/reader-vendor-architecture-firewall.test.mjs` rejects a vendored path/source that is not allowlisted, matches a denylisted control-plane path, imports denied modules, references production execution records, or requires production-repository mutation/runtime fetches.
