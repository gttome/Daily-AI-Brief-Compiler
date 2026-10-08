# Exact prompt transport and the retained Story 1 pre-generation abort

## Scope

This is an Iteration 7 clarification for the already-existing D1 Work Cloud Browser task in `gttome/Daily-AI-Brief-Compiler`. It repairs the qualification handoff's text-transport procedure and specifies how to retain one observed zero-generation abort. It changes no image contract, prompt compiler, visual requirement, attempt budget, proof validator, activation rule, runtime or daily schedule.

The owner has already authorized bounded Iteration 7 implementation and current-contract qualification. This document does not arm a task, generate an image, apply activation or declare the October 9 release ready. The primary daily start remains 19:15 America/Chicago.

## Actual evidence at this checkpoint

Protected main was read at `7287e569f285982f122e8024ec234f5ce972132a`. The qualification branch's observed head was `6dcd08338b5d6b732b2c99523478a62b39f13e20`, whose only addition over `f1e9b0afdbdba89d4746adc3bb3d067d86a85a93` is the following immutable record:

[Runtime prompt mismatch recorded at 2026-10-08T18:18:40Z](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/6dcd08338b5d6b732b2c99523478a62b39f13e20/qualifications/value-image-2026-10-08/evidence/runtime-prompt-mismatch-20261008T181840Z.json)

The record reports an actual invocation start at 18:15:15Z, Work context, available Cloud Browser and an authenticated ordinary inner Chat target. It reports that the response was stopped before a completed assistant response or any image. It is factual blocker evidence, not a successful image proof.

| Field | Retained observation |
| --- | --- |
| Blocker | `D1_SUBMITTED_PROMPT_MISMATCH_PREGENERATION` |
| Story | `learning-without-assistant`, first in the existing request |
| Expected prompt characters | 10,861 |
| Expected prompt SHA-256 | `6b75dd110609aa276bf33b6483e1a29606efc3682d4907d7802020aad6f3a12a` |
| Reported submitted characters | 9,623 |
| Reported submitted SHA-256 | `1183c103871a5f78a33417c901097e0a17decd8f76fe3cef15d283aa4dbdde94` |
| Completed native generations | 0 |
| Genuine quality attempts consumed | 0 |
| Accepted locks | 0 |
| State / attempt log changed by that invocation | No |
| Full qualification / activation | BLOCKED / not applied |

The record contains lengths and hashes, not the differing submitted text. It therefore does not establish whether the cause was truncation, model reconstruction, whitespace normalization, or another change. The exact cause remains unknown. A shorter rendered transcript alone must not be treated as an explanation of what the browser submitted.

The actual state and attempt log at that branch commit remain `PLANNED`, zero generations, no accepted assets, and an empty story-attempt list. A read-only invocation of the existing `nextD1ProofAction` on those exact records returned `START_WORK_BROWSER_STORY_1`.

## Immutable identities to preserve

| Identity | Existing value |
| --- | --- |
| Existing Work task | `6ac6cf14a9e88191af48c353b9bc1e11` |
| Proof | `value-image-2026-10-08` |
| Qualification branch | `qualification/value-image-2026-10-08` |
| Editorial source commit | `73b41c7312c9b1ad98fc33f455dc62cdc686476b` |
| Request storage commit | `5d9d89bcdeb2b75e7f1d8fa3aae96d26229aa29b` |
| Bound image runtime engine | `aee4f026e88a30e14369099d45f95514933f4707` |
| Request SHA-256 | `97452833383d27312f0095e41a2f09b811cd833551b04a5e24a7c2c3ea09254b` |
| Source evidence SHA-256 | `73d567ff550cc25a5ef5250cbfa0e78f47d87fc02da1be4db344b145d0f930bf` |
| Unchanged attempt-log SHA-256 | `da675d90f437e94a365bebe3b44ddd70c4bac758d823ae35c55c3bb3d3db2a97` |

The saved task conversation must remain unchanged and be evidenced through actual operator readbacks. Publish only its opaque identity. A new documentation commit does not replace the request storage, editorial source or image runtime engine. Main's code-only completion remains distinct from live qualification, protected activation and a frozen release.

## Exact input procedure

[The admission compiler](../../../../image-studio/spec-admission.mjs) already builds a deterministic single-story prompt and provides `assertD1SubmittedPrompt`, which requires strict string equality. [The existing admission CLI](../../../../scripts/admit-d1-specifications.mjs) writes the complete prompt with no added newline and refuses to overwrite inputs or existing outputs.

All six stored prompts were independently recompiled and compared in a read-only check. Each stored file exactly matched the compiler output and the protected prompt-binding digest. Story 1 is exactly 10,861 UTF-8 bytes as well as 10,861 characters; its correct immutable input is already present:

