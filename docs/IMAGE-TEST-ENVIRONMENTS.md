# Image budgets by environment

The environment policy is explicit in `contracts/image-test-environments.json`.
Production remains the default and retains six stories, four genuine attempts
per story and twenty-four total generations per execution. Existing production
requests, review schemas, qualification gates and frozen task prompts are unchanged.

| Environment | Cases in one run | Genuine attempts | Later test runs |
| --- | --- | --- | --- |
| Development | Any positive count | No application quota per case or run | Unlimited explicit new runs; earlier evidence retained |
| Preproduction | Six | Four per case, twenty-four per run | Every explicit new run starts a fresh allowance, including when the same source cases were tested earlier |
| Production | Six | Four per case, twenty-four per execution | Existing production allocation and recovery rules |

`null` in a development budget means **no application quota**. It does not mean
zero remaining attempts or permission to invent counts. Actual completed native
generations increment monotonically. Integer representation, platform access and
infrastructure limits still apply; this policy introduces no six-case, four-attempt
or twenty-four-generation cutoff for a development experiment.

## Separate development interface

`prepareDevelopmentImageRun` takes an explicit `START_NEW_TEST_RUN`, a unique
`runId`, actual `createdAt`, a `startReason`, the retained run registry, the actual
inventory of retained execution IDs, and any positive number of cases. Each case
contains `{case_id, story, source}` with its sealed story and bound recipe/source
review. The same scientific story may be used in distinct experimental cases.

The result contains a development-only manifest, state and an appended registry.
Development files live under `development/image-experiments/<runId>`. Their schema,
environment and flags explicitly exclude production and qualification. They do
not satisfy production request, execution-state, acceptance-manifest or v3 review
schemas. Do not relabel or copy a development lock into production evidence.
Production requires its own correctly bound run and the unchanged admission,
review, image, set, byte and release gates.

`recordDevelopmentImageEvent` records actual observations from the existing
authorized image lane. It does not create another image executor or browser route.
It supports `GENERATION_INTENT`, `GENERATION_COMPLETED`, `REVIEW_COMPLETED`,
`ACCEPT_LOCK` and `INFRASTRUCTURE_BLOCKED`. It accepts fifth and later attempts
with their real numbers and accepts more than six cases and twenty-four total
generations. It never changes an attempt number to make a production schema pass.

Generation and correction strings still come from the existing frozen recipe
compiler. The full same-story canonical review, actual quality measurements and
distinct meaningful-component requirement remain mandatory. A specification
conflict remains a case blocker. Removing a quota does not authorize changing
the specification after a review or accepting a lower-quality image.

Each new candidate records the exact raw bytes and actual prompt. Pending external
outcomes must be reconciled; an unknown outcome is not treated as a free retry.
Canonical review binds the saved 1200 by 630 PNG. A development lock requires the
same observed canonical byte identity and actual immutable Git readback. The
caller must perform that readback through the existing authenticated transport;
the pure event serializer itself performs no network operation. Once locked, the
case is reused without regeneration. Its evidence survives a restart unchanged.

## Fresh preproduction runs

`preparePreproductionImageRun` takes the same explicit new-run metadata plus an
existing admitted six-case `request` and `sourceEvidence`. It changes the new
execution/request identity and source-envelope digest, while retaining the exact
six source-supported story specifications and generator strings. It records the
template digests and prior registry digest. Earlier evidence is never overwritten,
renamed, reinterpreted or subtracted from.

The new namespace is `qualifications/preproduction/<runId>` and its branch is
`qualification/preproduction-<runId>`. Persist the prepared request and source
evidence first. Then call `initializePreproductionRuntime` with their actual
immutable request commit, actual observation time, and authoritative observations
that no state or attempt log already exists at that namespace. It creates the
existing D1 state/log shape with zero generations and no accepted assets. The
standard D1 serializer and production-grade four-attempt limit apply within that
run. The ordinary fourteen-companion qualification is still required for any
qualification claim; preparation or a new allowance is not a qualification.

The registry and retained execution inventory must come from actual immutable
readback. Publish a new run using an expected-head atomic transaction that requires
the target namespace to be absent and appends the registry without changing prior
entries. An already-used run identity is an error. A new name is not evidence that
a new run occurred: retain the explicit start instruction, registry transition,
actual runtime start and resulting observations. Scheduled continuation, timeout,
transport recovery, quota exhaustion and an ordinary retry must never silently
call the new-run allocator.

`START_NEW_TEST_RUN` is an operation and identity boundary, not a new owner-
approval gate. The owner's standing instruction authorizes development experiments
without an application quota and fresh preproduction allowances for each new test
run. The existing operator may allocate these runs within that already authorized
testing scope without asking again for every test. It must still record a genuine
new-run operation; resuming, retrying or encountering a failure never resets the
current run's counters automatically.

## Resume preserves the current run

Use `RESUME_EXISTING_RUN` with `resumeDevelopmentImageRun` or
`resumePreproductionImageRun`. Supply the actual saved state/log and canonical
digests. The returned records preserve every attempt, pending intent, candidate,
accepted lock and count. A preproduction run blocked after four failed attempts
stays blocked when resumed. A genuinely new preproduction run allocated within
the standing testing authorization may test the same cases with a fresh allowance
under its own identity and records.

The currently frozen qualification engine, request, task binding and within-run
locks remain unchanged. This policy applies to subsequent explicitly identified
experiments/runs under the next reviewed engine; it does not reinterpret or reset
the current qualification's evidence.

## Local CLI

The CLI is a deterministic preparation/recording interface:

```sh
node scripts/image-test-run.mjs prepare-development INPUT.json NEW_OUTPUT.json
node scripts/image-test-run.mjs prepare-preproduction INPUT.json NEW_OUTPUT.json
node scripts/image-test-run.mjs initialize-preproduction INPUT.json NEW_OUTPUT.json
node scripts/image-test-run.mjs record-development INPUT.json NEW_OUTPUT.json
node scripts/image-test-run.mjs resume-development INPUT.json NEW_OUTPUT.json
node scripts/image-test-run.mjs resume-preproduction INPUT.json NEW_OUTPUT.json
```

For a development event, `raw_file` and `canonical_file` are optional relative
paths beneath the input directory. Only the corresponding completed-generation
or review event accepts those bytes. Output creation is exclusive: the CLI never
replaces a saved result. It does not publish to GitHub, generate an image, create
a task, arm a schedule or change an activation. The existing caller retains its
actual runtime authorization and performs guarded persistence.
