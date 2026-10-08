# Focused source-plan excerpts

Source: `Brief_Compiler_Implementation_Plan_Core_Value_and_Improvement_2026-10-07.md`. Exact original text is retained in the full supporting copy. Read these relevant passages first; the iteration plan supplies sequencing and package-specific scope. No legacy control-plane machinery is authorized.

---

**Original source lines 699–748**

## 11. Acceptance and fault-injection tests

### 11.1 Core and source tests

| Test | Expected result |
|---|---|
| **C01 — Historical preservation** | Running migration/hardening fixtures cannot alter October 8 original assets, terminal receipts, or accepted locks. |
| **C02 — Full directory accounting** | 74/40/22/28/40 memberships; 102 baseline + 102 additions; all rows mapped/dispositioned. |
| **C03 — Idempotent source import** | Running import twice adds no duplicate resource or layer membership; existing Compiler-only sources remain. |
| **C04 — Endpoint/identity separation** | Distinct endpoints from the same domain remain distinct; shared resource across layers fetches once when appropriate. |
| **C05 — Health versus yield** | Successful zero-result feed stays retrieval-healthy; 403/parse failure is classified separately; unknown timing is null. |
| **C06 — Actual breadth** | Due-source manifest and receipt show which expanded sources were really checked, not just registered. Unchecked is not PASS. |
| **C07 — Media identity and age** | Old video, generic channel link, unresolved episode, unsupported date/runtime, or duplicate show fails the applicable gate. |
| **C08 — Media writing/display** | Distinct Summary/Why/Connection renders across surfaces; exact external links open safely; required counts preserved. |
| **C09 — Pre-generation admission** | Invalid length, allowlist, missing mechanism, or repeated assignment fails before any native generation. |
| **C10 — Fresh context** | Reusing a story conversation for another story or injecting unrelated assets/context fails isolation. |
| **C11 — Genuine attempt accounting** | Admission/infrastructure failure consumes zero attempts; a quality failure consumes its actual attempt; rename does not reset it. |
| **C12 — Actual diversity** | Six different metadata strings attached to visibly repeated templates do not produce a set PASS. |
| **C13 — Resume from lock** | Interrupt after an accepted checkpoint; resume uses exact bytes and does not regenerate accepted stories. |
| **C14 — Readiness-driven timing** | Early and late readiness fixtures bind the same existing task to their actual due times; scheduler readback and conflicts are explicit. |
| **C15 — Corrections** | One/some/all replacement scopes preserve unselected assets and semantics; stale expected hashes fail; original terminal history stays intact. |
| **C16 — Real final quality** | Missing actual image review, byte mismatch, or invalid required media blocks the core even if the dashboard says green. |

### 11.2 Observation failure must not cause production failure

Use a frozen, qualified fixture bundle and accepted image bytes for deterministic A/B comparison. Do not regenerate images merely to test dashboard overhead.

| Injected fault | Required core behavior | Required observation behavior |
|---|---|---|
| **N01 — Dashboard host unavailable** | Continue unchanged | Show offline/stale when reachable again; retain last known state |
| **N02 — Snapshot malformed** | Continue unchanged | Reject only the snapshot; preserve last valid projection |
| **N03 — Metrics adapter throws** | Continue unchanged | Catch at boundary; report a gap when possible |
| **N04 — Observer credential/repo write denied** | Continue unchanged | Stop projection writes/back off; never request production permissions |
| **N05 — Learning report fails** | Remain correctly terminal when product is verified | Mark learning/report incomplete, retry separately |
| **N06 — Event duplicated/out of order** | Core remains authoritative | Deduplicate; no Done-to-WIP regression |
| **N07 — Browser tab closed/reloaded** | No change to liveness, schedules, or attempts | Resume timers from evidence; no reset |
| **N08 — Private Drive/session link unavailable** | No new dependency introduced | Show unavailable/restricted; do not expose credentials |
| **N09 — Observer CPU/runner constrained** | Publication capacity takes priority | Defer work or use cached/client projection |
| **N10 — Missing duration/overlapping spans** | Continue unchanged | Unknown remains unknown; no double counting |
| **N11 — All observation disabled** | Same qualified bundle digest, image hashes, core terminal result, and permitted side effects | Explicit `OBSERVATION_OFF` where a view remains available |
| **N12 — Viewer causes repeated refreshes** | No workflow/model/image activity triggered | Throttled cached reads only |

