# Terminal evidence normalization — value-image-2026-10-08

The existing image runtime reached its authorized four-attempt limit for the first story, with zero accepted images. Its original terminal commit is `3bc8dde18d77c570f169ae70030e0c8e92866649`. This evidence update preserves that terminal outcome and all four rejected raw PNGs. It grants no permission to resume, rearm or generate a fifth image.

## Exact changes

The current attempt log maps the established `QUALITY_REJECTED` / `QUALITY_REJECTED_FINAL` results to the existing validator's `FAIL` label and records `native_generation_completed: true` and `quality_attempt_consumed: true` for each of the four actual generations. No observation, defect, timestamp, raw identity or context changes. Counts remain four and accepted locks remain zero.

The current state replaces its log digest with the normalized **canonical JSON SHA-256** and relocates the undeclared `runtime_progress` observation into [runtime-progress.json](runtime-progress.json). Its status, counts, last error, historical update timestamp and immutable request/source bindings remain intact.

The historical state and terminal event recorded an **exact UTF-8 byte SHA-256** for the old log. That byte hash is not a canonical JSON hash. [The local validation receipt](normalization-receipt.json) labels both methods explicitly. The original terminal event remains unchanged at its original path and is also retained here among the exact [original snapshots](originals/).

## Validation and publication boundaries

The one-off [helper](normalize-settled-evidence.mjs) checked all five observed source file identities, eight pinned runtime/contract files, the declared state schema and the existing runtime adapter. The actual state returns `EXIT_BLOCKED`. A separate, nonpersisted diagnostic projection exercises the accounting logic and returns `FAIL_ATTEMPT_LIMIT`; it grants no execution authority.

[Operator preflight](publication-preflight.json), [repository observations](prepublication-observations.json) and [actual task readback](terminal-task-readback.json) establish source provenance, unchanged protected/history refs, preserved raw Git blob/size identities and the disabled completed image task. No raw-image acceptance review or canonical six-image proof is asserted.

The helper receipt records local preparation before publication; its “not published” result describes that earlier phase. The actual subsequent commit is recorded by the operator's readback and updated release handoff. No document attempts to contain its own future commit SHA.

This correction is limited to evidence format. The qualification remains **BLOCKED**, image activation remains **NOT_APPLIED**, and the October 9 release remains **NOT_READY / NOT_FROZEN**. The protected initial qualification scaffold stays PLANNED on main; mutable runtime state is not merged over it.
