# October 19, 2026 scheduler migration

For the October 20 edition onward, the sole image task is `6ad6310597b0819096a8d0f1b46bffc9` (**Daily Brief Images — Fresh Work**), configured in the actual scheduler as **New chat for every run**, daily at **21:15 America/Chicago**. It replaces `6acac88cff048191ba02e5b2bcb3becb`; pause the old task before enabling the replacement. The owner authorized this replacement after the autonomous GitHub/native-image test. Historical assignments and accepted PNGs retain their original task identity. No extra daily producer, chat-mode admission gate, quality relaxation or owner daily setup is introduced.

# Daily AI Brief Compiler — Two Primary Tasks Operating Runbook

**October 20+ image ownership:** follow [Image worker ownership](../external-app/IMAGE_WORKER_OWNERSHIP.md). Both the scheduled image worker and any recovery session atomically claim `image-package/YYYY-MM-DD-native-primary`, persist/read back the owner receipt before image generation, and use expected-head updates. Status checks are read-only. Missing outputs do not prove a missing invocation or missing tools, and do not authorize a competing producer. The replacement image task uses a fresh Work chat for every run with GitHub and native Image Creation; both production times remain unchanged.

**Operational policy revised October 11, 2026 by owner.** Scope: `gttome/Daily-AI-Brief-Compiler` ONLY; never modify retired `gttome/Daily-AI-Brief`. Timezone America/Chicago.

## 1. The only production schedules

| Lane | Saved task ID | Daily local time | Required abilities |
| --- | --- | --- | --- |
| Compiler | `6ac9868490b88191ac91f84d5f555994` | 19:15 | Genuine source research, connected GitHub branch/file create/update/readback, complete six-story editorial bundle |
| Premium Images | `6ad6310597b0819096a8d0f1b46bffc9` | 21:15 | Native generation, actual saved-pixel inspection, 1200×630 8-bit RGB/RGBA PNG export, exact GitHub bytes/sha and protected publishing |
| Deterministic reports | `.github/workflows/daily-operations-report.yml` | Morning | Read-only-source reconciliation of receipts on `operations-reports`; no AI generation, image creation or publishing |

**CHAT-TYPE ADMISSION REMOVED:** Ordinary / Work / Codex / other mode labels, host execution-mode attestation, invocation IDs, C2/C3/C5 proof branches, mode-dependent bans and synthetic diagnostic GitHub writes are NOT preconditions to start, write, compile, create images or publish. Never fabricate those identities. A future diagnostic may record UNKNOWN but must not stop the real production run. Actual availability of substantive research, image and connected GitHub tools is still necessary; unsuccessful writes and absent capabilities must be reported truthfully. No paid model APIs, TinyFish, alternate provider, owner login/file transfer or additional ChatGPT recovery schedules.

## 2. Edition date and existing-run discipline

Every Chicago evening targets **tomorrow's** edition. October 11 evening targets October 12. Check current protected main and its required CI, open PRs, `shadow/YYYY-MM-DD`, actual source/content state, valid writer progress and public site. Reuse valid same-edition work; do not allocate duplicate executions, reopen terminal historical editions, conflate proof branches with production, or let a stale C2/C3 diagnostic prevent editorial work. Prefer the actual edition branch over creating proof branches.

At 21:15, read the EXACT matching `shadow-pages-history/site/image-jobs/index.json` row and `site/image-jobs/YYYY-MM-DD/job.json`. Require one genuinely published new `PUBLISHED_PENDING` six-story job and immutable bundle/source hashes. If absent, report `WAITING_SOURCE_NO_GENERATION`; if released, verify-only no-op; never borrow another date. Keep accepted assets immutable.

## 3. Editorial and reader release

Produce exactly six source-backed original stories in 2/2/2 order, including one useful Agent Skills procedure; exactly two verified videos, two distinct-program verified podcasts; actual publisher/source reading evidence, original dates, supported reading time and runtime, Emerging AI Watchlist refresh and all four Professional Series book mappings. Use the existing honest six-placeholder image representation and established release contracts. Never invent sources or weaken editorial review.

