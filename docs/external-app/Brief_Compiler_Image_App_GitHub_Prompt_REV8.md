# October 19, 2026 scheduler migration

For the October 20 edition onward, the sole image task is `6ad6310597b0819096a8d0f1b46bffc9` (**Daily Brief Images — Fresh Work**), configured in the actual scheduler as **New chat for every run**, daily at **21:15 America/Chicago**. It replaces `6acac88cff048191ba02e5b2bcb3becb`; pause the old task before enabling the replacement. The owner authorized this replacement after the autonomous GitHub/native-image test. Historical assignments and accepted PNGs retain their original task identity. No extra daily producer, chat-mode admission gate, quality relaxation or owner daily setup is introduced.

# Daily AI Brief — Complete Recurring Premium Image Production Contract

**Mandatory ownership, October 20 onward:** read [Image worker ownership](IMAGE_WORKER_OWNERSHIP.md). Claim the one canonical current-edition image branch and commit/read back the owner receipt before generation. Every scheduled/recovery worker follows the same claim and expected-head updates; losing the claim means yield without generating or creating an alternate suffix. Status checks do not allocate image workers. Existing quality, source and protected release gates remain unchanged.

**Revision 8 — October 10, 2026.**  
**Scope:** `gttome/Daily-AI-Brief-Compiler` only.  
**Starter:** `docs/external-app/EXTERNAL_IMAGE_APP_START_PROMPT_REV8.md`.  
**Handoff:** `EXTERNAL_APP_HANDOFF_REV8.md`.  
**Selected only by:** `recurring_work_v8:rev8`; historical Rev6/Rev7 remains readable.

## 1. Scope, precedence and preserved Revision 7 quality contract

**Create the six premium images** for the *exact new current-cycle job*. Read the entire `docs/external-app/Brief_Compiler_Image_App_GitHub_Prompt_REV7.md`, `docs/external-app/Perfect_Image_Specification.md`, `docs/external-app/Image_Variation_After_Action.md`, and `docs/D1-PRODUCTION-IMAGE-BENCHMARK-PROFILE.md`. Apply all original source-fidelity, illustration density, mandatory explanatory text, isolated story-only input, 1200 × 630 PNG export, saved-pixel inspection, image differentiation, evidence hashes, protected CI/PR/merge, protected image-only deployment, seven page routes, 12 image/story pairings, 24 real image-region reviews, mobile checks, and 17 October 8 object preservation requirements. Rev8 supersedes Rev7 **only** in recurring source selection, continuing owner authorization, and real image/GitHub provenance requirements; chat-type and scheduler-invocation IDs are not admission requirements. It is not a lower-quality pipeline.

## 2. Current-edition source and actual tool readiness (owner override Oct 11)

**Mandatory output classification:** Read `docs/external-app/STATIC_EDITORIAL_IMAGE_ADMISSION.md`. The requested output is a static editorial illustration/infographic, not an editable or numerically exact diagram source. Accuracy is mandatory, but technical content, short exact labels and conceptual causal geometry do not alone preclude native image generation. Use available permitted native image creation for the finished artwork; review and correct its **actual saved pixels** against the original source and allowlist. A real capability denial must identify what tool call or output property failed; do not stop before generation merely because the subject is factual. This does not authorize violating platform restrictions, inventing scientific facts or relaxing any visual, file or release check.

**All chat-type, Work/ordinary/Codex mode and first-party scheduled invocation ID checks are removed.** Do not block creation or release because a task is labeled ordinary ChatGPT, Work, Codex or anything else. Do not create proof branches, require C2/C3, claim host identity from a prompt, or demand scheduler mode attestation. Gate instead on actual callable native image generation, saved pixel inspection, exact RGB/RGBA 8-bit 1200 × 630 PNG export, same job-bound GitHub binary writes and immutable readback, and truthful reviews.

Resolve `cycle_date` from the known Chicago evening calendar date and `edition_date` as the next Chicago date. Oct 11 evening ⇒ Oct 12 edition; Oct 12 evening ⇒ Oct 13. Read the exact date's published image index, job bytes and SHA-256, source bundle and immutable commit. Never process older jobs. Missing current job ⇒ `WAITING_SOURCE` with zero generation; already released ⇒ verify-only no-op; conflicting writer ⇒ yield.

## 3. Future-only continuing authorization and artifact-backed assignment

Owner standing authority is in `contracts/automation/recurring-image-authorization.json`. No new daily manual GO and no fabricated owner artwork review. Persist `external-image-packages/YYYY-MM-DD/recurring-assignment.json` with:
- `schema_version = external-compiler-recurring-assignment-v8`
- `prompt_version = rev8`, `scope = image_only_postpublication`
- `task_id = 6ad6310597b0819096a8d0f1b46bffc9`, `cycle_date`, `edition_date`, `execution_id`
- `job_sha256`, `manifest_sha256`, `original_source_commit_sha`, `original_bundle_sha256`
- `image_execution_evidence = {actual_generation_count:<genuine integer >= 6>, exact_png_1200x630_export_observed:true, github_binary_sha256_readback_observed:true, original_manifest_sha256:<exact manifest SHA-256>, six_actual_saved_pixel_reviews_passed:true}`
- `accepted_images`: all six exact source-bound story-ID and accepted SHA-256 pairs; `owner_personal_artwork_review_claimed:false`.

