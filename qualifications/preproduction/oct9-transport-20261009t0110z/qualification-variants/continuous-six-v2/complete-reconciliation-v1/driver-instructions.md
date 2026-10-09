CURRENT SAME-RUN716d CONTINUOUS-V2 DRIVER
This derived operational driver preserves the original request and review/projection/transport/assembly APIs. It replaces only completed-fixture precedence and the v1 interruption/evidence ordering with the existing716d v2 validator protocol. Original immutable driver remains historical at 06a692fe03d21c7519f917f1bb6d26d3f2bcd36f:qualifications/preproduction/oct9-transport-20261009t0110z/runtime-preflight/driver-instructions.md, SHA256 fb80f19c2c011159a9a9400f2f9af1d74f12ddc31e5dc7ea38713122bc7979c6.

# Same Work invocation: deterministic serializer and existing GitHub writer

This is operator guidance for an explicitly allocated preproduction test under the owner’s standing authorization. It does not attest to a live capability, tool call, image attempt or publication. The repaired engine, request, state and installed prompt must be bound to real immutable commits and actual task readbacks before use.

## Files and caller

Use the files from the actual verified engine checkout in the same outer Work invocation:

| File | Role |
| --- | --- |
| `scripts/record-d1-image-event.mjs` | Read-only historical inspection or deterministic event-to-batch emission. No Git publication. |
| `image-studio/runtime-records.mjs` | Actual exported inspection, record and `publishD1EventBatch` validation/publication functions. |
| `scripts/publish-d1-image-event.mjs` | Node stdio caller of `publishD1EventBatch`, with the existing writer injected. |
| `scripts/d1-github-writer-host.mjs` | Functions-code-mode host that answers the Node caller's four operations using existing authenticated GitHub tools. |

The host contains a reviewed function declaration named `runD1GitHubWriterHost`; it is not an ES-module export and is not a standalone shell/GitHub client. Read its full pinned text, evaluate that function declaration in the same actual Work caller's functions-code-mode environment, and call it with that environment's actually exposed `tools` object:

```javascript
// The complete reviewed runD1GitHubWriterHost declaration must precede this call.
const publication = await runD1GitHubWriterHost({
  tools,
  root: actualVerifiedEngineCheckoutAbsolutePath,
  batchPath: actualNewBatchAbsolutePath
});
```

The two path variables above are actual caller observations, not literal placeholder paths. `batchPath` must be under `root`. Preserve the returned receipt and observations without printing native PNG payloads. The helper starts the exact Node publisher through a raw, non-echoing PTY and answers only `getHead`, `readFile`, `createCommit` and `updateRef`. It does not call a separate model, run images, schedule a task or introduce a credential source, another image route or another execution runtime. Git writes remain on the existing authenticated connector; the repaired immutable binary readback uses the same public raw-GitHub route already required below.

It requires these existing exposed tool functions: `exec_command`, `write_stdin`, `mcp__codex_apps__github_fetch`, `mcp__codex_apps__github_fetch_file`, `mcp__codex_apps__github_create_blob`, `mcp__codex_apps__github_create_tree`, `mcp__codex_apps__github_create_commit` and `mcp__codex_apps__github_update_ref`. Discover the actual connected capabilities if necessary. A missing function is a real capability blocker; a supplied name in this document does not make it available.

## Historical completed E2 preflight — retained instructions, DO NOT REPEAT WRITES

The following original fixture sequence already completed at 38d68c8f45969b459a297c1c816bb0cc88877676 with PASS receipt at 51cd6ed640b5256943f108b29fd3a6ec0fbba5f2. Preserve its E2 identity. The current full task prompt controls read-only resume preflight; these historical writing steps must not be replayed.

### Original sequence

