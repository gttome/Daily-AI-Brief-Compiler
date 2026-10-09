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
| analytics.mjs | READER_PURE | allow |
| constants.mjs | READER_PURE | allow; environment value parameterized after snapshot |
| util.mjs | READER_PURE | allow |
| quality.mjs | READER_PURE | allow |
| edition-feed.mjs | READER_PURE | allow; environment value parameterized after snapshot |
| historical.mjs | READER_PURE | allow |
| trends.mjs | READER_PURE | allow |
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

## Browser dependency closure

The canonical layout loads the production CSS and browser scripts for header, reader release, share, archive, feedback, Watchlist, subscriptions, analytics/audience, calendar/RSS, and comments. Their local imports are included in the allowlist. No production workflow or execution-state API is part of the browser closure.

## Enforcement

`tests/reader-vendor-architecture-firewall.test.mjs` rejects a vendored path/source that is not allowlisted, matches a denylisted control-plane path, imports denied modules, references production execution records, or requires production-repository mutation/runtime fetches.
