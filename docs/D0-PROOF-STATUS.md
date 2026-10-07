# D0 Native Image Capsule Proof Status

Last reconciled: 2026-10-07 after protected main `67460d4149cc7f98d67d01087df55ac084c7bb8a`.

| Proof / stage | Status | Durable evidence | Next dependency |
|---|---|---|---|
| P0-A clean native capsule | **BLOCKED** | `contracts/d0-p0a-route-matrix.json`; `docs/D0-P0A-CAPABILITY-GAP.md`; `docs/D0-P0A-ZERO-COST-ROUTE-RESEARCH-2026-10-07.md` | At least one zero-cost route must evaluate READY before any fresh native proof generation |
| P0-B same-invocation exact bytes | **PASS** | `proof/d0-native-image-capsules/formal/p0-b.json` | Reuse; do not rerun |
| P0-C deterministic 1200×630 normalization | **PASS** | `proof/d0-native-image-capsules/formal/p0-c.json` | Reuse; do not rerun |
| P0-D exact persisted pixel review | **CAPABILITY PASS** | `proof/d0-native-image-capsules/formal/p0-d-capability.json` | Formal story-bound P0-D is promoted from the fused live proof once P0-A succeeds |
| P0-E strict first-attempt text/brand proof | **IMPLEMENTED / WAITING ON LIVE CANDIDATES** | `contracts/d0-p0e.schema.json`; `image-capsules/final-proof-gates.mjs` | Two first-attempt stress candidates in the fused six-image rehearsal |
| P0-F six-story native set | **IMPLEMENTED / WAITING ON LIVE CANDIDATES** | `contracts/d0-p0f.schema.json`; pre-activation D0 evidence gate; set-review machinery | Six valid isolated native candidates |
| Fused live proof | **READY / ROUTE-GATED** | `rehearsal/d0-fused-live-proof-r1`; six sealed prompts/packets; resumable execution state; route-gate receipt | Zero-cost P0-A route becomes READY |
| D0 activation | **IMPLEMENTED / BLOCKED BY LIVE PROOFS** | six-proof completion gate; activation receipt/applicator; production activation firewall | P0-A, formal P0-D, P0-E and P0-F PASS |
| Post-activation routing | **IMPLEMENTED** | activation-aware Proposal 1R routing | Activation receipt PASS |
| Four Compiler schedule prompts | **IMPLEMENTED / NOT APPLIED** | `contracts/d0-active-schedule-prompts.json` | Apply only after protected-main D0 activation PASS |
| October 7 image-only migration | **IMPLEMENTED / PREFLIGHTED** | same-execution migration plan on `shadow/2026-10-07`; migration verifier/applicator | D0 activation plus six accepted October 7 D0 replacements |
| Live rebuild/deploy/exact-byte verification | **READY AFTER MIGRATION** | existing deterministic compiler, Pages deployment and live verifier | Atomic October 7 D0 bundle replacement |

## Current product blocker

The remaining blocker is one platform primitive, not repository architecture: a supported unattended ChatGPT-native boundary that simultaneously gives the image generator a genuinely fresh story-only context and makes that exact generated image file available for same-invocation persistence and exact-pixel review before the capsule ends.

The current product-surface review covered standalone Scheduled tasks, run-conversation links, Temporary Chat modes, custom GPTs, ordinary new chats, team-task Previous runs, plugin file/library APIs, MCP server instructions/skills, and export/compliance paths. None currently satisfies all seven P0-A capabilities without a prohibited dependency.

There is no paid-capacity branch.

## Fused no-rework execution

The remaining live image proofs have been compressed into one six-image non-production rehearsal:

- six differentiated composition assignments and six sealed story-only prompts;
- two candidates designated as first-attempt text/branding stress cases;
- all six candidates also serve the full-set P0-F proof;
- the first qualifying exact persisted candidate supplies formal P0-D;
- the full set supplies P0-A isolation evidence across distinct fresh contexts;
- deterministic promotion derives P0-A, P0-D, P0-E and P0-F with **zero additional image generations**;
- P0-B and P0-C are reused unchanged.

The rehearsal branch is `rehearsal/d0-fused-live-proof-r1`. Its protected-CI-verified route gate currently returns `BLOCKED_NO_ZERO_COST_NATIVE_ROUTE` with zero native generations and zero quality attempts consumed. A fresh capsule allocation is executable only when the route matrix reports at least one READY zero-cost route. Already-persisted candidates, if any exist in a future run, are resumed before any new generation.

## No-rework boundary

Do not repeat P0-B, P0-C, transport preflights, PR1–PR5, October 7 semantics, or failed earlier P0-A experiments. Do not regenerate an accepted image. Do not create a second October 7 semantic execution. Do not apply the D0 schedule prompts or activate D0 while the six-proof gate is incomplete. Do not use Work, Codex, paid model/image APIs or services, billable overage, new paid infrastructure, alternate accounts, owner image transfer, owner-liveness, same-chat fallback, or Proposal 1R as a reader-story fallback.

When a zero-cost P0-A route first evaluates READY, resume the preserved fused rehearsal at its first incomplete candidate rather than starting a new proof execution.
