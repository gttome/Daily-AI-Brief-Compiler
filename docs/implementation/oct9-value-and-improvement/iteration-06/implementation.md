# Iteration 6: product release integrity and additive corrections

Scope: `gttome/Daily-AI-Brief-Compiler`, Iteration 6 only. The source package requires `PRODUCT_RELEASE_AND_CORRECTION_FIXTURES = PASS`; current live qualification and the final combined release are assessed in Iteration 7. Actual protected commit/check results are recorded in the completion files, once observed.

## Core product boundary

The compiler consumes the sealed edition, its exact raw bundle digest, current media evidence, image acceptance and canonical-byte evidence. Operator dashboards, run metrics, learning, events and human-readable reports do not establish correctness or authorize terminal success. A missing or failing optional observer cannot suppress a genuine product failure.

The compiler's temporary copy of the existing reader omits optional analytics, QA and editorial-feedback generation and inputs. Exact source hashes and counted source blocks guard this narrow projection; the vendored originals stay unchanged. Reader Trend Radar, Watchlist, ratings, sharing, comments and other product routes remain. Golden parity compares the resulting required reader pages against the untouched reference. Missing or import-failing optional modules are tested in fresh processes with network and extra-process calls denied.

Current D1 strategy resolution uses `d1_work_browser_fresh_chat`, contract v5 and the existing `IMAGE_BROWSER_ORCHESTRATION_AND_INGEST` Work scope. Unsupported or conflicting labels, missing system metadata and new editions attempting an unregistered legacy fallback fail. Frozen historical bundles retain exact registered compatibility without acquiring a new qualification claim. The unchanged Iteration 3 media fixture has its own exact test-only compatibility entry.

The core requires the existing activation validator to pass independently. The production D1 contract is unchanged and remains `proof_required`. All current-D1 PASS inputs in these tests are isolated, explicitly synthetic fixtures; none is real image proof or activation authority.

## Canonical image evidence

`image_system.canonical_reviews_path` and `canonical_reviews_sha256` identify a `daily-compiler-d1-canonical-reviews-v1` envelope governed by `contracts/d1-canonical-reviews.schema.json`. Its inputs are records already required from the separate approved image runtime: sealed per-story request and source evidence, independent specification admission, actual per-image v3 reviews, image-quality profiles, fresh story-context/attempt records, v3 set review and exact-commit binary readback.

The gate binds those records to the exact six selected story objects, edition/execution, acceptance manifest, ingest target, porter receipt, image path, SHA-256, Git blob, byte count, dimensions and locked identity. Reviewed canonical bytes must be the published bytes. Native originals and any deterministic resize are separately identified; semantic editing, mutable readback URLs, false summary flags and stale or missing review bindings fail. A per-image immutable commit may override the batch readback commit so a later correction can retain every untouched asset's original readback record. GitHub performs no new subjective visual review.

A complete PNG check verifies signature, chunk bounds/order, CRCs, dimensions, supported encoding, bounded deflate output and scanline filters. This validates the file without changing its pixels. It complements the digest and external review evidence.

Raw bundle and copied verification receipt hashes cover the exact serialized bytes. Structured evidence references use the repository's canonical JSON SHA-256. Git blob identities include Git's length-prefixed blob header. These identities are not interchangeable.

## Additive corrections

A correction preserves the original terminal `base_run`, exact original bundle text/digest and old accepted assets. The candidate uses a separate `daily-compiler-correction-revision-v1` record: correction and revision IDs, expected previous bundle digest, selected story IDs, immutable superseded/new asset manifests, scope and verification-receipt binding. It never moves the base execution back to BUNDLE_READY.

Only actual changed assets belong to the selected scope. Same-byte retries are unchanged operations; mixed retry/change batches cannot widen the correction scope. All requested asset identities and stale expected hashes are checked before filesystem writes. Applicators stage a complete fresh directory through one rename, reject conflicting output and traversal/symlink escapes, and preserve source inputs.

Current D1 image corrections may version the acceptance, ingest, porter and canonical-review reference pairs while retaining strategy, contract and all unselected story-level evidence. The compiler replays recorded corrections, validates original and candidate evidence, verifies every historical asset and rejects stale or unverified predecessor lineage. Story IDs, permanent routes and reader feedback identities remain stable.

The batch CLI takes the immutable terminal base-state file explicitly:

