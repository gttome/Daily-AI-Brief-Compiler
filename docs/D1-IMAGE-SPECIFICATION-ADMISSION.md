# D1 image specification admission

Iteration 1 adds a deterministic pre-generation gate to the existing D1 v5 lane.
It preserves the ordinary story-chat image executor, canonical resize-only policy,
pixel review, accepted locks, coarse stages and protected activation gate.

## Result and boundary

`IMAGE_SPEC_ADMISSION=PASS` means six specifications are structurally complete,
source-bound, assigned deliberately different compositions, and eligible for
single-story prompt compilation. The receipt always records zero opened story
chats, zero consumed visual attempts and `generation_authorized=false`.
It does not establish source truth, visible causal density, premium aesthetics,
actual isolation, native runtime availability, activation or publication. Those
facts remain the responsibility of their existing evidence and qualification gates.

The source-support input is a projection of already verified editorial evidence.
Its facts and story-content hashes must come from the persisted source record at
the pinned commit. Admission checks identity, exact support strings and digests;
it does not fetch a website or transform a claimed fact into verified evidence.

## Versioned inputs

`contracts/d1-image-admission-contract.json` specifies schema versions, bounds and
the canonical diversity thresholds. `image-studio/spec-admission.mjs` enforces
exact keys and types at every level; unknown fields fail closed. A complete
synthetic, nonproduction example is `tests/fixtures/d1-specifications.mjs`.

| Input | Required content |
|---|---|
| Source evidence | Schema, edition, original execution, immutable source commit and exactly six records containing story identity, story-content SHA-256, HTTPS source URL and previously verified visual facts |
| Request envelope | Schema, active quality contract version, edition, original execution, request identity, source commit, source-evidence digest and set-plan digest |
| Set plan | Exactly six story assignments plus the fixed declared six/four/four/four/three gate |
| Story specification | Story identity, source-content digest, specification digest and the exact generation fields |
| Generation fields | Subject, core mechanism, separate facts and conceptual geometry, supported component inventory, mechanism recipe, own assignment, exact labels, prohibited specifics/patterns and neutral reference policy |
| Mechanism recipe | Dominant mechanism; linked input/transformation/output substages; linked secondary relationships; evidence, constraint, feedback and release structures |

Each component references an existing fact or conceptual element by its zero-based
`support_index` and declares `support=verified_fact` or `approved_concept`.
Every substage/secondary relationship binds to distinct existing component IDs.
The recipe makes the proposed mechanism reviewable; it cannot prove that pixels
will realize that mechanism. No decorative components are authorized to meet a count.

The current minimum is 12 meaningful components, two internal substages and two
secondary relationships. The validator also reads the active D1 quality contract
and takes the stricter minimum. Historical capsule-v3 packets, their eight-component
schema and their proof records are unchanged. They are not automatically admitted
as current D1 requests.

## Deliberate set differentiation

Reuse the established canonical set-plan gate with normalized comparison keys:
six unique primary compositions, at least four layouts, four diagram grammars,
four hierarchy patterns and three annotation patterns. Case, Unicode width,
whitespace and equivalent hyphen/underscore presentation cannot manufacture
distinct assignments. Sealed values themselves are not rewritten.

Each assignment also reserves a palette family, mechanism metaphor, evidence
representation and feedback pattern. Those fields must be present and bound to
the story. They do not acquire unsupported all-six uniqueness thresholds. The
planner compares these fields across the set; each isolated generator receives
only its own assignment. Actual visual diversity remains a separate pixel review.

## Length and isolation checks

Explicit implementation bounds are: subject 240 characters; core mechanism 1,200;
individual facts, concepts, component descriptions and recipe text 600; signatures
120; labels 80 characters and eight words each. Labels are exact, trimmed and
unique. Zero visible labels is allowed; every label that is supplied must pass.
Facts/concepts and negative patterns are nonempty. Arrays and total input size
are bounded by the versioned contract. These new field bounds are admission
choices, not claims that historical packets already had those limits.

