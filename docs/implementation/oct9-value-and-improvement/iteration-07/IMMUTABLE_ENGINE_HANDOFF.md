# Immutable engine handoff for the existing Compiler release path

## Scope and authority

Iteration 7 requires a single immutable protected release, including engine, product contracts, source snapshot, image capability and schedule (`01_ITERATION_PLAN.md` 07.06; `02_IMPLEMENTATION_SPEC.md` Integrated Value proof; `SHARED_RULES.md` Deadline and freeze). The existing daily start remains 19:15 America/Chicago. This repair carries that engine through the existing state, dispatch, compile and finalization path. It creates no runtime, schedule, controller, observer dependency, activation grant or edition execution.

This document is an implementation handoff. It is not an activation receipt, a completed image proof, a qualified engine selection, a primary-task update or an October 9 allocation. The final approved release SHA and its retained evidence must be supplied from actual protected completion.

## Three distinct commit identities

| Identity | Meaning | Required behavior |
| --- | --- | --- |
| `F` | Exact qualified release engine, a full Git SHA on protected main's first-parent history | Set `compiler-state.json.engine_sha` when the edition is allocated; preserve it through every resume and finalization. |
| `S` | Exact semantic branch commit containing the sealed state, bundle and edition evidence | Carry it as `semantic_commit` in the existing bundle-ready dispatch, compiler handoff and retained receipts. |
| `R` | A later protected evidence or freeze record that names `F` | Keep it distinct from `F`. Recording evidence does not silently select a new engine. |

An image request's source, request-storage and runtime evidence commits remain their own identities. They need not be renamed to `F`; existing proof validators must establish compatibility with the image contracts in `F`.

## Existing workflow behavior

`bundle-ready-signal.yml` checks out protected main and reads the semantic branch as data in a separate worktree. `scripts/check-current-shadow-ready.mjs` verifies the exact state/bundle bytes, their identity and their semantic commit. It selects the state's full engine SHA from protected main's first-parent line. A feature-branch commit merely reachable through a merge's second parent is insufficient. A protected ancestor without the handoff interface is rejected.

The existing `daily-compiler-bundle-ready` payload now includes `engine_sha` and `semantic_commit` with `branch`, `date` and `bundle_digest`. Repository dispatch requires the two exact SHAs and digest. The existing manual workflow can resolve the current exact branch head through the same trusted bootstrap.

`shadow-compile.yml` first executes that protected-main bootstrap, then checks out `F` and explicitly imports the pinned handoff verifier. Semantic branch code never chooses or executes the compiler. Both the bootstrap and selected engine check that the executing checkout's tracked files match its Git identity; untracked build outputs and separate worktrees are allowed.

Before compiling, the pinned verifier checks engine, semantic commit, state bytes, bundle bytes and target identity. `compiler/compile.mjs --release-binding <retained-json>` repeats the check and writes `engine_binding` into the compile receipt. Immediately before `deploy-pages`, the workflow checks the actual remote semantic branch head again and compares the produced compile receipt's engine binding and state/bundle hashes with the verified handoff. A changed head or receipt mismatch stops deployment. The existing finalizer verifies and retains that identity with its first terminal receipt. It never rewrites a historical completion into a newer engine claim.

No retry loop is added. A concurrent branch update leaves the exact old handoff and work available for inspection. A subsequent authorized dispatch must identify the actual new semantic commit.

## Narrow frozen input boundary

The executed compiler, media policies, historical registries, reader templates and source maps are module-relative inputs from `F`. A changed copy on a semantic branch cannot replace that code or those inputs.

Current D1 activation is read through the semantic repository root. Therefore the exact bytes of `contracts/d1-image-contract.json` and `contracts/d1-image-admission-contract.json` must match `F`. The existing activation validator must also validate the full receipt/proof/evidence graph retained in `F`; a semantic-only proof cannot supply missing protected activation evidence. The semantic product validator then checks the same digest-bound graph and all actual edition image, media and correction evidence. For a previously bound D0 strategy, the same rule applies to its existing activation contract and receipt gate.

Unrelated semantic documentation, observation and learning files are not frozen input dependencies. Accepted edition assets and per-edition evidence keep their existing exact hash checks. The independent `operations/value-release.mjs` development audit is not imported into the production path.

## Historical and development compatibility

An absent engine pin is permitted on the operational release path only for an exact registered terminal historical bundle, including its bundle bytes, edition, execution and branch. Historical state and receipt files are not retrofitted. Registered test fixtures remain usable for local and approved isolated delivery validation; they cannot enter production selection by omitting a pin or by adding one.

