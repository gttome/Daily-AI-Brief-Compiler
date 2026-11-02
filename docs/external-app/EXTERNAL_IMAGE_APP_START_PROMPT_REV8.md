# External Image App — Recurring Starter (Revision 8)

## Current effective requirements

Read [Current image requirements](CURRENT_IMAGE_REQUIREMENTS.md) before freezing specifications or exporting any new image. It is the single active source for label sizes, safe geometry, source-bound composition planning and complete local exports. Its November 1 additions are prospective only. Older dated AAR documents explain history, not alternative current thresholds. Preserve every existing source, visual-review, authorization and release safeguard below.

**Before generation: read [Image worker ownership](IMAGE_WORKER_OWNERSHIP.md).** From the October 20 edition onward, the scheduled worker and every recovery session must atomically claim the single `image-package/YYYY-MM-DD-native-primary` branch and persist/read back its owner receipt before the first image call. A status check is read-only; missing artifacts alone do not authorize another producer. Reuse the existing Work conversation and actual GitHub/native-image tools; no new task or mode-attestation gate.

**Future-only recurring scope.** Use ONLY if protected main selects `recurring_work_v8:rev8`, standing authority is valid, and the actual execution has callable native Image Creation, PNG export, saved-pixel inspection and connected GitHub binary write/readback. **No chat type or host/scheduler invocation identity checks are allowed.** Current historical Revision 7 work remains unchanged.

## Native static-illustration eligibility — required operational clarification

Read [Static editorial image admission](STATIC_EDITORIAL_IMAGE_ADMISSION.md) before deciding whether to generate. The requested deliverable is six **static factual editorial images**, with source-grounded explanatory labels, not precise CAD/engineering drawings, editable diagram source, quantified data or executable components. Factual diagrams and exact short explanatory text do **not**, by themselves, prohibit native image creation. First classify the artifact correctly, then use a genuinely available permitted native image tool, inspect actual saved pixels and correct any false relationship, pseudotext or inaccurate label. Never assert source accuracy or success from the prompt alone. If the actual image tool refuses or lacks bytes, record that **observed** limitation precisely instead of inventing a blanket diagram ban. This clarification never overrides tool/platform restrictions, quality specifications or protected release gates.

## Assignment — Create the six premium images

**Create the six premium images for the exact NEW current-cycle edition only**, correct until the complete set passes, upload immutable accepted 1200 × 630 PNGs to GitHub, release through protected PR/CI/merge and verify all 24 actual desktop/mobile image contexts. Image creation is mandatory work, not an audit-only instruction.

First read `docs/external-app/Brief_Compiler_Image_App_GitHub_Prompt_REV8.md` (full Revision 8 contract), `EXTERNAL_APP_HANDOFF_REV8.md` (Revision 8 handoff), `docs/external-app/Brief_Compiler_Image_App_GitHub_Prompt_REV7.md`, `docs/external-app/Perfect_Image_Specification.md` and `docs/external-app/Image_Variation_After_Action.md`. Revision 7 quality and protected release safeguards remain in force unless the future-only recurring source-selection/authorization rule explicitly supersedes them.

**Transport/pre-PR reuse of proven recovery:** For connected GitHub PNG readback use `fetch_file` **with `encoding:"base64"` at the exact immutable commit**, decode bytes, and compare SHA-256, Git blob identity, length and PNG structure. Never try to UTF-8 decode binary PNG through `fetch_blob`. Before invoking the existing `preflight-recurring-image-package.mjs`, fetch current `origin/main`, `origin/shadow-pages-history` and the exact `origin/shadow/YYYY-MM-DD` source ref, and obtain complete ancestry if the checkout is shallow. Confirm them with `git rev-parse` and `git merge-base --is-ancestor` before claiming `PRE_PR_PACKAGE_PASS`. Do not alter accepted hashes or open a second package PR for an infrastructure failure.

## Exact new job selection

Bind `cycle_date` to the real America/Chicago evening of this production cycle; 21:15 targets the **next local calendar date**, regardless of chat/runtime labels. Select only `shadow-pages-history/site/image-jobs/index.json` entry for that exact edition. Do NOT use `latest_eligible_date` or resume older `PUBLISHED_PENDING` jobs. If absent: `WAITING_SOURCE` with no generation. If `RELEASED_VERIFIED`: no generation or repeat replacement. An old job is historical, not a retry queue.

## Authorized continuing assignment

Owner standing image authority is `contracts/automation/recurring-image-authorization.json`. There is **no additional daily manual approval**. After actual native generation, RGB/RGBA export, saved-pixel reviews and immutable GitHub binary readback, persist `external-image-packages/YYYY-MM-DD/recurring-assignment.json` with exact cycle/task, job/manifest/source hashes, six accepted hashes and `image_execution_evidence` (actual generations, RGB/RGBA PNG export, hash readback, six actual saved pixel PASS, original manifest SHA-256). Do not require or invent chat type, Work label, C2/C3 or a scheduler invocation identifier. If real image or GitHub capabilities are unavailable, report `BLOCKED_INCOMPLETE` without claiming success. This does not waive any GitHub-required human PR approval.

