# One-off local normalization of the settled Iteration 7 attempt records

This helper prepares a local evidence candidate for the actual terminal source
commit `3bc8dde18d77c570f169ae70030e0c8e92866649`. It is not production code, a
runtime recovery mechanism, a new task, an activation path, or retry authority.
The output stays `BLOCKED`, retains four failed genuine attempts, and permits
zero new generations.

## Run

Materialize these exact files from that immutable commit in a separate input
directory:

- `execution-state.json`
- `attempt-log.json`
- `request.json`
- `source-evidence.json`
- `quality-attempts-exhausted-20261008T195730Z.json`

Use a new output directory whose parent exists:

```sh
node /workspace/scratch/0db76654d0c5/evidence-normalization/normalize-settled-evidence.mjs \
  --input-dir /absolute/path/to/materialized-input \
  --output-dir /absolute/path/to/new-candidate \
  --source-commit 3bc8dde18d77c570f169ae70030e0c8e92866649 \
  --runtime-root /workspace/scratch/946260fbc14d/repo
```

The eight consumed code/contract files must match their pinned Git blob identities
at runtime `aee4f026e88a30e14369099d45f95514933f4707`. No dependency install or
external operation occurs. The declared state schema is checked by a bounded
interpreter supporting every assertion keyword in that exact schema. Any unknown
keyword fails closed.

Append `--check-only true` to run all eligibility, preservation, declared-schema
and pinned accounting checks without creating an output directory or changing
any input. Omit that option when the operator chooses to materialize the local
candidate.

## Optional observed source bindings

For stronger offline provenance, include `observed-source-bindings.json` using
actual GitHub file readbacks. Populate all five input records:

```json
{
  "source_commit": "3bc8dde18d77c570f169ae70030e0c8e92866649",
  "files": {
    "execution-state.json": {
      "repository_path": "qualifications/value-image-2026-10-08/execution-state.json",
      "git_blob_sha": "ACTUAL_OBSERVED_BLOB_SHA",
      "sha256": "ACTUAL_EXACT_UTF8_BYTES_SHA256"
    }
  }
}
```

The other record paths share `qualifications/value-image-2026-10-08/`; the terminal
receipt is under its `evidence/` directory. The helper recomputes every original
file's Git blob, exact-byte SHA-256 and canonical JSON SHA-256. The `sha256` values
are checked as exact-byte digests. The earlier `source-bindings.json` alias and
`records`/`bytes_sha256` shape are also supported. It does not perform a network
check that a blob belongs to the supplied commit. That observation remains the
operator's responsibility; absent source bindings are explicitly reported.

## Eligibility and changes

The helper only accepts the documented settled first-story failure: `BLOCKED`,
four completed generations, zero accepted images, four consecutive attempts in
the same context, and the actual terminal exhaustion receipt bound to the exact
original attempt log. Every attempt needs actual generation/review timestamps,
raw Git path/commit/hash/blob/bytes/dimensions, retained boolean pixel observations,
and nonempty defects. The terminal receipt must independently repeat each raw
identity and result. Attempts 1–3 must say `QUALITY_REJECTED`; attempt 4 must say
`QUALITY_REJECTED_FINAL`. Pending, PASS, contradictory, missing, fifth, or unrelated
rows are refused.

The changes are limited to:

- Map those established failure results to `FAIL` and set
  `native_generation_completed` and `quality_attempt_consumed` to `true`.
- Reconcile counts and the state's canonical attempt-log digest.
- Relocate the undeclared `runtime_progress` property to separate evidence.

The original files, terminal receipt, raw identities, observations, defects,
context, request/source bindings, status and all historical timestamps remain
preserved. The actual terminal action must be `EXIT_BLOCKED`. A separate in-memory
`BROWSER_RUNNING` projection must return `FAIL_ATTEMPT_LIMIT`; that projection is
never written as execution state and grants no authority to resume.

The historical terminal receipt binds the original log using the exact UTF-8
byte hash. The adapter requires a canonical JSON hash. The helper explicitly
records both identities and the observed historical digest method, preserves the
original receipt unchanged, and binds the normalized canonical digest. It never
silently relabels the old byte hash as a canonical hash.

## Output and verification limits

The new output directory contains exact `originals/`, normalized state/log under
`normalized/`, preserved runtime progress under `evidence/`, a normalization receipt,
and an operator candidate mapping. Existing input/output files are never
overwritten. Validation happens before creating the output directory.

This establishes record-format compatibility and preservation. It performs no
quality reassessment and does not independently download or inspect the raw PNGs.
It cannot convert this exhausted qualification into a PASS. Publication, if the
operator chooses it, requires verifying the writer has exited, current branch has
not moved, actual source provenance, and normal authorized repository discipline.
No fifth attempt or rearm is permitted by this candidate.