1. Fetch the root-prepared `runtime-preflight/normalized-terminal-input.json` at its actual immutable publication commit. Independently verify that its normalized records retain the old request/log/state identities and accounting. Run `node scripts/record-d1-image-event.mjs validate-only INPUT.json`. Require `EXIT_BLOCKED`, four genuine generations, zero accepted, `FAIL_ATTEMPT_LIMIT` and zero permitted new generations. Retain full stdout, CLI and loaded-module hashes and actual engine-checkout verification. Do not write to the old branch.
2. Publish TEST_ONLY seeds at actual request commit S, then publish initialized state binding that request S at actual state commit B. Both are on the existing successor branch; neither is an image attempt. Record the real commits and digests. The implementation operator performs these preparation writes before the approved live invocation.
3. In that approved invocation, read request/source at S and current fixture state/log at B, verify all canonical hashes, and observe the actual current branch head. A later unrelated commit on the same branch changes expected head; do not retain a stale B as the presumed current head. Keep the request commitment S unchanged.
4. Build a concrete CLI input containing `state`, `attemptLog`, `request`, `sourceEvidence`, `expectedStateSha256`, `expectedLogSha256`, `engineSha`, `expectedHead` and `event`. Supply actual observed event time and evidence-derived `ctx-` identities. Use only the fixture event shape in `TEST_ONLY/preflight-seed.json`, with `external_outcome: NOT_INVOKED`. Do not add raw/canonical files, pixels, a review or an acceptance.
5. Run `node scripts/record-d1-image-event.mjs emit INPUT.json NEW-BATCH.json` to an unused path under the verified engine checkout. Require a validated batch with exactly the fixture state, log and event writes. The CLI only emits a local batch; it does not prove Git publication.
6. Call the reviewed host above with that exact batch path. Require expected-head publication and real immutable-byte readback through the actual exported publisher. Retain the original complete batch, file hashes, observed connector calls, real parent and resulting commit. The fixture consumes zero native generations, zero quality attempts and zero accepted assets.
7. Read the resulting fixture state/log from their actual commit. Invoke the serializer again with the identical event and matching current digests; require `UNCHANGED` and zero writes. This result is a local no-op, not a publication batch: do not submit it to the publisher.
8. Attempt the original validated batch again with its original expected head against the now-advanced actual branch. Require the publisher's `stale_expected_head` failure before any new commit. Do not modify the expected head inside an old batch, force a ref update or retry an unknown mutation outcome. Reconcile any ambiguous external outcome first.
9. Preserve actual capability observations for this caller. A separate implementation caller's receipt, unit-test success or supplied engine string cannot stand in for the existing Work task's actual preflight. Continue to the separately approved live six-case request only when the actual preflight passes.

## Project the one actual review response into both retained review formats

Use the agreed callable exports from the pinned `image-studio/specification-projection.mjs`: `bindRecipeReview` and `projectRecipeVisualReview`. The latter has signature `projectRecipeVisualReview(story, recipeReview, {attempt, canonicalIdentity})`. All six generation prompts and all 545 criterion IDs/requirements remain unchanged. The final frozen review prompt appends only RECIPE_QUALITY_OBSERVATION_INSTRUCTIONS, the versioned response-format instructions for five existing observations; it still requests one subjective response.

After downloading and, only if needed, deterministically resizing the actual image, validate its saved canonical bytes as a 1200 by 630 PNG. Compute its canonical identity from those bytes and the serializer-assigned immutable path. The existing `sha256` and `gitBlobSha` functions in `image-capsules/util.mjs`, `pngDimensions` in `work-porter/integrity.mjs`, and `validateCanonicalPng` in `image-studio/png-integrity.mjs` supply factual integrity operations.

