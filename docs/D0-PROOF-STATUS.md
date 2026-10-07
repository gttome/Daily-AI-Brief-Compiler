# D0 Native Image Capsule Proof Status

Last reconciled: 2026-10-07.

| Proof | Status | Durable evidence | Next dependency |
|---|---|---|---|
| P0-A clean native capsule | **BLOCKED** | `docs/D0-P0A-CAPABILITY-GAP.md`; `contracts/d0-p0a-route-matrix.json` | Product/tool route must evaluate READY before another generation |
| P0-B same-invocation exact bytes | **PASS** | proof branch `proof/d0-native-image-capsules/formal/p0-b.json` | Reuse; do not rerun |
| P0-C deterministic 1200×630 normalization | **PASS** | proof branch `proof/d0-native-image-capsules/formal/p0-c.json` | Reuse; do not rerun |
| P0-D exact persisted pixel review | **CAPABILITY PASS** | proof branch `proof/d0-native-image-capsules/formal/p0-d-capability.json` | Formal story-bound Visual Review v3 waits for P0-A |
| P0-E strict first-attempt text/brand proof | **BLOCKED_BY_P0-A** | PR2 prompt/text/brand contracts already implemented | Needs valid P0-A native candidates |
| P0-F six-story native set | **BLOCKED_BY_P0-A** | PR4 set-review/benchmark machinery already implemented | Needs six valid isolated native candidates |
| D0 activation / PR6 | **BLOCKED** | D0 remains `proof_required` | P0-A, P0-E and P0-F must pass |

## No-rework boundary

Do not repeat P0-B, P0-C, transport preflights, PR1–PR5, October 7 semantics, or the failed control-heavy Run A path. Do not generate another P0-A image unless the executable route matrix first reports a zero-cost native route READY.