The pure compiler API still supports controlled offline product fixtures without an immutable engine claim. Such a receipt has no `engine_binding`. A state that already has an engine pin requires its actual Git-backed handoff even through the library API. Operational compilation of a new base edition and operational finalization require the binding. A pure fixture compile is therefore not release authority. The existing separate correction workflow retains its existing revision scope and terminal evidence rules.

## Final primary and recovery prompt promotion

After the complete current image proof, explicit protected activation, final-engine CI, source evidence and actual isolated delivery are valid, the existing primary task can receive its concrete `F` binding using those already-known exact references. Preserve its current identity and daily recurrence, and update the same existing recovery prompts as described below. Read back the actual resulting task bindings as `P`, then protect the final audit/freeze metadata `R` binding `F` and `P`. The prompts need not reference that not-yet-created record or their own future readback digests. This order avoids a prompt/hash/reference cycle and keeps the development audit outside the runtime dependency path. Replace the placeholders below with verified exact references before any task update; placeholders are not authorization or proof.

> For a new October 9 edition allocation, operate only on `gttome/Daily-AI-Brief-Compiler` using the exact qualified protected engine `<F: full 40-character SHA>`. Read its core instructions, contracts, qualified source configuration and vendor source map at that commit. Verify the source snapshot at `<known paths and digests in F>` and the explicit protected D1 activation receipt, complete compatible premium proof and approval at `<known exact paths, digests and protected references>`. If any required record is missing, inconsistent, unqualified or not approved, preserve a precise blocker and stop before allocation; do not allocate with a preactivation or legacy fallback. For an existing execution, retain its original engine SHA, image strategy, research cutoff, accepted image locks and execution identity. Do not reopen a terminal execution. At new allocation set `compiler-state.json.engine_sha` to exactly `F` and branch from that engine. At sealing retain it and use the existing bundle-ready path, which binds the actual semantic commit. Do not substitute then-current main during resume, compile or publication. Keep the already configured daily 19:15 America/Chicago start unchanged.

The actual task readback at `2026-10-08T17:58:37Z` identified these three existing enabled recovery tasks. At final promotion, update their prompts in place while retaining their task identities, saved conversations and existing America/Chicago cadences:

| Existing recovery task ID | Existing daily time |
| --- | --- |
| `6ac57b28e8b08191a35a634a556583fb` | 21:15 America/Chicago |
| `6ac57b39c2108191b0502fa432e3a2fb` | 01:15 America/Chicago |
| `6ac57b4a77988191a2986f11ac597140` | 05:15 America/Chicago |

Add this instruction to each existing recovery prompt: read the execution's persisted `compiler-state.json` as data and, for a bound execution, load the implementation and contracts from its exact `engine_sha`. Preserve that SHA through the existing resume, sealed-bundle handoff and compile behavior; never select then-current main as a replacement engine. Preserve the recorded historical strategy and binding, research cutoff, accepted locks and execution identity. A genuinely new execution missing its required pin must retain a precise blocker; recovery must not infer a pin, allocate another execution or reopen terminal history. Retain actual post-update readbacks with `P`. These are prompt-binding changes to the same tasks, not new tasks or schedule changes, and none is performed by this document.

Later normal daily upgrades can promote a separately qualified `F2` for future allocations through the same existing task prompt. They do not change an already allocated edition's `engine_sha` or require a new daily task. An authorized critical change to a frozen release must follow Iteration 7's affected-candidate requalification rule before promotion.

If an already-existing freeze-record reference is subsequently added to the prompt, retain a new actual readback and final audit for that prompt revision without retargeting `F`. A prompt-only metadata edit does not relabel the engine or prove a schedule readback that has not happened.

## Validation

`tests/release-engine.test.mjs` exercises actual temporary Git histories and worktrees for first-parent selection, pre-interface ancestors, mismatched dispatch/checkout/receipt identities, clean executing bytes, branch-head changes before deployment, immutable resume bindings, exact historical fixture scope, independent observer files and frozen activation authority. `tests/shadow-ready-worktree.test.mjs` invokes the actual readiness CLI from a temporary protected-engine checkout and verifies both emitted SHAs. These are development tests, with synthetic image-proof fixtures where stated; they are not live proof, activation or release.

The two existing fresh-process observer-independence tests now call the pure APIs in those fresh processes, retaining their original missing/throwing optional modules and guards against network, generation, scheduler and child-process work. Their unchanged synthetic fixtures have no operational engine claim. Separate new tests invoke the actual operational compiler and finalizer CLIs from an exact temporary Git engine: missing and mismatched bindings reject, and the valid binding survives actual product validation, deterministic reader/HTTP replay and finalization. No test-only bypass was added to either operational CLI.