```javascript
validateCanonicalPng(canonicalBytes);
const canonicalIdentity = {
  path: canonicalPath,
  sha256: sha256(canonicalBytes),
  git_blob_sha: gitBlobSha(canonicalBytes),
  bytes: canonicalBytes.length,
  ...pngDimensions(canonicalBytes),
  format: 'png'
};
const recipeReview = bindRecipeReview(story, actualReviewResponseText, {
  finalSha256: canonicalIdentity.sha256,
  contextId: actualStoryContextId,
  reviewedAt: actualReviewObservationTime
});
const visualReview = projectRecipeVisualReview(story, recipeReview, {
  attempt: actualPendingAttemptNumber,
  canonicalIdentity
});
// This data belongs to the actual, otherwise fully bound REVIEW_COMPLETED event.
const reviewEventData = {
  canonical_path: canonicalIdentity.path,
  review_request_text: exactCompiledReviewPrompt,
  review_response_text: actualReviewResponseText,
  recipe_review: recipeReview,
  visual_review: visualReview
};
```

The final pinned `image-studio/recipe-quality-observations.mjs` exports `RECIPE_QUALITY_OBSERVATION_INSTRUCTIONS`, `parseRecipeQualityObservations(recipeReview)` and `projectRecipeQualityProfile(story, recipeReview, visualReview)`. The exact instruction string is already appended by `compileRecipeProjections` to the complete frozen review prompt; do not append a second copy in the browser.

For five existing criteria only, the response's existing `observation` field contains a compact JSON **string** with exactly `value` and `observation`. The five values report actual useful-canvas percent (`layout.occupancy`), major-region count (`layout.regions`), dominant internal-substage count (`quality.minimum_internal_substages_in_dominant_mechanism`), secondary-relation count (`quality.minimum_secondary_relationships`), and observed white/near-white background (`basic.composition`). Unknown values are null with that criterion false. They are observed values, never requested limits, planned counts or a default midpoint. `bindRecipeReview` invokes the exact parser through validation, so a malformed or contradictory measurement cannot become an accepted record.

The response text is the complete actual result of the one frozen same-story canonical review. The Node caller supplies only real byte, identity, attempt and time bindings. Do not synthesize observations, ask for another subjective response, append to the frozen review prompt, or hand-author the v3 review.

| Existing observation | Deterministic v3 destination |
| --- | --- |
| `basic.*` | Corresponding basic-gate verdict and localized observation |
| `benchmark.*` | Corresponding benchmark verdict and localized observation |
| `text.allowlist` | The sealed required labels, reported missing labels, the remaining reported-present labels, and exact unauthorized readable text |
| Passing `component.*` | Observed meaningful components in the sealed component order |
| Confirmed generic/minimum-detail quality observations | `generic_or_sparse=false` only when established |
| Confirmed decorative-geometry prohibition observation | `decorative_only=false` only when established |
| Actual asset, request and runtime identities | Exact story, attempt, canonical path/hash/blob, packet/prompt hash, reviewer context and review time |

An unconfirmed generic/decorative flag remains `null` in a rejected runtime record. This truthfully fails the existing v3 gate; it is never an accepted canonical schema value. The final accepted v3 schema still requires both flags `false`. Derive the v3 result with `validateVisualReview`, rather than copying the v2 result. An exact recipe or geometry failure can coexist with a passing older v3 subset; the existing event serializer records that attempt as **FAIL from the full recipe result**, so the narrower v3 projection grants no lock or extra attempt.

Other full-companion facts still need their actual observations. A range PASS does not supply an exact canvas-utilization percentage; the selected construction does not supply observed region/substage/secondary-relation counts; a white-background generation instruction does not prove the image background. Preserve missing facts as missing until observed through the approved review boundary. Do not insert a midpoint, planned count or assumed background into qualification evidence.

## Live event handling

Use the same verified CLI and publisher path for each actual `GENERATION_INTENT`, `GENERATION_COMPLETED`, `REVIEW_COMPLETED`, `ACCEPT_LOCK` or permitted infrastructure event. The serializer sets immutable per-attempt paths and updates state/log together; do not independently edit totals or mark a lock. For generated/canonical bytes, place actual files under the input directory and pass the permitted relative filenames. The CLI rejects path escape and enforces size limits.

Before acceptance, preserve the complete actual same-story canonical review request/response and bound criterion observations. The publisher independently fetches canonical bytes at the claimed immutable commit; tool metadata or a UTF-8 text representation is not binary identity evidence. The separate full-lane raw-GitHub exact-commit binary readback requirement remains mandatory for all six accepted PNGs.

