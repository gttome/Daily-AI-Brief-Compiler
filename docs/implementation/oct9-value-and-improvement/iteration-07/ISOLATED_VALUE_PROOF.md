# Isolated Value delivery proof

This development proof reuses the registered October 6 fixture to verify the
current engine's reader delivery. Its six accepted fixture slots contain one
unique image byte identity. The fixture does not prove current premium image
quality, authorize activation, finalize a production run, or launch October 9.

The bounded destination is the existing Compiler feedback host, at
`/qualification/value-<full-engine-SHA>/`. The existing root, API routes, D1 store,
Compiler Pages reader, legacy reader and terminal history retain their authority.
Building an artifact does not prove that this namespace has been deployed.

## Deterministic artifact

The existing `compiler-validation` workflow checks out its exact event head and
uses three existing product steps: compile the immutable fixture with the
explicit environment, render with `actions/jekyll-build-pages@v1`, and run built
reader verification. It then runs the existing history merger with `-` as the
history input. No history branch or live reader is read or written by this build.

`scripts/prepare-isolated-value-proof.mjs prepare` reads actual Git HEAD and
requires clean tracked files. It retains a complete `git archive HEAD` and a
SHA-256 manifest of tracked source files. `package` rechecks this binding and the
current Value inventory before retaining the compiled artifact. Both commands
require `--engine-sha`; `prepare` also requires the actual `--check-url`.

The artifact is named `isolated-value-proof-<full-engine-SHA>`. Its contents use
the same layout as `build/isolated-value/`:

| Path | Purpose |
|---|---|
| `shadow/` | Complete public artifact; the only directory eligible for isolated hosting |
| `reader-source/` | Compiled source, manifest and source/compile receipts |
| `inputs/fixtures/complete-edition/` | Exact state, bundle and existing fixture PNGs |
| `reader-environment.json` | Bound public base and basepath |
| `build-binding.json` | Actual CI checkout, check URL, inventory and fixture identity |
| `built-verification.json` | Existing product verifier's built reader receipt |
| `history-merge-receipt.json` | Existing merger's receipt using an empty isolated history |
| `engine-file-manifest.json` | SHA-256 and byte count for every tracked engine file |
| `engine-source.tar` | Complete source at that exact Git HEAD, without Git history |
| `build-provenance.json` | `BUILT_LIVE_PENDING` seed with `live: null`, public file hashes and sizes |

The seed's `public_artifact.files` identifies every public file by relative path,
SHA-256 and byte length. `public_artifact.total_bytes` is the actual size to assess
against the exposed hosting capability. `packet_files` additionally binds all
retained source, input and build material. Artifact metadata and completed CI
conclusions must be read from GitHub after the job completes; the running job
does not certify its own final conclusion or protected merge.

## Explicit live verification

After the actual protected artifact is downloaded through the connector, verify
its metadata and digest. Extract its engine archive into a separate directory
and place the packet at `build/isolated-value/` inside that directory. Do not
create artificial Git metadata. The verification command compares every
extracted tracked file and the current Value inventory with the retained CI
manifest, while preserving the original CI checkout identity as its provenance.

Deploy only `shadow/` under the exact bound immutable prefix using the existing
approved hosting capability. Separately retain the scope approval, hosting
receipt and actual before/after preservation readbacks. These external facts are
required by the Iteration 7 release inspector and cannot be supplied by a local
file hash or by this build seed.

Run the matching extracted engine's command once after deployment:

```sh
node scripts/prepare-isolated-value-proof.mjs verify --root . --engine-sha "$VALUE_ENGINE_SHA"
```

`verify` calls the existing `verifyLiveReader` with real global HTTP fetch. It
checks exact public route and image bytes, then performs the existing bounded
ratings, public comments and Watchlist probes against the Compiler feedback
service. It has no mock fetch option or automatic retry loop. CI never calls this
command or writes feedback.

Successful HTTP evidence is passed through current edition validation,
`verifyFinalizationEvidence`, `assertCompleteReleaseEvidence` and the I7 complete
provenance checker. Only then does the command write
`complete-build-provenance.json` under the existing
`daily-compiler-value-build-provenance-v1` schema, binding all six required product
receipts including the actual live receipt. It preserves the initial pending
seed. Failed verification retains an actual failure record and any completed
live receipt; it does not overwrite earlier live evidence or assert activation,
release, public-root preservation or a completed future edition.

The final release record must bind the complete provenance, actual live receipt,
protected approval/check/merge references and independent current image and
schedule evidence. A later engine change requires an artifact and applicable
proof for that new exact head.
