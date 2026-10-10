# External Image App Handoff — Start Here

**Updated:** 2026-10-09.  
**Repository:** `gttome/Daily-AI-Brief-Compiler` only.  
**Permanent location:** https://github.com/gttome/Daily-AI-Brief-Compiler/blob/main/EXTERNAL_APP_HANDOFF.md

## 1. The exchange

An existing external app reads the [image-production prompt](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/main/docs/external-app/Brief_Compiler_Image_App_GitHub_Prompt.md) and the GitHub image job, creates and reviews six article-specific images, and copies six PNG binaries plus their manifest/review records back into GitHub. The executing session then uses the existing protected Compiler release process to integrate, publish and verify all six images in the live Brief.

The Compiler does not require a ChatGPT Work chat, a fresh conversation, a browser session, a particular image provider, a Work porter or a new app architecture. Story-only generator inputs are a quality requirement inside the app, not a chat-platform requirement. No Work-session receipt is required. Do not fabricate `actual_work_session` or other platform claims.

The executing session, including a Work session when used, owns completion: correct and re-review failed images until all six pass every applicable individual and set-level requirement, then successfully upload and read back all six exact PNGs and the matching manifest/reviews from GitHub, and continue through image-only publication and live verification. There is no fixed quality-attempt cap. Routine review or upload failures require corrective work, not an early completion report. Genuine tool/access/quota/source-data blockers leave the assignment BLOCKED_INCOMPLETE with saved progress.

The daily publisher remains independent of this optional post-publication work. Image-app failure must not delay, restart or reschedule the Brief. Do not build an app, revive retired image lanes, reopen terminal executions or modify `gttome/Daily-AI-Brief`.

**Use the existing GitHub connection first.** Read the job, upload binary PNGs, create commits and PRs, and perform supported release operations through the already connected account. Do not require a separate GitHub browser sign-in as a routine startup step. Request authentication only after an actual authorization failure establishes that the connection needs it; lack of a workflow-dispatch tool is a capability limitation, not proof that the owner must sign in. Never request passwords or access tokens in chat.

Before generation, inspect the available publication capabilities and the current repository release workflow. Use a supported authenticated API, connector or already configured automation route when available. The image replacement workflow was manual-only at this revision, and the GitHub tools in the editing session did not expose a new-workflow dispatch action. This prompt does not add that capability or change the workflow. If release cannot be started through an available authorized route, preserve completed work, identify the precise missing capability and report **BLOCKED_INCOMPLETE**. Do not automatically fall back to browser login, fabricate a dispatch or silently change release triggers, permissions or schedules.

## 2. Read the actual job from GitHub

Read the current index:

https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/shadow-pages-history/site/image-jobs/index.json

Select `latest_eligible_date` only when the corresponding entry is `PUBLISHED_PENDING` and binds exactly six stories. Follow `job_url`; independently verify the exact downloaded bytes against `job_sha256`. Retrieve `job.source.bundle_url`, verify its original bytes against `bundle_sha256`, and preserve the source commit, edition and execution identities.

Read all six complete story records, primary-source URLs and dates, verified source-reading evidence, image intents, visual specifications and `expected_stage_path` values. Check the original completed publication evidence, live dated Brief and six permanent story pages as required by the existing release contract. A branch name, CI success or old narrative is not a substitute for those records. If no qualified job exists, report the missing input and stop without guessing a date.

Already-published source jobs and bundles remain immutable. Do not rebuild their JSON to change hashes, rewrite editorial content or substitute a different edition.

**October 9 historical exception:** an authorized manual placeholder publication may identify `shadow/2026-10-09-owner-placeholder-20261009`, `one_time_owner_recovery=true` and `unattended_schedule_proven=false`. Preserve those values and require its actual publication evidence. It does not prove unattended scheduling, reopen the failed `shadow/2026-10-09` execution or authorize an image release. October 8's six accepted premium images remain protected, not a replacement target.

## 3. Produce six accurate, varied images

Use these synchronized documents:

- [Full app prompt](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/main/docs/external-app/Brief_Compiler_Image_App_GitHub_Prompt.md)
- [Image specification](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/main/docs/external-app/Perfect_Image_Specification.md)
- [Variation guidance and historical lesson](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/main/docs/external-app/Image_Variation_After_Action.md)
- [Benchmark profile](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/main/docs/D1-PRODUCTION-IMAGE-BENCHMARK-PROFILE.md)

Deliver exact **1200 × 630 PNGs**, white or near-white, professional editorial finish, meaningful mechanism detail and **mandatory readable explanatory text**. Use an infographic-like or hybrid appearance when it fits the article; do not substitute a generic, sparse template.

