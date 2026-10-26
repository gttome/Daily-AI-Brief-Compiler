# Full-source discovery coverage — v1 (forward-only)

**Date:** October 26, 2026. **Repository:** `gttome/Daily-AI-Brief-Compiler`.
**Owner's goal:** Every enabled registered source should be visibly accounted for in the normal 19:15 CT editorial cycle; actual publisher/index retrieval attempts and dated-item editorial reviews must not be confused with merely possessing a source catalogue. **No new recurring task, paid provider, Work/Codex, TinyFish, workflow, or image change.**

## 1. Baseline and two distinct kinds of proof

- **208** registered source IDs on protected main at the start of this change.
- **94** enabled IDs are allowed to be probed; **114** are intentionally disabled/pending qualification. The complete catalogue must be enumerated as 208/208. Disabling an unqualified, dead, or generic source never makes it a successful source.
- **83** enabled sources have a direct Article, Video or Podcast role: **56 Article, 6 Video, 21 Podcast**. Eleven other enabled sources are research/Watchlist only. Roles are counted per membership; a source may have several roles.
- **Route coverage** means a real low-cost public HTTPS HEAD or GET attempt on each enabled source's declared endpoint. One successful HTTP response proves **route reachability only**, not a dated item, fresh story, AI podcast share, or a playable video. A 403, 429, network exception, or timeout is an attempted check but is **not a usable source**.
- **Editorial coverage** means actually reading each eligible source's original index, feed, episode list or verified independent channel index and recording either a dated original item, a researched lack of qualifying material, or a precise access/source failure. It does **not** mean selecting 83 items, and a syntactically valid receipt does not establish the truth of observations.
- **Selection** of the six stories, two videos and two podcasts remains entirely subject to the current protected, independently sourced original-date, novelty, publisher ownership, runtime, playback and content-quality gates.

## 2. Source-only tools (Node 20+, no API key)

New read-only/pure functions are in `operations/source-coverage.mjs` and `operations/source-item-census.mjs`. A local, existing editorial runtime **that actually has Node and public internet access** can run:

```bash
node scripts/source-coverage-sweep.mjs \
  2026-10-27 compiler-2026-10-27-r1 \
  shadow-runs/2026-10-27/editorial/source-route-coverage.json
```

The command uses six concurrent direct public HTTPS requests, four-second per-request aborts and at most one HEAD→GET fallback for HTTP 405/501. It does not use paid models, search APIs or metered browsers. It covers **all enabled IDs** and writes 208 explicit rows. It does not claim successful retrieval when the network is blocked. A real scheduled ChatGPT conversation **may not have a Node shell**, so this is a conditional capability, not a guaranteed cron-side execution.

The semantic editor independently records source-by-source dated item observations in a document built from `buildEditorialSourceCensus(registry,{edition_date,execution_id,created_at})`, one record for **each of 83 enabled Article/Video/Podcast source IDs**. The editor must fill `outcome` with `CANDIDATES_FOUND`, `NO_ELIGIBLE_ITEMS`, `ACCESS_BLOCKED` or `SOURCE_ERROR`, each with actual `checked_at`, `source_index_url`, `evidence_method`, and a specific descriptive `reason`. For `CANDIDATES_FOUND`, include precise original dated `{url,title,original_date}` entries. Do not fill `NOT_VISITED` records with invented details; do not mistake a marketing landing page for a genuinely date-qualified story.

When **both real receipts** are persisted on the edition branch, independently check them:

```bash
node scripts/validate-source-coverage.mjs \
  shadow-runs/2026-10-27/editorial/source-route-coverage.json \
  shadow-runs/2026-10-27/editorial/source-item-census.json
```

This intentionally fails when **any enabled route has no recorded actual attempt**, **any one of the 83 editorial source IDs has no recorded visit**, the registry digest differs, one source is omitted, or status/counts are falsified. Output `ALL_SOURCES_ACCOUNTED` means **coverage accounting**, not 94 usable sources nor successful full playback/listening. Both receipts must reflect the **same edition and execution**.

## 3. Publication safety and acceptance stages

| Stage | Evidence | Acceptance |
|---|---|---|
| A — Registry enumeration | 208 unique IDs, 94 enabled, 114 disabled and role map | Deterministic tests must PASS |
| B — Route sweep | Real attempt per 94 enabled IDs, with attempted time, method, HTTP result or precise network error | Route receipt passes `requireAllAttempts` (no silent omissions) |
| C — Dated item review | Actual index/read evidence for 83 enabled Article/Video/Podcast IDs | Item census passes `requireAllVisited` |
| D — Editorial selection | Existing six stories/two videos/two podcasts and separate publication gates | Existing protected producer/CI must pass |
| E — Natural run | Real scheduled invocation and a real saved receipt from that execution | Only then claim full unattended coverage |

**Critical distinction:** A and the deterministic validator are implemented and regression tested in this PR. A passing fixture test does **not** establish B, C or E. B and C are executable tools/contracts **where the required environment exists**, but exhaustive live retrieval remains **UNVERIFIED** until actual persisted observations are read back.

**Do not insert a new mandatory fail-closed publishing gate for tonight** until B+C have succeeded in a genuine same-environment rehearsal. The existing single editorial invocation can lack shell/network tools or exceed the release window; prematurely making the entire Brief fail on all 94 external servers would disrupt tonight's 21:15 image handoff. A non-complete coverage receipt must be reported honestly and **must not be labeled 100%**. Continue the normal safe, evidence-grounded editorial selection with explicitly qualified source scope when exhaustive checking is not feasible.

No further schedules, watchdogs, CI jobs, hosted crawlers, billable external services, image regeneration, source score defaults, editorial quota changes, Watchlist changes, or backdated editions are authorized. The separately scheduled **19:15 editorial and 21:15 Work Image** tasks keep their existing times and identities. Existing protected `compiler-validation / validate`, normal `npm test`, bootstrap, fixture e2e, and reader parity continue to protect every source-only PR.

## 4. First-run report required

The actual October 26 19:15 CT invocation (target October 27 edition) should state precisely: `registry_ids`, `enabled_source_ids`, `attempted_routes`, `reachable_routes`, `blocked_or_failed_routes`, `editorial_sources_attempted`, `original_dated_candidate_sources`, `disabled_sources_skipped`, `coverage_incomplete_ids` and `source_coverage_result`. Missing evidence is **UNKNOWN/INCOMPLETE**, never fabricated `PASS`. The time budget must still accommodate completing the actual Brief before the existing image handoff.

## 5. Rollback

Disable the optional source census instruction through one protected source-only PR if it materially harms producer liveness; do not remove the source registry or accepted images. The report-only tools do not alter production state or trigger a new process.
