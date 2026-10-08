# Image completion handoff and post-publication corrections

Owner directive: October 7, 2026, 8:34 PM America/Chicago. Repository scope: `gttome/Daily-AI-Brief-Compiler` only.

## Required outcome

When the main semantic run finishes its articles and sealed image specifications, hand the exact edition to the existing Work image task immediately. Re-arm that same task for each edition's actual readiness time instead of making a ready edition wait until 10:15 PM. After quality acceptance, Git integrity, protected deployment and live verification, report images published. A scheduled task or an accepted local image is not publication.

Allow an owner-requested correction to replace one, several, or all six images after publication. Keep the edition identity, completed semantics, original assets and historical evidence. A correction is a revision of that edition, not another production execution or an excuse to reset an exhausted proof.

## Two independent gates

### Current D1 specification admission

New D1 generation requests must first pass the versioned all-six admission in
`docs/D1-IMAGE-SPECIFICATION-ADMISSION.md`. Use `scripts/build-d1-image-handoff.mjs`
for their admission-bound handoff and `scripts/admit-d1-specifications.mjs` for
each exact single-story prompt. The original `build-image-lane-handoff.mjs` remains
a historical schedule-payload helper, not proof of generation eligibility.
Accepted-asset transport and terminal history retain their existing paths; do not
regenerate accepted bytes or rewrite exhausted proof requests to add this schema.
No script in this admission change calls the scheduler or establishes browser availability.

- **Readiness:** articles and six story-specific specifications are durably persisted and digest-bound. This is when the semantic run hands off, even though image generation and final publication are unfinished.
- **Permission and capability:** the normal D1 lane still requires its protected activation evidence. This change does not activate D1 or declare the failed R3 proof successful. An explicit owner-requested image correction may use the approved browser route within that correction's scope without changing the edition's original strategy or activating global D1.

If either gate fails, record the exact blocker. Never silently use a weak diagram or claim that scheduling has resolved a quality failure. A main run finishing with legacy images is not evidence that premium replacements exist.

## Completion-triggered scheduling

Reuse Work task `6ac6cf14a9e88191af48c353b9bc1e11` (D1 Work Image Lane). Its Work conversation identity must be preserved; do not create an ordinary-chat replacement task.

The separate D1 Activation Gate must not restore a fixed 10:15 PM recurrence or overwrite the lane's current prompt/target. Its previous terminal-proof restoration instruction would otherwise undo the completion-driven handoff. Preserve its activation proof requirements; use `contracts/image-lane-activation-guard-prompt.txt` for the schedule-safe guard prompt.

The Primary and each Recovery task must perform this handoff when they first observe durable semantic/specification readiness:

1. Persist an image request containing edition date, original execution ID, exact source commit, branch, request path, sealed specifications and their hashes, selected story IDs, normal/correction mode, accepted locks and attempt history.
2. Build a handoff with `scripts/build-image-lane-handoff.mjs`. Input fields are `edition`, `executionId`, `branch`, `requestPath`, `requestSha256`, `readyAt`, `now`, optional `lastRunAt`, and optional `previous` receipt.
3. Read the existing task. If another target is actively running, leave its binding intact and persist this target as pending for the same lane. Do not overwrite active work. On completion, the lane consumes the next durably ready target.
4. Update the existing Work task with the returned one-shot schedule and an exact target binding in its prompt. Keep the base browser, quality, transport and publication instructions. The next Primary/Recovery readiness event re-arms the same task. No new schedule per edition, supervisor, watchdog, polling loop or extra worker.
5. The intended due time is one minute after readiness handling, subject to the scheduler's one-hour minimum between invocations. If that minimum delays execution, record the actual due time; never claim instantaneous execution.
6. Read back the saved task ID, enabled flag, target binding, schedule and unchanged conversation ID. Persist `scheduler_readback_verified=true` only after they match. An identical verified handoff is a no-op; an unverified handoff is repairable.
7. Missing scheduler access is `IMAGE_HANDOFF_SCHEDULER_UNAVAILABLE`, not success. Missing browser access is `IMAGE_LANE_BROWSER_UNAVAILABLE`. Expired authentication is `AUTH_REFRESH_REQUIRED`. Infrastructure failures consume no visual attempts.

The previous daily 10:15 PM recurrence is replaced by an exact one-shot when a ready handoff is armed. Do not retain a competing recurring image run after that handoff. All times must retain America/Chicago as the user timezone; UTC instants may be used in an exact VEVENT.

## Execution and publication

Read the bound request, not merely the newest nonterminal edition. A published edition with a pending correction is eligible for the correction lane. Normal runs continue to respect their immutable original image strategy and activation contract.

For every selected unaccepted story:

