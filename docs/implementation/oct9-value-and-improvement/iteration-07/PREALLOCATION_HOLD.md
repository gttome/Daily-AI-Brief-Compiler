# Primary allocation hold while the release is unqualified

## Actual change

The existing primary task `6ac57b19b3508191944ce2e0dec1d57b` now has an explicit hold on new allocations. Its exact saved prompt is [primary-admission-hold-prompt.txt](primary-admission-hold-prompt.txt); [the actual before/after readback](primary-admission-hold-readback.json) records the verification. The prior prompt is retained in [primary-before-hold-prompt.txt](primary-before-hold-prompt.txt).

The update was requested as a **prompt-only** change. Actual readback at **2026-10-08T19:46:09Z** matched all 3,410 UTF-8 bytes of the requested prompt, SHA-256 `d4bfbb724a10e4597e0b58319ef25a8cfc16504a8a3b865c578c6bba8cb1ab46`. The task remains enabled on its existing daily **19:15 America/Chicago** recurrence. Its task identity, saved conversation, timezone and timing mode are unchanged.

The image task and all three recovery tasks retained their exact prompts, schedules, saved conversations and enabled states. Public evidence uses opaque conversation digests; private identifiers are excluded.

## Why this change is needed

The previous actual primary prompt instructed allocation from then-current main and selected `proposal1r_legacy` when D1 remained `proof_required`. That behavior conflicts with the existing Iteration 7 stop-before-allocation requirement when a qualified release engine and compatible activation proof are absent. A successful code check or the preserved isolated delivery for an earlier engine cannot promote a new engine.

The new prompt resolves the target date and first reads any existing execution as data. When no execution exists, it reports `RELEASE_ENGINE_NOT_PROMOTED` and exits before any repository mutation, branch, state, research, image request or bundle. It cannot invent an engine pin or use a preactivation fallback. Existing terminal executions remain terminal. Existing eligible nonterminal executions preserve their own engine, strategy, cutoff, locks and identity; D1-specific handoff instructions apply only to an already-bound D1 execution.

## Authority and limits

This bounded Iteration 7 continuation applies the pre-allocation boundary already described in [IMMUTABLE_ENGINE_HANDOFF.md](IMMUTABLE_ENGINE_HANDOFF.md) and the exact-resume handoff. It changes a prompt binding on the same task, not its cadence. The independently authorized image qualification continues with its existing task and binding; this update neither interrupts nor rearms it.

This is a temporary **unqualified allocation hold**, not qualified engine promotion, image activation, a new runtime, or an October 9 launch. No future `F`, freeze record, self-referential prompt hash or fabricated PASS is placed in the prompt. Historical transition contracts and readbacks are preserved.

## Finite promotion

Complete the actual current six-image proof and required interruption/resume evidence. Apply the existing conditional protected approval through the normal activation path, merge through protection, and verify the resulting engine `F` with its own completed CI and isolated delivery. Then replace the same primary prompt with the known exact `F` and its already-existing proof/approval/delivery references; independently update and read back the existing recovery bindings, preserving their cadences. Restore the image task's normal idle, disabled, unbound capability before new allocation. Retain actual readbacks as `P`, then protect freeze metadata `R` naming `F` and `P`.

Until that promotion is complete: **CORE_RELEASE_READY remains NOT_READY and the release is NOT_FROZEN.**