The compiler projects an explicit whitelist of single-story fields. It excludes
the envelope, source URLs, hashes, request/execution identities, other stories,
set plan, accepted-image history and benchmark documents. It rejects known
repository paths/identifiers, operational prose, dashboard state and exact
other-story subjects/mechanisms inside allowed text fields. This deterministic
screen complements source binding and the real fresh-context boundary; it does
not claim a complete semantic detector. Contextual operational patterns avoid
blanket rejection of legitimate source-grounded terms such as a supervisor agent.

`assertD1SubmittedPrompt` requires the exact compiled prompt, preventing callers
from appending operational instructions after validation. The prompt carries
smooth blank surfaces, exact labels, no pseudo-writing, no generic card grids,
no decorative geometry and the active premium mechanism requirements.

## Existing-lane integration

For a new request, persist the source-evidence projection and all six sealed
specifications through the existing repository path. `sealD1Specifications`
calculates digests on a clone; it neither repairs invalid fields nor changes an
active edition. Never call it to mutate a sealed exhausted or accepted lineage.

```sh
node scripts/admit-d1-specifications.mjs request.json source-evidence.json admission.json
node scripts/admit-d1-specifications.mjs request.json source-evidence.json story-admission.json story-id story-prompt.txt
node scripts/build-d1-image-handoff.mjs handoff-input.json request.json source-evidence.json handoff.json
```

The handoff input retains the existing `edition`, `executionId`, `branch`,
`requestPath`, `requestSha256`, `readyAt`, `now`, optional `lastRunAt` and `previous`
fields. It additionally requires `requestCommit` (the immutable commit containing
the request and evidence files) and `sourceEvidencePath` (its repository-relative
path). The CLI checks both file arguments against the declared local paths.
For the new D1 entry point `requestSha256` is the canonical JSON digest
returned by admission. Edition, execution and request digest must match the
admitted specifications before an existing-task schedule payload is produced.
No scheduling call is made. Saved task identity, due-time readback, actual runtime
availability and target binding still require their existing external evidence.
The modern handoff key includes the branch, storage commit, both paths, both
input digests and both contract digests. A different branch or evidence locator
cannot reuse a previous verified handoff.

The existing proof-action selector checks all-six admission before returning a
new-story start/resume action. For those actions its optional modern
`specification_binding` must bind request/source digests, source/storage commits,
source-evidence path and the existing attempt-log digest. The supplied read
context must match the state's branch/request path/storage commit/evidence path,
and the request execution identity must match the proof identity. Missing binding
blocks new generation rather than interpreting an old request as current.

A pure adapter reads the existing flat/grouped attempt-log shapes. It reconciles
actual completed generations, consecutive attempt numbers, pending candidates
and accepted asset identities with the state, then reuses the existing four-attempt
guard. It never edits the original log. A renamed request cannot reset a bound
history; missing or contradictory history cannot be treated as zero attempts.
D1 context IDs are not subjected to D0's different per-attempt context policy.
Accepted locks remain dependent on their existing canonical review/hash evidence.

`BLOCKED`, accepted-package, Git ingest, verified
and complete states retain their existing actions without requiring a new spec
or regenerated image. Admission does not allocate or reset an attempt and does
not replace the runtime's accepted-lock and pending-byte checks.

The two CLIs write new output paths only and reject input/output aliases. A failed
admission persists a FAIL receipt and emits no prompt. Existing files and sealed
inputs are not overwritten. Exact-compatible admission receipts may be reused
only when request, source evidence, set plan and both contract digests still match.
This reuse is specification proof only; one-image byte proof and six-image live
qualification remain separately scoped.

## Core and observation

The admission code depends only on local core contracts, canonical hashing and
the established set-plan validator. It imports no dashboard, learning projector,
telemetry adapter or remote service. Required source/image/hash evidence remains
blocking; optional metrics, dashboards and learning-report prose do not influence
admission. Their absence never makes a valid specification fail.

## Preservation and first unfinished qualification

The Iteration 1 baseline receipt inventories exact predecessor refs, accepted
October 8 replacement hashes, original supersessions and terminal state. The
completed one-image capability/readback proof is retained. The latest R3
six-image benchmark proof has four exhausted quality attempts and zero accepted
assets. This change does not reset that lineage, begin a fifth attempt or activate
D1. Current-contract Story 1 pixel acceptance within a fully qualified six-image
proof remains the first unfinished native-image gate for Iteration 2.
