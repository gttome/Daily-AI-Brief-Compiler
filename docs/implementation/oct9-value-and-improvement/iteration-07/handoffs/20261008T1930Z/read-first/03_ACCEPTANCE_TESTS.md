# Iteration 7 — Acceptance and regression tests

**Status: test designs only; NOT RUN in this planning package.** A future implementation must adapt them to the current repository test runner and preserve existing fixtures.

| Test ID | Input / condition | Required result |
|---|---|---|
| `I07-T01` | Exact integrated candidate versus prior component proof versions | All reused proofs demonstrably compatible; changed contracts invalidate affected proofs. |
| `I07-T02` | Observer and learning infrastructure entirely off | Required product and release checks still PASS; B outputs not dependencies. |
| `I07-T03` | Image capability/activation/arming evidence missing | CORE_RELEASE_READY FAIL or precise pending gate; no fallback or fabricated approval. |
| `I07-T04` | Full source map but some new routes unresolved | Honest SOURCE_ROLLOUT PARTIAL; core may pass only with sufficient approved qualified discovery. |
| `I07-T05` | Owner target 2026-10-08 19:15 America/Chicago | Recorded UTC instant 2026-10-09T00:15:00Z; no accidental extra-day shift. |
| `I07-T06` | Isolated build/live verification with accepted fixtures | Correct routes/bytes, no modification of current public edition or legacy repository. |
| `I07-T07` | Freeze followed by a critical code/contract change | Readiness rebound and retested; previous receipt cannot certify new head. |

## Evidence to record

For each test retain the actual command/workflow, candidate SHA, PASS/FAIL/NOT_RUN, artifact or check URL and any limitation. Run targeted tests before the full applicable suite and exact-head CI. Use the existing pinned toolchain; a local PASS does not replace a required protected check.

## Cross-cutting assertions

No legacy repository mutation; no terminal-run reopening; no accepted image re-generation; no hidden attempt reset; no public private-data exposure; no observer control over production. A core defect must still fail even when optional telemetry errors are caught.

## Iteration exit

CORE_RELEASE_READY = PASS only when all mandatory product and authorized execution evidence passes. Source partial status stays visible. Iterations 8–13 are never required.
