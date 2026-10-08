# Iteration 7 — Prove the integrated Value release and freeze for the October 9 edition

**Track:** VALUE · **Priority:** 7 of 13 · **Package status:** PLANNED — NOT STARTED

| Control | Requirement |
|---|---|
| Delivery classification | Deadline Value commitment |
| Existing plan packages | A-00/A-40 final integration and admission |
| Logical system groups | G01–G08 |
| Dependencies | Iteration 1, Iteration 2, Iteration 3, Iteration 4, Iteration 5, Iteration 6 |
| Planning effort | 45–90 minutes; reserve a separate one-hour contingency — estimate, not a promise |
| Timing objective | Target ready by October 8, 17:15 CT; freeze 18:15 CT; owner-requested run 19:15 CT. |
| Implementation chat | Standard ChatGPT with GitHub plugin |
| Writable repository | `gttome/Daily-AI-Brief-Compiler` only |
| Assessment issues | OCT8-01, OCT8-04, OCT8-07, OCT8-08, OCT8-09, OCT8-10, OCT8-13, OCT8-14 |

## Reader or system outcome

A single immutable protected release binds the actual product gates, source snapshot, existing image capability and intended run schedule. No Stretch output is required.

## Read first

Read `SHARED_RULES.md`, this plan, `02_IMPLEMENTATION_SPEC.md`, `03_ACCEPTANCE_TESTS.md`, `04_REPO_READ_MAP.md` and `SUPPORTING_DOCUMENTS/Relevant_Plan_Excerpts.md`. The full parent plan and owner note are included. Use the remaining reference files for the relevant specification/evidence; do not load unrelated story images into a generator context.

## Entry and evidence requirements

Resolve current main, relevant implementation/proof branches, open PRs and predecessor receipts. Do not assume the old head or blocker in the assessment is current. Each prerequisite needs actual release/proof evidence, not its presence in this ZIP. If already satisfied, verify compatibility and record ALREADY_SATISFIED instead of rebuilding.

## Implementation sequence

| Work item | Operation | Exact intent |
|---|---|---|
| 07.01 | Reconcile all Value results | Read actual Iteration 1–6 receipts and merged heads, not the packaged NOT_STARTED manifest. Reuse compatible passed evidence, identify remaining blockers and bind current source/quality/engine versions. |
| 07.02 | Verify image activation and approved executor | Full six-image proof must be current/compatible, activation explicitly authorized and applied, existing task bound and capability real. CODE_PASS, a one-image result or a scheduling intent cannot satisfy this gate. |
| 07.03 | Verify the owner’s calendar target | The October 9 edition begins Thursday October 8 at 19:15 America/Chicago, not Friday evening. Compare target with actual existing schedule/readback. Do not create another schedule or silently modify timing; report the exact existing-task change/readback needed if unavailable or mismatched. |
| 07.04 | Run combined deterministic qualification | Run full core tests, schema compatibility, source coverage/identity, media, image manifest, correction, reader parity and non-interference on the exact integrated candidate. Reuse accepted bytes; do not regenerate six images for dashboard or CI proof. |
| 07.05 | Use an isolated preview for final delivery checks | Build/deploy only to an approved non-production rehearsal surface when exposed, with route and exact-byte checks; do not overwrite the live reader with a fixture. If no isolated deploy exists, keep that gate unproved rather than improvising a target. |
| 07.06 | Freeze a versioned release | Record engine SHA, contract versions/digests, qualified registry snapshot, activation proof, test runs and rollback version. Freeze core/shared hooks at 18:15 CT. Any authorized critical fix after freeze invalidates readiness until the affected tests rerun. |
| 07.07 | Deliver independent release decisions | Emit CORE_RELEASE_READY PASS/FAIL, SOURCE_ROLLOUT COMPLETE/PARTIAL, and OBSERVATION_RELEASE OFF/LIVE/DEGRADED. Missing dashboard/learning does not fail core. Do not start the future edition now or change legacy production authority. |

## Required deliverables

1. Combined exact-head Value test receipt.
2. Engine/contract/registry/activation version manifest.
3. Actual target-schedule comparison/readback.
4. Isolated deployment/route/byte verification evidence where required.
5. Final CORE_RELEASE_READY, SOURCE_ROLLOUT and independent observer/learning states.
6. Freeze and rollback handoff for the existing scheduled run.

## Exit gate

**CORE_RELEASE_READY = PASS only when all mandatory product and authorized execution evidence passes. Source partial status stays visible. Iterations 8–13 are never required.**

Run the named acceptance tests from `03_ACCEPTANCE_TESTS.md`. Record exact candidate/check identities, merge result and actual live evidence where required. Do not synthesize a PASS receipt from planned work. This package contains test designs, not already-run tests or an implementation patch.

## Out of scope

No other repository mutation, new daily execution, reset of a terminal run, regeneration of accepted images, runtime code-repair mechanism, protected-main bypass, arbitrary schedule replacement or new paid dependency. No dashboard control authority. Scope-specific activation/deployment/privacy approval remains explicit. Do not implement later iterations in this chat.

## Risks and checkpoint rule

A late unresolved capability cannot be solved by a green checklist. Drop Stretch work immediately; preserve the real blocker and do not represent the deadline as guaranteed.

Persist a public-safe partial handoff on a genuine tool/platform/access blocker. Fix ordinary implementation errors inside this iteration and continue; do not stop at status. Do not repeatedly retry unchanged external failures. Preserve valid code, test results and evidence for the next invocation.

## Rollback

Use the last qualified compatible release only if it meets the same premium/media contract. Otherwise preserve work and fail closed. Never roll the public reader backwards or alter the legacy production system.

## Completion and next chat

Fill `06_COMPLETION_AND_HANDOFF_TEMPLATE.md` from actual results and persist through the repository’s existing documentation convention. The proposed receipt convention in SHARED_RULES is development documentation, not runtime orchestration. Next priority: **Iteration 8**; respect its own dependencies.

**Source basis:** parent implementation plan packages A-00/A-40 final integration and admission, quoted in supporting excerpts; owner improvements note; associated assessment/contracts/source directory where included. Estimates, iteration grouping and deadline gates are package planning choices.