The fixture's successful publication establishes only the observed code-integration path and zero-generation accounting. It never substitutes for browser isolation, actual prompt equality, native generation, canonical pixel acceptance, continuous six-image quality and the separate actual read-only recovery, any of the fourteen companions, activation or delivery.

## Actual six-image set review through the same Work browser

After all six individual images are accepted and locked, use the **same outer Work Cloud Browser** to open a separate ordinary Chat conversation for review only. Keep this conversation outside all six story-generation contexts. Attach the six exact locked canonical PNGs, in frozen order, using the browser's actually exposed cloud attachment capability. Retain real attachment/byte bindings, the complete request and response, context observation and actual review time. If this capability is unavailable, preserve all six locks and report the exact boundary; do not transfer the work to the owner or generate replacements.

The review conversation must inspect the actual six-image set and provide its observed composition, layout, diagram grammar, visual hierarchy and annotation pattern for each numbered image, with concrete observations supporting the comparisons. It must judge all four existing editorial gates: no labels-swapped template, no repeated dominant template, intentional curation and all images individually at the benchmark. Request review only: no image generation, alteration, replacement or unlock. The outer Work coordinator must not substitute its own visual decisions.

The set review requires `contracts/image-set-review-v3.schema.json`. Bind factual story IDs, actual canonical hashes, edition date and observed review time outside the review conversation. Bind the sealed assignment codes only after matching them to the reviewer's recorded observed visual dimensions; do not populate candidate dimensions from the plan by default. Preserve the matching record and source observations separately. A contradiction, ambiguous mapping or actual repeated template remains a failed or incomplete set review even when six planned strings are different.

The final set-review record has exactly these top-level fields:

| Field | Actual source or deterministic operation |
| --- | --- |
| `schema_version` | `daily-compiler-image-set-review-v3` |
| `edition_date` | The bound request edition date |
| `candidates` | Exactly six observed-and-bound rows in frozen order |
| `observed_gate` | `observedSetGate(candidates)` from `image-capsules/set-review.mjs` |
| `no_labels_swapped_template` | The actual set reviewer's judgment |
| `no_repeated_dominant_template` | The actual set reviewer's judgment |
| `intentionally_curated` | The actual set reviewer's judgment |
| `all_individually_benchmark_grade` | The actual set reviewer's judgment |
| `result` | Derived with the existing `validateSetReview` result; never forced PASS |
| `reviewed_at` | The actual recorded set-review time |

Each candidate row has exactly `story_id`, `final_sha256`, `composition_signature`, `layout_signature`, `diagram_grammar`, `hierarchy_signature` and `annotation_pattern_signature`. `observed_gate` contains exactly `unique_compositions`, `distinct_layouts`, `distinct_grammars`, `distinct_hierarchies`, `distinct_annotation_patterns` and `unique_byte_streams`. Require the unchanged six unique compositions and bytes, at least four layouts, grammars and hierarchies, at least three annotation patterns and all four editorial gates true. Validate using `validateSetReview(review)` or `assertSetReview(review)` from the existing module. No native call or additional quality-attempt allocation occurs here.

## Final companion assembly and the actual GITHUB_VERIFIED boundary

The attempt serializer writes observed attempt events and keeps `BROWSER_RUNNING` or `BLOCKED`; it does not expose a phase-transition event or a CLI that manufactures `GITHUB_VERIFIED`. The following existing validated assembly path is distinct from the attempt-event writer. Its source is the complete actual event history, retained review responses, verified locked bytes, actual independent recovery and actual set review. It never edits a generation count or accepted lock independently.

## Continuous quality and actual independent recovery: required ordering

This current revision uses daily-compiler-d1-qualification-evidence-v2 and qualification_mode=continuous_six_independent_recovery. The original E4/v1 stop and pending-Story3 witness remain historical; they are not this variant's required recovery format. The original manifest, request, source, events and counters are never relabelled or rewritten.

