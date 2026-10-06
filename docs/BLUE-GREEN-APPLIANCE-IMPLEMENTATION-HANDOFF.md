# Daily AI Brief — Immutable Blue/Green Appliance Implementation Handoff

**Date:** October 6, 2026  
**Architecture:** Proposal 2 — Immutable Blue/Green Production Appliance  
**Proof status:** State portability PASS  
**Production authority:** Existing `gttome/Daily-AI-Brief` remains official and unchanged until an explicit later rollout decision.

## 1. Objective

Implement a qualified BLUE/GREEN engine model that removes production-time program repair from the Daily AI Brief operating model.

The governing rule is:

> Production may repair data state. Production may not repair program state.

The active edition must be able to resume the same durable edition state on a previously qualified standby engine without re-researching stories, rerunning selection, regenerating accepted images, or changing the immutable publication bundle.

## 2. Evidence already established

The isolated October 6 historical state-portability proof passed on workflow run `37501718510`, head `2cc3fb4aa8859f84d19080bdf34a5add71205d97`.

The proof demonstrated BLUE -> GREEN resume with:

- exact same midway checkpoint;
- same immutable state digest;
- zero research replay;
- zero editorial-selection replay;
- zero image-generation attempts;
- zero accepted-image mutations;
- six exact deployed image SHA-256 identities verified;
- live reader semantic parity verified;
- no production repository mutation.

Do not repeat this proof merely for reassurance. Re-run it only if the state contract changes.

## 3. Non-negotiable boundaries

During implementation:

- do not change production schedules;
- do not change the current official publication authority;
- do not disable the existing production engine;
- do not rewrite completed production editions;
- do not regenerate accepted images;
- do not add a new Supervisor or Watchdog layer for Blue/Green;
- do not use Work, Codex, paid model APIs, alternate accounts, owner upload, or owner-liveness prompts as production dependencies;
- do not allow an active production edition to patch workflow/validator/orchestration code.

Development changes must occur on a bounded protected development branch and reach production only after qualification.

## 4. Target operating model

```text
DAYTIME / DEVELOPMENT

engine candidate
   |
   v
tests + historical replay + fault injection
   |
   v
QUALIFIED ENGINE RELEASE
   |
   +--------------------+
   |                    |
   v                    v
 BLUE                 GREEN
 qualified             qualified

PRODUCTION EDITION

active engine = BLUE
standby = GREEN
      |
      v
durable engine-independent edition capsule
      |
      +---- normal data recovery ----> BLUE resumes
      |
      +---- program/infrastructure defect
                   |
                   v
            failover eligibility check
                   |
               +---+---+
              no       yes
              |         |
              v         v
         honest stop   switch engine
                       BLUE -> GREEN
                            |
                            v
                    resume same capsule
```

No code patch is written inside the active edition.

## 5. Required durable contracts

### 5.1 Engine release manifest

Create an engine-release manifest schema with, at minimum:

- `engine_id`
- `engine_version`
- `qualified_sha`
- `qualification_run_id`
- `qualified_at`
- `state_contract_version`
- `supported_persistence_modes`
- `supported_task/stage contract versions`
- `status = CANDIDATE | QUALIFIED | RETIRED`
- `immutable = true`

A production edition binds to an exact qualified engine SHA.

### 5.2 Active/standby engine record

One small protected record should identify:

- active engine;
- standby engine;
- qualification evidence for each;
- exact state-contract compatibility;
- last promotion/failover reason.

This is release configuration, not a lease.

### 5.3 Engine-independent edition capsule

Define one state capsule that contains every semantic/durable artifact needed to resume independently of engine implementation:

- edition identity and execution identity;
- locked six-story selection;
- research/evidence identities;
- media selections;
- Watchlist output;
- book mappings;
- six image specifications;
- six accepted image identities and exact persistence references;
- accepted image hashes;
- publication manifest;
- completed-stage/task receipts;
- current first incomplete semantic/deterministic boundary;
- bundle digest;
- state-contract version.

No critical resume state may live only in an engine-specific temporary workspace.

## 6. Program-state versus data-state policy

### Allowed during production

- resume the same persisted semantic request;
- restore/re-read exact accepted image bytes;
- retry transient network transport;
- rebuild a deterministic projection;
- resume an immutable bundle;
- replay deterministic validation against unchanged state;
- switch to the qualified standby engine after compatibility proof.

### Forbidden during production

- workflow code changes;
- validator code changes;
- Supervisor changes;
- Watchdog changes;
- schema migrations;
- new recovery logic;
- orchestration redesign;
- runtime repair PRs;
- protected-repair coding loops.

A program defect must yield an immutable failure classification and, if compatible, fail over to standby. If neither qualified engine can safely resume the state, stop the edition honestly. Daytime development repairs the next candidate engine.

## 7. Implementation sequence

### Phase A — Read-only coupling assessment

Before writing production code, identify exactly which current durable state is engine-independent versus implementation-coupled.

Classify each state artifact as:

- portable as-is;
- portable after deterministic normalization;
- engine-coupled and must be moved into the edition capsule;
- transient and safe to discard.

Do not change production during this assessment.

### Phase B — State contract

Implement:

- `edition-capsule-v1` schema;
- deterministic capsule digest;
- validator proving all accepted image identities are immutable;
- validator proving completed semantic work is not invalidated by engine switch;
- compatibility matrix between engine release and capsule version.

Exit only when historical October 6 fixture and at least two additional immutable historical fixtures validate.

### Phase C — Engine release contract

Implement:

- `engine-release-v1` schema;
- candidate -> qualified transition;
- immutable qualified SHA;
- release metadata;
- deterministic qualification receipt;
- explicit active/standby mapping.

Qualified engine releases are immutable for the duration of a production edition.

### Phase D — Qualification pipeline

A candidate engine must pass, before becoming standby:

1. current unit/integration suite;
2. state-contract validation;
3. historical edition replay;
4. accepted-image immutability checks;
5. publication-contract checks;
6. state portability BLUE -> candidate;
7. state portability candidate -> BLUE;
8. injected-stop recovery at multiple boundaries;
9. no semantic replay where completed output already exists;
10. no runtime repair path enabled.

### Phase E — Failover executor

Implement the smallest deterministic failover decision:

```text
program/infrastructure failure
        |
        v
classify failure
        |
        v
is standby QUALIFIED for exact capsule contract?
        |
      yes/no
        |
 yes -> atomically bind same execution to standby -> resume exact state
 no  -> persist non-retryable/blocked evidence -> stop
```

The failover executor must not edit engine code.

### Phase F — Runtime repair prohibition guard

Add an explicit production guard that fails if an active edition attempts to:

- modify workflow/runtime implementation;
- open a runtime engineering-repair PR;
- mutate a qualified engine release;
- migrate the state schema in place;
- alter accepted image identity.

Emergency development fixes happen outside the active edition and produce a newly qualified engine candidate.

### Phase G — Fault injection

Run non-production tests that stop the active engine at:

- after editorial lock;
- after media/Watchlist/books;
- after image 2;
- after image 5;
- after all six images before set review;
- after immutable bundle seal;
- before publication preflight;
- during deterministic qualification;
- immediately before publication merge.

For each case prove:

- same execution identity;
- same locked stories;
- no research replay;
- no selection replay;
- no accepted image regenerated;
- no accepted image identity changed;
- bundle digest preserved when already sealed;
- standby resumes from the smallest incomplete boundary.

### Phase H — Canary

Only after all fault tests pass:

- keep official production path unchanged;
- run one non-production/canary edition using the qualified active/standby pair;
- inject one controlled engine stop;
- require automatic state-compatible failover;
- verify exact reader output and all immutable image identities.

### Phase I — Production rollout

Production rollout requires an explicit later decision.

First production rollout should be reversible:

- one qualified engine active;
- one qualified standby;
- current engine retained as rollback;
- no runtime code repair;
- exact state capsule required before failover;
- no change to editorial quality gates.

## 8. Acceptance targets

A production-ready Blue/Green implementation requires:

| Requirement | Target |
|---|---:|
| Qualified engines available | 2 |
| Runtime repair PRs during edition | 0 |
| Accepted image regeneration on failover | 0 |
| Story re-research on failover | 0 |
| Story reselection on failover | 0 |
| Same execution reused | 100% |
| State contract compatibility before switch | PASS |
| Historical fault-injection cases | PASS |
| Canary failover | PASS |
| Owner intervention | 0 |
| Work/Codex/paid API production dependency | 0 |

## 9. Rollback

Before production promotion, current production authority remains unchanged.

After eventual promotion, rollback is release selection, not code reconstruction:

```text
current active engine unhealthy
        |
        v
select previously qualified compatible engine
        |
        v
resume same edition capsule
```

Never reconstruct accepted semantic work or accepted image bytes simply to roll back engine code.

## 10. Implementation discipline

Keep this architecture smaller than the current recovery system.

Do not turn Blue/Green into:

- two Supervisors;
- two Watchdog Rings;
- dual leases;
- mirrored worker pools;
- two independent production executions.

There is still only one edition execution and one durable edition state. BLUE/GREEN describes immutable engine releases capable of consuming that same state.

## 11. Immediate next action in a GitHub-enabled implementation chat

Use this instruction:

> Implement Proposal 2 — Immutable Blue/Green Production Appliance for the Daily AI Brief from this handoff. Begin with a read-only coupling assessment and the engine-independent edition-capsule contract. Preserve the existing production system, schedules, current edition authority, completed work and accepted images. Do not begin live production failover yet. Build and qualify two immutable engine releases, implement the no-runtime-program-repair guard, run the complete historical/fault-injection matrix, and prepare one canary failover. Development may use a bounded protected branch, but production main/schedules must remain operational until all gates pass. Never redo valid semantic work or regenerate accepted images. No Work, Codex or paid API may become a production dependency.
