# Iteration 7 integrated Value release qualification

This is development evidence for the October 9 release decision. It does not
allocate an edition, activate D1, arm a task, deploy a reader, or become a new
runtime authority. Existing mandatory product validators remain authoritative.

## Why this change is needed

The completed component iterations do not by themselves identify an integrated
release. A historical code check, an unchanged schema-version string, an enabled
recurrence, or the one-image transport result cannot establish current six-image
quality, protected activation, unattended execution, or isolated live delivery.

The current baseline is protected main
`819956876c8f520d8a5d8ddbdb89c6e7225c02dc`. Iterations 1, 3, 4, 5 and 6 have
completed their bounded implementation exits. Iteration 2 has protected code
proof with its external premium-lane exit still blocked. The retained records
are reconciled in `predecessors.json`; their work is reused.

## Bounded implementation

`operations/value-release.mjs` supplies offline version-inventory, evidence
comparison and release-audit helpers. It reads the existing activation and
source-snapshot validators. It is not imported by the producer, compiler,
image executor, correction runtime, or observation code.

`scripts/audit-value-release.mjs` independently checks the clean Git checkout and
rejects a supplied engine SHA that differs from it. A materialized source
directory without Git remains `SOURCE_DIGESTS_ONLY`. Its successful exit means
that the report was produced. It does not
mean `CORE_RELEASE_READY = PASS`, and a running CI job cannot report its own
completed protected check. The later completion receipt records actual GitHub
check conclusions and immutable artifact references.

```sh
node scripts/audit-value-release.mjs \
  --root . \
  --engine-sha <actual-checkout-sha> \
  --schedule docs/implementation/oct9-value-and-improvement/iteration-07/scheduler-readback.json \
  --out build/value-release/qualification.json
```

The existing `validate` workflow runs the targeted audit tests before the full
suite, then retains the version audit and existing compile, verification, built
reader, and parity receipts. Node 20 and `sharp@0.34.4` are unchanged. The
existing Jekyll build remains a local CI build and performs no deployment.

## Evidence boundaries

- File content digests and the exact engine SHA identify the evaluated code,
  contracts and source snapshot. A new engine or changed bound content cannot
  inherit the old freeze/qualification result.
- `validateD1Activation` reopens its retained current qualification evidence. A
  copied `PASS` flag or one-image receipt cannot satisfy it. Explicit protected
  activation authorization is a separate external requirement.
- The actual source snapshot retains all 204 memberships and 169 resources.
  Fifteen resources are qualified for metadata discovery; 154 remain unresolved.
  No video route is currently qualified. Neither a valid snapshot nor catalog
  membership proves eligible selected media for the future edition.
- The actual scheduler readback confirms daily 19:15 America/Chicago. Its
  `next_run_time` is null. That unknown remains distinct from the intended
  `2026-10-09T00:15:00Z` instant. The image task remains paused with no eligible
  target. No schedule or prompt was changed.
- The configured primary prompt still reads moving protected main and permits
  its existing legacy strategy before D1 activation. It has not been bound to an
  immutable qualified premium release by this implementation.
- Optional observation and learning outputs are independent: `OFF` and
  `UNAVAILABLE` cannot cause a core failure or hide a genuine product failure.

## Current external resume boundary

The latest R3 proof remains at
`e1efd7fa2b76df315671b442862edee9aab2bfbd`, with four genuine quality attempts,
zero accepted images, and `STORY_1_QUALITY_ATTEMPTS_EXHAUSTED`. No eligible
continuation, fifth attempt, renamed replacement, or new executor is authorized
by this audit. Preserve the existing lineage and all accepted historical assets.

`external-gates.json` retains the exact proof paths and required evidence.
Complete compatible six-image proof and the explicit protected activation grant
must exist before activation can be applied. The existing task's current prompt,
availability and complete runtime/resume evidence establish pre-run readiness
capability. A proven, available task may remain idle before future edition
allocation; an armed qualification task must identify its already-approved
proof target. Neither case requires an October 9 handoff before content exists.
Actual task readback remains separate from computing a handoff.

The old `fixture-pages-proof.yml` deploys a fixture at the current reader root.
It was not dispatched. An approved isolated current preview surface and actual
route/byte verification remain unproved. No live fixture overwrites the reader.

## Freeze and rollback

The requested Central time targets remain October 8 at 17:15 for readiness,
18:15 for core/shared-hook freeze, and 19:15 for execution of the October 9
edition. They are targets, not completed events. `freeze-and-rollback.json`
records `NOT_FROZEN` while mandatory gates remain unresolved.

No compatible fully qualified premium rollback release has been established;
its SHA remains null. The code baseline is preserved for development recovery,
but cannot substitute for a current premium release. Any explicitly authorized
critical change after a later actual freeze invalidates old readiness and
requires affected tests and proofs for the changed candidate.

## No rework and separation

This change does not modify production content, accepted image bytes, terminal
edition state, source qualifications, active contracts, existing task bindings,
protection, or the legacy repository. It adds no generation, paid service,
controller, Supervisor, Watchdog, lease, runtime-repair loop, or dashboard
dependency. Stretch Iterations 8–13 are outside this change and cannot block a
valid Brief.

Actual commands, candidate/merge SHAs, CI results, preservation comparisons and
remaining gates are recorded in the completed handoff only after observation.