QUALITY INVOCATION A: Perform the six original admitted stories in order. Immediately after the first two accepted locks, preserve immutable BROWSER_RUNNING state/log copies with exactly those two accepted rows at one real commit; this is a data checkpoint, not an interruption. Proceed directly to Story3 in this same capable invocation and then through Story6. Do not force an exit after Story2. Preserve all accepted work and pending outcomes through an unplanned interruption. The last actual story-generation invocation is A for the final recovery witness.

After six locks and actual set review, complete the original manifest, identical-byte ingest, immutable raw-GitHub downloads, porter and final path-bound review/profile records below. Stage and publish a factual frozen GITHUB_VERIFIED state plus final attempt log and all completed quality companions at an actual immutable commit C. Preserve the last-event state separately. The final state and final attempt-log paths/digests must remain unchanged during recovery; all four recovery.before/after state/log references resolve to these SAME final paths and values at C. No cloud proof, COMPLETE state, activation or full qualification PASS exists yet. Return SIX_LOCKS_PERSISTED_RECOVERY_PENDING with the real C, paths/digests, two-lock checkpoint references, last-generation invocation identity/provenance and actual chronology. This status is an operator receipt, not a new state-machine status.

POST-RETURN OPERATOR OBSERVATION: The existing implementation operator observes the actual quality invocation's completion and reads the SAME scheduled task after return. Persist a daily-compiler-d1-task-observation-v1 record with source=actual_scheduler_readback, task_id, actual last_run_time, observed_at, full installed prompt_sha256 and saved_conversation_sha256. Use opaque public digests and retain underlying actual observations privately. Capture the real before observation strictly after manifest.accepted_at. Bind recovery.before.invocation_id to runtime.sessions.at(-1).invocation_id and before.observed_at to that actual observation. Keep unavailable platform run IDs null. No scheduler timestamp or invented nonce is proof of a run by itself.

The existing operator may rearm only this same task after actual return, at or after max(actual now plus one minute, actual recorded last_run_time plus one hour), rounding the chosen whole-second schedule UP. Preserve the EXACT complete prompt, engine, request and saved conversation; update schedule only. Append actual operator and independent dispatch readbacks. A genuinely separate later invocation B performs only the recovery below; it creates zero story contexts and generates/reviews zero new images. No third image/recovery invocation is required merely to collect post-return scheduler telemetry.

READ-ONLY RECOVERY INVOCATION B: Read current operator handoff phase and immutable C, final state/log, all six locked canonical bytes/identities and the saved two-lock data checkpoint. Revalidate full unchanged final state/log/counters and six accepted images. Read the saved checkpoint state/log without copying them into active state. Call nextD1ProofAction(savedState,{request,sourceEvidence,attemptLog:savedLog,historicalVerification:false,requestSource:{branch:finalState.branch,request_path:actualEvidence.request.path,source_evidence_path:actualEvidence.source_evidence.path,commit:actualEvidence.request.commit}}) from pinned716d. Require RESUME_FIRST_UNACCEPTED_STORY for that original two-lock prefix; the first unaccepted story is request.stories[2].story_id. Do not actually generate it. The returned generic action may not contain story_id; derive and verify the first unaccepted story from the unchanged saved log/request order rather than inventing an API field.

Persist an actual daily-compiler-d1-recovery-readback-v1 receipt on this same branch with result=PASS only after these factual checks pass: proof_id, distinct exercise_id, task_id, actual B invocation_id, state_sha256, attempt_log_sha256, state_commit=C, native_generations=finalState.native_generations, no_new_native_generations=true, regenerated_accepted_images=0, checkpoint_state_sha256, checkpoint_attempt_log_sha256, resumed_action from the actual call, resumed_story_id=request.stories[2].story_id, and locked_images in manifest.images order as {story_id,sha256,context_id:chat_session_id,accepted_attempt:attempt}. Preserve actual observed_at, exact readback provenance and the original state/log/asset bytes. The receipt's actual commit must differ from C. It is append-only evidence; no generation event, counter change or accepted-lock rewrite is allowed. Return the receipt reference and actual B invocation evidence. Do not fabricate this invocation's later completed scheduler last_run_time while it is still running.