**Before the first image-package PR:** persist six accepted original PNGs, canonical manifest, recurring assignment and actual individual review JSON files under `external-image-packages/YYYY-MM-DD/reviews/` on one `image-package/YYYY-MM-DD-*` candidate branch. Push the complete six-image package with its exact committed binary readback, then open the single protected image PR. As of October 24, incomplete image-package pushes **do not trigger full CI**. The existing `compiler-validation` **pull-request** job performs the same `scripts/preflight-recurring-image-package.mjs` Rev8 admission and must return `PRE_PR_PACKAGE_PASS` on the exact PR head before any protected merge. Do not wait for a removed package-push CI check. Local preflight is useful when available, but never substitute a claim for the required PR CI. Fail closed and correct the package/transport, never regenerate accepted art to fix Git. For PNGs over 750 KiB use the fixed 256-KiB offset scheme and `scripts/reassemble-fixed-offset-image.mjs` to verify exact bytes/hash/blob before committing.

Use exact binary GitHub readback, existing protected package-merge auto-release, October 8 17-object integrity and all source/image validation gates. Six source-bound advanced textbook diagrams, mandatory readable explanatory text, genuine image differentiation, correcting failed elements, preserving accepted PNGs, 12 page pairings and actual visual inspection of 24 contexts remain mandatory. A screenshot count alone is never PASS.

Write an honest best-effort Image AAR and readiness receipt even when blocked. The deterministic daily reporter backfills no-start or missing AAR outcomes independently. Never modify `gttome/Daily-AI-Brief`, schedule additional AI recoveries, require a routine owner login, substitute fake/palette-mode images or claim quota resets nightly. 


## October 20 owner-approved improvements — October 21 onward

Read and apply [the six approved production improvements](../automation/OCT20_APPROVED_IMPROVEMENTS.md). New editorial bundles require real chronology, nontechnical audience-fit evidence, video publisher variety and exact podcast episode links. New image packages require story-specific label/causal-state preflight plus canonical reviews/after-action.json and after-action.md. Preserve historical bundles and accepted PNGs. Complete actual 24-context visual QA and terminal closeout after release; never infer semantic PASS from screenshots or CI. Keep existing schedules and one worker per lane.


## October 21 owner-approved observed-timing rule — October 22+ images

Read [permanent AAR implementation](../automation/OCT21_AAR_IMPROVEMENTS.md) and scripts/image-aar-contract.mjs before starting any native generation. Capture an actual UTC first-invocation clock observation in production.host_execution_observed_at with host_execution_observation_source: executor_observed_in_same_invocation. Immediately before the first real native image tool call, capture the actual UTC generation_started_at with generation_start_source: executor_observed_before_first_native_call. Retain both exact observed instants in canonical reviews/after-action.json and its generated human report. Never infer from a 21:15 plan, Git author timestamp, worker lease or first saved PNG. If the clock cannot be genuinely observed, record that as missing and do not fabricate timestamps to pass package validation. All preexisting visual correctness, six-images, full-set and final 24 saved-pixel context gates remain strict; no rework of accepted assets and no new tasks or paid services.


## Capability preflight and current quality plan

After claiming the existing image worker and immutable eligible six-story job, perform `scripts/preflight-image-app-route.mjs` with actual same-invocation capability evidence before the first image call. Save the genuine receipt. Record origin only if observed; missing first-party scheduler identity remains **UNPROVEN** and never becomes a production gate. Run `scripts/preflight-image-firstpass.mjs` on all six specifications using [Current image requirements](CURRENT_IMAGE_REQUIREMENTS.md). A passing plan is not saved-pixel proof. Correct only rejected regions; preserve passing features and never stop at an efficiency target.

## Historical improvement references

The unchanged [October 23](../automation/OCT23_APPROVED_IMPROVEMENTS.md), [October 24](../automation/OCT24_APPROVED_DEDUP_IMPROVEMENTS.md), [October 28](../automation/OCT28_APPROVED_AAR_IMPLEMENTATION.md), [October 29](../automation/OCT29_APPROVED_AAR_IMPLEMENTATION.md), and [October 30](../automation/OCT30_APPROVED_AAR_IMPLEMENTATION.md) records explain prior changes. `docs/automation/OCT30_APPROVED_AAR_IMPLEMENTATION.md` includes ten actual rejected examples. Review relevant source-specific failures before new generation, but use CURRENT_IMAGE_REQUIREMENTS.md for current thresholds. Do not append competing dated quality rules or rework historical images.
