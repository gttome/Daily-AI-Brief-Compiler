# Daily Compiler Architecture

## Mission

Test a radically simpler production hypothesis: one substantial semantic producer creates one immutable edition bundle; GitHub performs deterministic validation/build/deploy/verification afterward.

## Six coarse stages

1. EDITORIAL — research, evidence, selection
2. CONTENT — stories, media, Watchlist, book mappings
3. IMAGES — six specifications and six accepted images
4. BUNDLE — immutable complete edition package
5. COMPILE — deterministic GitHub validation/build/deploy
6. VERIFY — deterministic preview verification

Stages 1–4 are semantic producer work. Stages 5–6 are GitHub-only.

## Complexity budget

- Primary semantic producer: 1
- Scheduled recovery invocations: max 3
- Supervisors: 0
- Watchdogs: 0
- Writer leases: 0
- Recovery leases: 0
- Worker pools: 0
- Runtime repair workflows: 0
- AI health polling: 0
- Major semantic stages: <= 6
- GitHub runtime workflows: <= 3
- Owner-liveness prompts: 0
- Work/Codex/paid API production dependencies: 0

If the architecture requires the prohibited machinery above, treat that as evidence against the Daily Compiler experiment rather than expanding the architecture.

## State

Each shadow edition will use exactly one authoritative file:

`shadow-runs/YYYY-MM-DD/compiler-state.json`

Legal top-level states:

`ALLOCATED -> PRODUCING -> BUNDLE_READY -> COMPILING -> PREVIEW_READY -> SHADOW_VERIFIED`

Failure terminal:

`SHADOW_FAILED`

No micro-task orchestration state is permitted.

## Runtime repair policy

Active shadow executions do not repair program code. A software or platform defect produces a concise failure receipt and stops. Development fixes happen outside the active shadow execution.
