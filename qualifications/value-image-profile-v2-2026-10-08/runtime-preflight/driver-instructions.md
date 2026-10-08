# Same Work invocation: deterministic serializer and existing GitHub writer

This document is prospective operator guidance. It does not attest to a live capability, tool call, user approval, image attempt or publication. The exact approved engine and request bindings must be real immutable commits before use.

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

The two path variables above are actual caller observations, not literal placeholder paths. `batchPath` must be under `root`. Preserve the returned receipt and observations without printing native PNG payloads. The helper starts the exact Node publisher through a raw, non-echoing PTY and answers only `getHead`, `readFile`, `createCommit` and `updateRef`. It does not call a separate model, run images, schedule a task or introduce a network/credential client.

It requires these existing exposed tool functions: `exec_command`, `write_stdin`, `mcp__codex_apps__github_fetch`, `mcp__codex_apps__github_fetch_file`, `mcp__codex_apps__github_create_blob`, `mcp__codex_apps__github_create_tree`, `mcp__codex_apps__github_create_commit` and `mcp__codex_apps__github_update_ref`. Discover the actual connected capabilities if necessary. A missing function is a real capability blocker; a supplied name in this document does not make it available.

## Exact preflight order

1. Fetch the root-prepared `runtime-preflight/normalized-terminal-input.json` at its actual immutable publication commit. Independently verify that its normalized records retain the old request/log/state identities and accounting. Run `node scripts/record-d1-image-event.mjs validate-only INPUT.json`. Require `EXIT_BLOCKED`, four genuine generations, zero accepted, `FAIL_ATTEMPT_LIMIT` and zero permitted new generations. Retain full stdout, CLI and loaded-module hashes and actual engine-checkout verification. Do not write to the old branch.
2. Publish TEST_ONLY seeds at actual request commit S, then publish initialized state binding that request S at actual state commit B. Both are on the existing successor branch; neither is an image attempt. Record the real commits and digests. The implementation operator performs these preparation writes before the approved live invocation.
3. In that approved invocation, read request/source at S and current fixture state/log at B, verify all canonical hashes, and observe the actual current branch head. A later unrelated commit on the same branch changes expected head; do not retain a stale B as the presumed current head. Keep the request commitment S unchanged.
4. Build a concrete CLI input containing `state`, `attemptLog`, `request`, `sourceEvidence`, `expectedStateSha256`, `expectedLogSha256`, `engineSha`, `expectedHead` and `event`. Supply actual observed event time and evidence-derived `ctx-` identities. Use only the fixture event shape in `TEST_ONLY/preflight-seed.json`, with `external_outcome: NOT_INVOKED`. Do not add raw/canonical files, pixels, a review or an acceptance.
5. Run `node scripts/record-d1-image-event.mjs emit INPUT.json NEW-BATCH.json` to an unused path under the verified engine checkout. Require a validated batch with exactly the fixture state, log and event writes. The CLI only emits a local batch; it does not prove Git publication.
6. Call the reviewed host above with that exact batch path. Require expected-head publication and real immutable-byte readback through the actual exported publisher. Retain the original complete batch, file hashes, observed connector calls, real parent and resulting commit. The fixture consumes zero native generations, zero quality attempts and zero accepted assets.
7. Read the resulting fixture state/log from their actual commit. Invoke the serializer again with the identical event and matching current digests; require `UNCHANGED` and zero writes. This result is a local no-op, not a publication batch: do not submit it to the publisher.
8. Attempt the original validated batch again with its original expected head against the now-advanced actual branch. Require the publisher's `stale_expected_head` failure before any new commit. Do not modify the expected head inside an old batch, force a ref update or retry an unknown mutation outcome. Reconcile any ambiguous external outcome first.
9. Preserve actual capability observations for this caller. A separate implementation caller's receipt, unit-test success or supplied engine string cannot stand in for the existing Work task's actual preflight. Continue to the separately approved live six-case request only when the actual preflight passes.

## Live event handling

Use the same verified CLI and publisher path for each actual `GENERATION_INTENT`, `GENERATION_COMPLETED`, `REVIEW_COMPLETED`, `ACCEPT_LOCK` or permitted infrastructure event. The serializer sets immutable per-attempt paths and updates state/log together; do not independently edit totals or mark a lock. For generated/canonical bytes, place actual files under the input directory and pass the permitted relative filenames. The CLI rejects path escape and enforces size limits.

Before acceptance, preserve the complete actual same-story canonical review request/response and bound criterion observations. The publisher independently fetches canonical bytes at the claimed immutable commit; tool metadata or a UTF-8 text representation is not binary identity evidence. The separate full-lane raw-GitHub exact-commit binary readback requirement remains mandatory for all six accepted PNGs.

The fixture's successful publication establishes only the observed code-integration path and zero-generation accounting. It never substitutes for browser isolation, actual prompt equality, native generation, canonical pixel acceptance, the two-image interruption/resume, any of the fourteen companions, activation or delivery.
