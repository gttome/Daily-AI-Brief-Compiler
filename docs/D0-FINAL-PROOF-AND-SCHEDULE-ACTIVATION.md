# D0 Final Proof and Schedule Activation

This file closes the remaining implementation work that does not depend on the missing live P0-A product primitive.

## P0-E

P0-E is a strict first-attempt stress proof. Use at least two valid P0-A-isolated candidates that naturally invite text/branding, such as a terminal/device workflow and an app/workflow/screen/evidence artifact. Each must pass on attempt 1 with:

- exact visible-text allowlist only;
- every required label observed;
- zero missing labels;
- zero extra visible text;
- no logos or branding;
- benchmark-grade exact persisted-asset review;
- zero prohibited dependency use.

Validate with `node scripts/verify-d0-p0e.mjs <p0-e.json>`.

## P0-F

P0-F is the six-story full D0 rehearsal. It requires:

- six distinct story IDs;
- six distinct fresh context IDs;
- six exact raw byte streams;
- six exact final byte streams;
- deterministic 1200×630 normalization;
- six Visual Review v3 PASS results;
- Set Review v3 PASS;
- six unique compositions;
- at least four layouts, grammars and hierarchies;
- at least three annotation patterns;
- no labels-swapped template;
- zero Proposal 1R reader fallback;
- zero prohibited dependency use.

Validate with `node scripts/verify-d0-p0f.mjs <p0-f.json>`.

## Schedule transition

The original post-activation-only prompts are retained in `contracts/d0-active-schedule-prompts.json` for provenance, but they are superseded by `contracts/d0-transition-schedule-prompts.json`.

The four existing Compiler schedules have already been synchronized to the transition prompts. No new schedule was created.

The transition is driven only by protected-main contract state:

1. While `contracts/image-contract.json` is `proof_required`, the schedules preserve the existing deterministic Proposal 1R reader-image path and do **not** attempt D0 native generation.
2. After P0-A through P0-F formal receipts all validate PASS, the activation applicator writes the exact `daily-compiler-d0-activation-v1` receipt and active image contract.
3. Protected CI and merge place `activation_status=active` plus the exact activation-receipt digest on main.
4. On the next ordinary schedule invocation, the same four schedules automatically require that receipt and use D0 Native Image Capsules for reader-story images. Proposal 1R remains available only for internal fixtures/diagrams, never as an active-D0 reader-story fallback.

This removes a separate owner configuration step at activation while preserving fail-closed pre-activation behavior.

## Bounded autonomous completion

`Daily Compiler Recovery 3` has a second role only when no nonterminal Compiler edition exists. It may:

- perform a bounded P0-A capability recheck without spending an image to discover infrastructure;
- resume the existing `rehearsal/d0-fused-live-proof-r1` only after a zero-cost route is READY;
- promote P0-A, formal P0-D, P0-E and P0-F from the same six-image rehearsal with zero additional promotion generations;
- apply activation through the protected PR/CI path;
- after activation, resume the preserved October 7 same-execution image-only migration without redoing semantics or allocating a second execution.

The exact live schedule text and synchronization receipt are in `contracts/d0-transition-schedule-prompts.json` and `contracts/d0-transition-schedule-sync.json`.

No Work, Codex, paid model/image API or service, billable overage, new paid infrastructure, alternate account, owner image transfer or owner-liveness path is introduced.