POST-RETURN RECOVERY COMPLETION: After B actually returns, the existing implementation operator captures a SECOND actual daily-compiler-d1-task-observation-v1 at a different immutable path/commit. Its last_run_time must be strictly later than the first observation; both full prompt and saved-conversation digests must match. Bind after.invocation_id to the actual B receipt and after.observed_at to a real later observation, strictly later than before.observed_at. The operator may assemble the factual recovery metadata and final proof from these actual runtime records with the existing deterministic validators and authenticated Git writer; it performs no subjective review, image generation, browser work or new runtime. If actual observations are absent or contradictory, preserve all six locks and report recovery pending.

Assemble resume as daily-compiler-d1-independent-recovery-v1 with result=PASS, proof_id, mode=SEPARATE_READ_ONLY_RECOVERY, distinct exercise_id, task_id, native_generations_consumed=0, regenerated_accepted_images=0; before={invocation_id,observed_at,state,attempt_log,task_readback}; after={invocation_id,observed_at,state,attempt_log,task_readback,immutable_readback}; checkpoint={state,attempt_log}. Every reference is an actual safe repository-relative {path,sha256,commit}, with canonical JSON digest. All four before/after final state/log refs must use C; checkpoint.state and checkpoint.attempt_log share their earlier actual commit. The two task_readback commits differ; after.immutable_readback commit differs from C. Persist all referenced files locally and in Git; a commit string does not remotely resolve absent local bytes.

Only now assemble the fourteen-companion evidence-v2 index with qualification_mode=continuous_six_independent_recovery and resume pointing to this actual independent receipt. Run the existing full qualification/cloud-proof validators and builder described below, preserve immutable snapshots, and publish/re-read the exact final proof. A file hash establishes identity, not the truth of an observation. Never copy planned PASS booleans into a receipt without the actual operation. Both actual all-six quality and actual independent recovery remain mandatory for release.

### 1. Assemble the real manifest and exact ingest handoff

Require all six real accepted locks and no pending intent/candidate. Preserve the last actual event state and attempt log at their observed immutable commit. Assemble `daily-compiler-d1-image-acceptance-manifest-v2` from those six actual locks and the passing actual set review. Each row's context, cloud asset identity, filename, bytes, dimensions, canonical SHA-256, assignment, visible-text allowlist and accepted attempt must match retained observations. Its set summary derives from the actual set-review result, not the planned set.

Run these existing CLIs from the verified engine checkout, using new output paths:

```sh
node scripts/validate-d1-acceptance-manifest.mjs MANIFEST.json
node scripts/build-d1-ingest-handoff.mjs MANIFEST.json INGEST-MAPPING.json NEW-HANDOFF.json
```

The second CLI validates the manifest and frozen six-item mapping and calls `buildD1IngestPlan(manifest, handoff)` from `image-studio/acceptance.mjs`. It does not copy files, write Git, change state or review an image.

### 2. Persist and independently read back the identical six PNGs

Use the existing authenticated expected-head Git writer to copy the already locked canonical byte streams into the frozen ingest targets. Preserve the original per-attempt raw/canonical assets and events. Do not invoke `publishD1EventBatch` with an invented finalization event or arbitrary write set; its guarded protocol is specifically for validated attempt events.

Record the actual resulting immutable asset commit. Download every target from its exact-commit `raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/COMMIT/TARGET` URL as binary. Compute actual byte count, SHA-256, Git blob identity and PNG dimensions and compare all identities to the existing locks. A UTF-8 content reader, planned URL or successful create-blob call is not this binary readback. On failure, reconcile and resume the same bytes; do not regenerate.

Call the existing factual porter builder from `work-porter/integrity.mjs`:

