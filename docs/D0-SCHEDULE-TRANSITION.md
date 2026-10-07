# D0 schedule transition

Status: live synchronized on 2026-10-07.

The four existing Compiler schedules are now state-driven. No new schedule was added.

## Pre-activation behavior

While `contracts/image-contract.json` has `activation_status=proof_required`, the schedules preserve the current Compiler reader-image behavior:

- deterministic Proposal 1R story diagram specifications and rendering;
- exact persisted GitHub PNG review;
- accepted-image immutability;
- no D0 native image generation.

This prevents the D0 proof blocker from interrupting ordinary Compiler editions before activation.

## Post-activation behavior

Once protected main has `activation_status=active` and the exact digest-bound `daily-compiler-d0-activation-v1` PASS receipt, the same schedules switch automatically:

- reader-story images use D0 Native Image Capsules only;
- Proposal 1R is not a reader-story fallback;
- every new D0 generation requires a genuinely fresh story-only native ChatGPT context;
- exact bytes must be captured in the same invocation;
- raw Git persistence, deterministic 1200×630 normalization, exact persisted Visual Review v3, set review and atomic ACCEPTED_LOCKED remain mandatory.

Because routing is driven by protected-main contract state, there is no separate owner configuration step at activation.

## Bounded D0 completion lane

`Daily Compiler Recovery 3` has one additional role only when there is **no nonterminal Compiler edition**. It may continue the already implemented D0 proof/migration path without creating another schedule or control plane.

While D0 is still proof-required, it may perform a bounded current capability recheck against authoritative OpenAI product documentation and actually available tool surfaces. It must not spend a native image merely to discover whether infrastructure works. The fused rehearsal remains blocked until `contracts/d0-p0a-route-matrix.json` has at least one zero-cost READY route satisfying all seven P0-A capabilities.

When a route becomes READY, Recovery 3 resumes the existing `rehearsal/d0-fused-live-proof-r1` execution from its first incomplete operation. It reuses P0-B/P0-C and promotes P0-A, formal P0-D, P0-E and P0-F from the one six-image rehearsal with zero additional promotion generations.

After activation, and only when no current nonterminal edition competes for the schedule, it may resume the preserved October 7 same-execution image-only migration. It must preserve `daily-compiler-shadow-2026-10-07`, `semantic_rework=0`, all accepted images and the locked October 7 semantics.

## Live schedules

The synchronized schedules remain enabled with their existing cadences:

- Daily Compiler Primary — 19:15 America/Chicago.
- Daily Compiler Recovery 1 — 21:15 America/Chicago.
- Daily Compiler Recovery 2 — 01:15 America/Chicago.
- Daily Compiler Recovery 3 — 05:15 America/Chicago.

The exact synchronized prompt text is canonicalized in `contracts/d0-transition-schedule-prompts.json`.

No Work, Codex, paid AI/API/service, billable overage, new paid infrastructure, alternate account, owner image transfer or owner-liveness route is introduced.