1. Use Work Cloud Browser and the authenticated session, with one new ordinary regular ChatGPT chat for that story. No Temporary Chat, Work-native image generation, subagents, local computer, paid API/service or owner transfer.
2. Send only that story's sealed material, exact text allowlist, assigned composition and neutral quality rules. Never send repository, orchestration, publication, prior-story or prior-image context.
3. Review actual generated pixels in the same story chat. Require all objective checks and premium finish. Use at most four genuine visual attempts per story/request; retries must address observed defects. Never reset the counter by renaming a request.
4. Download exact bytes. Deterministically resize to 1200×630 only if necessary, then review the canonical bytes in the same story chat. Persist accepted locks immediately, with story ID, chat ID, attempt, dimensions, bytes, SHA-256, Git blob identity and review evidence.
5. Resume transport/CI/publication from the lock. Never regenerate an accepted replacement to solve a transport or deployment error.

For six new images require the existing complete-set gate. For a subset correction require quality and integrity for every selected image and demonstrate that all unselected asset references and bytes remain identical. Do not weaken the six-image production validator to accept partial sets.

After accepted assets are persisted, independently retrieve each exact immutable-commit PNG as binary and compare byte count, Git blob SHA and SHA-256. Use versioned asset paths so cached historical URLs do not silently change. Build the corrected bundle, run protected exact-head CI, merge only through repository protections, deploy and check homepage, latest, dated and story routes. Read every changed live image and compare its SHA-256. On an old-date correction, keep the newest edition as homepage/latest; patch only the selected historical pages and shared archive references.

The Work lane must continue to deterministic compile/deploy/live verification when authorized and available, or persist a precise handoff blocker. Do not stop at `GITHUB_VERIFIED` and wait for the next fixed Recovery slot when publication can proceed immediately.

## One, some or all images

Use stable story IDs; resolve display numbers against the chosen edition before constructing a request.

| Requested scope | `story_ids` |
|---|---|
| One image | One exact story ID |
| Several images | The explicit selected IDs, without duplicates |
| All images | All six IDs from the immutable source bundle |

The correction request uses `schema_version=daily-compiler-image-correction-request-v1`, a unique `request_id`, `edition_date`, original `execution_id`, `source_commit`, selected `story_ids`, reason, bounded attempt history, `preserve_original=true` and `new_execution_allowed=false`. Set `status=READY_TO_APPLY` only after all selected images have passed and been locked.

Create one existing `daily-compiler-post-publication-correction-v1` record per selected image, with `correction_type=replace_image`, `semantic_scope=image_only`, `target.story_id`, and `target.expected_sha256` equal to the source bundle's current hash. Each replacement needs a new path, byte count, SHA-256, Git blob SHA, `accepted=true`, `accepted_locked=true`, and a canonical-hash-bound PASS review with `quality_gate_location=fresh_regular_chat_per_story`.

Run:

```sh
node scripts/apply-image-correction-batch.mjs \
  original-bundle.json request.json validated-corrections.json \
  asset-root staged-output
```

This stages `bundle.json` and `receipt.json` without mutating the input. It checks selected IDs, stale hashes, quality bindings, PNG signature/dimensions, bytes, SHA-256 and Git blob identity. It preserves article text, media, book mappings, watchlist, producer history and unselected images, and appends correction records. The stage receipt explicitly says `publication_verified=false`; it is not a deployment receipt. Existing asset decode, compiler, CI and live verification gates still apply.

The original published terminal receipt remains historical evidence. Store correction progress separately. Use the same edition identity for a deterministic revision build; do not rerun editorial discovery or content generation. Preserve prior bundle and original asset paths. Correcting a previous accepted image is explicit owner-authorized supersession, not a transport-driven regeneration.

## Completion evidence required before next-run readiness can be claimed

For a full current D1 qualification, follow
`docs/D1-QUALIFICATION-EVIDENCE.md`. The cloud-proof builder and activation gate
both require its digest-bound companion records, including actual canonical
pixel review, observed set variety, accepted-lock resume evidence and exact
binary readback. Preserve immutable input snapshots when the active execution
state advances. A one-image capability proof, local CI, or an owner-selected
correction does not substitute for the full qualification. This requirement does
not change the existing scope of authorized image-only corrections or their
accepted-asset transport.

- Primary and Recovery handoff prompts are saved and read back.
- The same Work task is actually re-armed from a real semantic completion, with exact target and due time verified.
- An unattended run has Work Cloud Browser and can resume its signed-in session.
- All selected images pass quality; locked assets survive a transport restart without regeneration.
- A subset correction demonstrably preserves unselected images and all semantics.
- A full correction replaces all six, with exact Git and live byte equality.
- Concurrent/stale requests are rejected, old-date corrections do not regress latest, and duplicate handoffs do not create duplicate executions.
- D1 activation is still gated by its required proof; this hardening does not satisfy or bypass that proof.

Code unit tests establish selection, preservation, stale-target, integrity-binding and schedule-payload behavior. They do not establish unattended browser availability or image quality. Report those remaining gates honestly.

