# Daily Compiler Architecture

## Mission

The Daily Compiler uses one semantic producer for editorial/content/image decisions and deterministic GitHub validation/build/deploy/verification afterward. It intentionally avoids recreating the legacy production control plane.

## Six coarse stages

1. EDITORIAL — research, evidence, selection
2. CONTENT — stories, media, Watchlist, book mappings
3. IMAGES — D0 Native Image Capsules after activation
4. BUNDLE — immutable complete edition package
5. COMPILE — deterministic GitHub validation/build/deploy
6. VERIFY — deterministic preview/live verification

Stages 1–4 are semantic producer work. Stages 5–6 are GitHub-only.

## D0 Native Image Capsules

D0 is the permanent reader-story image architecture, but remains proof-gated until immutable P0-A through P0-F capability receipts pass.

```text
locked six-story edition
  -> composition reservation plan
  -> Image Packet v3 x6
  -> fresh story-only native capsule
  -> built-in ChatGPT image generation
  -> same-invocation raw-byte persistence
  -> deterministic 1200x630 normalization
  -> exact persisted Visual Review v3
  -> six-image Set Review v3
  -> atomic ACCEPTED_LOCKED x6
  -> BUNDLE_READY
```

The generator capsule must be genuinely fresh and story-only. Prompt text saying "ignore prior context" is not isolation proof. The generated raw bytes must be persisted before the capsule ends. If either boundary cannot be proven, D0 activation fails closed.

The deterministic image processor performs no model calls. It validates raw receipts, normalizes with contain/no-crop semantics, persists exact final candidates, and records structural evidence.

## Proposal 1R role

Proposal 1R is retained for historical evidence, internal architecture diagrams, proof fixtures, status graphics, developer documentation, and deterministic diagram tests. It is not a reader-story fallback for D0.

Existing Proposal 1R editions remain valid historical editions until an explicitly authorized image-only migration replaces their image identities. The October 7 migration must reuse execution `daily-compiler-shadow-2026-10-07` with semantic rework = 0.

## Deterministic compiler boundary

Once state is `BUNDLE_READY`, ChatGPT is no longer required. For a D0 bundle the compiler additionally verifies the complete D0 evidence graph: set plan, packet, clean-capsule admission, raw receipt/bytes, final receipt/bytes, structural PASS, exact persisted visual review, set-review PASS, atomic acceptance, hashes, Git blob identities, versions/cache keys, and supersedes identity.

## Complexity budget

- Primary semantic producer: 1
- Existing recovery invocations: bounded
- Supervisor: 0
- Watchdog Ring: 0
- Writer lease: 0
- Recovery lease: 0
- Worker pools: 0
- Runtime repair workflows: 0
- AI health polling: 0
- Wake PRs: 0
- Owner-liveness prompts: 0
- Work/Codex/paid model API dependencies: 0

If a required capability needs prohibited machinery or paid capacity, preserve completed outputs and fail closed.

## State

Each shadow edition uses exactly one authoritative file: `shadow-runs/YYYY-MM-DD/compiler-state.json`.

Legal top-level states:

`ALLOCATED -> PRODUCING -> BUNDLE_READY -> COMPILING -> PREVIEW_READY -> SHADOW_VERIFIED`

Failure terminal: `SHADOW_FAILED`.

No micro-task orchestration state is permitted.

## Runtime repair policy

Active shadow executions do not repair program code. A software/platform defect produces a concise durable blocker/failure receipt and stops. Development fixes occur outside the active execution.
