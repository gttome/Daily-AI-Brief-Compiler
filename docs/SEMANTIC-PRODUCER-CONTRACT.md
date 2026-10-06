# Semantic Producer Contract

The Daily Compiler uses one Scheduled ChatGPT semantic producer for EDITORIAL, CONTENT, IMAGES and BUNDLE. GitHub owns deterministic rendering and compilation. The producer operates only in `gttome/Daily-AI-Brief-Compiler`.

## Primary mode

For target date `YYYY-MM-DD`, inspect Compiler state only. If an execution already exists for the target date, resume it. Otherwise allocate exactly one branch `shadow/YYYY-MM-DD`, create `shadow-runs/YYYY-MM-DD/compiler-state.json`, and continue semantic stages as far as possible. Stop only at `BUNDLE_READY` or a genuine platform/software blocker.

## Recovery mode

Recovery never allocates. Find the newest nonterminal shadow edition, read its `compiler-state.json` first, resume the first incomplete semantic stage, preserve every valid completed output, preserve accepted image identities exactly, and continue toward `BUNDLE_READY`.

## Stage outputs

EDITORIAL persists `editorial/editorial.json` containing candidate evidence and the locked six-story selection. Once complete, recovery must not redo research or selection unless the durable output is proven invalid.

CONTENT persists `stories/<story-id>.json`, `media/media.json`, `watchlist/watchlist.json`, and `books/book-mappings.json`.

IMAGES uses Proposal 1R. For each story, persist one semantic diagram specification at `images/specs/<story-id>.json`. GitHub deterministically renders it. The producer then fetches the exact persisted PNG bytes from GitHub, passes those exact bytes into visual reasoning, and writes `images/reviews/<story-id>.json`. Only a visually reviewed PASS asset may be appended to `compiler-state.json -> images.accepted`.

Accepted images are immutable. Never regenerate or replace an accepted image during recovery.

BUNDLE assembles `shadow-runs/YYYY-MM-DD/edition-bundle.json`. The bundle is a lossless projection of the already persisted semantic outputs, not a summary of them. Preserve every reader-required story field (source dates, topics, coverage labels, related coverage, image alt intent, permanent route), every media field (source, date, focus where applicable, duration, summary, Why it matters, verification, podcast written reading time), Watchlist evidence and dropped-topic rationale, all book mapping fields (concept/chapter, connection, what to study next), and the exact six accepted image identities and review hashes. Do not omit fields merely because the deterministic compiler could infer them from another file.

Set state to `BUNDLE_READY` only after the complete bundle has been checked against the current editorial/product contract, the exact bundle digest is calculated, and that digest is persisted. After `BUNDLE_READY`, ChatGPT performs no deterministic compilation or publication work.

## Diagram specification v2

Every story image uses exactly one qualified grammar: `pipeline`, `layered_system`, `control_loop`, `hub_spoke`, `comparison`, or `state_machine`. Diversify grammars across the six-story set; do not use the same grammar more than twice unless a documented semantic reason requires it. Each spec contains six mechanism nodes and three evidence/callout cards. The spec contains semantic content, not pixel coordinates.

## Runtime software rule

No active shadow edition may modify compiler code, workflow code, schemas or renderer code. A genuine code/platform defect produces `SHADOW_FAILED` while preserving completed semantic output. Development fixes occur outside the active shadow execution.

Forbidden: Supervisor, Watchdog Ring, writer/recovery leases, worker pools, wake PRs, continuous AI polling, runtime software repair, owner upload, Work, Codex, paid model API, alternate account, or owner liveness prompt.