[Canonical Story 1 prompt at the request storage commit](https://github.com/gttome/Daily-AI-Brief-Compiler/blob/5d9d89bcdeb2b75e7f1d8fa3aae96d26229aa29b/qualifications/value-image-2026-10-08/prompts/01-learning-without-assistant.txt)

The runtime must first revalidate all-six admission and current state/lineage, then obtain that complete compiler-produced string. It must not rewrite or narrate the JSON, shorten the text, normalize whitespace or line endings, trim, add fences, or append operational instructions.

Use only the input and readback capabilities actually exposed by Work Cloud Browser. Transfer the verified string directly and compare the complete actual composer value immediately before sending. Retain the canonical string, the exact input argument, the observed composer value, UTF-8 byte counts and SHA-256 values as public-safe evidence outside the story chat. Do not assume a filesystem bridge, clipboard method, browser method or hidden API exists.

A hash of compiler output proves what was intended. Equality of that output with itself does not prove what entered the browser. If the actual composer differs, do not submit or consume an image attempt. The same supported input capability may replace the unsent draft and recheck it. If full input/readback or strict equality cannot be established, retain the precise capability blocker and stop.

Retain the observed send action with its verified input binding. Complete raw sent-message readback, when exposed, provides additional evidence. Rendered or normalized text must be labeled as such; do not substitute its digest for the submitted byte stream. This procedure does not impose an unavailable hidden-message API as a new gate.

## Narrow treatment of the aborted context

This clarification applies only to the aborted context identified in the immutable mismatch record:

`ctx-6afb8dd8d2feb32116d80f0c1f51e6d026b0824ae6f2f84caeb1538b54ee5f17`

The next authorized invocation must reconcile that context's actual outcome with current state and all retained lineage before new generation. If a completed generation or pending image exists, retain its bytes, prompt/context provenance and history. Do not discard it, silently continue from zero attempts, or replace the context to evade its record. An outcome that cannot satisfy the unchanged exact-prompt/context requirements remains a blocker.

Only if there are zero completed generations and no pending image may that one context be retired from generation use as blocked infrastructure. Preserve its original record and opaque context identity. Do not send a second initial prompt into it and claim `fresh_regular_conversation: true` or `prior_context_reused: false`.

The same unchanged request can then start its first valid Story 1 generation in one fresh ordinary context, with the original four-genuine-attempt budget. This is not a new qualification case or an attempt reset. No other story context is authorized for replacement by this clarification.

The [current D1 contract](../../../../contracts/d1-image-contract.json) requires fresh ordinary contexts, exact canonical prompts and preservation of accepted images. The [existing proof-state adapter](../../../../image-studio/proof-state.mjs) distinguishes completed visual attempts from infrastructure records. An infrastructure row, if retained in an attempt log, must have `native_generation_completed: false`, `quality_attempt_consumed: false` and `status: BLOCKED_INFRASTRUCTURE`, with no image `result` or `review`. Its addition must preserve earlier records and reconcile the state's attempt-log digest. Keeping the original abort as separate immutable infrastructure evidence does not require rewriting the protected initial scaffold.

The [qualification validator](../../../../image-studio/proof-evidence.mjs) requires six mapped accepted story-generation sessions. All genuine attempts and canonical reviews for each story must remain in its one valid generation context. The retired zero-generation context stays visible in infrastructure history; it is not a seventh accepted session or an erased event.

## Proof and activation boundaries

The task must still stop after durably accepting Stories 1 and 2, leaving Story 3 unopened. Only a later actual invocation of the same existing task, with the required operator readbacks and one-hour separation, can produce the Story 3 pending-candidate checkpoint. Scheduled times or different derived hashes alone do not establish two executions.

All fourteen companion records remain mandatory: state, manifest, handoff, porter, request, source evidence, attempt log, admission, quality contract, runtime, canonical reviews, binary readback, resume and set review. Keep canonical-byte review in each same story chat, all actual attempts, six-image differentiation, and immutable-commit raw Git binary verification. The [qualification evidence contract](../../../D1-QUALIFICATION-EVIDENCE.md) and executable validators remain unchanged.

No accepted image, exhausted R1/R2/R3 case or terminal edition may be reopened. No image is generated in the standard implementation chat. This document neither activates D1 nor arms a task, creates a schedule, allocates October 9, or changes production. A complete compatible actual proof must precede the separately authorized normal protected activation, final-engine isolated delivery and release freeze.

## Verification of this documentation change

Only this document and `live-qualification-task-prompt.txt` change. The normal/correction prefix, all eighteen required binding placeholders, and qualification execution steps 2 through the end of task authority are preserved byte-for-byte. The prompt adds an exact input/readback procedure and the one identified pre-generation-abort interpretation.

Current-main bytes of the prompt compiler, proof-state adapter, qualification validator and D1 quality contract were independently compared with the verified request-engine archive and match exactly. No runtime code or quality requirement is modified. Read-only prompt equality checks are code/input evidence; they are not live image, activation or release PASS claims.
