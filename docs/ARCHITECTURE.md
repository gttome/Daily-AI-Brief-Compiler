# Daily Compiler Architecture

## Mission

Test a radically simpler production hypothesis: one substantial semantic producer creates one immutable edition bundle; GitHub performs deterministic validation/build/deploy/verification afterward.

## Six coarse stages

1. EDITORIAL — research, evidence, selection
2. CONTENT — stories, media, Watchlist, book mappings
3. IMAGES — six semantic diagram specifications and six accepted persisted PNGs
4. BUNDLE — immutable complete edition package
5. COMPILE — deterministic GitHub validation/build/deploy
6. VERIFY — deterministic preview verification

Stages 1–4 are semantic producer work. Stages 5–6 are GitHub-only.

## Proposal 1R image boundary

The original native-image exact-byte transfer gate was not viable in unattended Scheduled ChatGPT. Proposal 1R keeps the one-producer Compiler architecture but changes the image boundary:

```text
Scheduled ChatGPT semantic diagram specification
        ->
deterministic GitHub diagram compiler
        ->
exact 1200x630 persisted PNG + hashes
        ->
Scheduled ChatGPT review of the exact persisted PNG
        ->
accepted immutable image
```

The F1D, F1R and F1V proofs all passed without owner upload, Work, Codex, paid APIs, Supervisor, Watchdog or lease machinery.

## Deterministic compiler boundary

Once state is `BUNDLE_READY`, ChatGPT is no longer required. The compiler must validate state, bundle digest, exact editorial counts, media diversity, Watchlist/book blocks, accepted image hashes and Git blob identities, and the isolation rule. It then builds the reader-shaped site and verifies routes and internal links deterministically.

## Complexity budget

- Primary semantic producer: 1
- Scheduled recovery invocations: max 3
- Supervisor: 0
- Watchdog Ring: 0
- Writer lease: 0
- Recovery lease: 0
- Worker pools: 0
- Runtime repair workflows: 0
- AI health polling: 0
- Major semantic stages: <= 6
- GitHub runtime workflows: <= 3
- Owner-liveness prompts: 0
- Work/Codex/paid API production dependencies: 0

If the architecture requires prohibited machinery, treat that as evidence against the Daily Compiler rather than expanding it.

## State

Each shadow edition uses exactly one authoritative file:

`shadow-runs/YYYY-MM-DD/compiler-state.json`

Legal top-level states:

`ALLOCATED -> PRODUCING -> BUNDLE_READY -> COMPILING -> PREVIEW_READY -> SHADOW_VERIFIED`

Failure terminal:

`SHADOW_FAILED`

No micro-task orchestration state is permitted.

## Runtime repair policy

Active shadow executions do not repair program code. A software or platform defect produces a concise failure receipt and stops. Development fixes happen outside the active shadow execution.