Actual image outputs, pixel checks and connected GitHub evidence—not a runtime label or missing invocation ID—must establish these claims. Release code checks the assignment and six-image manifest, date/source integrity and actual accepted hashes. The strict `checkRealPng` enforces RGB/RGBA, 8-bit, 1200 × 630, full PNG integrity; palette PNGs remain forbidden. Never assert availability of an image tool or a successful readback unless the bytes were genuinely produced and verified. Required protected GitHub PR/CI/review, six live hashes, 12 story/page pairings, 24 actual desktop/mobile context reviews and 17 October 8 preserved objects remain mandatory.

## 4. Premium work and exact publication

For each of six full stories read original-source and full article evidence; freeze precise explanatory labels, causal edges, exclusions, and six genuinely different diagram grammars. Produce real, legible, high-density white/near-white educational PNGs with mandatory visible explanatory text, correct story mechanisms, no people/avatars/brands/logos/photos/pseudotext, no generic dashboards. Inspect saved 1200 × 630 pixels and correct failed parts until PASS; no arbitrary attempt cap. Never regenerate accepted images for GitHub, CI or network errors. Verify actual GitHub committed image bytes by exact commit readback, not a pasted claim.

**Mandatory pre-FIRST-image-PR admission (P0):** On one `image-package/YYYY-MM-DD-*` branch created from refreshed protected `main`, commit and push exactly six story-bound `images/*.png`, one `manifest.json`, one `recurring-assignment.json`, and all review/AAR evidence under `reviews/` (never a root AAR). Real saved-pixel reviews must have matching `reviews/<story-id>.json` receipts and canonical `persisted_git_binary` inspection method, hashes, source URLs and actual visual notes. Require the existing `compiler-validation` push check to produce `PRE_PR_PACKAGE_PASS` before opening the first image PR; the same test is rerun on PR head by existing CI. It reads only the *exact current Chicago cycle* history index/job and source bundle, diffs to protected main, checks current Pages head, runs Rev8 assignment admission, validates six actual committed RGB/RGBA 1200×630 PNGs including bounded 8-MiB Git blob readback, and independently fetches the immutable GitHub commit bytes for SHA-256/blob/length match. If the connected execution has a local Git checkout, run `node scripts/preflight-recurring-image-package.mjs YYYY-MM-DD .` using the evening **cycle date**, after refreshing `origin/main`, `origin/shadow-pages-history`, and `origin/shadow/<edition>`; otherwise the pushed branch CI performs that same code. Do not claim a structural receipt PASS substitutes for subjective pixel inspection. For accepted PNGs over 750 KiB, transfer 256-KiB fixed-offset base64 segments, then use `scripts/reassemble-fixed-offset-image.mjs` for exact bytes/length/SHA-256/Git blob and PNG reconstruction; any missing/changed segment fails. Never open a PR while this gate fails, never substitute an older job, and never regenerate accepted art to repair transport.

Create a single current-edition protected package PR; keep main protection and exact-head validation. The existing `.github/workflows/external-image-only-replacement.yml` is the ONLY publication path and its published-placeholder source/history gates must still pass. A protected merge may trigger it automatically if genuine; never infer auto-dispatch from syntax alone or bypass required reviewers. After deployment inspect all 24 image-region contexts at desktop and mobile against source claims, six PNG hashes, 12 pairings, and Oct8 historical hashes. Release receipt `RELEASED_VERIFIED` is not itself proof that every semantic context review occurred.

## 5. Reporting and failure policy

Persist a source-backed Image AAR and readiness report when possible. Use `NO_START_RECEIPT` rather than claiming `DID_NOT_START` from missing artifacts; deterministic GitHub reconciler independently reports missed/unknown invocations. A failed old cycle cannot hijack tomorrow; no platform quota reset is implied. Keep Compiler publication independent using its own connected GitHub; no chat-type admission check. Do not touch `gttome/Daily-AI-Brief`; do not create extra AI schedules, ask for per-edition owner actions, use paid image APIs or pretend tools were available when they were not.


## October 20 owner-approved improvements — October 21 onward

Read and apply [the six approved production improvements](../automation/OCT20_APPROVED_IMPROVEMENTS.md). New editorial bundles require real chronology, nontechnical audience-fit evidence, video publisher variety and exact podcast episode links. New image packages require story-specific label/causal-state preflight plus canonical reviews/after-action.json and after-action.md. Preserve historical bundles and accepted PNGs. Complete actual 24-context visual QA and terminal closeout after release; never infer semantic PASS from screenshots or CI. Keep existing schedules and one worker per lane.