```text
node scripts/apply-image-correction-batch.mjs \
  bundle.json request.json corrections.json asset-root \
  new-revision-directory base-state.json [previous-revision.json]
```

The staged revision and candidate bundle are inputs to the existing compiler:

```text
node compiler/compile.mjs \
  --state new-revision-directory/revision.json \
  --bundle new-revision-directory/bundle.json \
  --out build/reader-source --repo-root .
```

A separate correction finalization path requires current mandatory source, built, history and live verification receipts. It creates an additive verification record and a new verified revision without writing the original terminal state. Staging or code tests alone never mark a live correction verified. No actual correction is authorized or applied by Iteration 6.

```text
npm run correction:finalize -- \
  . new-revision-directory/revision.json new-revision-directory/bundle.json \
  build https://gttome.github.io/Daily-AI-Brief-Compiler/ new-verified-directory \
  original-terminal-state.json original-bundle.json
```

This requires already-obtained complete live evidence. The new directory retains `verification-receipt.json`, `revision.json` and immutable copies of the exact underlying proofs. The command performs no deployment, network request or image operation.

## Reader and release integrity

The public-safe build manifest binds bundle identity, permanent story/image/source/feedback mappings and the four selected media records. Built verification checks actual displayed image URLs and alt text, current media links and copy, ratings, shares, comments, source links, required routes and accessibility. An existing correct image file cannot conceal a wrong displayed image.

Live artifact checks compare served bytes with the exact built and history-merged artifact across required routes and all six canonical images. A read-only artifact-check receipt is distinct from a full live receipt; the latter also requires the existing reader feedback persistence checks. No live endpoint or feedback store is used in Iteration 6 fixtures.

A historical correction starts from the newest published reader and overlays only the target dated/permanent routes and image aliases. Newer homepage/latest, shared navigation, feeds, archive, feedback registry, runtimes and other editions retain their bytes. Newer edition builds retain all prior permanent history and original asset versions.

The protected validation workflow explicitly checks out the pull request head (or exact push SHA), retaining Node 20 and pinned `sharp@0.34.4`. Its existing deterministic fixture is additionally built with the same Pages Jekyll action already used by this repository and checked with the built-reader verifier. This CI step does not deploy or start an edition.

## Acceptance evidence map

| Package ID | Repository tests |
|---|---|
| I06-T01 | `tests/observation-noninterference.test.mjs`: same frozen qualified content with optional artifacts absent, stale or failing; fresh-process missing/throwing modules; exact reader/bundle/image/core-terminal bytes and allowed side effects. |
| I06-T02 | `tests/d1-bundle-gate.test.mjs`, observation and release-integrity tests: false-green image/media/receipt/route failures propagate. |
| I06-T03 | `tests/product-correction-integration.test.mjs`, correction batch/application/finalization tests: one, subset and all-six changes; immutable terminal base and unselected semantics/evidence. |
| I06-T04 | `tests/correction-files.test.mjs`, correction batch/application tests: stale identities reject before writes, including a later invalid asset in a batch. |
| I06-T05 | `tests/history.test.mjs` and release-integrity tests: older correction retains the newest reader and permanent history. |
| I06-T06 | `tests/d1-bundle-gate.test.mjs` and release-integrity tests: active current proof, true canonical review binding, exact bytes and displayed route references. |
| I06-T07 | `tests/release-integrity.test.mjs`, existing media/reader/feedback tests and the actual Jekyll fixture build: reader routes, media, feedback, source and accessibility parity. |

## Preserved work and exact external boundary

`baseline.json` records protected main, successful predecessor PRs/checks, all relevant historical/proof branch heads, the October 8 terminal bundle/accepted identities and the current R3 proof blocker. Iterations 1 and 3 are reused; Iteration 5 source qualification and migration provenance remain unchanged.

The separately approved image runtime, original R1 asset, R1/R2/R3 attempt lineage and October 7/8 terminal histories are preserved. The current R3 record is BLOCKED after four Story 1 quality attempts, with no accepted set. There is no new browser/scheduler capability assumption, owner asset transfer, image generation, qualification claim or activation in this change.

Independent release fields remain separate: Iteration 6 code/fixture results do not establish `CORE_RELEASE_READY`, source rollout completion, observation release, learning report completion, image activation or an edition release. Iteration 7 is next, subject to its own dependencies and the existing explicit image activation approval.