For each story, prepare the visual thesis, distinctive anchors, evidence/relationship map, exact label list, composition choice and exclusions. An empty legacy `visible_text_allowlist` or `labels_authorized=false` means the app must complete the label specification; it never authorizes a textless image. The owner requires text and authorizes the app to draft source-supported wording. Record that authority separately from the immutable job without claiming separate owner approval of the wording or artwork.

Reserve six compositions before generation. Generate and review one story at a time in clean story-only inputs, then compare the six saved images for article alignment and variation. Preserve accepted bytes. Inspect actual persisted pixels; a successful build, image hash or JSON assertion is not visual acceptance.

## 4. Copy six binaries back to GitHub

Use a dedicated **unprotected staging branch based on freshly resolved `main`**. Resume an existing matching branch when its job and saved work are verified. Use each story's exact `expected_stage_path`:

```text
external-image-packages/YYYY-MM-DD/images/<exact-story-id>.png
external-image-packages/YYYY-MM-DD/manifest.json
```

The angle-bracket segment is a template only. Use the real job's date and six exact IDs. Upload actual PNG binaries, not screenshots, external links, encoded text files or files merely renamed `.png`.

Use the current [`external-compiler-image-package-v1` intake contract](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/main/scripts/stage-external-image-package.mjs). Bind edition, execution, original job/bundle hashes, source commit, current expected Pages-history head, six story/file paths, byte counts, SHA-256 values, Git blob SHA-1 values and genuine individual/set review evidence. Store the supporting specifications, label lists, visual signatures and alt text in schema-compatible review records.

The Compiler checks the package, not the app's internal platform. `external_operator_cold_start_evidence` is legacy optional metadata and is not an admission requirement. Existing genuine metadata may remain in an old package; no new app must manufacture it.

Read the exact committed blobs back, and independently retrieve the raw files at the exact commit SHA. Verify PNG structure, 1200 × 630 actual pixels, 8-bit RGB/RGBA noninterlaced encoding, byte counts, SHA-256 and blob identities. Require six unique story bindings and six distinct image hashes. Reinspect those persisted pixels against their actual articles and exact label lists. Never overwrite accepted/locked images or regenerate them because transport failed.

## 5. Continue through publication and live verification

**Publication authority:** when the owner submits this startup prompt as the assignment, it authorizes the selected eligible job's image-only publication after all six images pass review, including the normal protected PR, merge and existing release workflow. Preserve that actual owner instruction as the authorization evidence and bind the release record to the exact job, manifest and six accepted image hashes once available. Do not ask for the same routine publication permission again. This authorization does not claim that the owner personally inspected the artwork, supply missing historical evidence, waive a required repository approval, or permit bypassing branch protection or failed checks. Record only facts and approval evidence that actually exist.

Verified staging is an intermediate checkpoint. Follow section 9 of the full prompt and the current `.github/workflows/external-image-only-replacement.yml` contract: prepare genuine approval evidence, validate the package PR's current head, merge through protection, start the existing release through an available authorized route, and monitor its deployment and finalization. Preserve source jobs, article content, schedules, historical accepted assets and the 17 protected October 8 public objects. Do not weaken gates or fabricate legacy Work-session evidence.

**The task is not finished until all six passing images are uploaded to GitHub, integrated into their correct articles in the dated Brief, published, and independently verified on the live site.** Uploads, a merged PR, a queued release, previews or a successful deployment status alone do not satisfy completion. Continue correcting image, integration and publication failures until the complete live result passes; a genuine unresolved access, tool or quota blocker leaves the task incomplete.

Verify the live dated Brief and all six permanent story pages from the job/release evidence. Confirm every image appears beside the correct article, no pending placeholder or broken/stale image remains, and each live PNG matches the exact accepted GitHub SHA-256 and file specification. Inspect mandatory text and desktop/mobile display. Require actual live evidence in addition to CI/deployment status.

Only report **PUBLISHED_COMPLETE** after all six individual and set reviews pass, GitHub readbacks pass, the protected release and finalization succeed, and all six live images and their article bindings pass. Return the live Brief URL, package PR and immutable commit, release-run link, manifest link and a six-row table of story, GitHub and live image URLs, hashes, review results and live verification results. Otherwise retain **IN_PROGRESS** or **BLOCKED_INCOMPLETE** with exact completed work and a resume checkpoint.

A later quality defect requires an explicitly versioned successor and re-review of the changed image and set; preserve prior accepted evidence and unaffected passing bytes. Transport or deployment retries reuse accepted bytes. The executing session remains responsible through publication; no separate chat is required.

`EXTERNAL_WORK_HANDOFF.md` remains a compatibility pointer to this document. Its historical name does not impose a Work requirement.
