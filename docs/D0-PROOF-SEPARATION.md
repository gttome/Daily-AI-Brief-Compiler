# D0 P0-A / P0-B Proof Separation

Status: binding development rule for D0 activation evidence.

## Decision

P0-A and P0-B prove different platform properties and MUST NOT be coupled in a way that causes unnecessary native image regeneration.

- **P0-A** proves clean image-generation isolation: a fresh story-only native generation context with no other story, prior image, project/repository/orchestration material, or unrelated context influencing the generator.
- **P0-B** proves same-invocation exact-byte persistence: exact bytes returned by native ChatGPT Images are captured before the invocation yields, persisted to Git, and read back with exact identity.

D0 activation still requires both PASS. Passing P0-B never waives or implies P0-A.

## Existing P0-B evidence

The live transport-only preflight on 2026-10-07 already proved the P0-B transport primitive without owner transfer or paid capacity:

```text
native ChatGPT image
  -> runtime generated file
  -> already-connected ephemeral Google Drive shuttle
  -> complete raw byte fetch
  -> Git Data blob/tree/commit
  -> exact Git blob readback
  -> ephemeral Drive deletion
```

The preflight recorded byte count, SHA-256, Git blob SHA, Git commit identity and exact readback. Formal P0-B promotion reuses that immutable evidence and performs zero additional native generations.

Run A later independently demonstrated the same generation-to-Git path inside a standalone scheduled run. Its image was the wrong subject, so it is invalid for P0-A, but that wrong-subject result does not invalidate its exact-byte transport evidence.

## P0-A remains fail-closed

The current native image tool does not expose an explicit prompt argument to the assistant runtime; its image instructions are inferred from conversation context. Therefore a fetched story prompt cannot be claimed to be the sole generator-visible prompt merely because its hash was verified.

Run B correctly stopped before generation on this boundary. No visual-quality attempt was consumed.

The next P0-A experiment MUST first establish a product-supported way to make the generator-visible context genuinely story-only and independently inspect the resulting image. Do not solve this by:

- adding operational instructions to the supposedly story-only generator prompt;
- treating a new chat alone as proof of story-only visibility;
- using owner download/upload or owner review;
- using Work, Codex, paid APIs/services, alternate accounts, or new paid infrastructure;
- falling back to Proposal 1R for reader images.

## No-rework rule

Existing valid implementation, transport receipts, raw assets, hashes and exact-byte evidence are preserved. A retry targets only the missing P0-A isolation capability. It does not rerun P0-B, regenerate transport samples, reopen October 7 semantics, or redo PR1-PR5.
