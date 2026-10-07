# D1 Cloud Image Studio + Operational Intelligence Architecture

Date: 2026-10-07  
Status: implementation target; activation remains proof-gated until the cloud task-to-Work asset handoff is proven.

## 1. Objective

D1 replaces the D0 requirement that one isolated image invocation must both generate a pristine native image and persist its exact bytes into GitHub. The image-quality job and repository-transport job are intentionally separated.

The production image path becomes:

```text
Compiler semantic image specifications
  -> Dot cloud coordinator
  -> fresh Image Studio cloud task
  -> six visually accepted native ChatGPT images
  -> six individual cloud image assets + acceptance manifest
  -> Work Cloud Porter (IMAGE_PACKAGE_INGEST only)
  -> exact Git blobs
  -> protected CI / deploy
  -> live exact-byte verification
```

No ZIP is required. An archive may never be a correctness dependency.

The entire target runtime is cloud-based. No local computer, owner file transfer, owner upload, or owner presence is part of the normal path.

## 2. Separation of responsibilities

### Dot

The Dot coordinates stage transitions. It does not generate reader images in its persistent conversation and does not make image-quality judgments.

It may:

- observe Compiler durable state;
- launch a fresh Image Studio task;
- receive the six accepted cloud assets and manifest;
- launch the Work Cloud Porter;
- resume failed transfers from the same accepted assets;
- record timing, usage, problems and outcomes;
- trigger the post-run analysis.

It may not use the local computer.

### Image Studio

The Image Studio is the sole subjective image-quality boundary.

It receives only:

- six locked story image specifications;
- the Perfect Image quality policy;
- differentiation assignments;
- exact visible-text allowlists.

It does not receive GitHub branches, CI instructions, run orchestration, publication state, Work instructions, repository paths, Watchdog/Supervisor material, or unrelated stories outside the six-image studio brief.

Default operation is one clean Image Studio conversation for all six images because the October 7 manual proof showed that this can be fast and produce an excellent differentiated set. If future evidence shows within-session motif contamination, the same D1 package contract permits one fresh studio task per story without changing the Porter or publication architecture.

The Image Studio:

1. generates one candidate at a time with native ChatGPT Images;
2. visually judges it against the complete premium-image rubric;
3. rejects and regenerates weak candidates inside the Studio;
4. performs the six-image differentiation review;
5. locks the exact six accepted cloud assets;
6. emits `daily-compiler-d1-image-acceptance-manifest-v1` containing only visual/asset identity. It does not contain repository names, branches or Git target paths.

No accepted image is regenerated after manifest lock.

### Work Cloud Porter

Work is permitted only under the explicit scope:

`IMAGE_PACKAGE_INGEST`

The Porter receives the six accepted image assets plus the acceptance manifest and a separate `daily-compiler-d1-ingest-handoff-v1`. The ingest handoff is the only object that maps accepted story/filename identities to repository, branch and Git target paths.

It may:

- retrieve the six exact cloud files;
- verify PNG signature, dimensions, filename, story mapping, byte size and SHA-256;
- upload the exact bytes to Git;
- record Git blob identities and exact readback;
- update image references/manifests;
- open the protected PR;
- repair only correction/ingest-related CI defects;
- merge through protection;
- verify deployment and live bytes.

It may not:

- generate an image;
- edit an image;
- regenerate an image;
- visually rate or reject an image;
- change editorial story selection;
- change unrelated content.

**GitHub proves identity, not aesthetics.**

### Clean-context handoff rule

The Image Studio never receives repository paths or publication/transport instructions. The Studio manifest proves which six cloud assets were accepted. After Studio acceptance, the Dot creates or retrieves a separate ingest handoff that binds those accepted filenames/story IDs to repository target paths. The Work Porter requires both objects and proves their hashes separately.

A second visual-quality review during ingest is prohibited. If Git/readback SHA-256 equals the visually accepted manifest SHA-256, the repository contains the same accepted image.

## 3. Activation proof

D1 remains fail-closed until one non-production cloud proof establishes all of the following:

- Dot coordination runs in the cloud;
- the Image Studio is a separate fresh task/conversation;
- generation uses native ChatGPT Images;
- six accepted image assets are produced;
- the acceptance manifest validates;
- the assets transfer programmatically with no owner/local file transfer;
- no archive is required;
- Work Cloud receives the same exact six assets;
- Work remains within `IMAGE_PACKAGE_INGEST`;
- Work performs no visual re-review and no generation;
- Git readback matches accepted asset hashes;
- no local computer is used;
- no prohibited paid/model/API dependency is used.

The proof is `daily-compiler-d1-cloud-proof-v1`. Activation is `daily-compiler-d1-activation-v1`.

D0 evidence remains historical development evidence. It is not deleted.

## 4. Runtime image state

The preferred D1 lifecycle is intentionally small:

```text
PLANNED
  -> STUDIO_RUNNING
  -> PACKAGE_ACCEPTED
  -> WORK_INGEST
  -> GITHUB_VERIFIED
  -> BUNDLE_READY
```

Accepted asset hashes survive every recovery boundary. A Work/GitHub failure resumes from `PACKAGE_ACCEPTED`; it never returns to image generation.

## 5. Timing and observability

Every reasonable stage boundary must emit a `daily-compiler-run-event-v1` record.

Required timing coverage includes:

- run allocation/start;
- research start/end;
- individual external resource query groups;
- candidate selection;
- content writing;
- video verification;
- podcast verification;
- Watchlist discovery;
- book mappings;
- Image Studio start/end;
- each image generation attempt;
- each image accepted/rejected;
- six-image set acceptance;
- Dot delegation start/end when observable;
- Work Porter start/end;
- Git upload;
- CI;
- merge;
- deployment;
- live verification;
- corrections;
- post-run analysis.

Each event records the actor, stage, event type, status, duration when observable, durable references, problem/resource identity, and usage counters.

### Usage / charge minimization

Track actual observable activity rather than inventing billing:

- Dot active seconds;
- Work active seconds;
- native image generations;
- web queries;
- GitHub writes.

Monetary estimates remain null unless an explicit rate card is configured. The system must never infer a charge from incomplete telemetry.

The goal of run analysis is to reduce:

- wall time;
- wait time;
- retries;
- unnecessary research queries;
- low-yield resource queries;
- native image attempts;
- Dot active time;
- Work active time;
- CI repetitions;
- publication latency.

## 6. Problems, fixes and cumulative learning

Every material problem creates one `daily-compiler-problem-learning-v1` record with:

- problem;
- classification;
- root cause;
- impact;
- attempted fixes;
- actual fix;
- outcome;
- timing impact;
- Work-time impact;
- Dot-time impact;
- permanent action;
- regression test;
- recurrence classification;
- current status.

Per-run problem records remain durable.

At run close, deterministic tooling builds:

- a machine-readable cumulative learning ledger;
- a human-readable Markdown learning document.

Repeated problems are explicitly classified as repeat occurrences. A run may not describe a recurring defect as a new isolated issue.

Learning is part of the completion contract, not optional narrative.

## 7. Mandatory post-run analysis

Every publication and every post-publication correction produces a `daily-compiler-run-analysis-v1`.

The analysis must cover:

- total wall time;
- per-stage timings;
- critical-path stages;
- measured wait time;
- retries;
- image attempts;
- Dot and Work active time;
- source-query counts and source yield;
- resource failures;
- CI/deploy timing;
- problems and fixes;
- quality outcomes;
- concrete improvement proposals.

Improvement proposals are classified by:

- priority;
- area;
- expected benefit;
- implementation scope: next run, system hardening, monitor, or backlog.

The analysis must explicitly seek speed, reliability, quality and cost-efficiency improvements.

## 8. External resource registry and monitoring

Research sources are first-class configuration, not hard-coded prompt prose.

`config/resource-registry.json` is the extensible registry for article, video, podcast, Watchlist and general research sources.

Each resource records:

- stable resource ID;
- name and URL;
- enabled state;
- supported content types;
- priority;
- search mode / endpoint;
- publisher metadata;
- health state;
- last check and success;
- consecutive failures;
- observed usable-yield rate;
- freshness-hit rate.

Every run records `daily-compiler-resource-observation-v1` observations.

The post-run analysis identifies:

- high-yield sources;
- low-yield sources;
- stale sources;
- failing endpoints;
- repeated duplicates;
- sources that supply selected items;
- underrepresented media/resource classes.

