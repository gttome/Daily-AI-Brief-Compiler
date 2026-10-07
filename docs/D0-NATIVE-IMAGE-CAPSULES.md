# D0 Native Image Capsules

Status: implementation candidate; activation requires zero-cost pre-proof plus live P0-A through P0-F PASS.

D0 preserves the Daily Compiler simplicity boundary while replacing Proposal 1R for future reader-story images only after a live capability proof. The intended path is:

```text
locked six-story edition
  -> six-image composition reservation plan
  -> Image Packet v3 per story
  -> proven fresh story-only native capsule
  -> built-in ChatGPT image generation
  -> same-invocation raw byte capture
  -> immutable raw Git persistence
  -> deterministic 1200x630 normalization
  -> exact saved-asset Visual Review v3
  -> individual pass pending set
  -> six-image Set Review v3
  -> atomic ACCEPTED_LOCKED x6
  -> fail-closed BUNDLE_READY
```

## Hard boundaries

D0 adds no Supervisor, Watchdog Ring, writer/recovery lease, worker pool, wake PR, continuous AI polling, or runtime software-repair loop. Runtime D0 executable code must not depend on Work, Codex, OpenAI/model APIs, paid image services, billable overage, new paid infrastructure, owner image upload/manual transfer, alternate accounts, or owner liveness.

Native ChatGPT image generation already included in the existing subscription is the intended executor. A temporary native-capacity failure is infrastructure, consumes zero quality attempts, preserves state, and resumes only in a later ordinary Compiler invocation. There is no paid-capacity escalation path.

## Zero-cost pre-proof

Before formal P0-A/P0-B, run the executable pre-proof in `docs/D0-ZERO-COST-PREPROOF.md`. It uses two disposable native images total across two independent standalone scheduled runs. Those runs jointly establish fresh-chat isolation, canary non-leakage, same-run generated-file handoff, exact raw persistence, read-back identity, and repeatability.

Once the pre-proof receipt validates PASS, formal P0-A/P0-B promote the same immutable evidence instead of regenerating the two images. This is deliberate: capability discovery occurs before the formal proof, while evidence reuse reduces native-capacity exposure without weakening the proof.

## Clean capsule boundary

A generator capsule sees exactly one story's generator-visible projection and no other story, prior image, benchmark asset, publication state, repository path, branch, run ID, recovery prose, or orchestration context. "Ignore prior context" is not proof. Generation is unauthorized without a durable admission receipt binding a unique invocation/context identity and exact prompt digest to a fresh dedicated story-only context.

Each genuine retry requires a new invocation ID, context ID, and native generation call. A contaminated/wrong-subject output is discarded rather than edited into compliance.

## Same-invocation byte boundary

A capsule is incomplete until exact native output bytes are captured and durably persisted before that capsule yields. Cross-invocation recovery of an opaque generated-image reference is prohibited. If exact bytes are not exposed before capsule end, record `CAPABILITY_BLOCKED_NATIVE_SAME_INVOCATION_CAPTURE`, consume zero quality attempts, and stop the image stage.

## Quality boundary

Every final candidate is an exact 1200x630 PNG, normalized without crop from an immutable raw PNG. The raw and final byte identities remain separately auditable. Visual review is always of the exact persisted final asset.

Per-image acceptance requires the canonical Perfect Image rules, including exact visible-text allowlist, no extra characters, no people/humanoids, no branding, no photorealism, no unsupported specifics, at least eight meaningful visible explanatory components, and PASS on all nine benchmark dimensions.

The six-image set requires six unique composition signatures, at least four layout signatures, four diagram grammars, four hierarchy signatures, three annotation-pattern signatures, and six distinct byte streams. Individual PASS is provisional until the set passes; final lock is atomic across all six.

## Attempts and failure semantics

Maximum genuine visual generation attempts per story: 4. Admission, isolation, native-capacity, byte-transport, readback, deterministic normalization, or pre-verdict review runtime failures consume zero quality attempts. There is no fifth low-quality fallback.

After set acceptance, exact bytes are immutable. A legitimate replacement requires a new asset version, content hash, cache key, supersedes identity, and deployed-byte verification.

## Activation firewall

D0 remains inactive for reader-story generation until a zero-cost pre-proof PASS and a non-production proof demonstrate both a genuine clean generator context and same-invocation raw byte persistence, followed by normalization, exact saved-asset review, strict first-attempt text/brand behavior, and a full six-image rehearsal. Proposal 1R must never become an emergency reader-story fallback after D0 activation.