**Media freshness, effective October 19:** Before selection, inspect the seven most recently published previous editions and select four genuinely different individual media items. The same video or podcast episode must not repeat, even with a changed URL or refreshed summary; favor varied publishers across adjacent editions. The existing bundle-ready-signal and shadow-compile workflows independently validate against preserved published media pages and fail closed on reuse or missing recent evidence. Repair prospective media selection before sealing. Do not rewrite already published October 15–18 editions.

**Source and show diversity, effective October 19:** Before selecting the six articles, read the prior seven published editions and the expanded resource registry. Target six distinct publishing organizations, enforce a floor of five, allow at most two stories from any one organization, and cap AWS at one and SAP at one, treating sub-blogs as the same publisher. The producer must seek high-quality non-dominant original sources rather than reshuffle labels or stretch evidence. For the two podcasts, enforce two different shows and reject any program used in the previous three published editions; prefer a seven-edition show gap when fresh verifiable episodes permit it. Exact episode non-repetition across seven editions remains mandatory. The existing forward-only validator independently checks both source diversity and show cooldown at the bundle signal and Pages release, reports seven-edition publisher exposure, and preserves every edition through October 18 unchanged. The source/podcast registry is discovery material, not proof that a specific candidate episode is available. Keep original publication dates and full source evidence.

**Archive completeness, effective on next regular compiler deployment:** After restoring immutable earlier pages, scripts/rebuild-history-discovery.mjs reconstructs all Complete editions cards, searchable item index, daily RSS, Atom RSS and JSON feed from every preserved valid Brief page and permanent-page metadata. All preserved edition dates must appear in the complete-edition archive and daily RSS; every recovered searchable item must have a genuine permanent page. The separate receipt travels with the edition execution. Do not alter historical article HTML, approved premium PNGs, image jobs, saved schedules or the independent 21:15 image release workflow. Future builds fail on missing archive dates or broken archive identities.

Save actual full evidence and exact-byte digest-backed `shadow-runs/YYYY-MM-DD/edition-bundle.json` and `compiler-state.json` in `shadow/YYYY-MM-DD`. Existing `bundle-ready-signal.yml` → protected-main `shadow-compile.yml` must provide genuine GitHub Pages deployment, independent live checks and unchanged 17 October 8 objects before declaring success. Image generation is not an editorial publishing dependency.

### October 13+ concise reader-copy gate (required before BUNDLE_READY)

Match the published October 8 editorial density. For each of six **new Oct 13+ stories** produce **exactly 3 distinct Topics** (each at most 4 words); **Summary 45–60 words**; **Why it matters 32–45 words**. The canonical reader uses the Why field for the visible **What you'll learn**, so it must also be **32–45 words**, factual and outcome oriented. Preserve full research/evidence separately. Correct any noncompliant new story before sealing; the protected deterministic editorial validator rejects out-of-bound copy. Do not clip, blindly truncate, or revise/reseal published October 8–12 editions. Keep source freshness, media, images, Watchlist and all-four-book requirements unchanged.

### October 16+ evidence-grounded Watchlist scoring gate