For every N-test, assert no extra native generation, no core schedule update, no producer dispatch, no publication retry, no mutation to accepted content, and no false failure swallowed from a core validator.

### 11.3 Observation's own release tests

Stopwatch fidelity; 7/30-run cohort filtering; sample-size labels; source freshness watermarks; private/public redaction; reduced-motion/accessibility/mobile layout; exact thumbnail/story binding; correction scope; and bounded refresh/backoff must pass before the dashboard is described as complete. Failure delays **the dashboard release**, not the edition.

---

---

**Original source lines 749–794**

## 12. Pre–October 9 sequence and release decisions

### 12.1 Dependency-aware order

**First: protect value production.** Complete A-00, the core image/media gaps, and source reconciliation/qualification work. Continue existing image development from valid saved progress. Keep observers disabled during the first core qualification unless their non-interference is already proven.

**Second: attach the smallest safe observer.** Complete B-00/B-10 and a minimal live overview, timed Kanban, and deliverable view. This can proceed alongside core work on an independent branch, but cannot consume the image executor or create a shared release dependency.

**Third: complete the improvement experience.** Add living projections, architecture/source views, comparisons, trends, recommendations, and exports. Record unfinished B work openly; do not make the next Brief wait for it.

### 12.2 Time-window planning

`T0` is the next Compiler start verified from the actual configured schedule. Do not infer it from an old document. For the October 9 edition, this is the relevant October 8 preparation window, subject to the current configuration.

| Window | Track A | Track B |
|---|---|---|
| After owner approval | Resolve live baseline, source migration, media/spec tests; preserve image work | Isolation audit and design using recorded fixtures |
| Before core freeze | Finish core fixes and due-source qualification; obtain required actual image-path evidence | Minimal safe event/view release only if independently proven |
| **T0 minus 60 minutes** — proposed freeze | Freeze approved engine/contract/source snapshot; run final core admission | Freeze any shared observation hook; UI-only changes remain separately deployable if isolation is proven |
| At T0 | Start/resume under core authority, with actual readiness-bound image handoff | Read-only observation; optional and removable |
| During run | Produce and persist qualified deliverables | Display live evidence and append living projections without blocking |
| After terminal | Preserve terminal state; corrections only through explicit authority | Run/trend report and proposed next iteration |

The schedule is conditional on approval and actual image qualification. It is not a promise that a six-image quality proof will finish in a fixed engineering estimate. When time is short, drop optional interface scope, **not image quality, exact media verification, or live publication integrity**.

### 12.3 Independent release results

| Result | Meaning | October 9 consequence |
|---|---|---|
| `CORE_RELEASE_READY = PASS` | Required product, evidence, image, media, publication, and authorized capability gates pass | May run regardless of dashboard availability |
| `CORE_RELEASE_READY = FAIL` | A genuine mandatory contract/capability remains unproved | Do not substitute low-quality art or falsely report readiness |
| `SOURCE_ROLLOUT = COMPLETE` | Full supplied catalogue accounted for; intended operational routes qualified with honest dispositions | Use approved expanded snapshot |
| `SOURCE_ROLLOUT = PARTIAL` | Full scope is retained but some route qualification is unresolved | Use qualified approved routes; disclose incomplete expansion; do not claim full researched coverage |
| `OBSERVATION_RELEASE = LIVE / DEGRADED / OFF` | Status of dashboard/metrics delivery | Does not determine Brief success |
| `LEARNING_REPORT = COMPLETE / PARTIAL / UNAVAILABLE` | Status of analytical documentation | Does not reopen or stop the Brief |

A real unresolved C0 defect cannot be relabeled “observation-only” to bypass it. Conversely, a missing incident prose field cannot be used to hold a correctly verified reader edition.

### 12.4 Branch, PR, and rollback discipline

Use separate protected changes for source/media qualification, image-path work, and optional observation where practical. Do not accumulate dashboard experiments into the publication candidate. Keep required core CI independent of optional dashboard tests unless a change actually touches the shared core boundary.

For rollback: disable the observation adapter/projector/UI independently; retain immutable evidence for later reconstruction. For a bad proposed source snapshot, do not release it; preserve the last approved qualified configuration while fixing the migration. For core image failure, preserve completed semantics and locks and follow the existing fail-closed contract—never a weak fallback. All code changes occur outside active runtime repair loops.

---

---

**Original source lines 795–822**

## 13. Disposition of the October 8 assessment

This table preserves all 15 prior issue IDs while revising implementation placement and gate authority to match the owner's latest direction. The assessment's findings remain historical; new code-read findings are separately identified in Section 8.4.

