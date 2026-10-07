# Production reader snapshot import

This development-only importer copies the reader allowlist from the pinned production baseline into `vendor/production-reader/snapshot/`.

It intentionally copies public reader history, public reader data, layouts, reader assets, rendering modules, and the four canonical reader tests. It does **not** copy production workflows, execution records, Supervisor/Watchdog/lease/recovery code, or other control-plane files.

The sole source patch removes the static `book-selection.mjs` dependency from the materialized `book-reading.mjs` copy. That dependency is editorial selection logic, not reader presentation. The patch preserves rendering exports and is recorded with source/vendored SHA-256 values in `PROVENANCE.json`.

The import workflow exists only on the PR2 implementation branch to create the immutable compatibility snapshot and is removed before merge.
