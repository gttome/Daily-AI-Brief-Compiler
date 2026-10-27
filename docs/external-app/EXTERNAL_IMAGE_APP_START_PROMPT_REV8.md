# External Image App — Recurring Starter (Revision 8)

**Before generation: read [Image worker ownership](IMAGE_WORKER_OWNERSHIP.md).** From the October 20 edition onward, the scheduled worker and every recovery session must atomically claim the single `image-package/YYYY-MM-DD-native-primary` branch and persist/read back its owner receipt before the first image call. A status check is read-only; missing artifacts alone do not authorize another producer. Reuse the existing Work conversation and actual GitHub/native-image tools; no new task or mode-attestation gate.

**Future-only recurring scope.** Use ONLY if protected main selects `recurring_work_v8:rev8`, standing authority is valid, and the actual execution has callable native Image Creation, PNG export, saved-pixel inspection and connected GitHub binary write/readback. **No chat type or host/scheduler invocation identity checks are allowed.** Current historical Revision 7 work remains unchanged.

## Native static-illustration eligibility — required operational clarification

Read [Static editorial image admission](STATIC_EDITORIAL_IMAGE_ADMISSION.md) before deciding whether to generate. The requested deliverable is six **static factual editorial images**, with source-grounded explanatory labels, not precise CAD/engineering drawings, editable diagram source, quantified data or executable components. Factual diagrams and exact short explanatory text do **not**, by themselves, prohibit native image creation. First classify the artifact correctly, then use a genuinely available permitted native image tool, inspect actual saved pixels and correct any false relationship, pseudotext or inaccurate label. Never assert source accuracy or success from the prompt alone. If the actual image tool refuses or lacks bytes, record that **observed** limitation precisely instead of inventing a blanket diagram ban. This clarification never overrides tool/platform restrictions, quality specifications or protected release gates.

## Assignment — Create the six premium images

**Create the six premium images for the exact NEW current-cycle edition only**, correct until the complete set passes, upload immutable accepted 1200 × 630 PNGs to GitHub, release through protected PR/CI/merge and verify all 24 actual desktop/mobile image contexts. Image creation is mandatory work, not an audit-only instruction.

First read `docs/external-app/Brief_Compiler_Image_App_GitHub_Prompt_REV8.md` (full Revision 8 contract), `EXTERNAL_APP_HANDOFF_REV8.md` (Revision 8 handoff), `docs/external-app/Brief_Compiler_Image_App_GitHub_Prompt_REV7.md`, `docs/external-app/Perfect_Image_Specification.md` and `docs/external-app/Image_Variation_After_Action.md`. Revision 7 quality and protected release safeguards remain in force unless the future-only recurring source-selection/authorization rule explicitly supersedes them.

## October 26 image AAR corrective preflight — effective October 27

The existing source-frozen quality preflight already requires explanatory labels, allowed causal edges, safe margins, 12 meaningful components and real saved-pixel review. **Do not rebuild or relax it.** October 26 still required 16 true native image attempts to accept six images. For the **next and future** original six-source images only, populate the additional fields in `pre_generation_checks` before the first native call:

- `source_caveat_detached:true`: put source limitations in a physically separate note, never as an input or output of a process arrow.
- `no_simulated_document_strokes:true` and `no_unsupported_chart_or_score_marks:true`: prohibit faux writing, fake chart bars and simulated ranked scores anywhere, not just in headings.
- `mechanism_canvas_percent` between 55 and 85 and `explanatory_substage_labels` containing at least two **distinct existing approved labels**: reserve meaningful visual room for internal mechanism detail, not decorative gears, shields or empty boxes.
- Specify export-effective font sizes at **at least 26px for every secondary label**, and **at least 32px for the existing 2–3 priority labels** at the actual final 1200×630 resolution.

The existing `scripts/preflight-image-firstpass.mjs` now enforces these typed future-only preparations. A syntactically passing plan is not pixel evidence: inspect the actual saved final-size pixels, check arrow origins/destinations, exact label bytes, mobile rendering and causal qualifications, then reject/correct until all six pass. Accepted original PNGs remain immutable; no extra AI worker or paid APIs.

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


## October 23 approved first-pass and invocation improvements — October 24+ image jobs

Read [October 23 implementation contract](../automation/OCT23_APPROVED_IMPROVEMENTS.md) before generation. After claiming the existing image worker and immutable eligible six-story job, perform `scripts/preflight-image-app-route.mjs` with actual same-invocation capability evidence before the first image call; save the genuine receipt, and record a task origin only if actually observed. If no first-party scheduler invocation ID is available, state **UNPROVEN**, not an assumed Work/ChatGPT host identity. For each new frozen specification supply the 1200×630 native export plan, ≥22px effective required-label layout with 40px safe-area bounding boxes, and source-claim-bound connector origins and blocked paths; run `scripts/preflight-image-firstpass.mjs` on all six before native creation. Do not fabricate preview success: actual pixel inspection still follows native export. Correct only defects, preserve passing components, never regenerate accepted PNGs and never stop at an efficiency target. Keep the existing 21:15 America/Chicago image task and all protected/public verification gates. No added paid services or schedules.

## October 24 owner-approved forward-only hardening (Oct25+)

Read [the deduplicated October 24 improvement contract](../automation/OCT24_APPROVED_DEDUP_IMPROVEMENTS.md). Do **not** redo existing protections or regenerate accepted published images. For each Oct25+ pre-generation frozen spec, name **two or three existing source-approved explanatory labels** under `pre_generation_checks.thumbnail_priority_labels` and plan these labels at **>=30 px effective size** in the original 1200x630 image (remaining labels retain >=22px and the 40px safe zone). Review the source-supported origin/destination of every causal connector; visually separate training versus use-time, evidence versus model output, and conditional versus guaranteed results. Reject invented dashboards, success trophies, speculative quantitative charts, pseudo-writing, unapproved glyphs and person-like decorative shapes. Actual saved-pixel and all 24 desktop/mobile reviews—not the preflight text—determine final acceptance. Always preserve published PNG bytes and the existing schedule, PR/CI and zero-paid-service constraints.


## October 27 image AAR: first-pass spatial correction (for Oct28+ editions only)

The October 27 image run used 24 actual native attempts to accept six images; none passed on the first attempt. The existing source-bound causal, 40px margins, 26px/32px text-size, immutable accepted PNG, and actual saved-pixel review safeguards remain mandatory and unchanged.

For Oct28+ jobs, before the FIRST native generation, reserve separate bounding rectangles for every required explanatory label on the actual 1200x630 canvas. Planned explanatory label rectangles must NOT intersect one another. The future-only image first-pass preflight rejects intersections; it is a planning check, not a substitute for actual exported 1200x630 pixel inspection.

After each real export, check origin and destination of each supported causal connector, positive and blocked paths, absence of simulated writing or unsupported quantitative marks, and final-size readable explanatory labels. Correct rejected regions until passing; preserve genuinely passing components. Never regenerate locked accepted PNG bytes solely to repair transport, GitHub validation, release, or reporting.