Before research and bundle assembly, read the current [Semantic Producer Contract](../SEMANTIC-PRODUCER-CONTRACT.md#watchlist-research-rubric--required-from-october-16-2026). Every new or materially updated topic must carry six distinct source-grounded `{score,reason}` rubric assessments: novelty, evidence, independence, momentum, relevance and durability. Keep unknown momentum `null` on both new and updated topics; a numeric score requires the documented named measure and at least two dated, source-linked numerical observations. Preserve genuinely reviewed carried-forward rubrics by stable topic identity; never generate a default. All October 14 copy and normal evidence gates still apply.

Before signaling, review the exact assembled bundle and digest. Where Node is available, run `node scripts/validate-semantic-bundle.mjs <state.json> <edition-bundle.json>`. This uses existing production validation without publishing. A connected-GitHub-only producer performs exact bundle readback and semantic review, then uses mandatory protected GitHub validation; local Node availability is not a new admission gate or evidence of a PASS. The saved primary task also needs this requirement in its external prompt; changing repository documents alone does not change that prompt. No schedule or image-task changes.

## 4. Image acceptance and release

Selected contract: `recurring_work_v8:rev8`; owner standing authority `contracts/automation/recurring-image-authorization.json`. Rev8 requires `external-image-packages/YYYY-MM-DD/recurring-assignment.json` with exact cycle/task/source/job/manifest SHA-256s and six accepted hash pairs, plus `image_execution_evidence` demonstrating genuine generation count, actual 1200×630 RGB/RGBA PNG export, exact GitHub binary SHA-256 readback, source manifest hash and six passing saved-pixel reviews. **No chat or scheduler mode proof.**

**New pre-PR package stop:** Before the *first* protected image PR, use one `image-package/YYYY-MM-DD-*` branch from current protected main; commit six exact binaries, canonical manifest, current-date recurring assignment and actual review JSON/AAR evidence **under `reviews/` only**. Push that branch and require the existing `compiler-validation` push check's deterministic `PRE_PR_PACKAGE_PASS` from `scripts/preflight-recurring-image-package.mjs`; the same gate reruns in PR CI. It rejects altered/extra paths, bad enum tokens, stale source/job/bundle/Pages hashes, absent set/individual pixel review receipts, non-RGB/RGBA or corrupt PNG, Git SHA/length mismatches and failed exact-commit remote readbacks. Segment accepted PNG transport above 750 KiB at 256-KiB fixed offsets using `scripts/reassemble-fixed-offset-image.mjs`; preserve the bounded 8-MiB Git readback. Failed packages are corrected on the same branch before PR; never regenerate accepted images because of transport/CI defects. This is an added check in existing CI, **not a new release workflow or AI task**.

Use full Rev7 premium quality, story fidelity, explanatory visible text and six distinct diagrams; enforce exact PNG decoder integrity (no indexed/P-mode, fake pixels or weak fallback). Save original accepted bytes to GitHub, verify immutable exact-commit readback, protected PR and exact-head CI, permitted merge and existing `external-image-only-replacement.yml` automatic release. Verify six public image hashes, 12 dated/permanent image pairings, 24 actually reviewed desktop/mobile image regions and all 17 October 8 historical objects. Never regenerate an accepted image because of a GitHub/Pages transport failure. No daily manual GO required, and existing reviewer policy remains binding.

## 5. Reports and next-day continuity

The Compiler and image tasks save honest source-based AARs where possible. Existing deterministic reporter should write `daily/<cycle>/{compiler,images,daily-rollup}.{json,md}` on `operations-reports`, backfill missing receipts, and never misreport host execution identity. `NO_START_RECEIPT` is not proof of no scheduled invocation. Missing historical AARs never block a new date's editorial work.

No independent recovery AI schedule is active. Preserve partial valid work and identify the exact blocker if a task ends without release. The two existing primary recurrences continue. Never report SUCCESS from schedule enablement, tests, an image preview or a Git branch alone.

## 6. Protected deployment and rollback

Every code/contract change requires normal protected PR, exact-head CI and permitted merge; no direct main, force push, disabled checks or bypass. The selected image policy may roll back separately without touching the Compiler, October 8 assets, prior editions or public reader. A saved task and an image-release contract must agree, but neither may impose a chat-type test.


## Unified editorial + premium-image after-action report (October 13 onward)

**Primary daily deliverable:** `operations-reports:daily/YYYY-MM-DD/combined.md`, with `combined.json` as its evidence-backed metadata. `YYYY-MM-DD` is the **Chicago evening cycle date**, and the report is labeled for the next-day edition. Keep the separate `compiler.{json,md}`, `images.{json,md}`, and `daily-rollup.{json,md}` as auditable source-specific companions, not competing owner-facing summaries.

The protected `.github/workflows/daily-operations-report.yml` generates and updates the combined report **automatically** after `external-image-only-replacement` completes (GitHub `workflow_run`) and during its existing Chicago 09:00 next-morning reconciliation. The workflow is deterministic and does **not** generate AI content, images, app reports from unsupported claims, add a ChatGPT task, alter schedules, deploy Pages or bypass protected main. It is idempotent and preserves the prior fourteen cycles. Never write a status of COMPLETE unless the Compiler public receipt, six real published PNG hashes and 24 source-matched actual desktop/mobile review records all pass.

A high-design combined `.md` includes color status indicators, GitHub callouts, Mermaid workflow diagrams, KPI tables, six live article images, generation/correction reviews, protected PR/CI/Pages evidence, immutability status, next-cycle readiness and a usage/budget section. Accepted image hashes and reviewed contexts must be read from current-cycle GitHub evidence, not inferred from a scheduled task label or image count.

**Owner-provided Work usage is optional.** If supplied for a specific cycle, store a protected, reviewable JSON record `docs/after-action/usage/YYYY-MM-DD.json` with `cycle_date`, `edition_date`, `work_usage_percent`, source `owner_reported_in_chat`, and `carry_forward_allowed:false`; the unified AAR displays the figure as owner-reported, not as API-metered telemetry. If no record is present, display **Not reported**, publish normally, and never carry a prior cycle's number forward. October 12 evening / October 13 edition had **2% of weekly Work usage**, directly reported by the owner. This is not an estimated rate or a statement of account balance.

**Cycle-start safety:** A missing external chat heartbeat or first-party scheduler attestation is not, by itself, a production failure. Release and quality gates remain artifact-based. Preserve the existing two production tasks and normal 19:15 / 21:15 Chicago times; the October 12 early 20:15 image-time exception is governed by the existing one-time October 13 09:00 restoration task, not by the AAR workflow.


### Portable Markdown for Typora and other local readers

The combined AAR's status and callout indicators must be **self-contained text/Unicode**, not dynamically fetched external badge images. Do not use `img.shields.io` (or another URL) for headings, status pills, QA labels, or usage indicators. Standard Markdown blockquotes with bold labels are preferred to GitHub-only `[!IMPORTANT]` syntax; Mermaid source and linked evidence remain part of the `.md` report.

The six premium image files are real production PNGs, not decorations. A lone downloaded `.md` can only embed online images when the editor has internet access. Therefore the existing deterministic `daily-operations-report.yml` also uploads a portable GitHub Actions **`unified-aar-offline-<run_id>` artifact** when a release is complete. It contains a cycle-date subfolder with `combined.md`, `images/` containing the six exact original published RGB/RGBA 1200x630 PNGs, `image-integrity.json` and `README.txt`. All local image `src` references use relative `images/...` paths. The bytes are fetched from protected `main` in the runner, and the SHA-256/size/IHDR must match the exact release and original manifest; screenshot crops and re-encoded substitutes are forbidden.

To use locally: download the offline artifact ZIP, extract the complete archive, and open the enclosed `combined.md` in Typora while retaining the adjacent `images/` directory. Remote source hyperlinks still require internet; document status, tables, diagrams (when Mermaid is enabled), and illustration images do not. No new production scheduler task or GitHub Pages publication is created for report packaging. The archive is disposable and generated from already accepted immutable Git data.


### Image processing stage duration in the combined daily AAR

Every unified AAR must place **Image processing stage duration** next to **Compiler state duration** in its performance dashboard, and display the underlying timestamp evidence in the image-production section.

The report reconciler calls `scripts/derive-image-stage-timing.mjs` on each exact Chicago cycle using the **first commit containing accepted original PNG bytes**, the six-image accepted-package commit, protected PR merge, `RELEASED_VERIFIED` time, and the **first commit adding the fully reviewed 24/24 semantic-image-context evidence**. It writes `image-timing.json` into the temporary per-cycle evidence directory and records each boundary with the elapsed wall-clock time. Primary image duration is **first accepted binary Git commit → approved final 24-context review commit**. This is a verifiable persisted-stage duration, not a claim that image creation began at that first commit.

For the exceptional October 12 evening / October 13 edition only, the owner-approved temporary **20:15 Chicago scheduled start** is separately recorded in `docs/after-action/timing/2026-10-12.json`. The report also shows the **scheduled-to-final-review window**, explicitly labeled as a *schedule window rather than actual native generation duration*. The October 13 duration readings are **18m 04s** first accepted bytes→final approval and **38m 09s** scheduled start→final approval. Future scheduled anchors are optional and never copied between cycles; no special user input is needed for the primary Git-auditable stage duration.

Any inaccessible commit, missing production/QA receipt, mismatched edition, missing schedule exception, or inconsistent timestamp must produce **Not independently recorded**, not a fabricated duration. Both per-lane JSON and combined Markdown retain the evidence links. This is a read-only reporting improvement and does not alter either production task, change the 21:15 standard image schedule, deploy Pages, regenerate images, or enable any extra ChatGPT worker.