```javascript
const porter = buildD1WorkPorterReceipt({
  manifest,
  handoff,
  assetsById,          // Map of actual locked cloud_asset_id to canonical Buffer
  gitReadbackByStory,  // Actual {sha256, git_blob_sha, target_path, bytes} per story
  recordedAt: actualReadbackCompletionTime
});
```

It calls `validateD1CloudAssets(manifest, assetsById, handoff)` and rejects a mismatched source or readback. Its returned claims may be retained only when the actual observed browser and transport actions establish them.

### 3. Preserve original event reviews and bind separate final review copies

Each original `REVIEW_COMPLETED` event, its v2/v3 review objects and its attempt-path canonical identity remain immutable. After proving byte identity at the ingest target, create a **separate final v3 review copy** whose only changed review field is `final_path`, now the exact ingest target. Keep the same canonical SHA-256, Git blob, reviewer context, review time, request/prompt binding, observations and result. This is a path binding after identical-byte transport; it is not a new subjective review.

Call `projectRecipeQualityProfile(story, recipeReview, finalReview)` from `image-studio/recipe-quality-observations.mjs` after the verified path-only rebinding. This accepted-only helper parses the actual measured values, validates the passed recipe and v3 review, and computes the profile's `review_sha256` from `canonicalSha(finalReview)`. The original event review and its old digest remain intact. The profile's numeric/background facts come from the unchanged criterion set's recorded response values. Never replace measurements with limits, planned counts or assumed backgrounds. Retain the source structured observations and the original/final path identity link outside the closed v3 review shape.

For this qualification, the canonical companion is the existing qualification envelope `{proof_id, images, observations, recipe_reviews}`. Its `images` are those six final v3 review copies; `observations` are six actual quality profiles; `recipe_reviews` retain every unchanged request/response, criterion review and correction lineage. `validateD1QualificationEvidence` supplies the actual runtime sessions to `validateRecipeCompanion`. Do not label this proof envelope `daily-compiler-d1-canonical-reviews-v1`: that is the separate later product envelope with edition/execution/manifest/request/source/admission/session/set/readback fields and does not accept `proof_id`.

### 4. Stage the complete immutable GITHUB_VERIFIED candidate and fourteen companions

Make the candidate state by copying the actual last-event state. Preserve `schema_version`, `proof_id`, `branch`, `request_path`, `ingest_mapping_path`, the complete `specification_binding`, `native_generations`, `accepted_assets`, `accepted_story_chats`, `owner_intervention`, `local_computer_used` and actual error history. Do not change an attempt, context, lock, source, request commit or counter. Set only the observed phase/artifact fields: `status: GITHUB_VERIFIED`, actual `acceptance_manifest_path`, `ingest_handoff_path`, `work_porter_receipt_path`, and actual `updated_at`; leave `cloud_proof_path` null until a real proof exists. Preserve the prior event-state checkpoint independently.

`PACKAGE_ACCEPTED` and `GIT_INGEST`, if retained as intermediate phase snapshots, use the same immutable-history rule. There is no claim of Git verification until the six real target-byte readbacks and full porter record exist. `validateD1ProofState(candidateState)` from `image-studio/proof-state.mjs` checks the state shape, but state shape alone is not a full qualification gate.

After actual independent recovery and both post-return scheduler readbacks, stage all fourteen actual companion files plus a `daily-compiler-d1-qualification-evidence-v2` reference record with `qualification_mode: continuous_six_independent_recovery`. Bind each file with its real repository-relative path and canonical JSON SHA-256, adding actual immutable commits where required. The `state` reference must name a frozen GITHUB_VERIFIED snapshot that remains unchanged when live progress later reaches COMPLETE. Preserve the real two-lock data checkpoint, final six-lock state/log, distinct actual task observations, independent readback receipt and preactivation quality-contract snapshot. No fixture, planned row, estimated time or unobserved boolean can fill a companion.