Adding a large number of sources requires registry entries, not architecture changes.

## 9. Future Brief suggestion inbox

`config/future-brief-inbox.json` is the durable queue for user/system suggestions.

A suggestion may target:

- article;
- story topic;
- image;
- video;
- podcast;
- Watchlist;
- new research resource.

It may target a specific date such as tomorrow or remain open-ended.

Modes:

- `suggest`;
- `must_consider`;
- `must_include_if_valid`.

Suggestions never silently bypass freshness, evidence, safety or editorial validity. The next eligible edition records whether each item was considered, selected, rejected, expired or carried forward, with a resolution reason.

This supports requests such as:

> Add this podcast to tomorrow's Brief if it is valid.

without editing the next edition manually.

## 10. Post-publication corrections

The system supports additive, protected corrections after publication without reopening the original production execution.

Supported correction types:

- replace article;
- replace image;
- replace video;
- replace podcast;
- replace Watchlist item;
- add Watchlist item;
- remove Watchlist item.

Every correction:

- preserves the original historical artifact;
- creates no new edition execution;
- has a correction revision;
- uses a protected PR;
- requires deployment;
- requires independent live verification;
- records supersession;
- creates timing/problem/learning events.

For image replacement, a D1 acceptance manifest is authoritative for visual quality. The Porter performs identity/integrity validation only.

## 11. Dashboard-ready backend artifacts

The future backend dashboard must not need to reconstruct state from free-form prose.

The Compiler therefore emits stable machine-readable surfaces for:

- current run state;
- recent run metrics;
- stage timing;
- Work/Dot usage;
- problems and fixes;
- cumulative learning;
- resource health;
- source yield/freshness;
- future Brief queue;
- correction queue;
- risks;
- next actions.

`daily-compiler-dashboard-snapshot-v1` is the initial read model for that future backend.

The later dashboard can display and manage these artifacts without changing the core producer architecture.

## 12. Complexity rules

D1 is intended to reduce, not expand, the control plane.

Runtime target:

- one semantic producer;
- one Dot coordinator;
- one fresh Image Studio task per edition by default;
- one Work Cloud Porter invocation per accepted six-image package by default;
- deterministic GitHub Actions after bundle boundaries;
- existing bounded recovery schedules only until Dot replaces their coordination role.

Forbidden:

- Supervisor;
- Watchdog Ring;
- leases;
- persistent worker pools;
- continuous AI polling;
- wake PRs;
- local-computer dependency;
- owner-liveness dependency;
- paid model/image APIs;
- Codex as runtime dependency.

The system should prefer one batch transfer of six accepted images over six Work invocations.

## 13. Reliability rule

The central D1 recovery rule is:

> Never regenerate content or images to repair a transport, GitHub, CI or deployment failure.

Once an image is `accepted_locked`, every downstream retry reuses the same bytes.

Once semantic content is complete, image or publication failures do not reopen research/content.

Once publication is verified, corrections are additive revisions rather than run reopenings.

## 14. Migration from D0

D0 remains proof-gated and preserved as development history.

D1 activation should supersede D0 as the permanent reader-story path only after the cloud proof passes.

Before D1 activation:

- existing Proposal 1R shadow behavior remains available;
- D0 is not activated merely to bridge to D1;
- no October 7 semantic work is reopened.

After D1 activation:

- reader-story image generation routes to D1;
- Proposal 1R remains internal/historical only;
- the existing October 7 image-only migration can use D1 accepted assets;
- the narrow Work exception is enabled only for package ingest.

## 15. Success criteria

D1 is production-ready when a non-production full run proves:

1. zero owner presence;
2. zero local computer dependency;
3. six premium images generated and accepted in the Image Studio;
4. no ZIP dependency;
5. exact individual cloud assets transferred automatically;
6. Work Cloud uses only `IMAGE_PACKAGE_INGEST`;
7. no visual re-review during Git ingest;
8. exact Git readback;
9. protected CI;
10. deployment and exact live-byte verification;
11. timing/usage events complete;
12. problem/learning artifacts complete;
13. resource observations complete;
14. post-run analysis generated;
15. dashboard snapshot generated.
