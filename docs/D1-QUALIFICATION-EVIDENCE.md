# D1 qualification evidence and protected activation

## Purpose

Full image-lane qualification must be supported by the retained artifacts that
establish it. The former cloud-proof builder could emit `PASS` from a failed
manifest containing six different chat strings, an incomplete state and a
digest-matching porter stub. It did not validate the manifest or its set verdict,
and filled in browser and binary-readback claims itself.

Iteration 2 closes that proof-construction gap. The builder and activation gate
now validate the same file-backed qualification evidence. This is mandatory
image/integrity validation. It adds no image executor, scheduler, controller,
observer requirement, runtime repair loop or new generation attempt.

The quality contract remains `daily-compiler-image-contract-v5`, the cloud proof
remains `daily-compiler-d1-cloud-proof-v2`, and the activation receipt remains
`daily-compiler-d1-activation-v2`. A current full proof requires an explicit
`daily-compiler-d1-qualification-evidence-v1` binding. Historical aggregate-only
assertions do not establish current qualification. Historical one-image proofs
remain preserved and useful within their original capability/byte-identity scope.

## Prepare evidence in the approved image lane

Before any new story chat, follow the all-six admission described in
`D1-IMAGE-SPECIFICATION-ADMISSION.md`. Preserve the current request, separate source
evidence, accepted locks and complete attempt log. Admission does not grant a new
budget to an exhausted lineage. Do not retrofit R3 or rename its request to
obtain another attempt.

The existing executor records what actually happened: isolated ordinary story
contexts, native attempts and pixel reviews, canonical acceptance, transport,
interruption/resume and the final set review. Use opaque context digests in public
evidence. Do not publish private conversation URLs, account information or raw
owner planning inputs.

After six stories are individually locked and exactly persisted, retain the
qualification inputs in the repository. References must survive a fresh checkout;
temporary download locations and expiring cloud URLs are insufficient. Snapshot
mutable execution checkpoints and the preactivation quality contract into
immutable evidence files. Do not overwrite those snapshots when the active
execution advances to `COMPLETE` or the global activation receipt changes.

The companion uses relative paths and canonical JSON SHA-256 values:

```json
{
  "path": "rehearsals/example/evidence/manifest.json",
  "sha256": "<canonical JSON SHA-256>"
}
```

An immutable commit is additionally required where the validator binds an exact
request, resume checkpoint or binary readback. The request reference's `commit`
identifies the persisted request; `request.source_commit` identifies its separate
editorial source. This example is notation, not executable evidence.
The validator rejects missing or changed records and paths that escape the
checkout, including symlinks. The precise machine requirements are defined by
`contracts/d1-qualification-evidence.schema.json` and
`image-studio/proof-evidence.mjs`.

## Required records

| Companion field | What the retained record must establish |
|---|---|
| `state` | A frozen valid six-image `GITHUB_VERIFIED` or `COMPLETE` checkpoint, with exact proof, branch, request, accepted assets and story contexts. |
| `request` | The current admitted six-story request at its exact persisted commit, retaining its separate editorial-source binding. |
| `source_evidence` | Separate source-supported facts and concepts, bound to that request. |
| `attempt_log` | All genuine attempts and accepted locks, consistent with the state and the per-story manifest. No fifth attempt or reset. |
| `admission` | A real all-six admission result bound to the request, source evidence, set plan and applicable contracts. |
| `quality_contract` | The immutable contract snapshot used for admission and acceptance. Its quality requirements must still match the current contract. |
| `manifest` | Six distinct, individually accepted and locked canonical PNGs, their contexts, assignments, allowlists and passing set verdict. |
| `handoff` | Exact Compiler repository, branch, proof/execution identity, manifest digest and six story-to-target mappings. |
| `porter` | Six matching integrity rows, correct scope, source/readback hashes, Git blobs, dimensions and no image generation or owner transfer. |
| `runtime` | Actual unattended operation of the existing Work image task, six fresh ordinary story contexts, exact prompt bindings and the required browser/native-generation boundaries. |
| `canonical_reviews` | Final canonical-hash-bound pixel reviews in each same story context, including current D1 mechanism requirements. |
| `binary_readback` | Six actual immutable-commit raw GitHub binary downloads with matching byte counts, SHA-256 and Git blob identities; raw/canonical identity and the permitted normalization rule. |
| `resume` | Actual saved state/attempt checkpoints at distinct immutable commits and separate invocations of the same existing task, preserving the first two accepted hashes, contexts and attempt counts, then continuing at Story 3. |
| `set_review` | The existing v3 actual-pixel set review: six compositions, at least four layouts/grammars/hierarchies and three annotation patterns, plus no repeated dominant template. |

The set review is a planner/reviewer artifact outside the six story-generation
contexts. Different signature strings are insufficient when the observed set
fails. A failed final set never silently unlocks accepted images; any supersession
still requires the existing explicit correction authority.

The active normalization rule remains deterministic resize only when needed to
reach 1200 by 630. It does not permit semantic image editing. Acceptance must bind
the canonical bytes reviewed in the same story chat. The repository-byte check
recomputes canonical SHA-256, Git blob identity, byte count and dimensions.
Raw downloaded identity remains retained runtime evidence; this validator does
not reconstruct raw image bytes or apply a new normalization transform.

## Build and validate

Run from the repository root only after the approved executor has retained all
actual evidence:

```sh
node scripts/build-d1-cloud-proof.mjs \
  rehearsals/example/evidence/state-github-verified.json \
  rehearsals/example/evidence/manifest.json \
  rehearsals/example/evidence/handoff.json \
  rehearsals/example/evidence/porter.json \
  rehearsals/example/qualification-evidence.json \
  rehearsals/example/cloud-proof.json
```

The explicit input paths must match the companion. The builder refuses incomplete
or mismatched evidence and refuses to overwrite an existing output. It copies
validated runtime/readback claims from their evidence instead of supplying them
as unconditional constants. It performs no browser or scheduler operation.

`validateD1CloudProof(proof, {repoRoot})` validates the bound evidence again.
`applyD1Activation` and subsequent activation validation use that same path, so
hand-authoring aggregate `true` flags cannot bypass the artifact requirements.
The validator allows only `activation_status`, `activation_receipt_path` and
`activation_receipt_sha256` to differ from the preserved preactivation quality
snapshot. Changes to actual quality requirements invalidate compatibility.

A structurally valid proof still requires the existing explicit protected
activation authorization and normal protected PR/check/merge process. This
implementation does not apply an activation receipt or arm the image task.

## Evidence limits and independent results

Hashes establish that retained records and bytes match; they do not establish
that an asserted observation is true. Pixel observations, fresh-context checks,
unattended execution and download provenance must be obtained from the actual
approved runtime. Test fixtures are explicitly synthetic structural tests and
must never be represented as live qualification.

Keep these results separate:

- `CODE_PASS`: the required implementation checks passed.
- `PREMIUM_LANE_QUALIFIED`: all compatible actual six-image evidence passed.
- `ACTIVATION_AUTHORIZED_AND_APPLIED`: the separate protected activation is proven.
- A readiness handoff is requested, armed and read back only when those distinct
  operations actually occur; computing a schedule payload is not arming.
- Publication requires its own protected deployment and live-byte verification.

The current Iteration 2 lineage, scheduler observation, tests and exact remaining
blocker are recorded under
`docs/implementation/oct9-value-and-improvement/iteration-02/`. That folder is a
development handoff, not a new runtime authority or mandatory observer dependency.