| Assessment issue | Implementation destination | Revised gate treatment |
|---|---|---|
| **OCT8-01** — Original image quality false-green | A-30/A-31 | Core premium quality remains mandatory. |
| **OCT8-02** — Set visual convergence | A-30/A-31; B image funnel for analysis | Actual diversity mandatory; dashboard scoring is not authority. |
| **OCT8-03** — Five-versus-six signature conflict | A-30 | Preserve stricter canonical six-signature rule. |
| **OCT8-04** — D1 complete proof not established in assessment | A-00/A-31 | Resolve newest actual evidence; do not assume R1 is current or activate from old status. |
| **OCT8-05** — Spec/contract repairs during run | A-30 | Deterministic admission before generation. |
| **OCT8-06** — Post-render mechanism clarification | A-30/A-31 | Story-specific causal planning; do not re-render accepted work. |
| **OCT8-07** — Video freshness drift | A-20; A-11 widens supply | Core 72-hour rule, explicit cutoff/date precision. |
| **OCT8-08** — Generic video destination | A-20 | Exact selected-item identity required. |
| **OCT8-09** — Podcast homepage destination | A-20 | Exact episode identity/link required. |
| **OCT8-10** — Missing media Connection field | A-20 | Preserve reader value across surfaces. |
| **OCT8-11** — False-zero/stale observation | B-10/B-40; source schema compatibility in A-11 | Observation defect; **not a publication blocker**. |
| **OCT8-12** — Empty learning ledger | B-20/B-40 | Mandatory improvement deliverable, but **not a runtime/next-edition prerequisite merely because the report is missing**. Confirmed underlying C0 defects remain blockers. |
| **OCT8-13** — Base-terminal/correction ambiguity | A-40/B-30 | Core preserves revision identities; display improvement independent. |
| **OCT8-14** — Correction metric scope | A-40/B-40 | Core correction identity mandatory; aggregate performance metrics optional. |
| **OCT8-15** — Base-run/usage scope | B-10/B-40 | Cohort/provenance repair; no quality downgrade or false speed comparison. |

### Additional owner-directed work

The assessment did not fully specify the 204-membership expansion, a passive live dashboard, architecture/component view, stopwatches with prior averages, source-contribution tools, and automatic trend-based improvement proposals. Those are explicit deliverables in this plan, not omitted as “future ideas.” Their delivery remains independently sequenced so they cannot hold up value production.

---

---

**Original source lines 823–849**

## 14. Decisions for owner review

The following defaults make this implementation plan executable after approval without reopening settled product requirements.

| Decision | Recommended default |
|---|---|
| Separation | Approve two tracks and enforce the no-reverse-dependency rule. |
| Source scope | Reconcile all 204 memberships and 102 additions; preserve existing Compiler-only sources; qualify actual routes before calling them operational. |
| Daily research breadth | Due Tier 1 metadata checks, explicit Tier 2/3 cadence, deduplicated retrieval, existing bounded deep-review envelope. No silent reduction of directory scope. |
| Image priority | Protect and finish the existing premium image lane first; no parallel redesign, lowered benchmark, renamed retry budget, or fallback. |
| Image timing | Preserve actual-readiness handoff on the existing task, with verified due time; dashboard never controls it. |
| Media | Enforce precise age/identity/duration/copy rules; do not silently relax the two-video/two-podcast requirement. |
| First dashboard release | Overview + timed Kanban + deliverables + freshness; architecture, source analysis, and trends follow independently. |
| Hosting/privacy | Evaluate an existing separate owner Site; default to a small read-only app, no new database unless a proven requirement justifies it. Public-safe and owner-only information stay separated. |
| Learning | Capture during-run observations and generate living documents asynchronously; missing reports are observation failures, not reasons to halt a valid Brief. |
| Recommendations | Deterministic evidence-ranked proposals after every run; no automatic implementation or runtime repair. |

### Definition of done

**Track A is ready** when the expanded-source snapshot is honestly reconciled/qualified for its intended scope, required reader/media/image gates are proven, the current image lane resumes from valid progress, publication/correction integrity holds, and the whole core works with observation disabled.

**Track B is ready** when live views, accurate task/group/run timing, evidence-bound deliverables, living incident documents, source/architecture views, and run/trend recommendations work with visible provenance and pass the non-interference tests.

**The implementation programme is complete** when both tracks meet their own acceptance criteria. **The next Brief does not wait for Track B to be complete.**

---
