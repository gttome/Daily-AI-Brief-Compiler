# D1 Option 1 Implementation Plan — Dot → Image Studio → Work Cloud

## Decision

Adopt Option 1 as the target architecture:

**Compiler → Dot cloud coordinator → fresh Image Studio task → six accepted individual cloud assets + manifest → Work Cloud Porter → GitHub → deterministic deploy/live verification.**

No local computer and no owner-presence dependency are permitted in the normal runtime.

## Expanded product requirements

D1 is not only an image architecture. The Compiler must become an observable, learning production system with stable machine-readable surfaces that can later power a backend dashboard.

Required capabilities:

1. fine-grained timing across every reasonable stage and major substage;
2. Dot/Work/image-generation/research/GitHub usage counters;
3. durable problem/root-cause/fix/outcome learning records;
4. cumulative learning documents in GitHub;
5. mandatory post-run analysis and prioritized improvements;
6. explicit optimization for speed, reliability, quality, Dot time and Work time;
7. external research resource registry and per-run health/yield observations;
8. future-Brief suggestion inbox for articles, topics, images, videos, podcasts, Watchlist items and new sources;
9. generic post-publication corrections for articles, images, videos, podcasts and Watchlist items;
10. dashboard-ready status/metrics/queue/resource/correction read models;
11. D1 image ingest with no redundant visual quality review after Studio acceptance.

## Phase 1 — Repository contracts and deterministic support

Implement:

- D1 image contract v4;
- Image Studio acceptance manifest;
- D1 cloud proof + activation receipt;
- narrow Work Porter contract and receipt;
- exact-byte D1 bundle gate;
- D1-aware compiler/recovery schemas;
- run-event, run-metrics, problem-learning and run-analysis schemas;
- resource registry + observation schemas;
- future-Brief suggestion schema;
- post-publication correction schema;
- dashboard snapshot schema;
- deterministic validators and tests.

Exit criteria:

- protected CI PASS;
- D0/legacy behavior remains compatible;
- D1 remains proof-gated;
- no production image generation is triggered.

## Phase 2 — Cloud coordination proof

Configure the Dot to act only as coordinator.

Non-production proof:

1. Compiler persists six locked image specs.
2. Dot launches a separate fresh Image Studio cloud task.
3. Image Studio generates and accepts six native images.
4. Studio locks exact individual cloud assets and manifest; no ZIP.
5. Dot passes those same assets plus manifest to Work Cloud.
6. Work validates integrity only and writes exact bytes to a disposable Compiler branch.
7. Git readback matches all six manifest hashes.
8. No owner interaction and no local computer.
9. Timing/usage events and problems are persisted.
10. Post-run metrics/analysis and dashboard snapshot are created.

Exit criteria: `daily-compiler-d1-cloud-proof-v1 = PASS`.

## Phase 3 — D1 activation and normal daily runtime

After proof PASS:

1. merge D1 activation receipt through protected main;
2. switch Compiler image routing to D1;
3. preserve Proposal 1R only for historical/internal diagrams;
4. keep D0 evidence as development history;
5. make Dot the primary cloud coordinator;
6. use one Image Studio task and one Work Porter batch per edition by default;
7. recovery reuses accepted bytes and completed semantic stages.

Daily completion includes:

- published reader;
- exact live-byte verification;
- metrics;
- problems/fixes;
- learning ledger update;
- post-run analysis;
- dashboard snapshot;
- source-health observations;
- future-inbox resolutions.

## Phase 4 — Corrections, suggestions and resource expansion

### Post-publication corrections

Support protected revisions for:

- article;
- image;
- video;
- podcast;
- Watchlist.

Rules:

- preserve original historical artifact;
- no new execution for the published edition;
- explicit supersession/revision;
- protected PR;
- deploy + live verification;
- learning and timing records;
- no unrelated content rework.

### Future Brief suggestions

Users or system components can queue:

- a URL/article for tomorrow;
- a topic to consider tomorrow;
- a specific video/podcast;
- an image idea;
- a Watchlist item;
- a new research source.

The producer resolves each eligible suggestion as selected, rejected, expired or carried forward with reason.

### Resource expansion

New sources are added to the registry, not to prompt prose. Source monitoring tracks failures, freshness and usable yield so low-value sources can be downgraded and high-value sources prioritized.

## Phase 5 — Backend dashboard

Do not build the dashboard until the runtime artifacts are stable.

The dashboard consumes:

- Compiler state;
- run events;
- metrics;
- run analyses;
- problem learning;
- resource health;
- future-Brief queue;
- corrections;
- Dot/Work usage;
- risks and next actions.

The dashboard is a management surface, not a second source of truth.

## Efficiency principles

- Dot coordinates; deterministic code validates.
- Work transports/publishes accepted image bytes; it does not think about image aesthetics.
- Batch six accepted images into one Work invocation when possible.
- Never regenerate an accepted image because Git/CI/deploy failed.
- Track actual Dot/Work active seconds to identify cost reductions.
- Keep source observations compact and aggregate them after each run.
- Use one post-run analysis pass over structured metrics, not the entire conversation history.
- Prefer stable registries/queues/contracts over larger prompts.

## Current implementation status

Phase 1 is being implemented in protected repository code now.

Phase 2 requires the product-level Dot/task configuration and a live non-production cloud proof. The current chat does not expose a Dot-management API, so repository contracts and exact prompts can be completed here, but the final Dot creation/configuration itself must be performed through the ChatGPT Dot UI unless that control surface becomes available programmatically.

