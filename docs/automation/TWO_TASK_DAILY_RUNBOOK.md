# Daily AI Brief Compiler — Two Primary Tasks Operating Runbook

**Status:** implementation contract, not a scheduled-runtime qualification receipt. **Timezone:** America/Chicago. **Owner:** gttome. **Repository boundary:** `gttome/Daily-AI-Brief-Compiler` only; never modify `gttome/Daily-AI-Brief`.

## 1. The only production schedules

| Lane | Saved task ID | Local recurrence | Actual required runtime |
| --- | --- | --- | --- |
| Compiler Primary | `6ac9868490b88191ac91f84d5f555994` | Every day 19:15 | Ordinary Scheduled ChatGPT **with connected GitHub read/write/readback**; no Work, Codex, paid API |
| Premium Images | `6acac88cff048191ba02e5b2bcb3becb` | Every day 21:15 | Scheduled **Work**, native Image Creation, saved-pixel inspection, exact PNG export, connected GitHub, protected release |
| Evidence reconciler | `.github/workflows/daily-operations-report.yml` | One deterministic workflow with Chicago morning time guard | GitHub Actions only, no model, image generation, publisher, or schedule changes |

There are no scheduled AI recovery tasks, Supervisors, Watchdogs or repair agents. A paused or unavailable image task is an **activation blocker**, not permission to run images in ordinary ChatGPT. Saved prompt text, task title, an interactive success or this implementation session cannot prove the actual scheduled runtime.

## 2. Date and source selection

Resolve the intended *scheduled evening*, not the current clock after a delayed execution. `cycle_date` is the Chicago date of the scheduled evening; `edition_date` is **the next Chicago calendar date**, even when an invocation runs past midnight or across a DST change. Oct 11 evening must target **Oct 12**; Oct 12 evening must target **Oct 13**. Where the actual scheduled trigger/date cannot be established, classify identity as `UNKNOWN` and fail closed before mutation.

At the start of each Compiler cycle, read live protected main, live same-date shadow branch and publication facts. A terminal, verified *same edition* is a no-op. Resume an honestly progressing *same date* execution only when it is safe; never take over another active writer. Otherwise start one new date-scoped edition. Do not use a previous cycle's active pointer, failed job, branch, PR, quota counter or missing AAR as a new-cycle gate. Do not delete historical state or invent fresh Work account-level quota.

At 21:15 image invocation, calculate the **same date binding**, and select the image index entry for the exact `edition_date` only. Cross-check index row, immutable job bytes/digest, original bundle/commit and six unique stories. If missing: `WAITING_SOURCE`, no generations. If `RELEASED_VERIFIED`: verification-only no-op. Historical `PUBLISHED_PENDING` entries cannot be substituted. Separate task-specific same-invocation proofs of image Work/Image Creation/GitHub are mandatory.

## 3. Authorize a new recurring image assignment without weakening art quality

Owner standing scope is in `contracts/automation/recurring-image-authorization.json`; it starts with Oct 11 evening for Oct 12, excludes previous jobs, and **is not itself evidence of runtime capabilities**. After future activation, selected Revision 8 requires a job-bound `external-image-packages/<edition_date>/recurring-assignment.json` with exact original job, package and six accepted hashes plus cycle/task binding; the release gate never treats that assignment as independent first-party proof of Work.

Follow the existing complete Rev7 technical quality instructions, then the narrower recurring Rev8 overrides: six differentiated, factual 1200 × 630 PNGs with mandatory legible explanatory text, independently reviewed saved pixels, strict protected PR/CI/merge, no manual per-edition GO, exactly 12 story/image pairings, 24 **actually reviewed** desktop/mobile image-region contexts, and October 8 integrity. No weak fallback, no accepted-asset regeneration for transport defects.

## 4. Compiler publication remains independent of images

The Compiler must publish the verified six-story placeholder edition using the existing `bundle-ready-signal.yml` → `shadow-compile.yml` path, all reader and media contracts intact. Six text stories in 2/2/2 allocation and exactly one reusable Agent Skills story, two verified videos, two source-diverse podcasts, Watchlist and all four books remain mandatory. The Work image lane only replaces pending art on the *already published* edition. It must not block or roll back a good text release.

## 5. Mandatory AARs: two lanes plus one rollup

Each live task makes its best-effort dated AAR when it runs and commits source receipts where available. **The independent daily GitHub Actions reconciler is the coverage guarantee:** in a nonpublishing `operations-reports` branch, it materializes `daily/<cycle_date>/{compiler,images,daily-rollup}.{json,md}` even when one or both invocations leave no receipts. A missing receipt is `NO_START_RECEIPT`, **not** conclusive evidence that a host task never fired. Reconcile previous 14 cycles idempotently on recovered GitHub service.

Distinguish source observation from independently proven **scheduled** execution. A producer receipt with `scheduled_execution:false` remains false. Record `UNKNOWN` for unavailable host mode, Work usage, attempts, start/end and elapsed time. Publication `VERIFIED` requires actual protected/public evidence, not task enablement. No AAR is a precondition to the next evening's new edition. GitHub outages can delay report persistence, not justify fabricated reports.

## 6. Activation/rollback and observation

Keep `bounded_starter_v7:rev7` selected until Rev8 compatibility tests, standing authority, real natural **scheduled** image Work + Image Creation + GitHub binary round-trip and existing protected image-only release route are proven. Never enable an unqualified image schedule. Verify both saved task configurations separately by readback after changes. Protect main by PR and required CI; do not bypass any GitHub reviewer rule. No discretionary engineering during a 7–14-day observation period. Report actual missing runtime capabilities as **NO-GO**, not a promise to repair them automatically.

Narrow rollback is Rev8 selector → Rev7 and pause only Images; Compiler, public pages, old accepted PNGs and history remain intact. Disable only the reporter if reporting itself fails. No fallback to Work/Codex for Compiler or ordinary Chat for image generation.