The pre-recovery factual six-lock GITHUB_VERIFIED snapshot/quality companions may already be published as RECOVERY_PENDING as specified above. Before claiming qualification or publishing a cloud proof, AFTER actual independent recovery, call:

```javascript
const qualification = validateD1QualificationEvidence({
  repoRoot: actualVerifiedEngineCheckoutAbsolutePath,
  evidence: {
    path: actualQualificationEvidencePath,
    sha256: canonicalSha(actualQualificationEvidenceRecord)
  },
  proofId: actualBoundProofId
});
```

This existing function in `image-studio/proof-evidence.mjs` must return PASS for the staged candidate with actual retained files and six canonical PNGs. It rechecks state/log lineage, all six admitted specifications, review/recipe histories, observed quality and set, runtime, real resume checkpoints, file hashes and exact canonical bytes. A failure leaves the cloud proof unpublished and preserves all already-persisted quality evidence and the actual state plus the exact failed condition.

### 5. Build, publish and revalidate the exact proof

Use the existing CLI, with argument paths exactly matching the companion references and an unused output path:

```sh
node scripts/build-d1-cloud-proof.mjs STATE-GITHUB-VERIFIED.json MANIFEST.json HANDOFF.json PORTER.json QUALIFICATION-EVIDENCE.json NEW-CLOUD-PROOF.json
```

It calls the same full qualification validator, requires the referenced state to be GITHUB_VERIFIED, derives claims from the retained evidence and validates the cloud proof. It does not publish, arm a task or activate D1.

Publish only the validated assembled metadata/proof and any required identical-byte files through the existing authenticated GitHub tree/commit/ref path on the same successor branch. Re-read the actual expected head before the batch; create blobs and a tree based on that exact parent; create a parented commit; update the existing branch with `force:false` and the real expected SHA. Keep operation receipts and actual outcomes. Do not reuse the attempt-only stdio publisher for an arbitrary assembly batch and do not claim an unavailable transition API.

Read back every new record from the actual resulting immutable commit, recompute its complete canonical/file hashes and re-run `validateD1CloudProof(proof, {repoRoot})` from `image-studio/activation.mjs` against the exact persisted files. The existing current state may then record COMPLETE with the actual cloud-proof path through this same validated assembly boundary; retain the immutable GITHUB_VERIFIED and other proof snapshots unchanged. A later protected activation still requires the separately bound conditional owner scope and normal protected implementation path. Neither this state transition nor the proof-branch commit is a production deployment or task promotion.

## Additional transport preflight for this new test

The prior test is qualification-ineligible because its browser actually submitted only 99 bytes of a 44,291-byte frozen prompt. Its one genuine attempt remains consumed in that original lineage. This explicit new preproduction run retains the same six specifications and every original record; its fresh allowance is per run under the owner’s standing instruction. It is not a resume or rewritten failure.

Before opening any new story context, run the repaired immutable binary reader against the already-existing failed-run raw PNG at commit 834d5ec82c2a102e16e2715f415a208c606fcd58, path qualifications/value-image-profile-v2-2026-10-08/evidence/attempts/crystal-stability-active-learning/a01/raw.png, Git blob 3aa95c5b8a5c7805820434447b7fd530a97a6476, 1,669,854 bytes, SHA256 884d0d9ac67b88905ea9e14b15aa1c1adf55ccdbc2301a45e6843ee963326c26. Read the complete repaired reader and host modules from the pinned engine and follow their actual API. Retain the exact HTTP result and independent byte/hash checks; this is read-only transport evidence, never a visual review or an accepted asset. It opens zero image contexts and consumes zero new generations.

For every generation, correction and review prompt, follow the complete non-submitting input, actual composer-readback and sent-message-readback protocol in the pinned base prompt. A model’s intended string or a successful input call is not a browser readback. Do not allow newline key events to submit a prefix. Retain the full observed input-operation/composer/sent-message receipt before treating prompt delivery as established. Any unexpected submission is a real native outcome to reconcile and preserve; never manufacture equality from the compiled input.
